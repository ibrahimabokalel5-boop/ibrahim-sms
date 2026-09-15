"""
Telegram Store Bot - بوت متجر الخدمات الرقمية التفاعلي الشامل
يعمل 100% داخل التيليجرام عبر القوائم والأزرار التفاعلية (Inline Keyboards & Menus)
بدون الحاجة لمتصفح ويب: شحن ألعاب، اشتراكات، بطاقات، أرقام تفعيل Hero-SMS، وإدارة الطلبات.
"""
import os
import sys
import time
import json
import logging
import threading
import requests
from datetime import datetime

# استيراد طبقة قاعدة البيانات
import database

# إعداد السجلات
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO
)
logger = logging.getLogger("TelegramBotStore")

# تحميل متغيرات .env إن وُجد
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

# =========================================================================
#   كتالوج الخدمات والأسعار الافتراضية
# =========================================================================

GAMES_DATA = {
    'pubg': {
        'id': 'pubg',
        'title': 'ببجي موبايل (PUBG UC)',
        'icon': '🪖',
        'packages': [
            {'id': 'p60', 'name': '60 UC شدات', 'cost': 0.85},
            {'id': 'p325', 'name': '325 UC (+25 بونص) 🔥', 'cost': 4.10},
            {'id': 'p660', 'name': '660 UC (رويال باس) 👑', 'cost': 8.15},
            {'id': 'p1800', 'name': '1800 UC (+300 بونص)', 'cost': 20.20},
            {'id': 'p3850', 'name': '3850 UC (+850 بونص)', 'cost': 40.50},
            {'id': 'p8100', 'name': '8100 UC باقة الهوامير', 'cost': 81.00}
        ]
    },
    'freefire': {
        'id': 'freefire',
        'title': 'فري فاير (Free Fire)',
        'icon': '🔥',
        'packages': [
            {'id': 'ff110', 'name': '100 + 10 💎 جواهر', 'cost': 0.88},
            {'id': 'ff231', 'name': '210 + 21 💎 جواهر', 'cost': 1.75},
            {'id': 'ff583', 'name': '530 + 53 💎 (الفاير باس)', 'cost': 4.30},
            {'id': 'ff1188', 'name': '1080 + 108 💎 جواهر', 'cost': 8.60},
            {'id': 'ff2420', 'name': '2200 + 220 💎 جواهر', 'cost': 17.20}
        ]
    },
    'roblox': {
        'id': 'roblox',
        'title': 'روبلوكس (Robux)',
        'icon': '🧱',
        'packages': [
            {'id': 'rb80', 'name': '80 Robux', 'cost': 0.95},
            {'id': 'rb400', 'name': '400 Robux', 'cost': 4.40},
            {'id': 'rb800', 'name': '800 Robux', 'cost': 8.70},
            {'id': 'rb1700', 'name': '1700 Robux', 'cost': 17.50},
            {'id': 'rb4500', 'name': '4500 Robux (VIP)', 'cost': 44.00}
        ]
    },
    'cod': {
        'id': 'cod',
        'title': 'كول أوف ديوتي (COD Mobile CP)',
        'icon': '🎯',
        'packages': [
            {'id': 'cod80', 'name': '80 CP', 'cost': 0.90},
            {'id': 'cod420', 'name': '420 CP (باتل باس)', 'cost': 4.30},
            {'id': 'cod880', 'name': '880 CP', 'cost': 8.50},
            {'id': 'cod2400', 'name': '2400 CP', 'cost': 21.00},
            {'id': 'cod5000', 'name': '5000 CP باقة الأساطير', 'cost': 42.00}
        ]
    },
    'pes': {
        'id': 'pes',
        'title': 'eFootball PES Coins',
        'icon': '⚽',
        'packages': [
            {'id': 'pes130', 'name': '130 Coins', 'cost': 1.20},
            {'id': 'pes550', 'name': '550 Coins', 'cost': 4.50},
            {'id': 'pes1040', 'name': '1040 Coins', 'cost': 8.50},
            {'id': 'pes2130', 'name': '2130 Coins', 'cost': 17.00}
        ]
    },
    'brawl': {
        'id': 'brawl',
        'title': 'Brawl Stars',
        'icon': '⭐',
        'packages': [
            {'id': 'bs30', 'name': '30 Gems', 'cost': 1.80},
            {'id': 'bs80', 'name': '80 Gems (براول باس)', 'cost': 4.50},
            {'id': 'bs170', 'name': '170 Gems', 'cost': 8.90},
            {'id': 'bs360', 'name': '360 Gems باقة سوبر', 'cost': 17.50}
        ]
    }
}

APPS_DATA = {
    'telegram': {
        'id': 'telegram',
        'title': 'تليجرام بريميوم (Telegram Premium)',
        'icon': '⭐',
        'inputLabel': 'معرف حسابك (@username):',
        'packages': [
            {'id': 'tg3m', 'name': '3 شهور بريميوم', 'cost': 11.50},
            {'id': 'tg6m', 'name': '6 شهور بريميوم', 'cost': 17.50},
            {'id': 'tg12m', 'name': 'سنة كاملة (12 شهر) ⭐', 'cost': 28.50}
        ]
    },
    'youtube': {
        'id': 'youtube',
        'title': 'يوتيوب بريميوم (YouTube Premium)',
        'icon': '▶️',
        'inputLabel': 'البريد الإلكتروني للزبون (Gmail):',
        'packages': [
            {'id': 'yt1m', 'name': 'شهر واحد بدون إعلانات', 'cost': 2.20},
            {'id': 'yt3m', 'name': '3 شهور ضمان كامل', 'cost': 5.80},
            {'id': 'yt12m', 'name': 'سنة كاملة (12 شهر)', 'cost': 19.00}
        ]
    },
    'chatgpt': {
        'id': 'chatgpt',
        'title': 'ChatGPT Plus رسمي (OpenAI)',
        'icon': '🤖',
        'inputLabel': 'البريد الإلكتروني لحسابك في OpenAI:',
        'packages': [
            {'id': 'gpt1m', 'name': 'اشتراك شهري (GPT-4o & DALL-E)', 'cost': 19.00}
        ]
    },
    'netflix': {
        'id': 'netflix',
        'title': 'Netflix 4K Ultra HD',
        'icon': '🍿',
        'inputLabel': 'رقم هاتف الزبون أو الإيميل للتسليم:',
        'packages': [
            {'id': 'nf1m_p', 'name': 'شهر واحد (بروفايل خاص برمز PIN)', 'cost': 3.50},
            {'id': 'nf3m_p', 'name': '3 شهور (بروفايل خاص)', 'cost': 9.50},
            {'id': 'nf1m_f', 'name': 'شهر كامل (حساب خاص 5 شاشات)', 'cost': 13.00}
        ]
    },
    'spotify': {
        'id': 'spotify',
        'title': 'Spotify Premium موسيقى',
        'icon': '🎵',
        'inputLabel': 'البريد الإلكتروني لحساب سبوتيفاي:',
        'packages': [
            {'id': 'sp3m', 'name': '3 شهور استماع بلا إنترنت', 'cost': 4.50},
            {'id': 'sp6m', 'name': '6 شهور بدون إعلانات', 'cost': 8.00},
            {'id': 'sp12m', 'name': 'سنة كاملة ترخيص رسمي', 'cost': 14.50}
        ]
    },
    'canva': {
        'id': 'canva',
        'title': 'Canva Pro للمصممين',
        'icon': '🎨',
        'inputLabel': 'البريد الإلكتروني لدعوة الفريق:',
        'packages': [
            {'id': 'canva1y', 'name': 'سنة كاملة (12 شهر) برو', 'cost': 6.50}
        ]
    }
}

CARDS_DATA = {
    'googleplay': {
        'id': 'googleplay',
        'title': 'بطاقات Google Play (أمريكي)',
        'icon': '🟢',
        'denominations': [
            {'id': 'gp5', 'name': 'Google Play 5$', 'cost': 4.95},
            {'id': 'gp10', 'name': 'Google Play 10$', 'cost': 9.85},
            {'id': 'gp15', 'name': 'Google Play 15$', 'cost': 14.80},
            {'id': 'gp25', 'name': 'Google Play 25$', 'cost': 24.60}
        ]
    },
    'itunes': {
        'id': 'itunes',
        'title': 'بطاقات Apple iTunes (أمريكي)',
        'icon': '🍎',
        'denominations': [
            {'id': 'it5', 'name': 'Apple iTunes 5$', 'cost': 4.95},
            {'id': 'it10', 'name': 'Apple iTunes 10$', 'cost': 9.85},
            {'id': 'it15', 'name': 'Apple iTunes 15$', 'cost': 14.80},
            {'id': 'it25', 'name': 'Apple iTunes 25$', 'cost': 24.60}
        ]
    },
    'razer': {
        'id': 'razer',
        'title': 'بطاقات Razer Gold العالمية',
        'icon': '🐍',
        'denominations': [
            {'id': 'rz5', 'name': 'Razer Gold 5$', 'cost': 5.00},
            {'id': 'rz10', 'name': 'Razer Gold 10$', 'cost': 9.90},
            {'id': 'rz20', 'name': 'Razer Gold 20$', 'cost': 19.80}
        ]
    },
    'playstation': {
        'id': 'playstation',
        'title': 'بطاقات PlayStation Store (أمريكي)',
        'icon': '🎮',
        'denominations': [
            {'id': 'ps10', 'name': 'PlayStation 10$', 'cost': 10.10},
            {'id': 'ps25', 'name': 'PlayStation 25$', 'cost': 25.20},
            {'id': 'ps50', 'name': 'PlayStation 50$', 'cost': 50.50}
        ]
    }
}

SMS_SERVICES_DATA = {
    'wa': {'name': 'واتساب (WhatsApp)', 'icon': '💬', 'code': 'wa'},
    'tg': {'name': 'تيليجرام (Telegram)', 'icon': '✈️', 'code': 'tg'},
    'lf': {'name': 'تيك توك (TikTok)', 'icon': '🎵', 'code': 'lf'},
    'go': {'name': 'جوجل ويوتيوب (Google)', 'icon': '🔍', 'code': 'go'},
    'fb': {'name': 'فيسبوك (Facebook)', 'icon': '📘', 'code': 'fb'},
    'ig': {'name': 'إنستغرام (Instagram)', 'icon': '📷', 'code': 'ig'},
    'fu': {'name': 'سناب شات (Snapchat)', 'icon': '👻', 'code': 'fu'},
    'tw': {'name': 'تويتر إكس (Twitter/X)', 'icon': '🐦', 'code': 'tw'}
}

SMS_COUNTRIES_DATA = [
    {'id': '4', 'name': '🇵🇭 الفلبين', 'cost': 0.05, 'aliases': ['فلبين', 'philippines']},
    {'id': '6', 'name': '🇮🇩 إندونيسيا', 'cost': 0.08, 'aliases': ['اندونيسيا', 'indonesia']},
    {'id': '0', 'name': '🇷🇺 روسيا', 'cost': 0.35, 'aliases': ['روسيا', 'russia']},
    {'id': '1', 'name': '🇺🇦 أوكرانيا', 'cost': 0.40, 'aliases': ['اوكرانيا', 'ukraine']},
    {'id': '2', 'name': '🇰🇿 كازاخستان', 'cost': 0.35, 'aliases': ['كازاخستان', 'kazakhstan']},
    {'id': '37', 'name': '🇲🇦 المغرب', 'cost': 0.15, 'aliases': ['المغرب', 'morocco']},
    {'id': '21', 'name': '🇪🇬 مصر', 'cost': 0.20, 'aliases': ['مصر', 'egypt']},
    {'id': '62', 'name': '🇹🇷 تركيا', 'cost': 0.80, 'aliases': ['تركيا', 'turkey']},
    {'id': '16', 'name': '🇬🇧 بريطانيا', 'cost': 0.70, 'aliases': ['بريطانيا', 'انكلترا', 'uk', 'britain']},
    {'id': '187', 'name': '🇺🇸 أمريكا', 'cost': 0.85, 'aliases': ['امريكا', 'الولايات المتحدة', 'usa']},
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
    {'id': '31', 'name': '🇿🇦 جنوب أفريقيا', 'cost': 0.30, 'aliases': ['جنوب افريقيا', 'south africa']},
    {'id': '114', 'name': '🇱🇰 سريلانكا', 'cost': 0.25, 'aliases': ['سريلانكا', 'sri lanka']},
    {'id': '40', 'name': '🇺🇿 أوزبكستان', 'cost': 0.35, 'aliases': ['اوزبكستان', 'uzbekistan']},
    {'id': '11', 'name': '🇰🇬 قيرغيزستان', 'cost': 0.35, 'aliases': ['قيرغيزستان', 'kyrgyzstan']},
    {'id': '7', 'name': '🇲🇾 ماليزيا', 'cost': 0.30, 'aliases': ['ماليزيا', 'malaysia']},
    {'id': '8', 'name': '🇰🇪 كينيا', 'cost': 0.20, 'aliases': ['كينيا', 'kenya']},
    {'id': '35', 'name': '🇦🇿 أذربيجان', 'cost': 0.35, 'aliases': ['اذربيجان', 'azerbaijan']},
    {'id': '34', 'name': '🇪🇪 إستونيا', 'cost': 0.60, 'aliases': ['استونيا', 'estonia']},
    {'id': '3', 'name': '🇨🇳 الصين', 'cost': 0.45, 'aliases': ['الصين', 'china']},
    {'id': '14', 'name': '🇭🇰 هونغ كونغ', 'cost': 0.50, 'aliases': ['هونغ كونغ', 'hong kong']}
]

# =========================================================================
#   دوال جلب الإعدادات وحساب الأسعار
# =========================================================================

def get_bot_token():
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
    return str(chat_id)

def get_pricing_params():
    settings = database.get_all_settings()
    try:
        rate = float(settings.get('exchange_rate', 14500))
    except Exception:
        rate = 14500.0
    try:
        margin = float(settings.get('profit_margin', 20))
    except Exception:
        margin = 20.0
    return rate, margin

def calculate_prices(base_cost):
    rate, margin = get_pricing_params()
    usd = round(base_cost * (1.0 + (margin / 100.0)), 2)
    local = round(usd * rate, -2)
    return usd, local

# =========================================================================
#   Telegram Bot API Client Wrapper
# =========================================================================

# إعداد البروكسي التلقائي في حال العمل على خوادم PythonAnywhere المجانية
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

def send_telegram_api(method, payload):
    token = get_bot_token()
    if not token:
        return {"ok": False, "description": "No Telegram bot token configured"}
    url = f"https://api.telegram.org/bot{token}/{method}"
    proxies = get_requests_proxies()
    try:
        resp = requests.post(url, json=payload, timeout=12, proxies=proxies)
        return resp.json()
    except Exception as e:
        logger.error(f"Telegram API request '{method}' failed: {e}")
        return {"ok": False, "description": str(e)}

def send_msg(chat_id, text, reply_markup=None, parse_mode="Markdown"):
    payload = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return send_telegram_api("sendMessage", payload)

def edit_msg(chat_id, message_id, text, reply_markup=None, parse_mode="Markdown"):
    payload = {"chat_id": chat_id, "message_id": message_id, "text": text, "parse_mode": parse_mode}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return send_telegram_api("editMessageText", payload)

def answer_cq(cq_id, text=None, show_alert=False):
    payload = {"callback_query_id": cq_id}
    if text:
        payload["text"] = text
    if show_alert:
        payload["show_alert"] = True
    return send_telegram_api("answerCallbackQuery", payload)

# =========================================================================
#   محرك أرقام التفعيل Hero-SMS API
# =========================================================================

HERO_SMS_URL = "https://hero-sms.com/stubs/handler_api.php"

def get_hero_key():
    key = os.environ.get("HERO_SMS_KEY")
    if not key:
        settings = database.get_all_settings()
        key = settings.get("hero_sms_api_key", "f144cA86391f362758c129f14dc33fc9")
    return key

def hero_api_call(params):
    api_key = get_hero_key()
    p = {"api_key": api_key, **params}
    proxies = get_requests_proxies()
    try:
        resp = requests.get(HERO_SMS_URL, params=p, timeout=15, proxies=proxies)
        return resp.text.strip()
    except Exception as e:
        logger.error(f"Hero-SMS call failed: {e}")
        return f"ERROR:{e}"

def hero_get_balance():
    res = hero_api_call({"action": "getBalance"})
    if res.startswith("ACCESS_BALANCE:"):
        return res.split(":", 1)[1] + " $"
    return res

def hero_order_number(service, country):
    res = hero_api_call({"action": "getNumber", "service": service, "country": country})
    if res.startswith("ACCESS_NUMBER:"):
        parts = res.split(":")
        return {"success": True, "id": parts[1], "number": parts[2]}
    return {"success": False, "error": res}

def hero_check_code(act_id):
    res = hero_api_call({"action": "getStatus", "id": act_id})
    if res.startswith("STATUS_OK:"):
        code = res.split(":", 1)[1]
        return {"status": "ok", "code": code}
    elif res == "STATUS_WAIT_CODE":
        return {"status": "waiting"}
    elif res == "STATUS_CANCEL":
        return {"status": "cancelled"}
    return {"status": "error", "raw": res}

def hero_cancel_number(act_id):
    res = hero_api_call({"action": "setStatus", "id": act_id, "status": "8"})
    return res

_prices_cache = {}
_prices_cache_time = {}

def hero_get_prices(service):
    """جلب الأسعار والأعداد الحية لجميع الدول من Hero-SMS مع كاش دقيقة واحدة"""
    global _prices_cache, _prices_cache_time
    now = time.time()
    if service in _prices_cache and (now - _prices_cache_time.get(service, 0) < 60):
        return _prices_cache[service]
    
    api_key = get_hero_key()
    proxies = get_requests_proxies()
    try:
        url = f"{HERO_SMS_URL}?api_key={api_key}&action=getPrices&service={service}"
        resp = requests.get(url, timeout=12, proxies=proxies)
        if resp.status_code == 200:
            data = resp.json()
            _prices_cache[service] = data
            _prices_cache_time[service] = now
            return data
    except Exception as e:
        logger.warning(f"Failed to fetch live prices for {service}: {e}")
    return _prices_cache.get(service, {})

# =========================================================================
#   واجهات القوائم والأزرار (Keyboards)
# =========================================================================

def build_main_menu_keyboard(chat_id):
    admin_id = get_admin_chat_id()
    is_admin = (str(chat_id) == admin_id)
    
    kb = [
        [
            {"text": "🎮 شحن الألعاب بالآيدي", "callback_data": "menu_games"},
            {"text": "📱 أرقام تفعيل SMS", "callback_data": "menu_sms"}
        ],
        [
            {"text": "🌟 اشتراكات وتطبيقات", "callback_data": "menu_apps"},
            {"text": "💳 بطاقات رقمية كروت", "callback_data": "menu_cards"}
        ],
        [
            {"text": "💰 طرق الدفع والتحويل", "callback_data": "menu_payment_info"},
            {"text": "📦 طلباتي السابقة", "callback_data": "menu_my_orders"}
        ],
        [
            {"text": "🔍 تتبع حالة طلب", "callback_data": "menu_track_prompt"},
            {"text": "💬 الدعم الفني والمساعدة", "callback_data": "menu_support"}
        ]
    ]
    if is_admin:
        kb.append([{"text": "👑 لوحة تحكم الإدارة (المدير)", "callback_data": "menu_admin"}])
    return {"inline_keyboard": kb}

def build_back_keyboard(target="menu_main"):
    return {"inline_keyboard": [[{"text": "🔙 العودة للقائمة الرئيسية", "callback_data": target}]]}

# =========================================================================
#   معالجة أحداث الأزرار (Callback Queries)
# =========================================================================

def handle_callback_query(cq):
    cq_id = cq.get("id")
    data = cq.get("data", "")
    message = cq.get("message", {})
    chat_id = message.get("chat", {}).get("id")
    message_id = message.get("message_id")
    admin_id = get_admin_chat_id()
    is_admin = (str(chat_id) == admin_id)

    # 1. القائمة الرئيسية
    if data == "menu_main":
        database.clear_user_session(chat_id)
        settings = database.get_all_settings()
        shop_name = settings.get("shop_name", "متجر الخدمات الرقمية")
        welcome = (
            f"👋 *مرحباً بك في {shop_name}!* 🛍️\n\n"
            f"⚡ المنصة الأسرع والأضمن لشحن الألعاب، شراء الاشتراكات، والحصول على أرقام التفعيل الفورية.\n\n"
            f"👇 *يرجى اختيار القسم المطلوب من القائمة أدناه:*"
        )
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, welcome, build_main_menu_keyboard(chat_id))
        return

    # 2. قائمة الألعاب
    if data == "menu_games":
        kb = []
        games_list = list(GAMES_DATA.values())
        for i in range(0, len(games_list), 2):
            row = []
            row.append({"text": f"{games_list[i]['icon']} {games_list[i]['title']}", "callback_data": f"game_{games_list[i]['id']}"})
            if i + 1 < len(games_list):
                row.append({"text": f"{games_list[i+1]['icon']} {games_list[i+1]['title']}", "callback_data": f"game_{games_list[i+1]['id']}"})
            kb.append(row)
        kb.append([{"text": "🔙 العودة للقائمة الرئيسية", "callback_data": "menu_main"}])
        
        text = "🎮 *اختر اللعبة التي ترغب بشحنها بالآيدي:*"
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, {"inline_keyboard": kb})
        return

    if data.startswith("game_"):
        game_key = data.replace("game_", "")
        game = GAMES_DATA.get(game_key)
        if not game:
            answer_cq(cq_id, "لعبة غير متوفرة")
            return
        
        kb = []
        for pkg in game['packages']:
            usd, local = calculate_prices(pkg['cost'])
            btn_text = f"{pkg['name']} ⇦ {usd}$ ({local:,.0f} ل.س)"
            kb.append([{"text": btn_text, "callback_data": f"gpkg_{game_key}_{pkg['id']}"}])
        kb.append([{"text": "🔙 العودة لقائمة الألعاب", "callback_data": "menu_games"}])
        
        text = f"{game['icon']} *شحن {game['title']}*\n\nاختر الباقة المناسبة للشحن الفوري:"
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, {"inline_keyboard": kb})
        return

    if data.startswith("gpkg_"):
        parts = data.split("_")
        game_key = parts[1]
        pkg_id = parts[2]
        game = GAMES_DATA.get(game_key)
        pkg = next((p for p in game['packages'] if p['id'] == pkg_id), None)
        if not pkg:
            answer_cq(cq_id, "باقة غير متوفرة")
            return
        
        usd, local = calculate_prices(pkg['cost'])
        database.set_user_session(chat_id, "waiting_game_id", {
            "service_type": "games",
            "service_title": game['title'],
            "package_id": pkg['id'],
            "package_name": pkg['name'],
            "price_usd": usd,
            "price_local": local
        })
        
        answer_cq(cq_id)
        prompt_text = (
            f"🎯 *تم اختيار:* {game['title']} - {pkg['name']}\n"
            f"💰 *السعر:* {usd}$ ({local:,.0f} ل.س)\n\n"
            f"📝 *يرجى الآن كتابة وإرسال الآيدي الخاص بحسابك في اللعبة (Player ID):*"
        )
        edit_msg(chat_id, message_id, prompt_text, {"inline_keyboard": [
            [{"text": "❌ إلغاء والعودة", "callback_data": "menu_main"}]
        ]})
        return

    # 3. قائمة الاشتراكات والتطبيقات
    if data == "menu_apps":
        kb = []
        apps_list = list(APPS_DATA.values())
        for i in range(0, len(apps_list), 2):
            row = []
            row.append({"text": f"{apps_list[i]['icon']} {apps_list[i]['title']}", "callback_data": f"app_{apps_list[i]['id']}"})
            if i + 1 < len(apps_list):
                row.append({"text": f"{apps_list[i+1]['icon']} {apps_list[i+1]['title']}", "callback_data": f"app_{apps_list[i+1]['id']}"})
            kb.append(row)
        kb.append([{"text": "🔙 العودة للقائمة الرئيسية", "callback_data": "menu_main"}])
        
        text = "🌟 *اختر الاشتراك أو التطبيق المطلوب:*"
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, {"inline_keyboard": kb})
        return

    if data.startswith("app_"):
        app_key = data.replace("app_", "")
        app = APPS_DATA.get(app_key)
        if not app:
            answer_cq(cq_id, "تطبيق غير متوفر")
            return
        
        kb = []
        for pkg in app['packages']:
            usd, local = calculate_prices(pkg['cost'])
            btn_text = f"{pkg['name']} ⇦ {usd}$ ({local:,.0f} ل.س)"
            kb.append([{"text": btn_text, "callback_data": f"apkg_{app_key}_{pkg['id']}"}])
        kb.append([{"text": "🔙 العودة لقائمة التطبيقات", "callback_data": "menu_apps"}])
        
        text = f"{app['icon']} *{app['title']}*\n\nاختر مدة ونوع الاشتراك:"
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, {"inline_keyboard": kb})
        return

    if data.startswith("apkg_"):
        parts = data.split("_")
        app_key = parts[1]
        pkg_id = parts[2]
        app = APPS_DATA.get(app_key)
        pkg = next((p for p in app['packages'] if p['id'] == pkg_id), None)
        if not pkg:
            answer_cq(cq_id, "باقة غير متوفرة")
            return
        
        usd, local = calculate_prices(pkg['cost'])
        database.set_user_session(chat_id, "waiting_app_target", {
            "service_type": "apps",
            "service_title": app['title'],
            "package_id": pkg['id'],
            "package_name": pkg['name'],
            "price_usd": usd,
            "price_local": local,
            "inputLabel": app.get('inputLabel', 'البريد أو المعرف:')
        })
        
        answer_cq(cq_id)
        prompt_text = (
            f"🌟 *تم اختيار:* {app['title']} - {pkg['name']}\n"
            f"💰 *السعر:* {usd}$ ({local:,.0f} ل.س)\n\n"
            f"📝 *يرجى إرسال {app.get('inputLabel', 'معرف الحساب أو البريد الإلكتروني')}:*"
        )
        edit_msg(chat_id, message_id, prompt_text, {"inline_keyboard": [
            [{"text": "❌ إلغاء والعودة", "callback_data": "menu_main"}]
        ]})
        return

    # 4. قائمة البطاقات الرقمية
    if data == "menu_cards":
        kb = []
        cards_list = list(CARDS_DATA.values())
        for i in range(0, len(cards_list), 2):
            row = []
            row.append({"text": f"{cards_list[i]['icon']} {cards_list[i]['title']}", "callback_data": f"card_{cards_list[i]['id']}"})
            if i + 1 < len(cards_list):
                row.append({"text": f"{cards_list[i+1]['icon']} {cards_list[i+1]['title']}", "callback_data": f"card_{cards_list[i+1]['id']}"})
            kb.append(row)
        kb.append([{"text": "🔙 العودة للقائمة الرئيسية", "callback_data": "menu_main"}])
        
        text = "💳 *اختر نوع البطاقة الرقمية المطلوبة:*"
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, {"inline_keyboard": kb})
        return

    if data.startswith("card_"):
        card_key = data.replace("card_", "")
        card = CARDS_DATA.get(card_key)
        if not card:
            answer_cq(cq_id, "بطاقة غير متوفرة")
            return
        
        kb = []
        for pkg in card['denominations']:
            usd, local = calculate_prices(pkg['cost'])
            btn_text = f"{pkg['name']} ⇦ {usd}$ ({local:,.0f} ل.س)"
            kb.append([{"text": btn_text, "callback_data": f"cpkg_{card_key}_{pkg['id']}"}])
        kb.append([{"text": "🔙 العودة للبطاقات", "callback_data": "menu_cards"}])
        
        text = f"{card['icon']} *{card['title']}*\n\nاختر فئة البطاقة المطلوبة:"
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, {"inline_keyboard": kb})
        return

    if data.startswith("cpkg_"):
        parts = data.split("_")
        card_key = parts[1]
        pkg_id = parts[2]
        card = CARDS_DATA.get(card_key)
        pkg = next((p for p in card['denominations'] if p['id'] == pkg_id), None)
        if not pkg:
            answer_cq(cq_id, "فئة غير متوفرة")
            return
        
        usd, local = calculate_prices(pkg['cost'])
        database.set_user_session(chat_id, "waiting_card_target", {
            "service_type": "cards",
            "service_title": card['title'],
            "package_id": pkg['id'],
            "package_name": pkg['name'],
            "price_usd": usd,
            "price_local": local
        })
        
        answer_cq(cq_id)
        prompt_text = (
            f"💳 *تم اختيار:* {card['title']} - {pkg['name']}\n"
            f"💰 *السعر:* {usd}$ ({local:,.0f} ل.س)\n\n"
            f"📱 *يرجى إرسال رقم هاتفك أو بريدك لاستلام كود البطاقة فوراً بعد المراجعة:*"
        )
        edit_msg(chat_id, message_id, prompt_text, {"inline_keyboard": [
            [{"text": "❌ إلغاء والعودة", "callback_data": "menu_main"}]
        ]})
        return

    # 5. محرك أرقام التفعيل Hero-SMS
    if data == "menu_sms":
        kb = []
        srv_list = list(SMS_SERVICES_DATA.values())
        for i in range(0, len(srv_list), 2):
            row = []
            row.append({"text": f"{srv_list[i]['icon']} {srv_list[i]['name']}", "callback_data": f"sms_srv_{srv_list[i]['code']}"})
            if i + 1 < len(srv_list):
                row.append({"text": f"{srv_list[i+1]['icon']} {srv_list[i+1]['name']}", "callback_data": f"sms_srv_{srv_list[i+1]['code']}"})
            kb.append(row)
        kb.append([{"text": "🔙 العودة للقائمة الرئيسية", "callback_data": "menu_main"}])
        
        text = (
            "📱 *أرقام تفعيل الرسائل القصيرة (Hero-SMS)*\n\n"
            "احصل على رقم مؤقت لتفعيل التطبيقات واستقبال كود SMS مباشرة هنا في الشات!\n\n"
            "اختر التطبيق الذي تريد تفعيله:"
        )
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, {"inline_keyboard": kb})
        return

def build_sms_countries_keyboard(code, page=0):
    prices = hero_get_prices(code)
    per_page = 8
    total_countries = len(SMS_COUNTRIES_DATA)
    total_pages = max(1, (total_countries + per_page - 1) // per_page)
    page = max(0, min(page, total_pages - 1))
    
    start_idx = page * per_page
    end_idx = min(start_idx + per_page, total_countries)
    page_countries = SMS_COUNTRIES_DATA[start_idx:end_idx]
    
    kb = [
        [
            {"text": "⚡ الأوفر والأرخص فوراً", "callback_data": f"sms_cheapest_{code}"},
            {"text": "🔍 بحث عن دولة بالاسم", "callback_data": f"sms_search_{code}"}
        ]
    ]
    
    for i in range(0, len(page_countries), 2):
        row = []
        c1 = page_countries[i]
        c1_live = prices.get(c1['id'], {}).get(code, {}).get('cost')
        cost1 = float(c1_live) if c1_live else c1['cost']
        usd1, local1 = calculate_prices(cost1)
        row.append({"text": f"{c1['name']} ⇦ {usd1}$", "callback_data": f"sms_prep_{code}_{c1['id']}"})
        
        if i + 1 < len(page_countries):
            c2 = page_countries[i+1]
            c2_live = prices.get(c2['id'], {}).get(code, {}).get('cost')
            cost2 = float(c2_live) if c2_live else c2['cost']
            usd2, local2 = calculate_prices(cost2)
            row.append({"text": f"{c2['name']} ⇦ {usd2}$", "callback_data": f"sms_prep_{code}_{c2['id']}"})
        kb.append(row)
        
    nav_row = []
    if page > 0:
        nav_row.append({"text": "⬅️ السابق", "callback_data": f"smspage_{code}_{page-1}"})
    nav_row.append({"text": f"📄 {page+1} / {total_pages}", "callback_data": "sms_noop"})
    if page < total_pages - 1:
        nav_row.append({"text": "التالي ➡️", "callback_data": f"smspage_{code}_{page+1}"})
    kb.append(nav_row)
    
    kb.append([{"text": "🔙 العودة لاختيار التطبيق", "callback_data": "menu_sms"}])
    return kb, total_pages

    if data.startswith("sms_srv_"):
        code = data.replace("sms_srv_", "")
        srv = SMS_SERVICES_DATA.get(code)
        if not srv:
            answer_cq(cq_id, "خدمة غير متوفرة")
            return
        
        kb, total_pages = build_sms_countries_keyboard(code, 0)
        text = f"{srv['icon']} *تفعيل {srv['name']}*\n\nاختر الدولة المطلوبة للرقم (صفحة 1 من {total_pages}) أو استخدم البحث الذكي:"
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, {"inline_keyboard": kb})
        return

    if data.startswith("smspage_"):
        parts = data.split("_")
        code = parts[1]
        page = int(parts[2])
        srv = SMS_SERVICES_DATA.get(code)
        kb, total_pages = build_sms_countries_keyboard(code, page)
        text = f"{srv['icon']} *تفعيل {srv['name']}*\n\nاختر الدولة المطلوبة للرقم (صفحة {page+1} من {total_pages}) أو استخدم البحث الذكي:"
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, {"inline_keyboard": kb})
        return

    if data == "sms_noop":
        answer_cq(cq_id)
        return

    if data.startswith("sms_cheapest_"):
        code = data.replace("sms_cheapest_", "")
        srv = SMS_SERVICES_DATA.get(code)
        prices = hero_get_prices(code)
        
        best_c = None
        min_cost = 9999.0
        for c in SMS_COUNTRIES_DATA:
            cid = c['id']
            p_info = prices.get(cid, {}).get(code, {})
            c_cost = float(p_info.get('cost', c['cost']))
            c_count = int(p_info.get('count', 100))
            if c_count > 10 and c_cost < min_cost:
                min_cost = c_cost
                best_c = c
        if not best_c:
            best_c = SMS_COUNTRIES_DATA[0]
            min_cost = best_c['cost']
            
        usd, local = calculate_prices(min_cost)
        answer_cq(cq_id, f"⚡ تم اختيار الأوفر: {best_c['name']} بسعر {usd}$", show_alert=True)
        database.set_user_session(chat_id, "waiting_payment_ref", {
            "service_type": "sms",
            "service_title": f"رقم {srv['name']} ({best_c['name']})",
            "package_id": f"{code}_{best_c['id']}",
            "package_name": f"رقم {best_c['name']} (الأرخص ⚡)",
            "target_id": f"كود تفعيل {srv['name']}",
            "price_usd": usd,
            "price_local": local,
            "sms_srv": code,
            "sms_country": best_c['id']
        })
        show_payment_methods(chat_id, message_id, {
            "service_title": f"رقم تفعيل {srv['name']}",
            "package_name": f"{best_c['name']} (الأوفر ⚡)",
            "target_id": "طلب رقم جديد",
            "price_usd": usd,
            "price_local": local
        })
        return

    if data.startswith("sms_search_"):
        code = data.replace("sms_search_", "")
        srv = SMS_SERVICES_DATA.get(code)
        database.set_user_session(chat_id, "waiting_country_search", {"sms_srv": code})
        answer_cq(cq_id)
        prompt_text = (
            f"🔍 *البحث عن دولة لتفعيل {srv['name']}:*\n\n"
            f"أرسل اسم الدولة التي تبحث عنها (مثال: `مصر`، `المغرب`، `المانيا`، `كندا`، `تركيا`...):"
        )
        edit_msg(chat_id, message_id, prompt_text, {"inline_keyboard": [
            [{"text": "🔙 إلغاء والعودة", "callback_data": f"sms_srv_{code}"}]
        ]})
        return

    if data.startswith("sms_prep_"):
        parts = data.split("_")
        srv_code = parts[2]
        c_id = parts[3]
        srv = SMS_SERVICES_DATA.get(srv_code)
        country = next((c for c in SMS_COUNTRIES_DATA if c['id'] == c_id), None)
        if not srv or not country:
            answer_cq(cq_id, "خطأ في اختيار الرقم")
            return
        
        prices = hero_get_prices(srv_code)
        c_live = prices.get(c_id, {}).get(srv_code, {}).get('cost')
        base_cost = float(c_live) if c_live else country['cost']
        usd, local = calculate_prices(base_cost)
        
        database.set_user_session(chat_id, "waiting_payment_ref", {
            "service_type": "sms",
            "service_title": f"رقم {srv['name']} ({country['name']})",
            "package_id": f"{srv_code}_{c_id}",
            "package_name": f"رقم {country['name']}",
            "target_id": f"كود تفعيل {srv['name']}",
            "price_usd": usd,
            "price_local": local,
            "sms_srv": srv_code,
            "sms_country": c_id
        })
        
        answer_cq(cq_id)
        show_payment_methods(chat_id, message_id, {
            "service_title": f"رقم تفعيل {srv['name']}",
            "package_name": country['name'],
            "target_id": "طلب رقم جديد",
            "price_usd": usd,
            "price_local": local
        })
        return

    # فحص كود التفعيل المستمر للرقم
    if data.startswith("sms_check_"):
        act_id = data.replace("sms_check_", "")
        check_res = hero_check_code(act_id)
        if check_res['status'] == "ok":
            code = check_res['code']
            answer_cq(cq_id, f"🎉 وصل كود التفعيل: {code}", show_alert=True)
            text = (
                f"🎉 *تم استلام كود التفعيل بنجاح!* 🎉\n\n"
                f"🔢 *كود التفعيل (Code):* `{code}`\n\n"
                f"يمكنك نسخ الكود مباشرة ولصقه في التطبيق. شكراً لثقتكم!"
            )
            edit_msg(chat_id, message_id, text, build_back_keyboard("menu_main"))
        elif check_res['status'] == "waiting":
            answer_cq(cq_id, "⏳ لم يصل الكود بعد، تأكد من طلب الإرسال في التطبيق ثم اعد الفحص خلال لحظات.", show_alert=True)
        elif check_res['status'] == "cancelled":
            answer_cq(cq_id, "تم إلغاء هذا الرقم.", show_alert=True)
            edit_msg(chat_id, message_id, "❌ *تم إلغاء هذا الرقم بنجاح.*", build_back_keyboard("menu_main"))
        else:
            answer_cq(cq_id, f"الحالة: {check_res.get('raw')}", show_alert=True)
        return

    if data.startswith("sms_cancel_"):
        act_id = data.replace("sms_cancel_", "")
        hero_cancel_number(act_id)
        answer_cq(cq_id, "✅ تم إلغاء الرقم بنجاح.", show_alert=True)
        edit_msg(chat_id, message_id, "❌ *تم إلغاء الرقم واسترداد العملية بنجاح.*", build_back_keyboard("menu_main"))
        return

    # 6. اختيار طريقة الدفع
    if data.startswith("pay_"):
        pay_method = data.replace("pay_", "")
        state, session_data = database.get_user_session(chat_id)
        if not session_data:
            answer_cq(cq_id, "انتهت صلاحية الجلسة، يرجى إعادة الطلب من البداية")
            edit_msg(chat_id, message_id, "⚠️ انتهت صلاحية الجلسة، اختر من القائمة الرئيسية:", build_main_menu_keyboard(chat_id))
            return
        
        session_data['payment_method'] = pay_method
        database.set_user_session(chat_id, "waiting_payment_ref", session_data)
        
        settings = database.get_all_settings()
        pay_info = ""
        amount_str = f"{session_data['price_usd']}$ ({session_data['price_local']:,.0f} ل.س)"
        
        if pay_method == "syriatel_cash":
            num = settings.get("syriatel_cash_number", "0900000000")
            pay_info = (
                f"📱 *الدفع عبر سيريتل كاش (Syriatel Cash):*\n\n"
                f"يرجى تحويل مبلغ: *{session_data['price_local']:,.0f} ل.س*\n"
                f"إلى الرقم: `{num}`\n\n"
                f"📌 *بعد التحويل، أرسل (رقم إشعار التحويل / كود العملية) في رسالة هنا:*"
            )
        elif pay_method == "sham_cash":
            num = settings.get("sham_cash_number", "0900000000")
            pay_info = (
                f"📱 *الدفع عبر شام كاش (Sham Cash):*\n\n"
                f"يرجى تحويل مبلغ: *{session_data['price_local']:,.0f} ل.س*\n"
                f"إلى الرقم: `{num}`\n\n"
                f"📌 *بعد التحويل، أرسل (رقم إشعار التحويل / كود العملية) في رسالة هنا:*"
            )
        elif pay_method == "usdt":
            wallet = settings.get("usdt_wallet_address", "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE")
            pay_info = (
                f"💎 *الدفع عبر USDT (TRC-20):*\n\n"
                f"يرجى تحويل مبلغ: *{session_data['price_usd']}$*\n"
                f"إلى عنوان المحفظة:\n`{wallet}`\n\n"
                f"📌 *بعد التحويل، أرسل (هاش التحويل TxID أو كود الإشعار) هنا:*"
            )
        
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, pay_info, {"inline_keyboard": [
            [{"text": "❌ إلغاء الطلب", "callback_data": "menu_main"}]
        ]})
        return

    # 7. استعراض معلومات وطرق الدفع
    if data == "menu_payment_info":
        settings = database.get_all_settings()
        s_cash = settings.get("syriatel_cash_number", "غير محدد")
        sh_cash = settings.get("sham_cash_number", "غير محدد")
        usdt_w = settings.get("usdt_wallet_address", "غير محدد")
        rate = settings.get("exchange_rate", "14500")

        text = (
            f"💳 *حسابات وطرق الدفع المعتمدة لدى المتجر:*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"📱 *سيريتل كاش:* `{s_cash}`\n"
            f"📱 *شام كاش:* `{sh_cash}`\n"
            f"💎 *محفظة USDT (TRC-20):*\n`{usdt_w}`\n"
            f"💱 *سعر الصرف المعتمد:* {float(rate):,.0f} ل.س لكل 1$\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"💡 *طريقة الدفع:* يمكنك تحويل المبلغ مباشرة إلى أي من الحسابات أعلاه ثم إرفاق رقم العملية عند إتمام أي طلب."
        )
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, build_back_keyboard("menu_main"))
        return

    # 8. طلباتي السابقة
    if data == "menu_my_orders":
        orders = database.get_user_orders(chat_id, limit=6)
        if not orders:
            answer_cq(cq_id)
            edit_msg(chat_id, message_id, "📦 *ليس لديك أي طلبات سابقة حتى الآن.*", build_back_keyboard("menu_main"))
            return
        
        status_icons = {
            "pending": "🟡 قيد المراجعة والانتظار",
            "processing": "🔵 جاري الشحن والتنفيذ",
            "completed": "🟢 تم التنفيذ بنجاح ✓",
            "rejected": "🔴 ملغي / مرفوض"
        }
        text = "📦 *سجل آخر طلباتك في المتجر:*\n━━━━━━━━━━━━━━━━━━\n"
        for o in orders:
            st = status_icons.get(o.get('status'), o.get('status'))
            text += (
                f"🆔 *طلب:* `{o.get('order_num')}`\n"
                f"🏷️ *الخدمة:* {o.get('service_title')} ({o.get('package_name')})\n"
                f"🎯 *الآيدي/الحساب:* `{o.get('target_id')}`\n"
                f"💰 *المبلغ:* {o.get('price_usd')} $ ({o.get('price_local'):,.0f} ل.س)\n"
                f"📊 *الحالة:* {st}\n"
                f"🕒 *التاريخ:* {o.get('created_at')}\n"
                f"━━━━━━━━━━━━━━━━━━\n"
            )
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, build_back_keyboard("menu_main"))
        return

    # 9. تتبع طلب
    if data == "menu_track_prompt":
        answer_cq(cq_id)
        text = (
            "🔍 *تتبع حالة أي طلب:*\n\n"
            "يمكنك في أي وقت كتابة الأمر بالشكل التالي:\n"
            "`/track ORD-2409-0001`\n\n"
            "أو إرسال رقم طلبك مباشرة الآن للبحث عنه."
        )
        database.set_user_session(chat_id, "waiting_track_num", {})
        edit_msg(chat_id, message_id, text, build_back_keyboard("menu_main"))
        return

    # 10. الدعم الفني
    if data == "menu_support":
        settings = database.get_all_settings()
        phone = settings.get("shop_phone", "+963 900 000 000")
        admin_chat = get_admin_chat_id()
        text = (
            "💬 *مركز الدعم الفني وخدمة الزبائن*\n"
            "━━━━━━━━━━━━━━━━━━\n"
            "نحن متواجدون لمساعدتك والإجابة على استفساراتك وتنفيذ طلباتك في أسرع وقت!\n\n"
            f"📞 *واتساب / هاتف:* `{phone}`\n"
            f"🕒 *أوقات العمل:* طيلة أيام الأسبوع 24/7\n"
            "━━━━━━━━━━━━━━━━━━"
        )
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, build_back_keyboard("menu_main"))
        return

    # 11. لوحة تحكم الإدارة (المدير فقط)
    if data == "menu_admin":
        if not is_admin:
            answer_cq(cq_id, "⛔ هذا القسم خاص بمدير المتجر فقط.", show_alert=True)
            return
        
        kb = [
            [
                {"text": "📊 إحصائيات المبيعات والأرباح", "callback_data": "admin_stats"},
                {"text": "📋 الطلبات المعلقة الجديدة", "callback_data": "admin_pending_orders"}
            ],
            [
                {"text": "💱 تعديل سعر الصرف", "callback_data": "admin_set_rate"},
                {"text": "📈 تعديل نسبة الربح %", "callback_data": "admin_set_margin"}
            ],
            [
                {"text": "💳 أرقام وحسابات الدفع", "callback_data": "admin_payment_settings"},
                {"text": "📢 إرسال إذاعة لجميع الزبائن", "callback_data": "admin_broadcast"}
            ],
            [
                {"text": "🔙 العودة للقائمة الرئيسية", "callback_data": "menu_main"}
            ]
        ]
        text = "👑 *لوحة تحكم إدارة المتجر*\n\nمرحباً بك يا مدير! اختر الإجراء المطلوب:"
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, {"inline_keyboard": kb})
        return

    if data == "admin_stats":
        if not is_admin:
            return
        stats = database.get_stats()
        users_count = database.get_bot_user_count()
        rate, margin = get_pricing_params()
        
        text = (
            f"📊 *تقرير إحصائيات المتجر الكاملة*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"👥 *مشتركو البوت:* {users_count} زبون\n"
            f"🛍️ *إجمالي الطلبات:* {stats['total_orders']}\n"
            f"🟢 *الطلبات المكتملة:* {stats['completed_orders']}\n"
            f"🟡 *الطلبات المعلقة:* {stats['pending_orders']}\n"
            f"💵 *إجمالي المبيعات (USD):* {stats['total_sales_usd']:,.2f} $\n"
            f"💰 *إجمالي المبيعات (ل.س):* {stats['total_sales_local']:,.0f} ل.س\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"💱 *سعر الصرف الحالي:* {rate:,.0f} ل.س\n"
            f"📈 *نسبة الربح المطبقة:* {margin} %\n"
            f"━━━━━━━━━━━━━━━━━━"
        )
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, {"inline_keyboard": [
            [{"text": "🔙 العودة للوحة الإدارة", "callback_data": "menu_admin"}]
        ]})
        return

    if data == "admin_pending_orders":
        if not is_admin:
            return
        orders = database.get_orders_list(status="pending", limit=5)
        if not orders:
            answer_cq(cq_id)
            edit_msg(chat_id, message_id, "✅ لا توجد أي طلبات معلقة بانتظار المراجعة الآن.", {"inline_keyboard": [
                [{"text": "🔙 العودة للوحة الإدارة", "callback_data": "menu_admin"}]
            ]})
            return
        
        answer_cq(cq_id)
        for o in orders:
            notify_admin_new_order(o)
        send_msg(chat_id, "تم إرسال الطلبات المعلقة أعلاه مع أزرار القبول والرفض.")
        return

    if data == "admin_set_rate":
        if not is_admin:
            return
        database.set_user_session(chat_id, "admin_waiting_rate", {})
        answer_cq(cq_id)
        rate, _ = get_pricing_params()
        edit_msg(chat_id, message_id, f"💱 *سعر الصرف الحالي:* {rate:,.0f} ل.س\n\nأرسل الآن القيمة الجديدة لسعر الصرف (مثال: `14800`):", {"inline_keyboard": [
            [{"text": "إلغاء", "callback_data": "menu_admin"}]
        ]})
        return

    if data == "admin_set_margin":
        if not is_admin:
            return
        database.set_user_session(chat_id, "admin_waiting_margin", {})
        answer_cq(cq_id)
        _, margin = get_pricing_params()
        edit_msg(chat_id, message_id, f"📈 *نسبة الربح الحالية:* {margin} %\n\nأرسل الآن النسبة المئوية الجديدة للربح (مثال: `25`):", {"inline_keyboard": [
            [{"text": "إلغاء", "callback_data": "menu_admin"}]
        ]})
        return

    if data == "admin_broadcast":
        if not is_admin:
            return
        count = database.get_bot_user_count()
        database.set_user_session(chat_id, "admin_waiting_broadcast", {})
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, f"📢 *إرسال إذاعة عامة لجميع زبائن البوت ({count} مشترك):*\n\nاكتب الآن نص الرسالة أو العرض الذي ترغب بإرساله للجميع:", {"inline_keyboard": [
            [{"text": "إلغاء", "callback_data": "menu_admin"}]
        ]})
        return

    if data == "admin_payment_settings":
        if not is_admin:
            return
        settings = database.get_all_settings()
        s_cash = settings.get("syriatel_cash_number", "غير محدد")
        sh_cash = settings.get("sham_cash_number", "غير محدد")
        usdt_w = settings.get("usdt_wallet_address", "غير محدد")
        phone = settings.get("shop_phone", "غير محدد")

        text = (
            "⚙️ *إدارة أرقام وحسابات الدفع للمحل:*\n"
            "━━━━━━━━━━━━━━━━━━\n"
            f"📱 *سيريتل كاش:* `{s_cash}`\n"
            f"📱 *شام كاش:* `{sh_cash}`\n"
            f"💎 *محفظة USDT:* `{usdt_w}`\n"
            f"📞 *هاتف الدعم:* `{phone}`\n"
            "━━━━━━━━━━━━━━━━━━\n"
            "اختر الحساب الذي ترغب بتعديل رقمه:"
        )
        kb = [
            [
                {"text": "✏️ تعديل سيريتل كاش", "callback_data": "admin_edit_syriatel"},
                {"text": "✏️ تعديل شام كاش", "callback_data": "admin_edit_sham"}
            ],
            [
                {"text": "✏️ تعديل محفظة USDT", "callback_data": "admin_edit_usdt"},
                {"text": "✏️ تعديل هاتف الدعم", "callback_data": "admin_edit_phone"}
            ],
            [
                {"text": "🔙 العودة للوحة الإدارة", "callback_data": "menu_admin"}
            ]
        ]
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, text, {"inline_keyboard": kb})
        return

    if data == "admin_edit_syriatel":
        if not is_admin:
            return
        database.set_user_session(chat_id, "admin_waiting_syriatel", {})
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, "📱 *أرسل رقم سيريتل كاش الجديد للمحل (مثال: 0991234567):*", {"inline_keyboard": [
            [{"text": "إلغاء", "callback_data": "admin_payment_settings"}]
        ]})
        return

    if data == "admin_edit_sham":
        if not is_admin:
            return
        database.set_user_session(chat_id, "admin_waiting_sham", {})
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, "📱 *أرسل رقم شام كاش الجديد للمحل (مثال: 0981234567):*", {"inline_keyboard": [
            [{"text": "إلغاء", "callback_data": "admin_payment_settings"}]
        ]})
        return

    if data == "admin_edit_usdt":
        if not is_admin:
            return
        database.set_user_session(chat_id, "admin_waiting_usdt", {})
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, "💎 *أرسل عنوان محفظة USDT (شبكة TRC-20) الجديد:*", {"inline_keyboard": [
            [{"text": "إلغاء", "callback_data": "admin_payment_settings"}]
        ]})
        return

    if data == "admin_edit_phone":
        if not is_admin:
            return
        database.set_user_session(chat_id, "admin_waiting_phone", {})
        answer_cq(cq_id)
        edit_msg(chat_id, message_id, "📞 *أرسل رقم هاتف أو واتساب الدعم الفني الجديد للمتجر:*", {"inline_keyboard": [
            [{"text": "إلغاء", "callback_data": "admin_payment_settings"}]
        ]})
        return

    # 12. أزرار القبول والرفض للإدارة
    if data.startswith("approve_"):
        if not is_admin:
            return
        order_num = data.replace("approve_", "")
        order = database.update_order_status(order_num, "completed", "تم القبول والتنفيذ عبر التيليجرام")
        answer_cq(cq_id, "✅ تم إكمال الطلب بنجاح!")
        new_text = message.get("text", "") + "\n\n🟢 *تم القبول والتنفيذ بنجاح بواسطة المدير.*"
        edit_msg(chat_id, message_id, new_text)
        
        # إشعار الزبون إن وُجد الآيدي الخاص به
        if order and order.get('telegram_chat_id'):
            send_msg(order['telegram_chat_id'], (
                f"🎉 *بشرى سارة! تم إكمال طلبك بنجاح!*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"🆔 *رقم الطلب:* `{order_num}`\n"
                f"🏷️ *الخدمة:* {order.get('service_title')} ({order.get('package_name')})\n"
                f"🎯 *الآيدي/الحساب:* `{order.get('target_id')}`\n"
                f"🟢 *الحالة الآن:* مكتمل بنجاح ✓\n"
                f"شكراً لتعاملك معنا ونتمنى لك وقتاً ممتعاً!"
            ))
        return

    if data.startswith("reject_"):
        if not is_admin:
            return
        order_num = data.replace("reject_", "")
        order = database.update_order_status(order_num, "rejected", "تم الرفض بواسطة المدير")
        answer_cq(cq_id, "❌ تم رفض الطلب.")
        new_text = message.get("text", "") + "\n\n🔴 *تم رفض هذا الطلب.*"
        edit_msg(chat_id, message_id, new_text)
        
        if order and order.get('telegram_chat_id'):
            send_msg(order['telegram_chat_id'], (
                f"⚠️ *تنبيه بخصوص طلبك #{order_num}*\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"للأسف تم رفض الطلب. يرجى التأكد من صحة الآيدي أو رقم إشعار التحويل والتواصل مع الدعم الفني."
            ))
        return

    if data.startswith("process_"):
        if not is_admin:
            return
        order_num = data.replace("process_", "")
        order = database.update_order_status(order_num, "processing", "جاري الشحن الآن")
        answer_cq(cq_id, "🔄 حالة الطلب الآن: جاري الشحن.")
        new_text = message.get("text", "") + "\n\n🔵 *حالة الطلب: جاري الشحن والمعالجة الآن...*"
        edit_msg(chat_id, message_id, new_text)
        
        if order and order.get('telegram_chat_id'):
            send_msg(order['telegram_chat_id'], (
                f"🔵 *حالة طلبك #{order_num}:* جاري الشحن والمعالجة الآن من قبل الإدارة..."
            ))
        return

# دالة مساعدة لعرض خيارات الدفع
def show_payment_methods(chat_id, message_id, data):
    kb = [
        [
            {"text": "📱 سيريتل كاش", "callback_data": "pay_syriatel_cash"},
            {"text": "📱 شام كاش", "callback_data": "pay_sham_cash"}
        ],
        [
            {"text": "💎 USDT (TRC-20)", "callback_data": "pay_usdt"}
        ],
        [
            {"text": "❌ إلغاء والعودة", "callback_data": "menu_main"}
        ]
    ]
    summary = (
        f"🧾 *ملخص الطلب وتأكيد الشراء:*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"🏷️ *الخدمة:* {data['service_title']}\n"
        f"📦 *الباقة:* {data['package_name']}\n"
        f"🎯 *الهدف/الحساب:* `{data['target_id']}`\n"
        f"💵 *المبلغ الإجمالي:* *{data['price_usd']}$* ({data['price_local']:,.0f} ل.س)\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"👇 *اختر طريقة الدفع للمتابعة:*"
    )
    if message_id:
        edit_msg(chat_id, message_id, summary, {"inline_keyboard": kb})
    else:
        send_msg(chat_id, summary, {"inline_keyboard": kb})

# =========================================================================
#   معالجة الرسائل النصية والأوامر (handle_message)
# =========================================================================

def handle_message(msg):
    chat_id = msg.get("chat", {}).get("id")
    text = (msg.get("text") or "").strip()
    user_info = msg.get("from", {})
    username = user_info.get("username")
    first_name = user_info.get("first_name", "زبون")
    admin_id = get_admin_chat_id()
    is_admin = (str(chat_id) == admin_id)

    # تسجيل المستخدم في قاعدة البيانات
    database.register_or_update_bot_user(chat_id, username, first_name)

    # 1. أمر /start
    if text.startswith("/start"):
        database.clear_user_session(chat_id)
        settings = database.get_all_settings()
        shop_name = settings.get("shop_name", "متجر الخدمات الرقمية الشاملة")
        welcome = (
            f"👋 *أهلاً بك يا {first_name} في {shop_name}!* 🛍️\n\n"
            f"⚡ يمكنك شحن ألعابك (ببجي، فري فاير، روبلوكس)، شراء اشتراكات (تليجرام، يوتيوب، ChatGPT)، والحصول على أرقام تفعيل SMS فورية.\n\n"
            f"👇 *اختر ما يناسبك من القائمة الرئيسية أدناه:*"
        )
        send_msg(chat_id, welcome, build_main_menu_keyboard(chat_id))
        return

    # 2. أمر /track
    if text.startswith("/track"):
        parts = text.split(maxsplit=1)
        if len(parts) < 2:
            send_msg(chat_id, "⚠️ يرجى كتابة رقم الطلب بعد الأمر. مثال:\n`/track ORD-2409-0001`")
            return
        track_order_lookup(chat_id, parts[1].strip())
        return

    # 3. أمر /stats (خاص بالمدير)
    if text.startswith("/stats"):
        if not is_admin:
            send_msg(chat_id, "⛔ هذا الأمر خاص بمدير المتجر فقط.")
            return
        stats = database.get_stats()
        rate, margin = get_pricing_params()
        count = database.get_bot_user_count()
        stats_msg = (
            f"📊 *إحصائيات المتجر الكاملة*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"👥 الزبائن المسجلين: *{count}*\n"
            f"🛍️ إجمالي الطلبات: *{stats['total_orders']}*\n"
            f"🟢 المكتملة: *{stats['completed_orders']}*\n"
            f"🟡 المعلقة: *{stats['pending_orders']}*\n"
            f"💵 المبيعات (USD): *{stats['total_sales_usd']:,.2f} $*\n"
            f"💰 المبيعات (المحلي): *{stats['total_sales_local']:,.0f} ل.س*\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"💱 سعر الصرف: {rate:,.0f} ل.س | الربح: {margin}%"
        )
        send_msg(chat_id, stats_msg)
        return

    # 4. فحص حالة الجلسة الحالية والخطوات المتعددة (State Machine)
    state, sdata = database.get_user_session(chat_id)

    # انتظار آيدي اللعبة
    if state == "waiting_game_id":
        target_id = text
        sdata['target_id'] = target_id
        database.set_user_session(chat_id, "waiting_payment_method", sdata)
        show_payment_methods(chat_id, None, sdata)
        return

    # انتظار إيميل أو حساب التطبيق
    if state == "waiting_app_target" or state == "waiting_card_target":
        target_id = text
        sdata['target_id'] = target_id
        database.set_user_session(chat_id, "waiting_payment_method", sdata)
        show_payment_methods(chat_id, None, sdata)
        return

    # انتظار رقم إشعار الدفع لتسجيل الطلب
    if state == "waiting_payment_ref":
        payment_ref = text
        sdata['payment_ref'] = payment_ref
        sdata['customer_name'] = f"{first_name} (@{username})" if username else first_name
        sdata['telegram_chat_id'] = chat_id
        
        # إنشاء الطلب في قاعدة البيانات
        order = database.create_order(sdata)
        database.clear_user_session(chat_id)

        # إذا كانت الخدمة رقم تفعيل SMS من Hero-SMS، نقوم بطلب الرقم فوري!
        if sdata.get('service_type') == "sms":
            srv_code = sdata.get('sms_srv')
            c_id = sdata.get('sms_country')
            number_res = hero_order_number(srv_code, c_id)
            if number_res.get('success'):
                act_id = number_res['id']
                phone_num = number_res['number']
                
                # إشعار الزبون برقم الهاتف وزر التحقق من الكود
                kb_num = [
                    [{"text": "🔄 فحص وصول كود التفعيل الآن", "callback_data": f"sms_check_{act_id}"}],
                    [{"text": "❌ إلغاء واسترداد الرقم", "callback_data": f"sms_cancel_{act_id}"}],
                    [{"text": "🔙 القائمة الرئيسية", "callback_data": "menu_main"}]
                ]
                sms_success_msg = (
                    f"🎉 *تم شراء رقم التفعيل بنجاح!* 🎉\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"📱 *رقم الهاتف:* `+{phone_num}`\n"
                    f"🏷️ *الخدمة:* {sdata['service_title']}\n"
                    f"🆔 *رقم الطلب:* `{order['order_num']}`\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"💡 *الخطوات:*\n"
                    f"1. انسخ الرقم بالأعلى بالضغط عليه.\n"
                    f"2. الصقه في التطبيق واطلب كود SMS.\n"
                    f"3. اضغط على زر *«فحص وصول كود التفعيل الآن»* بالأسفل لاستلام الكود مباشرة!"
                )
                send_msg(chat_id, sms_success_msg, {"inline_keyboard": kb_num})
                notify_admin_new_order(order)
                return
            else:
                # في حال نفاد الأرقام
                logger.warning(f"Hero-SMS error: {number_res.get('error')}")

        # الطلبات العادية (شحن ألعاب، اشتراكات، بطاقات)
        notify_admin_new_order(order)

        # رسالة تأكيد للزبون
        client_receipt = (
            f"✅ *تم استلام طلبك بنجاح وهو قيد التنفيذ الآن!* 🎉\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🆔 *رقم الطلب:* `{order['order_num']}`\n"
            f"🏷️ *الخدمة:* {order['service_title']}\n"
            f"📦 *الباقة:* {order['package_name']}\n"
            f"🎯 *الحساب / الآيدي:* `{order['target_id']}`\n"
            f"💵 *المبلغ:* {order['price_usd']}$ ({order['price_local']:,.0f} ل.س)\n"
            f"🧾 *إشعار التحويل:* `{payment_ref}`\n"
            f"⏳ *الحالة:* 🟡 قيد المراجعة والشحن الفوري\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"سيصلك إشعار فوري هنا على التيليجرام بمجرد اكتمال الشحن وتفعيل طلبك! ✓"
        )
        send_msg(chat_id, client_receipt, build_main_menu_keyboard(chat_id))
        return

    # حالة البحث عن دولة لأرقام SMS
    if state == "waiting_country_search":
        srv_code = sdata.get("sms_srv", "wa")
        srv = SMS_SERVICES_DATA.get(srv_code)
        q = text.strip().lower()
        
        matches = []
        for c in SMS_COUNTRIES_DATA:
            aliases = c.get('aliases', [])
            c_name = c['name'].lower()
            if q in c_name or any(q in a.lower() for a in aliases):
                matches.append(c)
                
        if not matches:
            send_msg(chat_id, f"❌ لم نجد دولة باسم `{text}` في القائمة المتاحة حالياً.\nيرجى تجربة اسم آخر أو اختيار الدولة مباشرة من القائمة:", {"inline_keyboard": [
                [{"text": "🔙 تصفح قائمة الدول", "callback_data": f"sms_srv_{srv_code}"}]
            ]})
            return
            
        prices = hero_get_prices(srv_code)
        kb = []
        for c in matches[:8]:
            c_live = prices.get(c['id'], {}).get(srv_code, {}).get('cost')
            cost = float(c_live) if c_live else c['cost']
            usd, local = calculate_prices(cost)
            kb.append([{"text": f"{c['name']} ⇦ {usd}$ ({local:,.0f} ل.س)", "callback_data": f"sms_prep_{srv_code}_{c['id']}"}])
            
        kb.append([{"text": "🔙 العودة لقائمة الدول", "callback_data": f"sms_srv_{srv_code}"}])
        database.clear_user_session(chat_id)
        send_msg(chat_id, f"🎯 *نتائج البحث عن ({text}) لتفعيل {srv['name']}:*", {"inline_keyboard": kb})
        return

    # حالة البحث عن رقم طلب
    if state == "waiting_track_num":
        database.clear_user_session(chat_id)
        track_order_lookup(chat_id, text)
        return

    # أوامر الإدارة التفاعلية
    if is_admin:
        if state == "admin_waiting_rate":
            try:
                new_rate = float(text)
                database.set_setting("exchange_rate", str(new_rate))
                database.clear_user_session(chat_id)
                send_msg(chat_id, f"✅ تم تحديث سعر الصرف بنجاح إلى: *{new_rate:,.0f} ل.س*", build_main_menu_keyboard(chat_id))
            except Exception:
                send_msg(chat_id, "⚠️ يرجى إرسال رقم صحيح لسعر الصرف (مثال: 14800)")
            return

        if state == "admin_waiting_margin":
            try:
                new_margin = float(text)
                database.set_setting("profit_margin", str(new_margin))
                database.clear_user_session(chat_id)
                send_msg(chat_id, f"✅ تم تحديث نسبة الربح بنجاح إلى: *{new_margin} %*", build_main_menu_keyboard(chat_id))
            except Exception:
                send_msg(chat_id, "⚠️ يرجى إرسال نسبة صحيحة (مثال: 20)")
            return

        if state == "admin_waiting_syriatel":
            database.set_setting("syriatel_cash_number", text.strip())
            database.clear_user_session(chat_id)
            send_msg(chat_id, f"✅ تم تحديث رقم سيريتل كاش بنجاح إلى:\n`{text.strip()}`", build_main_menu_keyboard(chat_id))
            return

        if state == "admin_waiting_sham":
            database.set_setting("sham_cash_number", text.strip())
            database.clear_user_session(chat_id)
            send_msg(chat_id, f"✅ تم تحديث رقم شام كاش بنجاح إلى:\n`{text.strip()}`", build_main_menu_keyboard(chat_id))
            return

        if state == "admin_waiting_usdt":
            database.set_setting("usdt_wallet_address", text.strip())
            database.clear_user_session(chat_id)
            send_msg(chat_id, f"✅ تم تحديث عنوان محفظة USDT بنجاح إلى:\n`{text.strip()}`", build_main_menu_keyboard(chat_id))
            return

        if state == "admin_waiting_phone":
            database.set_setting("shop_phone", text.strip())
            database.clear_user_session(chat_id)
            send_msg(chat_id, f"✅ تم تحديث رقم هاتف الدعم الفني بنجاح إلى:\n`{text.strip()}`", build_main_menu_keyboard(chat_id))
            return

        if state == "admin_waiting_broadcast":
            database.clear_user_session(chat_id)
            users = database.get_all_bot_users()
            sent_count = 0
            send_msg(chat_id, f"⏳ جاري إرسال الإذاعة إلى {len(users)} مشترك...")
            for u in users:
                uid = u.get("chat_id")
                if uid and str(uid) != admin_id:
                    try:
                        res = send_msg(uid, f"📢 *إشعار من إدارة المتجر:*\n\n{text}")
                        if res.get("ok"):
                            sent_count += 1
                        time.sleep(0.05)
                    except Exception:
                        pass
            send_msg(chat_id, f"🎉 تمت الإذاعة بنجاح! وصل الإشعار إلى {sent_count} زبون.", build_main_menu_keyboard(chat_id))
            return

    # إذا أرسل المستخدم رقم طلب مباشرة دون أوامر
    if text.upper().startswith("ORD-"):
        track_order_lookup(chat_id, text)
        return

    # رسالة افتراضية
    send_msg(chat_id, "👋 مرحباً بك! يرجى استخدام الأزرار أدناه للتنقل وإتمام طلبك:", build_main_menu_keyboard(chat_id))

def track_order_lookup(chat_id, order_num):
    order = database.get_order_by_num(order_num)
    if not order:
        send_msg(chat_id, f"❌ لم يتم العثور على أي طلب بالرقم `{order_num}`. يرجى التأكد من الرقم.", build_back_keyboard("menu_main"))
        return

    status_icons = {
        "pending": "🟡 قيد المراجعة والتأكيد",
        "processing": "🔵 جاري الشحن والتنفيذ",
        "completed": "🟢 تم التنفيذ بنجاح ✓",
        "rejected": "🔴 ملغي / مرفوض"
    }
    st = status_icons.get(order.get('status'), order.get('status'))
    msg = (
        f"📦 *بيانات الطلب #{order.get('order_num')}*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"🏷️ *الخدمة:* {order.get('service_title')}\n"
        f"📦 *الباقة:* {order.get('package_name')}\n"
        f"🎯 *الآيدي/الحساب:* `{order.get('target_id')}`\n"
        f"💵 *المبلغ:* {order.get('price_usd')} $ ({order.get('price_local'):,.0f} {order.get('currency')})\n"
        f"💳 *طريقة الدفع:* {order.get('payment_method')}\n"
        f"📊 *الحالة الحالية:* *{st}*\n"
        f"🕒 *تاريخ الطلب:* {order.get('created_at')}\n"
    )
    if order.get('admin_notes'):
        msg += f"📝 *ملاحظات الإدارة:* {order.get('admin_notes')}\n"
    msg += "━━━━━━━━━━━━━━━━━━"
    send_msg(chat_id, msg, build_back_keyboard("menu_main"))

def notify_admin_new_order(order):
    """إرسال إشعار فوري لمدير المتجر عند وصول طلب جديد مع أزرار تفاعلية"""
    admin_id = get_admin_chat_id()
    if not admin_id:
        return False

    payment_titles = {
        "syriatel_cash": "سيريتل كاش (Syriatel Cash)",
        "sham_cash": "شام كاش (Sham Cash)",
        "usdt": "USDT TRC-20",
        "bank": "حوالة مصرفية"
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
        f"💵 *السعر:* {order.get('price_usd')} $ ({order.get('price_local'):,.0f} {order.get('currency')})\n"
        f"💳 *طريقة الدفع:* {pay_name}\n"
        f"🧾 *رمز إشعار التحويل:* `{order.get('payment_ref') or 'بدون إشعار'}`\n"
        f"⏳ *الحالة:* 🟡 قيد المراجعة والانتظار\n"
        f"🕒 *التاريخ:* {order.get('created_at')}\n"
        f"━━━━━━━━━━━━━━━━━━"
    )

    reply_markup = {
        "inline_keyboard": [
            [
                {"text": "✅ قبول وإكمال", "callback_data": f"approve_{order.get('order_num')}"},
                {"text": "❌ رفض الطلب", "callback_data": f"reject_{order.get('order_num')}"}
            ],
            [
                {"text": "🔄 جاري الشحن والمعالجة", "callback_data": f"process_{order.get('order_num')}"}
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
    """معالجة جميع التحديثات القادمة من التيليجرام"""
    try:
        if "callback_query" in update:
            handle_callback_query(update["callback_query"])
        elif "message" in update:
            handle_message(update["message"])
    except Exception as e:
        logger.error(f"Error handling update: {e}", exc_info=True)

# =========================================================================
#   خيط الـ Polling المستمر للتشغيل الذاتي
# =========================================================================

_polling_active = False

def start_polling():
    global _polling_active
    if _polling_active:
        return
    _polling_active = True

    def poll_worker():
        offset = 0
        logger.info("Telegram Store Bot Polling Worker started.")
        while _polling_active:
            token = get_bot_token()
            if not token:
                time.sleep(5)
                continue

            try:
                url = f"https://api.telegram.org/bot{token}/getUpdates?offset={offset}&timeout=25"
                resp = requests.get(url, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("ok"):
                        for upd in data.get("result", []):
                            offset = upd["update_id"] + 1
                            handle_update(upd)
            except Exception as e:
                time.sleep(3)
            time.sleep(0.5)

    t = threading.Thread(target=poll_worker, daemon=True)
    t.start()

def run_standalone():
    """تشغيل البوت في وضع نافذة الطرفية المستقلة (Standalone)"""
    # حل مشكلة ترميز الإيموجي على ويندوز
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    token = get_bot_token()
    admin_id = get_admin_chat_id()
    print("=" * 60)
    print("  🤖 بوت متجر الخدمات الرقمية الشامل (Telegram Store Bot)")
    print(f"  🔑 توكن البوت: {token[:12]}... (نشط)")
    print(f"  👑 حساب المدير: {admin_id}")
    print("=" * 60)
    print("  ✓ البوت يعمل الآن ويستمع لكافة الطلبات والرسائل بنجاح...")
    print("  ✓ للإنهاء اضغط Ctrl + C")
    print("=" * 60)

    offset = 0
    # إزالة أي webhook قديم حتى يعمل الـ polling بنجاح
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
            print("\nتم إيقاف البوت.")
            break
        except Exception as e:
            time.sleep(3)
        time.sleep(0.3)

if __name__ == "__main__":
    run_standalone()
