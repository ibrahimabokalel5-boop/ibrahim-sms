"""
Telegram Bot Integration for Digital Services E-Commerce Store
إدارة بوت التيليجرام: إشعارات الطلبات الفورية، أزرار القبول والرفض، والاستعلام للزبائن
"""
import requests
import json
import logging
import threading
import time
import os
import database

logger = logging.getLogger("TelegramBot")

def get_bot_token():
    # الأولوية للمتغيرات البيئية ثم لقاعدة البيانات
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        settings = database.get_all_settings()
        token = settings.get("telegram_bot_token", "").strip()
    return token

def get_admin_chat_id():
    chat_id = os.environ.get("TELEGRAM_ADMIN_CHAT_ID")
    if not chat_id:
        settings = database.get_all_settings()
        chat_id = settings.get("telegram_admin_chat_id", "").strip()
    return chat_id

def send_telegram_api(method, payload):
    """إرسال طلب إلى Telegram Bot API"""
    token = get_bot_token()
    if not token:
        return {"ok": False, "description": "No Telegram bot token configured"}
    
    url = f"https://api.telegram.org/bot{token}/{method}"
    try:
        resp = requests.post(url, json=payload, timeout=10)
        return resp.json()
    except Exception as e:
        logger.error(f"Telegram API request failed: {e}")
        return {"ok": False, "description": str(e)}

def notify_admin_new_order(order):
    """إرسال إشعار فوري لمدير المتجر عند وصول طلب جديد مع أزرار تفاعلية"""
    admin_id = get_admin_chat_id()
    if not admin_id:
        logger.warning("TELEGRAM_ADMIN_CHAT_ID is not configured, skipping alert.")
        return False

    payment_titles = {
        "syriatel_cash": "سيريتل كاش (Syriatel Cash)",
        "sham_cash": "شام كاش (Sham Cash)",
        "usdt": "USDT TRC-20",
        "bank": "حوالة مصرفية / مكتب",
        "store_cash": "دفع نقدي بالمحل"
    }
    pay_name = payment_titles.get(order.get('payment_method'), order.get('payment_method'))

    msg = (
        f"🛍️ *طلب شراء جديد في المتجر!*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"🆔 *رقم الطلب:* `{order.get('order_num')}`\n"
        f"🏷️ *الخدمة:* {order.get('service_title')}\n"
        f"📦 *الباقة:* {order.get('package_name')}\n"
        f"🎯 *الهدف / الآيدي:* `{order.get('target_id')}`\n"
        f"👤 *الزبون:* {order.get('customer_name') or 'غير محدد'}\n"
        f"📱 *هاتف الزبون:* `{order.get('customer_phone') or 'بدون هاتف'}`\n"
        f"💵 *السعر:* {order.get('price_usd')} $ ({order.get('price_local'):,.0f} {order.get('currency')})\n"
        f"💳 *طريقة الدفع:* {pay_name}\n"
        f"🧾 *رمز إشعار التحويل:* `{order.get('payment_ref') or 'بدون إشعار'}`\n"
        f"⏳ *الحالة:* 🟡 قيد المراجعة والانتظار\n"
        f"🕒 *التاريخ:* {order.get('created_at')}\n"
        f"━━━━━━━━━━━━━━━━━━"
    )

    # أزرار تفاعلية للإدارة
    reply_markup = {
        "inline_keyboard": [
            [
                {"text": "✅ قبول وإكمال", "callback_data": f"approve_{order.get('order_num')}"},
                {"text": "❌ رفض الطلب", "callback_data": f"reject_{order.get('order_num')}"}
            ],
            [
                {"text": "🔄 جاري المعالجة", "callback_data": f"process_{order.get('order_num')}"}
            ]
        ]
    }

    payload = {
        "chat_id": admin_id,
        "text": msg,
        "parse_mode": "Markdown",
        "reply_markup": reply_markup
    }
    return send_telegram_api("sendMessage", payload)

def handle_update(update):
    """معالجة الرسائل والأزرار القادمة من التيليجرام"""
    token = get_bot_token()
    if not token:
        return

    # 1. معالجة الضغط على الأزرار التفاعلية (Callback Queries)
    if "callback_query" in update:
        cq = update["callback_query"]
        cq_id = cq.get("id")
        data = cq.get("data", "")
        message = cq.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        message_id = message.get("message_id")

        if data.startswith("approve_"):
            order_num = data.replace("approve_", "")
            database.update_order_status(order_num, "completed", "تم القبول والتنفيذ عبر التيليجرام")
            send_telegram_api("answerCallbackQuery", {"callback_query_id": cq_id, "text": "✅ تم إكمال الطلب بنجاح!"})
            # تحديث نص الرسالة
            new_text = message.get("text", "") + "\n\n🟢 *تم القبول والتنفيذ بنجاح بواسطة المدير.*"
            send_telegram_api("editMessageText", {"chat_id": chat_id, "message_id": message_id, "text": new_text, "parse_mode": "Markdown"})

        elif data.startswith("reject_"):
            order_num = data.replace("reject_", "")
            database.update_order_status(order_num, "rejected", "تم الرفض بواسطة المدير")
            send_telegram_api("answerCallbackQuery", {"callback_query_id": cq_id, "text": "❌ تم رفض الطلب."})
            new_text = message.get("text", "") + "\n\n🔴 *تم رفض هذا الطلب.*"
            send_telegram_api("editMessageText", {"chat_id": chat_id, "message_id": message_id, "text": new_text, "parse_mode": "Markdown"})

        elif data.startswith("process_"):
            order_num = data.replace("process_", "")
            database.update_order_status(order_num, "processing", "جاري الشحن الآن")
            send_telegram_api("answerCallbackQuery", {"callback_query_id": cq_id, "text": "🔄 حالة الطلب الآن: جاري الشحن."})
            new_text = message.get("text", "") + "\n\n🔵 *حالة الطلب: جاري الشحن والمعالجة الآن...*"
            send_telegram_api("editMessageText", {"chat_id": chat_id, "message_id": message_id, "text": new_text, "parse_mode": "Markdown"})
        return

    # 2. معالجة الرسائل النصية والأوامر
    if "message" in update:
        msg = update["message"]
        chat_id = msg.get("chat", {}).get("id")
        text = (msg.get("text") or "").strip()

        if text.startswith("/start"):
            base_url = os.environ.get("BASE_URL", "")
            store_btn = []
            if base_url:
                store_btn = [[{"text": "🛒 فتح المتجر والتطبيق", "web_app": {"url": base_url}}]]

            welcome_msg = (
                "👋 *أهلاً بك في منصة الخدمات الرقمية والمتجر الإلكتروني!*\n\n"
                "⚡ يمكنك شحن ألعابك (PUBG, Free Fire, Roblox)، شراء اشتراكات وبطاقات، والحصول على أرقام تفعيل بأسعار منافسة.\n\n"
                "📌 *الأوامر المتاحة:*\n"
                "🔍 `/track <رقم_الطلب>` - تتبع حالة أي طلب لك.\n"
                "📊 `/stats` - إحصائيات المتجر (خاص بالمدير).\n"
                "❓ `/help` - المساعدة والدعم الفني."
            )
            payload = {
                "chat_id": chat_id,
                "text": welcome_msg,
                "parse_mode": "Markdown"
            }
            if store_btn:
                payload["reply_markup"] = {"inline_keyboard": store_btn}
            send_telegram_api("sendMessage", payload)

        elif text.startswith("/track"):
            parts = text.split(maxsplit=1)
            if len(parts) < 2:
                send_telegram_api("sendMessage", {
                    "chat_id": chat_id,
                    "text": "⚠️ يرجى كتابة رقم الطلب بعد الأمر. مثال:\n`/track ORD-2409-0001`",
                    "parse_mode": "Markdown"
                })
                return
            order_num = parts[1].strip()
            order = database.get_order_by_num(order_num)
            if not order:
                send_telegram_api("sendMessage", {
                    "chat_id": chat_id,
                    "text": f"❌ لم يتم العثور على طلب بالرقم `{order_num}`. تأكد من صحة الرقم.",
                    "parse_mode": "Markdown"
                })
                return

            status_map = {
                "pending": "🟡 قيد المراجعة والتأكيد",
                "processing": "🔵 جاري الشحن والتنفيذ",
                "completed": "🟢 تم التنفيذ بنجاح ✓",
                "rejected": "🔴 ملغي / مرفوض"
            }
            status_desc = status_map.get(order.get('status'), order.get('status'))

            status_msg = (
                f"📦 *تفاصيل طلبك #{order.get('order_num')}*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🏷️ الخدمة: *{order.get('service_title')}*\n"
                f"📦 الباقة: *{order.get('package_name')}*\n"
                f"🎯 الحساب/الآيدي: `{order.get('target_id')}`\n"
                f"💰 المبلغ: {order.get('price_usd')} $ ({order.get('price_local'):,.0f} {order.get('currency')})\n"
                f"📊 الحالة الحالية: *{status_desc}*\n"
                f"🕒 تاريخ الطلب: {order.get('created_at')}\n"
            )
            if order.get('admin_notes'):
                status_msg += f"📝 ملاحظات: {order.get('admin_notes')}\n"
            status_msg += "━━━━━━━━━━━━━━━━━━"

            send_telegram_api("sendMessage", {
                "chat_id": chat_id,
                "text": status_msg,
                "parse_mode": "Markdown"
            })

        elif text.startswith("/stats"):
            stats = database.get_stats()
            stats_msg = (
                f"📊 *إحصائيات متجر الخدمات الرقمية*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🛍️ إجمالي الطلبات: *{stats['total_orders']}*\n"
                f"🟢 الطلبات المكتملة: *{stats['completed_orders']}*\n"
                f"🟡 الطلبات المعلقة: *{stats['pending_orders']}*\n"
                f"💵 إجمالي المبيعات (USD): *{stats['total_sales_usd']:,.2f} $* \n"
                f"💰 إجمالي المبيعات (المحلي): *{stats['total_sales_local']:,.0f} ل.س*\n"
                f"━━━━━━━━━━━━━━━━━━"
            )
            send_telegram_api("sendMessage", {"chat_id": chat_id, "text": stats_msg, "parse_mode": "Markdown"})

# خيط عمل دائم للـ Polling المحلي عند تشغيل البوت بدون Webhook
_polling_active = False

def start_polling():
    global _polling_active
    if _polling_active:
        return
    _polling_active = True

    def poll_worker():
        offset = 0
        while _polling_active:
            token = get_bot_token()
            if not token:
                time.sleep(5)
                continue

            try:
                url = f"https://api.telegram.org/bot{token}/getUpdates?offset={offset}&timeout=20"
                resp = requests.get(url, timeout=25)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("ok"):
                        for upd in data.get("result", []):
                            offset = upd["update_id"] + 1
                            try:
                                handle_update(upd)
                            except Exception as e:
                                logger.error(f"Error processing update {upd.get('update_id')}: {e}")
            except Exception:
                time.sleep(3)
            time.sleep(1)

    t = threading.Thread(target=poll_worker, daemon=True)
    t.start()
    logger.info("Telegram Polling Thread started.")
