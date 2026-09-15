"""
Hero-SMS Personal Bot - أداة أرقام التفعيل الفورية الخاصة بك
بوت شخصي مباشر مربوط 100% مع Hero-SMS API بدون أي تعقيدات أو طلبات يدوية:
- شراء الرقم فورياً بضغطة زر واحدة وخصمه من رصيدك في Hero-SMS.
- استلام كود التفعيل SMS في الشات تلقائياً.
- فحص الرصيد الحقيقي وإلغاء واسترداد الرقم بنقرة واحدة.
- مخصص لحسابك فقط بأمان كامل.
"""
import os
import sys
import time
import json
import logging
import threading
import requests
from datetime import datetime

# إعداد السجلات
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO
)
logger = logging.getLogger("HeroSMSBot")

# تحميل متغيرات .env إن وُجدت
def load_env_file():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(env_path):
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        os.environ.setdefault(k.strip(), v.strip())
        except Exception as e:
            logger.warning(f"Error loading .env file: {e}")

load_env_file()

# إعدادات البروكسي الخاصة بـ PythonAnywhere
if os.path.exists('/var/www') or 'PYTHONANYWHERE_DOMAIN' in os.environ:
    os.environ.setdefault('http_proxy', 'http://proxy.server:3128')
    os.environ.setdefault('https_proxy', 'http://proxy.server:3128')

def get_requests_proxies():
    if os.path.exists('/var/www') or 'PYTHONANYWHERE_DOMAIN' in os.environ:
        return {
            'http': 'http://proxy.server:3128',
            'https': 'http://proxy.server:3128'
        }
    return None

# =========================================================================
#   بيانات التطبيقات والدول لـ Hero-SMS
# =========================================================================

SERVICES_DATA = {
    'wa': {'name': 'واتساب (WhatsApp)', 'icon': '💬', 'code': 'wa'},
    'tg': {'name': 'تيليجرام (Telegram)', 'icon': '✈️', 'code': 'tg'},
    'lf': {'name': 'تيك توك (TikTok)', 'icon': '🎵', 'code': 'lf'},
    'go': {'name': 'جوجل ويوتيوب (Google)', 'icon': '🔍', 'code': 'go'},
    'fb': {'name': 'فيسبوك (Facebook)', 'icon': '📘', 'code': 'fb'},
    'ig': {'name': 'إنستغرام (Instagram)', 'icon': '📷', 'code': 'ig'},
    'fu': {'name': 'سناب شات (Snapchat)', 'icon': '👻', 'code': 'fu'},
    'tw': {'name': 'تويتر / إكس (Twitter)', 'icon': '🐦', 'code': 'tw'},
    'ds': {'name': 'ديسكورد (Discord)', 'icon': '👾', 'code': 'ds'},
    'vi': {'name': 'فايبر (Viber)', 'icon': '📞', 'code': 'vi'},
    'nf': {'name': 'نتفليكس (Netflix)', 'icon': '🍿', 'code': 'nf'},
    'ot': {'name': 'أي تطبيق آخر (Any Other)', 'icon': '🌐', 'code': 'ot'}
}

COUNTRIES_DATA = [
    {'id': '4', 'name': '🇵🇭 الفلبين', 'cost': 0.05, 'aliases': ['فلبين', 'philippines']},
    {'id': '6', 'name': '🇮🇩 إندونيسيا', 'cost': 0.08, 'aliases': ['اندونيسيا', 'indonesia']},
    {'id': '0', 'name': '🇷🇺 روسيا', 'cost': 0.35, 'aliases': ['روسيا', 'russia']},
    {'id': '1', 'name': '🇺🇦 أوكرانيا', 'cost': 0.40, 'aliases': ['اوكرانيا', 'ukraine']},
    {'id': '2', 'name': '🇰🇿 كازاخستان', 'cost': 0.35, 'aliases': ['كازاخستان', 'kazakhstan']},
    {'id': '37', 'name': '🇲🇦 المغرب', 'cost': 0.15, 'aliases': ['المغرب', 'morocco']},
    {'id': '21', 'name': '🇪🇬 مصر', 'cost': 0.20, 'aliases': ['مصر', 'egypt']},
    {'id': '62', 'name': '🇹🇷 تركيا', 'cost': 0.80, 'aliases': ['تركيا', 'turkey']},
    {'id': '16', 'name': '🇬🇧 بريطانيا', 'cost': 0.70, 'aliases': ['بريطانيا', 'انكلترا', 'uk']},
    {'id': '187', 'name': '🇺🇸 أمريكا', 'cost': 0.85, 'aliases': ['امريكا', 'usa']},
    {'id': '73', 'name': '🇧🇷 البرازيل', 'cost': 0.45, 'aliases': ['البرازيل', 'brazil']},
    {'id': '22', 'name': '🇮🇳 الهند', 'cost': 0.12, 'aliases': ['الهند', 'india']},
    {'id': '10', 'name': '🇻🇳 فيتنام', 'cost': 0.15, 'aliases': ['فيتنام', 'vietnam']},
    {'id': '19', 'name': '🇳🇬 نيجيريا', 'cost': 0.10, 'aliases': ['نيجيريا', 'nigeria']},
    {'id': '58', 'name': '🇩🇿 الجزائر', 'cost': 0.30, 'aliases': ['الجزائر', 'algeria']},
    {'id': '47', 'name': '🇮🇶 العراق', 'cost': 0.45, 'aliases': ['العراق', 'iraq']},
    {'id': '116', 'name': '🇯🇴 الأردن', 'cost': 0.45, 'aliases': ['الاردن', 'jordan']},
    {'id': '30', 'name': '🇾🇪 اليمن', 'cost': 0.50, 'aliases': ['اليمن', 'yemen']},
    {'id': '53', 'name': '🇸🇦 السعودية', 'cost': 0.90, 'aliases': ['السعودية', 'saudi']},
    {'id': '95', 'name': '🇦🇪 الإمارات', 'cost': 0.90, 'aliases': ['الامارات', 'uae']},
    {'id': '43', 'name': '🇩🇪 ألمانيا', 'cost': 0.85, 'aliases': ['المانيا', 'germany']},
    {'id': '78', 'name': '🇫🇷 فرنسا', 'cost': 0.85, 'aliases': ['فرنسا', 'france']},
    {'id': '48', 'name': '🇳🇱 هولندا', 'cost': 0.80, 'aliases': ['هولندا', 'netherlands']},
    {'id': '36', 'name': '🇨🇦 كندا', 'cost': 0.85, 'aliases': ['كندا', 'canada']},
    {'id': '15', 'name': '🇵🇱 بولندا', 'cost': 0.50, 'aliases': ['بولندا', 'poland']},
    {'id': '86', 'name': '🇮🇹 إيطاليا', 'cost': 0.85, 'aliases': ['ايطاليا', 'italy']},
    {'id': '56', 'name': '🇪🇸 إسبانيا', 'cost': 0.80, 'aliases': ['اسبانيا', 'spain']},
    {'id': '32', 'name': '🇷🇴 رومانيا', 'cost': 0.40, 'aliases': ['رومانيا', 'romania']},
    {'id': '33', 'name': '🇨🇴 كولومبيا', 'cost': 0.35, 'aliases': ['كولومبيا', 'colombia']},
    {'id': '31', 'name': '🇿🇦 جنوب أفريقيا', 'cost': 0.30, 'aliases': ['جنوب افريقيا']},
    {'id': '114', 'name': '🇱🇰 سريلانكا', 'cost': 0.25, 'aliases': ['سريلانكا']},
    {'id': '40', 'name': '🇺🇿 أوزبكستان', 'cost': 0.35, 'aliases': ['اوزبكستان']},
    {'id': '11', 'name': '🇰🇬 قيرغيزستان', 'cost': 0.35, 'aliases': ['قيرغيزستان']},
    {'id': '7', 'name': '🇲🇾 ماليزيا', 'cost': 0.30, 'aliases': ['ماليزيا']},
    {'id': '8', 'name': '🇰🇪 كينيا', 'cost': 0.20, 'aliases': ['كينيا']},
    {'id': '35', 'name': '🇦🇿 أذربيجان', 'cost': 0.35, 'aliases': ['اذربيجان']},
    {'id': '34', 'name': '🇪🇪 إستونيا', 'cost': 0.60, 'aliases': ['استونيا']},
    {'id': '3', 'name': '🇨🇳 الصين', 'cost': 0.45, 'aliases': ['الصين', 'china']},
    {'id': '14', 'name': '🇭🇰 هونغ كونغ', 'cost': 0.50, 'aliases': ['هونغ كونغ']}
]

# =========================================================================
#   Hero-SMS API المحرك المباشر
# =========================================================================

HERO_SMS_URL = "https://hero-sms.com/stubs/handler_api.php"

def get_hero_key():
    return os.environ.get("HERO_SMS_KEY", "f144cA86391f362758c129f14dc33fc9").strip()

def hero_api_call(params):
    p = {"api_key": get_hero_key(), **params}
    proxies = get_requests_proxies()
    try:
        resp = requests.get(HERO_SMS_URL, params=p, timeout=15, proxies=proxies)
        return resp.text.strip()
    except Exception as e:
        logger.error(f"Hero-SMS API Error: {e}")
        return f"ERROR:{e}"

def hero_get_balance():
    res = hero_api_call({"action": "getBalance"})
    if res.startswith("ACCESS_BALANCE:"):
        val = res.split(":", 1)[1]
        try:
            return f"{float(val):.2f} $"
        except Exception:
            return f"{val} $"
    return "0.00 $"

_prices_cache = {}
_prices_cache_time = {}

def hero_get_prices(service):
    global _prices_cache, _prices_cache_time
    now = time.time()
    if service in _prices_cache and (now - _prices_cache_time.get(service, 0) < 60):
        return _prices_cache[service]
    
    proxies = get_requests_proxies()
    try:
        url = f"{HERO_SMS_URL}?api_key={get_hero_key()}&action=getPrices&service={service}"
        resp = requests.get(url, timeout=10, proxies=proxies)
        if resp.status_code == 200:
            data = resp.json()
            _prices_cache[service] = data
            _prices_cache_time[service] = now
            return data
    except Exception:
        pass
    return _prices_cache.get(service, {})

def hero_buy_number(service, country):
    """شراء رقم فوري ومباشر من Hero-SMS"""
    res = hero_api_call({"action": "getNumber", "service": service, "country": country})
    if res.startswith("ACCESS_NUMBER:"):
        parts = res.split(":")
        return {"success": True, "id": parts[1], "number": parts[2]}
    elif res == "NO_NUMBERS":
        return {"success": False, "error": "لا توجد أرقام متوفرة حالياً لهذه الدولة"}
    elif res == "NO_BALANCE":
        return {"success": False, "error": "رصيدك في Hero-SMS غير كافٍ لشراء هذا الرقم"}
    return {"success": False, "error": res}

def hero_check_code(act_id):
    """فحص كود التفعيل للرقم"""
    res = hero_api_call({"action": "getStatus", "id": act_id})
    if res.startswith("STATUS_OK:"):
        code = res.split(":", 1)[1]
        return {"status": "ok", "code": code}
    elif res == "STATUS_WAIT_CODE":
        return {"status": "waiting"}
    elif res == "STATUS_CANCEL":
        return {"status": "cancelled"}
    return {"status": "unknown", "raw": res}

def hero_cancel_number(act_id):
    """إلغاء الرقم واسترداد الرصيد إلى حساب Hero-SMS"""
    res = hero_api_call({"action": "setStatus", "id": act_id, "status": "8"})
    return res

# =========================================================================
#   Telegram API Client
# =========================================================================

def get_bot_token():
    return os.environ.get("TELEGRAM_BOT_TOKEN", "8742602166:AAHKetli1l6ny4DfyqmsDfPPnvGtQM45GkI").strip()

def get_admin_chat_id():
    return os.environ.get("TELEGRAM_ADMIN_CHAT_ID", "6067874888").strip()

def is_authorized(chat_id):
    admin_id = get_admin_chat_id()
    if not admin_id:
        return True
    return str(chat_id) == str(admin_id)

def send_telegram_api(method, payload):
    token = get_bot_token()
    url = f"https://api.telegram.org/bot{token}/{method}"
    proxies = get_requests_proxies()
    try:
        resp = requests.post(url, json=payload, timeout=12, proxies=proxies)
        return resp.json()
    except Exception as e:
        logger.error(f"Telegram API request failed: {e}")
        return {"ok": False, "description": str(e)}

def send_msg(chat_id, text, reply_markup=None, parse_mode="Markdown"):
    p = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
    if reply_markup:
        p["reply_markup"] = reply_markup
    return send_telegram_api("sendMessage", p)

def edit_msg(chat_id, message_id, text, reply_markup=None, parse_mode="Markdown"):
    p = {"chat_id": chat_id, "message_id": message_id, "text": text, "parse_mode": parse_mode}
    if reply_markup:
        p["reply_markup"] = reply_markup
    return send_telegram_api("editMessageText", p)

def answer_cq(cq_id, text=None, show_alert=False):
    p = {"callback_query_id": cq_id}
    if text:
        p["text"] = text
    if show_alert:
        p["show_alert"] = True
    return send_telegram_api("answerCallbackQuery", p)

# =========================================================================
#   بناء واجهات القوائم
# =========================================================================

# ذاكرة للجلسات السريعة
_user_sessions = {}

def build_main_menu_keyboard():
    kb = []
    srv_list = list(SERVICES_DATA.values())
    for i in range(0, len(srv_list), 2):
        row = []
        row.append({"text": f"{srv_list[i]['icon']} {srv_list[i]['name']}", "callback_data": f"svc_{srv_list[i]['code']}"})
        if i + 1 < len(srv_list):
            row.append({"text": f"{srv_list[i+1]['icon']} {srv_list[i+1]['name']}", "callback_data": f"svc_{srv_list[i+1]['code']}"})
        kb.append(row)
    
    kb.append([
        {"text": "💰 تحديث الرصيد", "callback_data": "menu_refresh_balance"}
    ])
    return {"inline_keyboard": kb}

def build_countries_keyboard(service_code, page=0):
    prices = hero_get_prices(service_code)
    per_page = 8
    total_countries = len(COUNTRIES_DATA)
    total_pages = max(1, (total_countries + per_page - 1) // per_page)
    page = max(0, min(page, total_pages - 1))
    
    start_idx = page * per_page
    end_idx = min(start_idx + per_page, total_countries)
    page_countries = COUNTRIES_DATA[start_idx:end_idx]
    
    kb = [
        [
            {"text": "⚡ الأرخص والأوفر فوراً", "callback_data": f"buy_cheapest_{service_code}"},
            {"text": "🔍 بحث عن دولة", "callback_data": f"search_country_{service_code}"}
        ]
    ]
    
    for i in range(0, len(page_countries), 2):
        row = []
        c1 = page_countries[i]
        live1 = prices.get(c1['id'], {}).get(service_code, {}).get('cost')
        cost1 = float(live1) if live1 else c1['cost']
        row.append({"text": f"{c1['name']} ⇦ {cost1:.2f}$", "callback_data": f"buy_now_{service_code}_{c1['id']}"})
        
        if i + 1 < len(page_countries):
            c2 = page_countries[i+1]
            live2 = prices.get(c2['id'], {}).get(service_code, {}).get('cost')
            cost2 = float(live2) if live2 else c2['cost']
            row.append({"text": f"{c2['name']} ⇦ {cost2:.2f}$", "callback_data": f"buy_now_{service_code}_{c2['id']}"})
        kb.append(row)
        
    nav_row = []
    if page > 0:
        nav_row.append({"text": "⬅️ السابق", "callback_data": f"cpage_{service_code}_{page-1}"})
    nav_row.append({"text": f"📄 {page+1} / {total_pages}", "callback_data": "cpage_noop"})
    if page < total_pages - 1:
        nav_row.append({"text": "التالي ➡️", "callback_data": f"cpage_{service_code}_{page+1}"})
    kb.append(nav_row)
    
    kb.append([{"text": "🔙 العودة لاختيار التطبيق", "callback_data": "menu_main"}])
    return {"inline_keyboard": kb}, total_pages

# فحص تلقائي للكود في خيط خلفي
def auto_check_code_worker(chat_id, act_id, phone_num, srv_name):
    # فحص الكود لمدة دقيقتين كل ثانيتين
    for _ in range(40):
        time.sleep(3)
        res = hero_check_code(act_id)
        if res.get('status') == "ok":
            code = res['code']
            text = (
                f"🎉 *وصل كود التفعيل بنجاح!* 🎉\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📱 *الرقم:* `+{phone_num}`\n"
                f"🏷️ *التطبيق:* {srv_name}\n"
                f"🔢 *كود التفعيل (Code):* `{code}`\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"💡 اضغط على الكود لنسخه مباشرة ولصقه في التطبيق."
            )
            send_msg(chat_id, text, {"inline_keyboard": [
                [{"text": "📱 شراء رقم جديد", "callback_data": "menu_main"}]
            ]})
            return
        elif res.get('status') == "cancelled":
            return

# =========================================================================
#   معالجة أحداث الأزرار (Callback Query)
# =========================================================================

def handle_callback_query(cq):
    cq_id = cq.get("id")
    data = cq.get("data", "")
    message = cq.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    message_id = message.get("message_id")

    # التحقق من أن المستخدم هو صاحب البوت فقط
    if not is_authorized(chat_id):
        answer_cq(cq_id, "⛔ هذا البوت خاص بصاحب الحساب فقط.", show_alert=True)
        return

    # 1. القائمة الرئيسية
    if data == "menu_main":
        _user_sessions.pop(chat_id, None)
        bal = hero_get_balance()
        welcome = (
            f"⚡ *أداة تفعيل أرقام Hero-SMS الفورية*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"💰 *رصيدك الحالي في الموقع:* `{bal}`\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"👇 *اختر التطبيق المطلوب لشراء رقمه فوراً:*"
        )
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, welcome, build_main_menu_keyboard())
        return

    # 2. تحديث الرصيد
    if data == "menu_refresh_balance":
        bal = hero_get_balance()
        answer_cq(cq_id, f"💰 رصيدك في Hero-SMS: {bal}", show_alert=True)
        welcome = (
            f"⚡ *أداة تفعيل أرقام Hero-SMS الفورية*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"💰 *رصيدك الحالي في الموقع:* `{bal}`\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"👇 *اختر التطبيق المطلوب لشراء رقمه فوراً:*"
        )
        edit_msg(chat_id, message_id, welcome, build_main_menu_keyboard())
        return

    # 3. اختيار التطبيق وعرض الدول
    if data.startswith("svc_"):
        code = data.replace("svc_", "")
        srv = SERVICES_DATA.get(code)
        if not srv:
            answer_cq(cq_id, "خدمة غير متوفرة")
            return
        
        kb, total_pages = build_countries_keyboard(code, 0)
        text = f"{srv['icon']} *تفعيل {srv['name']}*\n\nاختر الدولة المطلوبة للشراء المباشر (صفحة 1 من {total_pages}):"
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, kb)
        return

    # 4. تقليب صفحات الدول
    if data.startswith("cpage_"):
        if data == "cpage_noop":
            answer_cq(cq_id)
            return
        parts = data.split("_")
        code = parts[1]
        page = int(parts[2])
        srv = SERVICES_DATA.get(code)
        kb, total_pages = build_countries_keyboard(code, page)
        text = f"{srv['icon']} *تفعيل {srv['name']}*\n\nاختر الدولة المطلوبة للشراء المباشر (صفحة {page+1} من {total_pages}):"
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, kb)
        return

    # 5. شراء الرقم فوراً بنقرة واحدة (Buy Now Direct API)
    if data.startswith("buy_now_"):
        parts = data.split("_")
        code = parts[2]
        c_id = parts[3]
        srv = SERVICES_DATA.get(code)
        country = next((c for c in COUNTRIES_DATA if c['id'] == c_id), None)
        c_name = country['name'] if country else f"دولة #{c_id}"

        answer_cq(cq_id, "⏳ جارٍ شراء الرقم مباشرة من Hero-SMS...")
        
        # استدعاء API الشراء المباشر
        res = hero_buy_number(code, c_id)
        if res.get('success'):
            act_id = res['id']
            phone_num = res['number']
            bal = hero_get_balance()

            kb_active = {
                "inline_keyboard": [
                    [{"text": "🔄 فحص الكود الآن", "callback_data": f"check_code_{act_id}_{phone_num}_{code}"}],
                    [{"text": "❌ إلغاء واسترداد الرصيد", "callback_data": f"cancel_num_{act_id}"}],
                    [{"text": "📱 شراء رقم آخر", "callback_data": "menu_main"}]
                ]
            }
            msg = (
                f"🎉 *تم شراء الرقم بنجاح!* 🎉\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📱 *رقم الهاتف:* `+{phone_num}`\n"
                f"🏷️ *التطبيق:* {srv['name']}\n"
                f"🌍 *الدولة:* {c_name}\n"
                f"💰 *الرصيد المتبقي:* `{bal}`\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"💡 *الخطوات:*\n"
                f"1. اضغط على الرقم بالأعلى لنسخه فوراً.\n"
                f"2. الصقه في التطبيق واطلب كود SMS.\n"
                f"3. سيصلك الكود هنا تلقائياً خلال ثوانٍ، أو اضغط على زر *«فحص الكود الآن»*!"
            )
            edit_msg(chat_id, message_id, msg, kb_active)

            # تشغيل خيط فحص الكود التلقائي
            t = threading.Thread(target=auto_check_code_worker, args=(chat_id, act_id, phone_num, srv['name']), daemon=True)
            t.start()
        else:
            err_msg = res.get('error', 'فشل شراء الرقم')
            answer_cq(cq_id, f"⚠️ {err_msg}", show_alert=True)
        return

    # 6. شراء الأرخص فوراً
    if data.startswith("buy_cheapest_"):
        code = data.replace("buy_cheapest_", "")
        srv = SERVICES_DATA.get(code)
        prices = hero_get_prices(code)

        best_cid = '4' # الفلبين افتراضياً
        min_cost = 9999.0
        for c in COUNTRIES_DATA:
            cid = c['id']
            p_info = prices.get(cid, {}).get(code, {})
            c_cost = float(p_info.get('cost', c['cost']))
            c_count = int(p_info.get('count', 100))
            if c_count > 10 and c_cost < min_cost:
                min_cost = c_cost
                best_cid = cid

        answer_cq(cq_id, "⏳ جارٍ شراء أرخص رقم متوفر...")
        res = hero_buy_number(code, best_cid)
        if res.get('success'):
            act_id = res['id']
            phone_num = res['number']
            country = next((c for c in COUNTRIES_DATA if c['id'] == best_cid), None)
            c_name = country['name'] if country else f"دولة #{best_cid}"
            bal = hero_get_balance()

            kb_active = {
                "inline_keyboard": [
                    [{"text": "🔄 فحص الكود الآن", "callback_data": f"check_code_{act_id}_{phone_num}_{code}"}],
                    [{"text": "❌ إلغاء واسترداد الرصيد", "callback_data": f"cancel_num_{act_id}"}],
                    [{"text": "📱 شراء رقم آخر", "callback_data": "menu_main"}]
                ]
            }
            msg = (
                f"⚡ *تم شراء الأوفر بنجاح ({min_cost:.2f}$)!* 🎉\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📱 *رقم الهاتف:* `+{phone_num}`\n"
                f"🏷️ *التطبيق:* {srv['name']}\n"
                f"🌍 *الدولة:* {c_name}\n"
                f"💰 *الرصيد المتبقي:* `{bal}`\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"💡 اضغط على الرقم لنسخه، واطلب الكود في التطبيق وسيصلك هنا تلقائياً!"
            )
            edit_msg(chat_id, message_id, msg, kb_active)
            t = threading.Thread(target=auto_check_code_worker, args=(chat_id, act_id, phone_num, srv['name']), daemon=True)
            t.start()
        else:
            answer_cq(cq_id, f"⚠️ {res.get('error')}", show_alert=True)
        return

    # 7. فحص كود التفعيل
    if data.startswith("check_code_"):
        parts = data.split("_")
        act_id = parts[2]
        phone_num = parts[3]
        code = parts[4]
        srv = SERVICES_DATA.get(code, {'name': 'التطبيق'})

        chk = hero_check_code(act_id)
        if chk.get('status') == "ok":
            code_val = chk['code']
            answer_cq(cq_id, f"🎉 وصل الكود: {code_val}", show_alert=True)
            text = (
                f"🎉 *تم استلام كود التفعيل بنجاح!* 🎉\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"📱 *الرقم:* `+{phone_num}`\n"
                f"🏷️ *التطبيق:* {srv['name']}\n"
                f"🔢 *كود التفعيل (Code):* `{code_val}`\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"💡 اضغط على الكود بالأعلى لنسخه فوراً."
            )
            edit_msg(chat_id, message_id, text, {"inline_keyboard": [
                [{"text": "📱 شراء رقم جديد", "callback_data": "menu_main"}]
            ]})
        elif chk.get('status') == "waiting":
            answer_cq(cq_id, "⏳ لم يصل الكود بعد. تأكد من طلب الإرسال في التطبيق ثم أعد الفحص.", show_alert=True)
        elif chk.get('status') == "cancelled":
            answer_cq(cq_id, "هذا الرقم ملغي.", show_alert=True)
            edit_msg(chat_id, message_id, "❌ *تم إلغاء هذا الرقم.*", {"inline_keyboard": [
                [{"text": "🔙 القائمة الرئيسية", "callback_data": "menu_main"}]
            ]})
        else:
            answer_cq(cq_id, f"الحالة: {chk.get('raw')}", show_alert=True)
        return

    # 8. إلغاء الرقم واسترداد الرصيد
    if data.startswith("cancel_num_"):
        act_id = data.replace("cancel_num_", "")
        hero_cancel_number(act_id)
        bal = hero_get_balance()
        answer_cq(cq_id, f"✅ تم إلغاء الرقم واسترداد رصيدك! الرصيد: {bal}", show_alert=True)
        edit_msg(chat_id, message_id, f"❌ *تم إلغاء الرقم واسترداد قيمته إلى حسابك بنجاح!*\n💰 *الرصيد الحالي:* `{bal}`", {"inline_keyboard": [
            [{"text": "📱 شراء رقم جديد", "callback_data": "menu_main"}]
        ]})
        return

    # 9. البحث عن دولة
    if data.startswith("search_country_"):
        code = data.replace("search_country_", "")
        srv = SERVICES_DATA.get(code)
        _user_sessions[chat_id] = {"action": "search_country", "code": code}
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, f"🔍 *بحث عن دولة لتفعيل {srv['name']}:*\n\nاكتب اسم الدولة في رسالة (مثال: `مصر`، `المغرب`، `المانيا`، `كندا`...):", {"inline_keyboard": [
            [{"text": "🔙 إلغاء والعودة", "callback_data": f"svc_{code}"}]
        ]})
        return

# =========================================================================
#   معالجة الرسائل النصية
# =========================================================================

def handle_message(msg):
    chat_id = msg.get("chat", {}).get("id")
    text = (msg.get("text") or "").strip()

    # حماية البوت: للمدير فقط
    if not is_authorized(chat_id):
        send_msg(chat_id, "⛔ هذا البوت شخصي وخاص بصاحبه فقط.")
        return

    if text.startswith("/start") or text == "القائمة الرئيسية":
        _user_sessions.pop(chat_id, None)
        bal = hero_get_balance()
        welcome = (
            f"👋 *أهلاً بك يا بطل في أداتك الخاصة لـ Hero-SMS!* ⚡\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"💰 *رصيدك الحقيقي في الموقع:* `{bal}`\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"👇 *اختر التطبيق الذي ترغب بشراء رقمه فورياً وبنقرة واحدة:*"
        )
        send_msg(chat_id, welcome, build_main_menu_keyboard())
        return

    if text.startswith("/balance") or text.startswith("/رصيد"):
        bal = hero_get_balance()
        send_msg(chat_id, f"💰 *رصيدك الحالي في Hero-SMS:* `{bal}`")
        return

    # فحص جلسة البحث عن دولة
    sess = _user_sessions.get(chat_id)
    if sess and sess.get("action") == "search_country":
        code = sess.get("code")
        srv = SERVICES_DATA.get(code)
        q = text.lower()
        
        matches = []
        for c in COUNTRIES_DATA:
            aliases = c.get('aliases', [])
            c_name = c['name'].lower()
            if q in c_name or any(q in a.lower() for a in aliases):
                matches.append(c)

        if not matches:
            send_msg(chat_id, f"❌ لم نجد دولة باسم `{text}`.\nيرجى تجربة اسم آخر أو الاختيار من القائمة:", {"inline_keyboard": [
                [{"text": "🔙 العودة لقائمة الدول", "callback_data": f"svc_{code}"}]
            ]})
            return

        prices = hero_get_prices(code)
        kb = []
        for c in matches[:8]:
            live = prices.get(c['id'], {}).get(code, {}).get('cost')
            cost = float(live) if live else c['cost']
            kb.append([{"text": f"{c['name']} ⇦ {cost:.2f}$ (شراء فوري)", "callback_data": f"buy_now_{code}_{c['id']}"}])
        
        kb.append([{"text": "🔙 العودة لقائمة الدول", "callback_data": f"svc_{code}"}])
        _user_sessions.pop(chat_id, None)
        send_msg(chat_id, f"🎯 *نتائج البحث عن ({text}) لتفعيل {srv['name']}:*", {"inline_keyboard": kb})
        return

    # الرد الافتراضي
    send_msg(chat_id, "👇 اختر من القائمة أدناه:", build_main_menu_keyboard())

def handle_update(update):
    try:
        if "callback_query" in update:
            handle_callback_query(update["callback_query"])
        elif "message" in update:
            handle_message(update["message"])
    except Exception as e:
        logger.error(f"Error handling update: {e}", exc_info=True)

# تشغيل محلي بالطرفية
def run_standalone():
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    token = get_bot_token()
    bal = hero_get_balance()
    print("=" * 60)
    print("  🤖 بوت أرقام التفعيل الشخصي المباشر (Hero-SMS Direct Bot)")
    print(f"  💰 رصيدك في Hero-SMS: {bal}")
    print(f"  👑 حسابك في التيليجرام: {get_admin_chat_id()}")
    print("=" * 60)
    print("  ✓ البوت يعمل بنجاح... جاهز لشراء الأرقام فوراً بنقرة زر!")
    print("=" * 60)

    offset = 0
    requests.get(f"https://api.telegram.org/bot{token}/deleteWebhook", timeout=10)

    while True:
        try:
            url = f"https://api.telegram.org/bot{token}/getUpdates?offset={offset}&timeout=25"
            resp = requests.get(url, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("ok"):
                    for upd in data.get("result", []):
                        offset = upd["update_id"] + 1
                        handle_update(upd)
        except KeyboardInterrupt:
            print("\nتم الإيقاف.")
            break
        except Exception as e:
            time.sleep(3)
        time.sleep(0.3)

if __name__ == "__main__":
    run_standalone()
