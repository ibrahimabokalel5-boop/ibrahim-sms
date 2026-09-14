# دليل النشر والتشغيل الشامل | GitHub & Render & Telegram Bot

دليل خطوة بخطوة لرفع المتجر الإلكتروني على **GitHub** واستضافته مجاناً مدى الحياة على **Render**، مع ربط إشعارات بوت التيليجرام وميزة تطبيق الهاتف (PWA).

---

## الخطوة 1: تجهيز بوت التيليجرام واستخراج المفاتيح (خلال دقيقة واحدة)

1. افتح تطبيق تيليجرام وابحث عن الحساب الرسمي: **`@BotFather`**
2. أرسل له الأمر: `/newbot`
3. اختر اسماً لمتجرك (مثال: `متجر الخدمات الرقمية`) ثم يوزرنيم ينتهي بـ `bot` (مثال: `MyDigitalStore_bot`).
4. سيعطيك الـ **HTTP API Token** (يبدو هكذا: `7123456789:AAFxAbcDeFGhiJkLmNoPQRsT...`). احتفظ به!
5. لمعرفة معرف حسابك الشخصي (Chat ID):
   - افتح بوت: **`@userinfobot`** واضغط `Start`.
   - سيعطيك رقم حسابك في خانة `Id:` (مثال: `987654321`).
6. يمكنك وضع هذين المفتاحين في إعدادات المتجر مباشرة أو في ملف `.env`.

---

## الخطوة 2: رفع المشروع على GitHub

1. سجّل دخولك إلى موقع [GitHub.com](https://github.com).
2. اضغط على زر **New** لإنشاء مستودع جديد (New Repository).
3. سمّ المستودع مثلاً: `digital-store` واجعله **Public** أو **Private** ثم اضغط **Create repository**.
4. على جهازك في مجلد المشروع، افتح موجه الأوامر (PowerShell أو CMD) ونفّذ الأوامر التالية:

```bash
# 1. تهيئة المستودع وإضافة كافة الملفات
git init
git add .
git commit -m "Initial commit: Complete Digital Store with Telegram Bot and PWA"

# 2. ربط المستودع بحسابك على GitHub (استبدل YOUR_USERNAME باسم حسابك)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/digital-store.git

# 3. رفع الملفات إلى GitHub
git push -u origin main
```

---

## الخطوة 3: الاستضافة المجانية على Render.com

يقدم موقع **Render** استضافة سحابية مجانية تدعم Python و Flask و Gunicorn مع شهادة أمان SSL (HTTPS) مجانية:

1. سجّل حساباً مجانياً على [Render.com](https://render.com) (يمكنك الدخول مباشرة عبر حساب GitHub).
2. اضغط على زر **New +** في أعلى الصفحة واختر **Web Service**.
3. اختر خيار **Build and deploy from a Git repository** واضغط Next.
4. اختر مستودع `digital-store` الذي قمت برفعه للتو واضغط **Connect**.
5. املأ البيانات البسيطة التالية:
   - **Name:** `my-digital-store` (أو أي اسم تفضله)
   - **Region:** `Frankfurt (EU)` (الأقرب للشرق الأوسط وسرعة الاتصال)
   - **Language:** `Python 3`
   - **Branch:** `main`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app_server:app --bind 0.0.0.0:$PORT`
   - **Instance Type:** `Free`
6. في قسم **Environment Variables** (المتغيرات البيئية)، أضف المتغيرات التالية:
   - `TELEGRAM_BOT_TOKEN` = (التوكن الخاص ببوتك من BotFather)
   - `TELEGRAM_ADMIN_CHAT_ID` = (معرف حسابك الشخصي في التيليجرام)
   - `BASE_URL` = (رابط الموقع الذي يوفره لك Render مثل: `https://my-digital-store.onrender.com`)
7. اضغط على زر **Create Web Service** في أسفل الصفحة.
8. خلال دقيقة إلى دقيقتين ستكتمل عملية البناء (Build Successful) وسيصبح متجرك متاحاً أونلاين على الرابط العام!

---

## الخطوة 4: تفعيل الـ Webhook لبوت التيليجرام تلقائياً

بمجرد الحصول على رابط Render العام (مثال: `https://my-digital-store.onrender.com`):
1. يمكنك فتح المتصفح والدخول إلى هذا الرابط لربط الـ Webhook مع تيليجرام:
   `https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://my-digital-store.onrender.com/api/telegram/webhook`
2. الآن أصبح البوت يعمل لحظياً على السحابة:
   - أي زبون يطلب أي خدمة، سيصلك إشعار فوري مع أزرار:
     - `[✅ قبول وإكمال]`
     - `[❌ رفض الطلب]`
     - `[🔄 جاري الشحن]`
   - الزبائن يستطيعون فتح المتجر كتطبيق مصغر داخل التيليجرام (Telegram WebApp)!

---

## الخطوة 5: ميزة تثبيت تطبيق الهاتف (PWA)

- **على هواتف أندرويد (Chrome):**
  - بمجرد فتح رابط المتجر، سيظهر شريط علوي جذاب: *"تطبيق المتجر متاح للتثبيت! تثبيت التطبيق ⚡"*.
  - عند الضغط عليه، يُثبت التطبيق فوراً بأيقونة وشاشة إقلاع كاملة ويعمل كتطبيق Native منفصل عن المتصفح.
- **على هواتف آيفون (Safari):**
  - افتح الرابط في Safari، اضغط على زر المشاركة (مربع بسهم للأعلى 📤)، واختر **"إضافة إلى الشاشة الرئيسية (Add to Home Screen)"**.
