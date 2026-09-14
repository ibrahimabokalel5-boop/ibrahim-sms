#!/usr/bin/env python3
"""
Digital Services Hub - Local Server & Multi-API Proxy
خادم محلي لتخطي مشاكل CORS وتوجيه طلبات الـ API لأرقام التفعيل وشحن الألعاب
"""
import http.server
import urllib.request
import urllib.parse
import urllib.error
import json
import os
import sys
import webbrowser

# ضبط ترميز المخرجات لتجنب أخطاء cp1256 على ويندوز
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 8080
HERO_SMS = "https://hero-sms.com/stubs/handler_api.php"

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_GET(self):
        # فحص حالة الخادم
        if self.path == "/health" or self.path == "/ping":
            self.send_json({"status": "ok", "message": "Digital Hub Server Running"})
            return

        # توجيه طلبات Hero-SMS
        if self.path.startswith("/api?") or self.path.startswith("/api/"):
            if self.path.startswith("/api?"):
                query = self.path[5:]
            else:
                query = self.path[5:]
                if query.startswith("?"):
                    query = query[1:]

            target = f"{HERO_SMS}?{query}"
            try:
                req = urllib.request.Request(
                    target,
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                )
                with urllib.request.urlopen(req, timeout=20) as resp:
                    data = resp.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(data)
            except urllib.error.HTTPError as e:
                try:
                    err_data = e.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(err_data if err_data else str(e).encode('utf-8', 'ignore'))
                except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
                    pass
            except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
                pass
            except Exception as e:
                try:
                    self.send_response(500)
                    self.send_header("Content-Type", "text/plain; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(f"ERROR: {str(e)}".encode('utf-8', 'ignore'))
                except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
                    pass
        else:
            super().do_GET()

    def do_POST(self):
        # 1. تنفيذ طلب شحن ألعاب حقيقي عبر الـ API
        if self.path == "/api/topup/execute":
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body) if body else {}

                provider_type = data.get('providerType', 'custom') # custom, like4card, smileone, telegram
                api_url = data.get('apiUrl', '').strip()
                api_key = data.get('apiKey', '').strip()
                merchant_id = data.get('merchantId', '').strip()
                game = data.get('game', '')
                pkg_id = data.get('packageId', '')
                player_id = data.get('playerId', '')

                if not api_url:
                    self.send_json({"success": False, "error": "لم يتم تحديد رابط الـ API (API URL) في الإعدادات"}, 400)
                    return

                # إعداد الـ payload المناسب للمزود
                headers = {
                    "User-Agent": "DigitalHub/2.0",
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }

                if api_key:
                    headers["Authorization"] = f"Bearer {api_key}"

                payload = {
                    "api_key": api_key,
                    "merchant_id": merchant_id,
                    "player_id": player_id,
                    "game": game,
                    "package_id": pkg_id,
                    "service": f"{game}_{pkg_id}"
                }

                # في حال كان المزود Telegram Bot Webhook
                if provider_type == 'telegram' or 'api.telegram.org' in api_url:
                    chat_id = merchant_id or data.get('chatId', '')
                    msg = f"🎮 *طلب شحن ألعاب جديد*\nاللعبة: {game}\nالباقة: {pkg_id}\nمعرف اللاعب: `{player_id}`\nرقم الطلب: #{data.get('orderId', '')}"
                    tele_payload = {
                        "chat_id": chat_id,
                        "text": msg,
                        "parse_mode": "Markdown"
                    }
                    req_data = json.dumps(tele_payload).encode('utf-8')
                    req = urllib.request.Request(api_url, data=req_data, headers={"Content-Type": "application/json"})
                else:
                    req_data = json.dumps(payload).encode('utf-8')
                    req = urllib.request.Request(api_url, data=req_data, headers=headers)

                # تنفيذ الطلب الخارجي
                with urllib.request.urlopen(req, timeout=25) as resp:
                    resp_bytes = resp.read()
                    resp_text = resp_bytes.decode('utf-8', errors='replace')
                    try:
                        resp_json = json.loads(resp_text)
                    except Exception:
                        resp_json = {"raw": resp_text}

                    self.send_json({
                        "success": True,
                        "message": "تم تنفيذ الطلب بنجاح لدى المزود",
                        "providerResponse": resp_json,
                        "transactionId": resp_json.get("order_id") or resp_json.get("transaction_id") or resp_json.get("id") or "TX-PROV-OK"
                    })
            except urllib.error.HTTPError as e:
                err_text = e.read().decode('utf-8', errors='replace')
                self.send_json({"success": False, "error": f"خطأ من سيرفر المزود ({e.code}): {err_text}"}, 200)
            except Exception as e:
                self.send_json({"success": False, "error": f"تعذر الاتصال بسيرفر الشحن: {str(e)}"}, 200)
            return

        # 2. فحص رصيد سيرفر الشحن
        elif self.path == "/api/topup/balance":
            try:
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length).decode('utf-8')
                data = json.loads(body) if body else {}

                balance_url = data.get('balanceUrl') or data.get('apiUrl')
                api_key = data.get('apiKey', '').strip()

                if not balance_url:
                    self.send_json({"success": False, "error": "يرجى إدخال رابط API الرصيد أولاً"}, 400)
                    return

                headers = {"User-Agent": "DigitalHub/2.0"}
                if api_key:
                    headers["Authorization"] = f"Bearer {api_key}"

                req = urllib.request.Request(balance_url, headers=headers)
                with urllib.request.urlopen(req, timeout=15) as resp:
                    resp_data = resp.read().decode('utf-8', errors='replace')
                    try:
                        resp_json = json.loads(resp_data)
                        balance = resp_json.get('balance') or resp_json.get('credit') or resp_json.get('amount') or 0
                    except Exception:
                        balance = resp_data.strip()
                    self.send_json({"success": True, "balance": balance})
            except Exception as e:
                self.send_json({"success": False, "error": str(e)}, 200)
            return

        # مسار غير معروف
        self.send_json({"error": "Unknown POST route"}, 404)

    def log_message(self, format, *args):
        try:
            sys.stderr.write(f"[Server] {self.address_string()} - {format % args}\n")
        except Exception:
            pass

if __name__ == "__main__":
    tool_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(tool_dir)

    server_address = ("", PORT)
    try:
        httpd = http.server.ThreadingHTTPServer(server_address, ProxyHandler)
    except AttributeError:
        httpd = http.server.HTTPServer(server_address, ProxyHandler)

    print("=" * 60)
    print("Digital Services Hub & Top-up Server Running!")
    print(f"Local URL: http://localhost:{PORT}")
    print("=" * 60)

    if "--open" in sys.argv:
        webbrowser.open(f"http://localhost:{PORT}")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
