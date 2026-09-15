#!/usr/bin/env python3
"""
Digital Services E-Commerce Platform - Flask Server
سيرفر المتجر الإلكتروني المتكامل: واجهة الـ REST API، قاعدة البيانات، بوت التيليجرام، وتوجيه خدمات الـ SMS والشحن
"""
import os
import sys
import json
import logging
import requests
from flask import Flask, request, jsonify, send_from_directory, send_file
from dotenv import load_dotenv

# ضبط ترميز المخرجات لويندوز
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

load_dotenv()

import database
import telegram_bot

# تهيئة تطبيق Flask
app = Flask(__name__, static_folder='.', static_url_path='')
app.config['JSON_AS_ASCII'] = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(levelname)s] - %(message)s')
logger = logging.getLogger("AppServer")

HERO_SMS = "https://hero-sms.com/stubs/handler_api.php"

# ==========================================
# معالجة CORS
# ==========================================
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = '*'
    return response

# ==========================================
# حالة السيرفر الخلفي لبوت التيليجرام
# ==========================================
@app.route('/')
def index():
    return jsonify({
        "status": "online",
        "service": "Telegram Store Bot Backend",
        "author": "Ibrahim Store",
        "telegram_bot_active": bool(telegram_bot.get_bot_token())
    })

# ==========================================
# مسارات فحص السيرفر والصحة (Health Check)
# ==========================================
@app.route('/health')
@app.route('/ping')
@app.route('/api/health')
def health():
    return jsonify({
        "status": "ok",
        "service": "Digital Services E-Commerce Platform",
        "version": "2.5.0",
        "telegram_configured": bool(telegram_bot.get_bot_token())
    })

# ==========================================
# مسارات المتجر والطلبات (Orders API)
# ==========================================
@app.route('/api/orders/create', methods=['POST'])
def create_new_order():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"success": False, "error": "بيانات الطلب فارغة"}), 400

        target_id = (data.get('target_id') or data.get('playerId') or data.get('email') or '').strip()
        if not target_id:
            return jsonify({"success": False, "error": "يرجى تحديد معرف الحساب أو الآيدي أو الإيميل"}), 400

        order = database.create_order({
            'service_type': data.get('service_type') or data.get('category') or 'games',
            'service_title': data.get('service_title') or data.get('gameTitle') or 'خدمة رقمية',
            'package_id': data.get('package_id') or data.get('packageId') or '',
            'package_name': data.get('package_name') or data.get('packageName') or 'باقة مخصصة',
            'target_id': target_id,
            'customer_name': data.get('customer_name') or data.get('customerName') or 'زبون المتجر',
            'customer_phone': data.get('customer_phone') or data.get('customerPhone') or '',
            'price_usd': float(data.get('price_usd') or data.get('priceUsd') or 0.0),
            'price_local': float(data.get('price_local') or data.get('priceLocal') or 0.0),
            'currency': data.get('currency', 'ل.س'),
            'payment_method': data.get('payment_method') or data.get('paymentMethod') or 'syriatel_cash',
            'payment_ref': (data.get('payment_ref') or data.get('paymentRef') or '').strip(),
            'status': 'pending',
            'admin_notes': data.get('notes', '')
        })

        # إرسال إشعار فوري لمدير المتجر عبر التيليجرام
        try:
            telegram_bot.notify_admin_new_order(order)
        except Exception as te:
            logger.warning(f"Telegram notification error: {te}")

        return jsonify({
            "success": True,
            "message": "تم إنشاء طلبك بنجاح وسيبدأ التنفيذ فور التحقق من الدفع!",
            "order": order
        })
    except Exception as e:
        logger.error(f"Order creation failed: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/orders/track/<query>', methods=['GET'])
def track_order(query):
    query = query.strip()
    # إذا كان رقم طلب دقيق
    order = database.get_order_by_num(query)
    if order:
        return jsonify({"success": True, "orders": [order]})
    
    # البحث بالهاتف أو بالمعرف
    results = database.search_orders(query)
    if results:
        return jsonify({"success": True, "orders": results})
    
    return jsonify({"success": False, "error": f"لم يتم العثور على أي طلب يطابق: {query}"}), 404

# ==========================================
# مسارات لوحة تحكم الإدارة (Admin API)
# ==========================================
@app.route('/api/admin/orders', methods=['GET'])
def admin_orders():
    status = request.args.get('status')
    limit = int(request.args.get('limit', 100))
    orders = database.get_orders_list(status=status, limit=limit)
    return jsonify({"success": True, "orders": orders})

@app.route('/api/admin/orders/<order_num>/status', methods=['POST'])
def admin_update_order(order_num):
    data = request.get_json(force=True) or {}
    status = data.get('status')
    notes = data.get('notes')
    if not status:
        return jsonify({"success": False, "error": "حالة الطلب مطلوبة"}), 400
    
    updated = database.update_order_status(order_num, status, notes)
    if updated:
        return jsonify({"success": True, "order": updated})
    return jsonify({"success": False, "error": "الطلب غير موجود"}), 404

@app.route('/api/admin/stats', methods=['GET'])
def admin_stats():
    stats = database.get_stats()
    return jsonify({"success": True, "stats": stats})

# ==========================================
# مسارات الإعدادات العامة للمتجر (Settings API)
# ==========================================
@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    if request.method == 'POST':
        data = request.get_json(force=True) or {}
        for k, v in data.items():
            database.set_setting(k, v)
        return jsonify({"success": True, "message": "تم حفظ الإعدادات بنجاح"})
    else:
        return jsonify({"success": True, "settings": database.get_all_settings()})

# ==========================================
# مسار التيليجرام Webhook (Render / Cloud)
# ==========================================
@app.route('/api/telegram/webhook', methods=['POST'])
def telegram_webhook():
    update = request.get_json(force=True) or {}
    try:
        telegram_bot.handle_update(update)
    except Exception as e:
        logger.error(f"Error handling Telegram webhook update: {e}")
    return jsonify({"ok": True})

@app.route('/api/telegram/test', methods=['POST'])
def telegram_test():
    admin_id = telegram_bot.get_admin_chat_id()
    if not admin_id:
        return jsonify({"success": False, "error": "لم يتم ضبط معرف حساب المدير (TELEGRAM_ADMIN_CHAT_ID)"}), 400
    
    res = telegram_bot.send_telegram_api("sendMessage", {
        "chat_id": admin_id,
        "text": "🎉 *نجاح الاتصال بنظام المتجر!*\nبوت التيليجرام متصل وجاهز لاستقبال إشعارات الطلبات.",
        "parse_mode": "Markdown"
    })
    return jsonify(res)

# ==========================================
# مسارات البروكسي لأرقام SMS وتخطي مشاكل CORS
# ==========================================
@app.route('/api', methods=['GET'])
def proxy_sms_query():
    query_string = request.query_string.decode('utf-8')
    target_url = f"{HERO_SMS}?{query_string}"
    try:
        resp = requests.get(target_url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
        }, timeout=20)
        return resp.text, resp.status_code, {'Content-Type': 'text/plain; charset=utf-8'}
    except Exception as e:
        return f"ERROR: {str(e)}", 500, {'Content-Type': 'text/plain; charset=utf-8'}

# ==========================================
# مسارات تنفيذ شحن الألعاب وسيرفرات الجملة
# ==========================================
@app.route('/api/topup/execute', methods=['POST'])
def topup_execute():
    try:
        data = request.get_json(force=True) or {}
        provider_type = data.get('providerType', 'custom')
        api_url = data.get('apiUrl', '').strip()
        api_key = data.get('apiKey', '').strip()
        merchant_id = data.get('merchantId', '').strip()
        game = data.get('game', '')
        pkg_id = data.get('packageId', '')
        player_id = data.get('playerId', '')

        if not api_url:
            return jsonify({"success": False, "error": "لم يتم تحديد رابط الـ API في الإعدادات"}), 400

        headers = {
            "User-Agent": "DigitalHub/2.5",
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

        # حالة Telegram Webhook
        if provider_type == 'telegram' or 'api.telegram.org' in api_url:
            chat_id = merchant_id or data.get('chatId', '')
            msg = f"🎮 *طلب شحن ألعاب فوري*\nاللعبة: {game}\nالباقة: {pkg_id}\nمعرف اللاعب: `{player_id}`"
            resp = requests.post(api_url, json={"chat_id": chat_id, "text": msg, "parse_mode": "Markdown"}, timeout=20)
            return jsonify({"success": True, "message": "تم إرسال الطلب بنجاح للوكيل عبر التيليجرام", "providerResponse": resp.json() if resp.headers.get('content-type', '').startswith('application/json') else {"raw": resp.text}})

        resp = requests.post(api_url, json=payload, headers=headers, timeout=25)
        try:
            resp_json = resp.json()
        except Exception:
            resp_json = {"raw": resp.text}

        return jsonify({
            "success": True,
            "message": "تم تنفيذ الطلب بنجاح لدى سيرفر المزود",
            "providerResponse": resp_json,
            "transactionId": resp_json.get("order_id") or resp_json.get("transaction_id") or "TX-SUCCESS"
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"تعذر الاتصال بسيرفر الشحن: {str(e)}"}), 200

@app.route('/api/topup/balance', methods=['POST'])
def topup_balance():
    try:
        data = request.get_json(force=True) or {}
        bal_url = data.get('balanceUrl') or data.get('apiUrl')
        api_key = (data.get('apiKey') or '').strip()

        if not bal_url:
            return jsonify({"success": False, "error": "يرجى كتابة رابط الـ API أولاً"}), 400

        headers = {"User-Agent": "DigitalHub/2.5"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        resp = requests.get(bal_url, headers=headers, timeout=15)
        try:
            resp_json = resp.json()
            balance = resp_json.get('balance') or resp_json.get('credit') or resp_json.get('amount') or 0
        except Exception:
            balance = resp.text.strip()
        return jsonify({"success": True, "balance": balance})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 200

# ==========================================
# نقطة الدخول الرئيسية
# ==========================================
if __name__ == '__main__':
    import webbrowser
    port = int(os.environ.get('PORT', 8080))
    base_url = os.environ.get('BASE_URL', '')

    # بدء الـ Polling محلياً إذا كان التوكن متوفراً وبدون Webhook
    if telegram_bot.get_bot_token() and not base_url:
        telegram_bot.start_polling()

    print("=" * 65)
    print("🚀 Digital Services & E-Commerce Platform Server Running!")
    print(f"🌐 Local URL: http://localhost:{port}")
    print(f"📱 PWA Manifest: http://localhost:{port}/manifest.json")
    print(f"🤖 Telegram Bot Ready: {bool(telegram_bot.get_bot_token())}")
    print("=" * 65)

    if "--open" in sys.argv:
        webbrowser.open(f"http://localhost:{port}")

    app.run(host='0.0.0.0', port=port, debug=False)
