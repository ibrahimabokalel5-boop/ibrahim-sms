"""
Database Layer - SQLite for Digital Services E-Commerce Store
إدارة قاعدة البيانات للطلبات، الإعدادات، وأسعار الصرف
"""
import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'store.db')

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # جدول الطلبات (Orders)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_num TEXT UNIQUE NOT NULL,
        service_type TEXT NOT NULL,
        service_title TEXT NOT NULL,
        package_id TEXT,
        package_name TEXT NOT NULL,
        target_id TEXT NOT NULL,
        customer_name TEXT,
        customer_phone TEXT,
        price_usd REAL NOT NULL,
        price_local REAL NOT NULL,
        currency TEXT DEFAULT 'ل.س',
        payment_method TEXT NOT NULL,
        payment_ref TEXT,
        status TEXT DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    # جدول الإعدادات العامة (Settings)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    ''')

    # إدخال الإعدادات الافتراضية إن لم تكن موجودة
    default_settings = {
        'shop_name': 'منصة الخدمات الرقمية الشاملة',
        'shop_phone': '+963 900 000 000',
        'exchange_rate': '14500',
        'profit_margin': '20',
        'syriatel_cash_number': '0900000000',
        'sham_cash_number': '0900000000',
        'usdt_wallet_address': 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
        'telegram_bot_token': '',
        'telegram_admin_chat_id': '',
        'hero_sms_api_key': 'f144cA86391f362758c129f14dc33fc9',
        'admin_password': 'admin'
    }

    for k, v in default_settings.items():
        cursor.execute('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', (k, v))

    conn.commit()
    conn.close()

def generate_order_number():
    """توليد رقم طلب تسلسلي مميز مثل ORD-2409-1001"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM orders')
    count = cursor.fetchone()[0] + 1
    conn.close()
    date_prefix = datetime.now().strftime('%y%m')
    return f"ORD-{date_prefix}-{count:04d}"

def create_order(data):
    """إضافة طلب جديد إلى قاعدة البيانات"""
    order_num = data.get('order_num') or generate_order_number()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO orders (
            order_num, service_type, service_title, package_id, package_name,
            target_id, customer_name, customer_phone, price_usd, price_local,
            currency, payment_method, payment_ref, status, admin_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        order_num,
        data.get('service_type', 'games'),
        data.get('service_title', 'خدمة رقمية'),
        data.get('package_id', ''),
        data.get('package_name', 'باقة مخصصة'),
        data.get('target_id', ''),
        data.get('customer_name', 'زبون المتجر'),
        data.get('customer_phone', ''),
        float(data.get('price_usd', 0.0)),
        float(data.get('price_local', 0.0)),
        data.get('currency', 'ل.س'),
        data.get('payment_method', 'syriatel_cash'),
        data.get('payment_ref', ''),
        data.get('status', 'pending'),
        data.get('admin_notes', '')
    ))
    conn.commit()
    
    cursor.execute('SELECT * FROM orders WHERE order_num = ?', (order_num,))
    row = cursor.fetchone()
    order_dict = dict(row) if row else None
    conn.close()
    return order_dict

def get_order_by_num(order_num):
    """البحث عن طلب برقم الطلب"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM orders WHERE order_num = ?', (order_num.strip(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def search_orders(query):
    """البحث برقم الطلب أو برقم هاتف الزبون أو بمعرف اللاعب"""
    conn = get_connection()
    cursor = conn.cursor()
    q = f"%{query.strip()}%"
    cursor.execute('''
        SELECT * FROM orders 
        WHERE order_num LIKE ? OR customer_phone LIKE ? OR target_id LIKE ? 
        ORDER BY id DESC LIMIT 20
    ''', (q, q, q))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_orders_list(status=None, limit=100, offset=0):
    """جلب قائمة الطلبات للإدارة مع دعم الفلترة"""
    conn = get_connection()
    cursor = conn.cursor()
    if status and status != 'all':
        cursor.execute('SELECT * FROM orders WHERE status = ? ORDER BY id DESC LIMIT ? OFFSET ?', (status, limit, offset))
    else:
        cursor.execute('SELECT * FROM orders ORDER BY id DESC LIMIT ? OFFSET ?', (limit, offset))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def update_order_status(order_num, status, admin_notes=None):
    """تحديث حالة الطلب (pending, processing, completed, rejected)"""
    conn = get_connection()
    cursor = conn.cursor()
    if admin_notes is not None:
        cursor.execute('''
            UPDATE orders 
            SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE order_num = ?
        ''', (status, admin_notes, order_num))
    else:
        cursor.execute('''
            UPDATE orders 
            SET status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE order_num = ?
        ''', (status, order_num))
    conn.commit()
    
    cursor.execute('SELECT * FROM orders WHERE order_num = ?', (order_num,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_stats():
    """إحصائيات المبيعات والأرباح والطلبات"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM orders')
    total_orders = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM orders WHERE status = 'completed'")
    completed_orders = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM orders WHERE status = 'pending'")
    pending_orders = cursor.fetchone()[0]
    
    cursor.execute("SELECT SUM(price_local) FROM orders WHERE status = 'completed'")
    total_sales_local = cursor.fetchone()[0] or 0.0
    
    cursor.execute("SELECT SUM(price_usd) FROM orders WHERE status = 'completed'")
    total_sales_usd = cursor.fetchone()[0] or 0.0

    conn.close()
    return {
        'total_orders': total_orders,
        'completed_orders': completed_orders,
        'pending_orders': pending_orders,
        'total_sales_local': total_sales_local,
        'total_sales_usd': total_sales_usd
    }

def get_all_settings():
    """جلب جميع الإعدادات"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT key, value FROM settings')
    rows = cursor.fetchall()
    conn.close()
    return {r['key']: r['value'] for r in rows}

def set_setting(key, value):
    """تحديث أو إضافة إعداد"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', (key, str(value)))
    conn.commit()
    conn.close()

# تهيئة قاعدة البيانات عند أول استدعاء
init_db()
