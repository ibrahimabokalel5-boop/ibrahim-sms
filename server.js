/**
 * Hero-SMS Bot — النسخة المتقدمة
 * ميزات: إحصائيات، تنبيهات، شراء ذكي، أرقام متعددة، لوحة ويب، متعدد المستخدمين
 */
require('dotenv').config();
const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =========================================================================
//   التحقق من المتغيرات البيئية الضرورية
// =========================================================================

const REQUIRED_VARS = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_ADMIN_CHAT_ID', 'HERO_SMS_KEY'];
for (const v of REQUIRED_VARS) {
  if (!process.env[v]) {
    console.error(`❌ متغير البيئة "${v}" مفقود في ملف .env`);
    process.exit(1);
  }
}

const TELEGRAM_BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN.trim();
const TELEGRAM_ADMIN_CHAT_ID = String(process.env.TELEGRAM_ADMIN_CHAT_ID).trim();
const HERO_SMS_KEY           = process.env.HERO_SMS_KEY.trim();
const PORT                   = process.env.PORT || 8080;
const WEBHOOK_URL            = (process.env.WEBHOOK_URL || '').trim().replace(/\/$/, '');
const WEBHOOK_SECRET         = (process.env.WEBHOOK_SECRET || '').trim();
const LOW_BALANCE_THRESHOLD  = parseFloat(process.env.LOW_BALANCE_THRESHOLD || '1.00');

const HERO_SMS_URL = 'https://hero-sms.com/stubs/handler_api.php';

// =========================================================================
//   قاعدة البيانات (ملف JSON)
// =========================================================================

const DB_PATH = path.join(__dirname, 'data', 'stats.json');

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { purchases: [], users: {}, totalSpent: 0, totalPurchases: 0 };
  }
}

function saveDB(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function recordPurchase({ chatId, service, serviceName, countryId, countryName, number, activationId, cost }) {
  const db = loadDB();
  const entry = {
    id: activationId,
    chatId,
    service,
    serviceName,
    countryId,
    countryName,
    number,
    cost,
    code: null,
    status: 'waiting',
    time: new Date().toISOString()
  };
  db.purchases.unshift(entry);
  if (db.purchases.length > 500) db.purchases = db.purchases.slice(0, 500);
  db.totalPurchases = (db.totalPurchases || 0) + 1;
  db.totalSpent     = parseFloat(((db.totalSpent || 0) + cost).toFixed(4));

  // إحصائيات المستخدم
  if (!db.users[chatId]) db.users[chatId] = { totalPurchases: 0, totalSpent: 0, balance: 0 };
  db.users[chatId].totalPurchases++;
  db.users[chatId].totalSpent = parseFloat((db.users[chatId].totalSpent + cost).toFixed(4));

  saveDB(db);
  return entry;
}

function updatePurchaseCode(activationId, code, status = 'done') {
  const db = loadDB();
  const entry = db.purchases.find(p => p.id === activationId);
  if (entry) { entry.code = code; entry.status = status; }
  saveDB(db);
}

// =========================================================================
//   بيانات التطبيقات والدول
// =========================================================================

const SERVICES_DATA = {
  wa: { name: 'واتساب',        icon: '💬', code: 'wa' },
  tg: { name: 'تيليجرام',      icon: '✈️', code: 'tg' },
  lf: { name: 'تيك توك',       icon: '🎵', code: 'lf' },
  go: { name: 'جوجل / يوتيوب', icon: '🔍', code: 'go' },
  fb: { name: 'فيسبوك',        icon: '📘', code: 'fb' },
  ig: { name: 'إنستغرام',      icon: '📷', code: 'ig' },
  fu: { name: 'سناب شات',      icon: '👻', code: 'fu' },
  tw: { name: 'تويتر / إكس',   icon: '🐦', code: 'tw' },
  ds: { name: 'ديسكورد',       icon: '👾', code: 'ds' },
  vi: { name: 'فايبر',         icon: '📞', code: 'vi' },
  nf: { name: 'نتفليكس',       icon: '🍿', code: 'nf' },
  ot: { name: 'أي تطبيق آخر',  icon: '🌐', code: 'ot' }
};

const COUNTRIES_DATA = [
  { id: '4',   name: '🇵🇭 الفلبين',      cost: 0.05, aliases: ['فلبين', 'philippines'] },
  { id: '6',   name: '🇮🇩 إندونيسيا',    cost: 0.08, aliases: ['اندونيسيا', 'indonesia'] },
  { id: '22',  name: '🇮🇳 الهند',         cost: 0.12, aliases: ['الهند', 'india'] },
  { id: '19',  name: '🇳🇬 نيجيريا',       cost: 0.10, aliases: ['نيجيريا', 'nigeria'] },
  { id: '10',  name: '🇻🇳 فيتنام',        cost: 0.15, aliases: ['فيتنام', 'vietnam'] },
  { id: '37',  name: '🇲🇦 المغرب',        cost: 0.15, aliases: ['المغرب', 'morocco'] },
  { id: '21',  name: '🇪🇬 مصر',           cost: 0.20, aliases: ['مصر', 'egypt'] },
  { id: '8',   name: '🇰🇪 كينيا',         cost: 0.20, aliases: ['كينيا'] },
  { id: '114', name: '🇱🇰 سريلانكا',      cost: 0.25, aliases: ['سريلانكا'] },
  { id: '31',  name: '🇿🇦 جنوب أفريقيا', cost: 0.30, aliases: ['جنوب افريقيا'] },
  { id: '7',   name: '🇲🇾 ماليزيا',       cost: 0.30, aliases: ['ماليزيا'] },
  { id: '58',  name: '🇩🇿 الجزائر',       cost: 0.30, aliases: ['الجزائر', 'algeria'] },
  { id: '0',   name: '🇷🇺 روسيا',         cost: 0.35, aliases: ['روسيا', 'russia'] },
  { id: '2',   name: '🇰🇿 كازاخستان',     cost: 0.35, aliases: ['كازاخستان', 'kazakhstan'] },
  { id: '33',  name: '🇨🇴 كولومبيا',      cost: 0.35, aliases: ['كولومبيا', 'colombia'] },
  { id: '40',  name: '🇺🇿 أوزبكستان',    cost: 0.35, aliases: ['اوزبكستان'] },
  { id: '11',  name: '🇰🇬 قيرغيزستان',    cost: 0.35, aliases: ['قيرغيزستان'] },
  { id: '35',  name: '🇦🇿 أذربيجان',      cost: 0.35, aliases: ['اذربيجان'] },
  { id: '1',   name: '🇺🇦 أوكرانيا',      cost: 0.40, aliases: ['اوكرانيا', 'ukraine'] },
  { id: '32',  name: '🇷🇴 رومانيا',       cost: 0.40, aliases: ['رومانيا', 'romania'] },
  { id: '73',  name: '🇧🇷 البرازيل',      cost: 0.45, aliases: ['البرازيل', 'brazil'] },
  { id: '47',  name: '🇮🇶 العراق',        cost: 0.45, aliases: ['العراق', 'iraq'] },
  { id: '116', name: '🇯🇴 الأردن',        cost: 0.45, aliases: ['الاردن', 'jordan'] },
  { id: '3',   name: '🇨🇳 الصين',         cost: 0.45, aliases: ['الصين', 'china'] },
  { id: '15',  name: '🇵🇱 بولندا',        cost: 0.50, aliases: ['بولندا', 'poland'] },
  { id: '30',  name: '🇾🇪 اليمن',         cost: 0.50, aliases: ['اليمن', 'yemen'] },
  { id: '14',  name: '🇭🇰 هونغ كونغ',    cost: 0.50, aliases: ['هونغ كونغ'] },
  { id: '34',  name: '🇪🇪 إستونيا',       cost: 0.60, aliases: ['استونيا'] },
  { id: '16',  name: '🇬🇧 بريطانيا',      cost: 0.70, aliases: ['بريطانيا', 'انكلترا', 'uk'] },
  { id: '62',  name: '🇹🇷 تركيا',         cost: 0.80, aliases: ['تركيا', 'turkey'] },
  { id: '48',  name: '🇳🇱 هولندا',        cost: 0.80, aliases: ['هولندا', 'netherlands'] },
  { id: '56',  name: '🇪🇸 إسبانيا',       cost: 0.80, aliases: ['اسبانيا', 'spain'] },
  { id: '187', name: '🇺🇸 أمريكا',        cost: 0.85, aliases: ['امريكا', 'usa'] },
  { id: '43',  name: '🇩🇪 ألمانيا',       cost: 0.85, aliases: ['المانيا', 'germany'] },
  { id: '78',  name: '🇫🇷 فرنسا',         cost: 0.85, aliases: ['فرنسا', 'france'] },
  { id: '36',  name: '🇨🇦 كندا',          cost: 0.85, aliases: ['كندا', 'canada'] },
  { id: '86',  name: '🇮🇹 إيطاليا',       cost: 0.85, aliases: ['ايطاليا', 'italy'] },
  { id: '53',  name: '🇸🇦 السعودية',      cost: 0.90, aliases: ['السعودية', 'saudi'] },
  { id: '95',  name: '🇦🇪 الإمارات',      cost: 0.90, aliases: ['الامارات', 'uae'] }
];

// =========================================================================
//   Hero-SMS API
// =========================================================================

async function heroApiCall(params) {
  const query = new URLSearchParams({ api_key: HERO_SMS_KEY, ...params }).toString();
  try {
    const res = await fetch(`${HERO_SMS_URL}?${query}`, { signal: AbortSignal.timeout(12000) });
    return (await res.text()).trim();
  } catch (err) {
    console.error('Hero-SMS API Error:', err.message);
    return `ERROR:${err.message}`;
  }
}

async function heroGetBalance() {
  const res = await heroApiCall({ action: 'getBalance' });
  if (res.startsWith('ACCESS_BALANCE:')) {
    const val = parseFloat(res.split(':')[1]);
    return isNaN(val) ? 0 : val;
  }
  return 0;
}

async function heroGetBalanceStr() {
  const val = await heroGetBalance();
  return `${val.toFixed(2)} $`;
}

let pricesCache = {};
let pricesCacheTime = {};

async function heroGetPrices(service) {
  const now = Date.now();
  if (pricesCache[service] && now - (pricesCacheTime[service] || 0) < 60000) return pricesCache[service];
  try {
    const query = new URLSearchParams({ api_key: HERO_SMS_KEY, action: 'getPrices', service }).toString();
    const res = await fetch(`${HERO_SMS_URL}?${query}`, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      pricesCache[service] = data;
      pricesCacheTime[service] = now;
      return data;
    }
  } catch (_) {}
  return pricesCache[service] || {};
}

async function heroBuyNumber(service, country) {
  const res = await heroApiCall({ action: 'getNumber', service, country });
  if (res.startsWith('ACCESS_NUMBER:')) {
    const parts = res.split(':');
    return { ok: true, activationId: parts[1], number: parts[2] };
  }
  if (res.includes('NO_NUMBERS')) return { ok: false, error: '⚠️ لا توجد أرقام متوفرة حالياً.\nجرب دولة أخرى أو تطبيقاً آخر.' };
  if (res.includes('NO_BALANCE'))  return { ok: false, error: '💳 رصيدك في Hero-SMS غير كافٍ.\nيرجى شحن حسابك أولاً.' };
  return { ok: false, error: `تعذر الشراء: ${res}` };
}

async function heroGetStatus(id)    { return await heroApiCall({ action: 'getStatus', id }); }
async function heroCancelNumber(id) { return await heroApiCall({ action: 'setStatus', id, status: '8' }); }

// =========================================================================
//   تنبيه الرصيد المنخفض (فحص كل 30 دقيقة)
// =========================================================================

let lastBalanceWarned = false;

async function checkBalanceAlert() {
  try {
    const bal = await heroGetBalance();
    if (bal <= LOW_BALANCE_THRESHOLD && !lastBalanceWarned) {
      lastBalanceWarned = true;
      await sendMsg(TELEGRAM_ADMIN_CHAT_ID,
        `⚠️ *تحذير: رصيد منخفض!*\n\n` +
        `💰 *الرصيد الحالي:* \`${bal.toFixed(2)} $\`\n` +
        `📉 وصل إلى حد التنبيه: \`${LOW_BALANCE_THRESHOLD} $\`\n\n` +
        `يرجى شحن حساب Hero-SMS لمواصلة الشراء.`,
        { inline_keyboard: [[{ text: '🔄 تحديث الرصيد', callback_data: 'refresh_balance' }]] }
      );
    } else if (bal > LOW_BALANCE_THRESHOLD) {
      lastBalanceWarned = false;
    }
  } catch (err) {
    console.error('Balance check error:', err.message);
  }
}

// =========================================================================
//   Telegram API
// =========================================================================

async function tgCall(method, body) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram ${method} Error:`, err.message);
    return { ok: false };
  }
}

const sendMsg  = (chatId, text, replyMarkup = null) =>
  tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', ...(replyMarkup && { reply_markup: replyMarkup }) });

const editMsg  = (chatId, messageId, text, replyMarkup = null) =>
  tgCall('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown', ...(replyMarkup && { reply_markup: replyMarkup }) });

const answerCb = (id, text = '', alert = false) =>
  tgCall('answerCallbackQuery', { callback_query_id: id, text, show_alert: alert });

// =========================================================================
//   التحقق من صلاحية المستخدم (مدير أم مستخدم عادي مُضاف)
// =========================================================================

function isAdmin(chatId)     { return chatId === TELEGRAM_ADMIN_CHAT_ID; }

function getUser(chatId) {
  const db = loadDB();
  return db.users[chatId] || null;
}

function isAllowedUser(chatId) {
  if (isAdmin(chatId)) return true;
  const user = getUser(chatId);
  return user && user.active;
}

function getUserBalance(chatId) {
  const db = loadDB();
  return db.users[chatId]?.balance ?? 0;
}

// =========================================================================
//   مراقبة وصول كود التفعيل تلقائياً
// =========================================================================

const activeMonitors = new Map();

async function monitorSmsCode(chatId, activationId, number, serviceName, countryName, cost) {
  const startTime = Date.now();
  const TIMEOUT_SEC = 120; // دقيقتان

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    if (activeMonitors.get(activationId) === 'cancelled') return;

    const elapsed   = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, TIMEOUT_SEC - elapsed);

    const st = await heroGetStatus(activationId);
    if (st.startsWith('STATUS_OK:')) {
      const code = st.split(':')[1];
      activeMonitors.delete(activationId);
      updatePurchaseCode(activationId, code, 'done');

      await sendMsg(chatId,
        `🎉 *وصل الكود بنجاح!*\n\n` +
        `${SERVICES_DATA[serviceName]?.icon || '📱'} *التطبيق:* ${SERVICES_DATA[serviceName]?.name || serviceName}\n` +
        `🌍 *الدولة:* ${countryName}\n` +
        `📱 *الرقم:* \`+${number}\`\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🔑 *كود التفعيل:*\n` +
        `\`${code}\`\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `_(اضغط على الكود لنسخه فوراً)_ ✅`,
        { inline_keyboard: [
          [{ text: '🛒 شراء رقم جديد',    callback_data: 'menu_services' }],
          [{ text: '📊 إحصائياتي',         callback_data: 'my_stats' }],
          [{ text: '🏠 القائمة الرئيسية',  callback_data: 'menu_main' }]
        ]}
      );
      return;
    }
  }

  activeMonitors.delete(activationId);
  updatePurchaseCode(activationId, null, 'timeout');

  await sendMsg(chatId,
    `⏰ *انتهى وقت الانتظار دون وصول الكود.*\n\n` +
    `📱 الرقم: \`+${number}\`\n` +
    `يمكنك استرداد رصيدك عبر إلغاء الرقم.`,
    { inline_keyboard: [
      [{ text: '❌ إلغاء واسترداد الرصيد', callback_data: `cancel_num_${activationId}` }],
      [{ text: '🏠 القائمة الرئيسية',      callback_data: 'menu_main' }]
    ]}
  );
}

// =========================================================================
//   الشراء الذكي التلقائي (أرخص دولة مع إعادة المحاولة)
// =========================================================================

async function smartBuy(chatId, service, maxRetries = 3) {
  const srv  = SERVICES_DATA[service] || { name: service, icon: '📱' };
  const sorted = [...COUNTRIES_DATA].sort((a, b) => a.cost - b.cost);

  await sendMsg(chatId,
    `🤖 *الشراء الذكي — ${srv.icon} ${srv.name}*\n\n` +
    `⏳ جاري البحث عن أرخص رقم متوفر...`
  );

  for (let i = 0; i < Math.min(maxRetries, sorted.length); i++) {
    const country = sorted[i];
    const res     = await heroBuyNumber(service, country.id);

    if (res.ok) {
      const { activationId: actId, number: num } = res;
      activeMonitors.set(actId, 'active');
      recordPurchase({ chatId, service, serviceName: service, countryId: country.id, countryName: country.name, number: num, activationId: actId, cost: country.cost });
      monitorSmsCode(chatId, actId, num, service, country.name, country.cost);

      await sendMsg(chatId,
        `✅ *تم الشراء الذكي بنجاح!*\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `${srv.icon} *التطبيق:* ${srv.name}\n` +
        `🌍 *الدولة:* ${country.name}\n` +
        `📱 *الرقم:* \`+${num}\`\n` +
        `💰 *التكلفة:* \`${country.cost.toFixed(2)} $\`\n` +
        `🔢 *المحاولة:* ${i + 1}/${maxRetries}\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⏳ *جارٍ انتظار كود SMS...*`,
        { inline_keyboard: [
          [{ text: '🔄 فحص الكود يدوياً',   callback_data: `check_code_${actId}_${num}` }],
          [{ text: '❌ إلغاء واسترداد الرصيد', callback_data: `cancel_num_${actId}` }],
          [{ text: '🏠 القائمة الرئيسية',    callback_data: 'menu_main' }]
        ]}
      );
      return;
    }

    if (res.error.includes('NO_BALANCE')) {
      await sendMsg(chatId, `💳 *رصيد غير كافٍ!* يرجى شحن حساب Hero-SMS.`);
      return;
    }

    await sendMsg(chatId,
      `⚠️ *المحاولة ${i + 1} فشلت* (${country.name})\nجاري تجربة الدولة التالية...`
    );
    await new Promise(r => setTimeout(r, 1000));
  }

  await sendMsg(chatId,
    `❌ *فشل الشراء الذكي*\n\nتعذر العثور على رقم متوفر بعد ${maxRetries} محاولات.\nحاول يدوياً أو غيّر التطبيق.`,
    { inline_keyboard: [[{ text: '📱 اختيار تطبيق يدوياً', callback_data: 'menu_services' }]] }
  );
}

// =========================================================================
//   الأرقام النشطة حالياً
// =========================================================================

function buildActiveNumbersMsg() {
  const active = [];
  for (const [actId, status] of activeMonitors.entries()) {
    if (status === 'active') active.push(actId);
  }
  return active;
}

// =========================================================================
//   الإحصائيات
// =========================================================================

async function buildStatsMsg(chatId) {
  const db  = loadDB();
  const bal = await heroGetBalanceStr();

  if (isAdmin(chatId)) {
    // إحصائيات كاملة للمدير
    const topServices = {};
    const topCountries = {};
    for (const p of db.purchases) {
      topServices[p.serviceName]   = (topServices[p.serviceName]   || 0) + 1;
      topCountries[p.countryName]  = (topCountries[p.countryName]  || 0) + 1;
    }
    const bestSvc = Object.entries(topServices).sort((a, b) => b[1] - a[1])[0];
    const bestCtry = Object.entries(topCountries).sort((a, b) => b[1] - a[1])[0];
    const done    = db.purchases.filter(p => p.status === 'done').length;
    const timeout = db.purchases.filter(p => p.status === 'timeout').length;

    return (
      `📊 *الإحصائيات الكاملة*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `💰 *الرصيد الحالي:* \`${bal}\`\n` +
      `🛒 *إجمالي الشراء:* ${db.totalPurchases} رقم\n` +
      `💸 *إجمالي المنفق:* \`${(db.totalSpent || 0).toFixed(2)} $\`\n` +
      `✅ *أكواد وصلت:* ${done}\n` +
      `⏰ *انتهت بدون كود:* ${timeout}\n` +
      `👥 *المستخدمون:* ${Object.keys(db.users).length}\n\n` +
      `🏆 *الأكثر استخداماً:*\n` +
      (bestSvc  ? `   📱 تطبيق: ${SERVICES_DATA[bestSvc[0]]?.name || bestSvc[0]} (${bestSvc[1]} مرة)\n`  : '') +
      (bestCtry ? `   🌍 دولة: ${bestCtry[0]} (${bestCtry[1]} مرة)\n`  : '')
    );
  } else {
    // إحصائيات المستخدم العادي
    const user = db.users[chatId] || {};
    return (
      `📊 *إحصائياتي*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `🛒 *أرقامي المشتراة:* ${user.totalPurchases || 0}\n` +
      `💸 *مجموع ما أنفقته:* \`${(user.totalSpent || 0).toFixed(2)} $\`\n`
    );
  }
}

async function buildHistoryMsg(chatId) {
  const db  = loadDB();
  let purchases = isAdmin(chatId)
    ? db.purchases.slice(0, 10)
    : db.purchases.filter(p => p.chatId === chatId).slice(0, 10);

  if (!purchases.length) return '📋 *لا توجد عمليات مسجلة بعد.*';

  let msg = `📋 *آخر ${purchases.length} عملية:*\n━━━━━━━━━━━━━━━━━━\n\n`;
  for (const p of purchases) {
    const date  = new Date(p.time).toLocaleDateString('ar-EG');
    const icon  = SERVICES_DATA[p.service]?.icon || '📱';
    const badge = p.status === 'done' ? '✅' : p.status === 'timeout' ? '⏰' : p.status === 'cancelled' ? '❌' : '⏳';
    msg += `${badge} ${icon} *${SERVICES_DATA[p.service]?.name || p.service}*\n`;
    msg += `   🌍 ${p.countryName} · 📱 \`+${p.number}\`\n`;
    if (p.code) msg += `   🔑 الكود: \`${p.code}\`\n`;
    msg += `   📅 ${date} · 💰 ${p.cost.toFixed(2)}$\n\n`;
  }
  return msg;
}

// =========================================================================
//   إدارة المستخدمين (للمدير فقط)
// =========================================================================

function addUser(chatId, balance = 0) {
  const db = loadDB();
  if (!db.users[chatId]) db.users[chatId] = { totalPurchases: 0, totalSpent: 0, balance: 0, active: false };
  db.users[chatId].active  = true;
  db.users[chatId].balance = balance;
  saveDB(db);
}

function removeUser(chatId) {
  const db = loadDB();
  if (db.users[chatId]) db.users[chatId].active = false;
  saveDB(db);
}

function topupUser(chatId, amount) {
  const db = loadDB();
  if (!db.users[chatId]) db.users[chatId] = { totalPurchases: 0, totalSpent: 0, balance: 0, active: true };
  db.users[chatId].balance = parseFloat(((db.users[chatId].balance || 0) + amount).toFixed(2));
  saveDB(db);
}

function listUsers() {
  const db = loadDB();
  return Object.entries(db.users)
    .filter(([, u]) => u.active)
    .map(([id, u]) => ({ id, ...u }));
}

// =========================================================================
//   بناء الرسائل والأزرار
// =========================================================================

async function getWelcomeMsg(chatId) {
  const bal    = await heroGetBalanceStr();
  const admin  = isAdmin(chatId);
  const active = buildActiveNumbersMsg().length;

  return {
    text:
      `🤖 *بوت أرقام التفعيل*${admin ? ' — 👑 المدير' : ''}\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `💰 *الرصيد الحالي:* \`${bal}\`\n` +
      (active ? `⚡ *أرقام نشطة الآن:* ${active}\n` : '') +
      `\nشراء أرقام تفعيل مؤقتة مباشرة من\n` +
      `*Hero-SMS* بنقرة واحدة فقط ⚡\n\n` +
      `👇 *اختر ما تريد:*`,
    keyboard: {
      inline_keyboard: [
        [{ text: '📱 شراء رقم تفعيل جديد',   callback_data: 'menu_services' }],
        [{ text: '🤖 شراء ذكي تلقائي',        callback_data: 'menu_smart_buy' }],
        [
          { text: `💰 رصيدي: ${bal}`, callback_data: 'refresh_balance' },
          { text: '🔄 تحديث',          callback_data: 'refresh_balance' }
        ],
        [
          { text: '📊 إحصائياتي',    callback_data: 'my_stats' },
          { text: '📋 السجل',        callback_data: 'my_history' }
        ],
        ...(active ? [[{ text: `⚡ الأرقام النشطة (${active})`, callback_data: 'active_numbers' }]] : []),
        ...(admin  ? [[{ text: '👥 إدارة المستخدمين', callback_data: 'admin_users' }]] : [])
      ]
    }
  };
}

function buildServicesKeyboard(prefix = 'svc') {
  const entries = Object.entries(SERVICES_DATA);
  const kb = [];
  for (let i = 0; i < entries.length; i += 2) {
    const row = [];
    row.push({ text: `${entries[i][1].icon} ${entries[i][1].name}`, callback_data: `${prefix}_${entries[i][0]}` });
    if (entries[i + 1]) row.push({ text: `${entries[i + 1][1].icon} ${entries[i + 1][1].name}`, callback_data: `${prefix}_${entries[i + 1][0]}` });
    kb.push(row);
  }
  kb.push([{ text: '🏠 القائمة الرئيسية', callback_data: 'menu_main' }]);
  return { inline_keyboard: kb };
}

async function buildCountriesKeyboard(serviceCode, page = 0) {
  const pageSize   = 8;
  const totalPages = Math.ceil(COUNTRIES_DATA.length / pageSize);
  page = Math.max(0, Math.min(page, totalPages - 1));
  const countries = COUNTRIES_DATA.slice(page * pageSize, (page + 1) * pageSize);
  const prices    = await heroGetPrices(serviceCode);
  const kb        = [];

  if (page === 0) {
    const cheapest = COUNTRIES_DATA.reduce((p, c) => c.cost < p.cost ? c : p);
    kb.push([{ text: `⚡ أرخص دولة: ${cheapest.name} (~${cheapest.cost.toFixed(2)}$)`, callback_data: `buy_now_${serviceCode}_${cheapest.id}` }]);
  }

  for (const c of countries) {
    const live = prices?.[c.id]?.[serviceCode]?.cost;
    const cost = live ? parseFloat(live) : c.cost;
    kb.push([{ text: `${c.name}  ·  ${cost.toFixed(2)} $`, callback_data: `buy_now_${serviceCode}_${c.id}` }]);
  }

  const nav = [];
  if (page > 0)              nav.push({ text: '◀️ السابق', callback_data: `page_${serviceCode}_${page - 1}` });
  nav.push({ text: `${page + 1} / ${totalPages}`, callback_data: 'noop' });
  if (page < totalPages - 1) nav.push({ text: 'التالي ▶️', callback_data: `page_${serviceCode}_${page + 1}` });
  if (nav.length) kb.push(nav);

  kb.push([{ text: '🔍 ابحث عن دولة', callback_data: `search_country_${serviceCode}` }]);
  kb.push([
    { text: '◀️ رجوع للتطبيقات', callback_data: 'menu_services' },
    { text: '🏠 الرئيسية',       callback_data: 'menu_main' }
  ]);

  return { inline_keyboard: kb };
}

// =========================================================================
//   إدارة الجلسات
// =========================================================================

const userSessions = new Map();

// =========================================================================
//   معالجة الأوامر النصية
// =========================================================================

async function handleCommand(chatId, text) {
  const parts   = text.trim().split(/\s+/);
  const cmd     = parts[0].toLowerCase();
  const args    = parts.slice(1);

  // /start أو /help
  if (cmd === '/start' || cmd === '/help') {
    const { text: t, keyboard } = await getWelcomeMsg(chatId);
    await sendMsg(chatId, t, keyboard);
    return true;
  }

  // /stats
  if (cmd === '/stats') {
    await sendMsg(chatId, await buildStatsMsg(chatId),
      { inline_keyboard: [[{ text: '🏠 الرئيسية', callback_data: 'menu_main' }]] }
    );
    return true;
  }

  // /history
  if (cmd === '/history') {
    await sendMsg(chatId, await buildHistoryMsg(chatId),
      { inline_keyboard: [[{ text: '🏠 الرئيسية', callback_data: 'menu_main' }]] }
    );
    return true;
  }

  // /active — الأرقام النشطة
  if (cmd === '/active') {
    const activeList = buildActiveNumbersMsg();
    if (!activeList.length) {
      await sendMsg(chatId, '📭 *لا توجد أرقام نشطة حالياً.*');
    } else {
      await sendMsg(chatId,
        `⚡ *الأرقام النشطة (${activeList.length}):*\n\n` +
        activeList.map((id, i) => `${i + 1}. \`${id}\``).join('\n'),
        { inline_keyboard: [[{ text: '🏠 الرئيسية', callback_data: 'menu_main' }]] }
      );
    }
    return true;
  }

  // /buy_cheapest <service> — شراء ذكي
  if (cmd === '/buy_cheapest') {
    const svc = args[0]?.toLowerCase();
    if (!svc || !SERVICES_DATA[svc]) {
      const list = Object.entries(SERVICES_DATA).map(([k, v]) => `\`${k}\` — ${v.icon} ${v.name}`).join('\n');
      await sendMsg(chatId, `❓ *استخدام الأمر:*\n\`/buy_cheapest <رمز_التطبيق>\`\n\n*التطبيقات المتاحة:*\n${list}`);
    } else {
      await smartBuy(chatId, svc);
    }
    return true;
  }

  // ── أوامر المدير فقط ──
  if (!isAdmin(chatId)) return false;

  // /adduser <chatId> [balance]
  if (cmd === '/adduser') {
    const userId  = args[0];
    const balance = parseFloat(args[1] || '0');
    if (!userId) { await sendMsg(chatId, '❓ الاستخدام: `/adduser <معرف_المستخدم> [الرصيد]`'); return true; }
    addUser(userId, balance);
    await sendMsg(chatId, `✅ تمت إضافة المستخدم \`${userId}\` برصيد \`${balance.toFixed(2)} $\`.`);
    return true;
  }

  // /removeuser <chatId>
  if (cmd === '/removeuser') {
    const userId = args[0];
    if (!userId) { await sendMsg(chatId, '❓ الاستخدام: `/removeuser <معرف_المستخدم>`'); return true; }
    removeUser(userId);
    await sendMsg(chatId, `✅ تم إلغاء تفعيل المستخدم \`${userId}\`.`);
    return true;
  }

  // /topup <chatId> <amount>
  if (cmd === '/topup') {
    const userId = args[0];
    const amount = parseFloat(args[1]);
    if (!userId || isNaN(amount)) { await sendMsg(chatId, '❓ الاستخدام: `/topup <معرف_المستخدم> <المبلغ>`'); return true; }
    topupUser(userId, amount);
    await sendMsg(chatId, `✅ تم شحن \`${amount.toFixed(2)} $\` لحساب المستخدم \`${userId}\`.`);
    return true;
  }

  // /users
  if (cmd === '/users') {
    const users = listUsers();
    if (!users.length) { await sendMsg(chatId, '📭 لا يوجد مستخدمون مضافون.'); return true; }
    let msg = `👥 *المستخدمون النشطون (${users.length}):*\n━━━━━━━━━━━━━━━━━━\n\n`;
    for (const u of users) {
      msg += `🆔 \`${u.id}\`\n💰 رصيد: \`${(u.balance || 0).toFixed(2)} $\` · 🛒 مشتريات: ${u.totalPurchases || 0}\n\n`;
    }
    await sendMsg(chatId, msg);
    return true;
  }

  return false;
}

// =========================================================================
//   معالجة التحديثات
// =========================================================================

async function handleUpdate(update) {

  // ── callback_query ──────────────────────────────────────────────────────
  if (update.callback_query) {
    const cb     = update.callback_query;
    const chatId = String(cb.message.chat.id);
    const msgId  = cb.message.message_id;
    const data   = cb.data || '';

    if (!isAllowedUser(chatId)) {
      await answerCb(cb.id, '⛔ ليس لديك صلاحية استخدام هذا البوت.', true);
      return;
    }
    if (data === 'noop') { await answerCb(cb.id); return; }

    // ── القائمة الرئيسية ──
    if (data === 'menu_main') {
      await answerCb(cb.id);
      const { text, keyboard } = await getWelcomeMsg(chatId);
      await editMsg(chatId, msgId, text, keyboard);
      return;
    }

    // ── تحديث الرصيد ──
    if (data === 'refresh_balance') {
      const bal = await heroGetBalanceStr();
      await answerCb(cb.id, `✅ تم التحديث! الرصيد: ${bal}`);
      const { text, keyboard } = await getWelcomeMsg(chatId);
      await editMsg(chatId, msgId, text, keyboard);
      return;
    }

    // ── قائمة التطبيقات ──
    if (data === 'menu_services') {
      await answerCb(cb.id);
      await editMsg(chatId, msgId,
        `📱 *اختر التطبيق المطلوب تفعيله:*\n\n_(الأسعار المعروضة تشمل الشراء الفوري)_`,
        buildServicesKeyboard()
      );
      return;
    }

    // ── الشراء الذكي — اختيار التطبيق ──
    if (data === 'menu_smart_buy') {
      await answerCb(cb.id);
      await editMsg(chatId, msgId,
        `🤖 *الشراء الذكي التلقائي*\n\n` +
        `سيختار البوت أرخص دولة متوفرة تلقائياً\nويعيد المحاولة حتى 3 مرات عند الفشل.\n\n` +
        `📱 *اختر التطبيق:*`,
        buildServicesKeyboard('smart')
      );
      return;
    }

    // ── شراء ذكي — تطبيق محدد ──
    if (data.startsWith('smart_')) {
      const code = data.slice(6);
      await answerCb(cb.id);
      smartBuy(chatId, code);
      await editMsg(chatId, msgId,
        `🤖 *جاري الشراء الذكي لـ ${SERVICES_DATA[code]?.icon} ${SERVICES_DATA[code]?.name}...*\n\nستصلك رسالة قريباً ✨`
      );
      return;
    }

    // ── الأرقام النشطة ──
    if (data === 'active_numbers') {
      await answerCb(cb.id);
      const activeList = buildActiveNumbersMsg();
      if (!activeList.length) {
        await editMsg(chatId, msgId, '📭 *لا توجد أرقام نشطة حالياً.*',
          { inline_keyboard: [[{ text: '🏠 الرئيسية', callback_data: 'menu_main' }]] }
        );
      } else {
        const kb = activeList.map(id => [
          { text: `🔄 فحص ${id}`, callback_data: `check_code_${id}_?` },
          { text: `❌ إلغاء`, callback_data: `cancel_num_${id}` }
        ]);
        kb.push([{ text: '🏠 الرئيسية', callback_data: 'menu_main' }]);
        await editMsg(chatId, msgId,
          `⚡ *الأرقام النشطة (${activeList.length}):*\n\n` +
          activeList.map((id, i) => `${i + 1}. \`${id}\``).join('\n'),
          { inline_keyboard: kb }
        );
      }
      return;
    }

    // ── إحصائياتي ──
    if (data === 'my_stats') {
      await answerCb(cb.id);
      await editMsg(chatId, msgId, await buildStatsMsg(chatId),
        { inline_keyboard: [
          [{ text: '📋 السجل',     callback_data: 'my_history' }],
          [{ text: '🏠 الرئيسية', callback_data: 'menu_main' }]
        ]}
      );
      return;
    }

    // ── السجل ──
    if (data === 'my_history') {
      await answerCb(cb.id);
      await editMsg(chatId, msgId, await buildHistoryMsg(chatId),
        { inline_keyboard: [
          [{ text: '📊 الإحصائيات', callback_data: 'my_stats' }],
          [{ text: '🏠 الرئيسية',   callback_data: 'menu_main' }]
        ]}
      );
      return;
    }

    // ── إدارة المستخدمين (مدير) ──
    if (data === 'admin_users' && isAdmin(chatId)) {
      await answerCb(cb.id);
      const users = listUsers();
      let msg = `👥 *المستخدمون النشطون (${users.length}):*\n━━━━━━━━━━━━━━━━━━\n\n`;
      if (!users.length) msg += '📭 لا يوجد مستخدمون مضافون.\n\n';
      else for (const u of users) msg += `🆔 \`${u.id}\` · 💰 \`${(u.balance || 0).toFixed(2)} $\` · 🛒 ${u.totalPurchases || 0}\n`;
      msg += '\n*لإضافة مستخدم:* `/adduser <id> [balance]`\n*لشحن رصيد:* `/topup <id> <amount>`\n*لحذف مستخدم:* `/removeuser <id>`';
      await editMsg(chatId, msgId, msg,
        { inline_keyboard: [[{ text: '🏠 الرئيسية', callback_data: 'menu_main' }]] }
      );
      return;
    }

    // ── اختيار تطبيق ──
    if (data.startsWith('svc_')) {
      const code = data.slice(4);
      const srv  = SERVICES_DATA[code] || { name: code, icon: '📱' };
      await answerCb(cb.id);
      const kb = await buildCountriesKeyboard(code, 0);
      await editMsg(chatId, msgId,
        `${srv.icon} *اختر الدولة لتفعيل ${srv.name}:*\n\n` +
        `💡 اضغط على الدولة لشراء رقمها فوراً\n` +
        `_(السعر يُخصم من رصيدك في Hero-SMS)_`,
        kb
      );
      return;
    }

    // ── تصفح الصفحات ──
    if (data.startsWith('page_')) {
      const [, code, pageStr] = data.split('_');
      const srv = SERVICES_DATA[code] || { name: code, icon: '📱' };
      await answerCb(cb.id);
      const kb = await buildCountriesKeyboard(code, parseInt(pageStr, 10));
      await editMsg(chatId, msgId, `${srv.icon} *اختر الدولة لتفعيل ${srv.name}:*`, kb);
      return;
    }

    // ── البحث عن دولة ──
    if (data.startsWith('search_country_')) {
      const code = data.replace('search_country_', '');
      userSessions.set(chatId, { action: 'search_country', service: code });
      await answerCb(cb.id);
      await sendMsg(chatId,
        `🔎 *ابحث عن دولة*\n\n` +
        `أرسل اسم الدولة بالعربي أو الإنجليزي:\n` +
        `_(مثال: مصر، تركيا، روسيا، egypt)_`
      );
      return;
    }

    // ── شراء رقم ──
    if (data.startsWith('buy_now_')) {
      const parts     = data.split('_');
      const service   = parts[2];
      const countryId = parts[3];
      const srv       = SERVICES_DATA[service] || { name: service, icon: '📱' };
      const country   = COUNTRIES_DATA.find(c => c.id === countryId) || { name: `#${countryId}`, cost: 0 };

      await answerCb(cb.id, '⏳ جاري طلب الرقم...');
      await editMsg(chatId, msgId,
        `⏳ *جاري الشراء...*\n\n` +
        `${srv.icon} التطبيق: *${srv.name}*\n` +
        `🌍 الدولة: *${country.name}*\n\n` +
        `الرجاء الانتظار ثوانٍ...`
      );

      const res = await heroBuyNumber(service, countryId);
      if (!res.ok) {
        await editMsg(chatId, msgId, `❌ *فشل الشراء*\n\n${res.error}`, {
          inline_keyboard: [
            [{ text: '🔄 تجربة دولة أخرى',  callback_data: `svc_${service}` }],
            [{ text: '🤖 شراء ذكي تلقائي',  callback_data: `smart_${service}` }],
            [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu_main' }]
          ]
        });
        return;
      }

      const { activationId: actId, number: num } = res;
      activeMonitors.set(actId, 'active');
      recordPurchase({ chatId, service, serviceName: service, countryId, countryName: country.name, number: num, activationId: actId, cost: country.cost });
      monitorSmsCode(chatId, actId, num, service, country.name, country.cost);

      await editMsg(chatId, msgId,
        `✅ *تم شراء الرقم بنجاح!*\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `${srv.icon} *التطبيق:* ${srv.name}\n` +
        `🌍 *الدولة:* ${country.name}\n` +
        `📱 *الرقم:* \`+${num}\`\n` +
        `💰 *التكلفة:* \`${country.cost.toFixed(2)} $\`\n` +
        `🆔 *رقم العملية:* \`${actId}\`\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⏳ *جارٍ انتظار كود SMS...*\n` +
        `سيصلك الكود هنا تلقائياً فور وصوله ✨`,
        {
          inline_keyboard: [
            [{ text: '🔄 فحص الكود يدوياً',      callback_data: `check_code_${actId}_${num}` }],
            [{ text: '❌ إلغاء واسترداد الرصيد',  callback_data: `cancel_num_${actId}` }],
            [{ text: '🏠 القائمة الرئيسية',       callback_data: 'menu_main' }]
          ]
        }
      );
      return;
    }

    // ── فحص الكود يدوياً ──
    if (data.startsWith('check_code_')) {
      const [, , actId, num] = data.split('_');
      const st = await heroGetStatus(actId);
      if (st.startsWith('STATUS_OK:')) {
        const code = st.split(':')[1];
        activeMonitors.delete(actId);
        updatePurchaseCode(actId, code, 'done');
        await answerCb(cb.id, '✅ وصل الكود!');
        await sendMsg(chatId,
          `🎉 *كود التفعيل للرقم* \`+${num}\`:\n\n\`${code}\`\n\n_(اضغط لنسخه)_`
        );
      } else if (st.includes('STATUS_WAIT_CODE')) {
        await answerCb(cb.id, '⏳ لم يصل الكود بعد، يرجى الانتظار...', true);
      } else if (st.includes('STATUS_CANCEL')) {
        await answerCb(cb.id, 'تم إلغاء هذا الرقم مسبقاً.', true);
      } else {
        await answerCb(cb.id, `الحالة: ${st}`, true);
      }
      return;
    }

    // ── إلغاء الرقم واسترداد الرصيد ──
    if (data.startsWith('cancel_num_')) {
      const actId = data.replace('cancel_num_', '');
      activeMonitors.set(actId, 'cancelled');
      updatePurchaseCode(actId, null, 'cancelled');
      await heroCancelNumber(actId);
      const bal = await heroGetBalanceStr();
      await answerCb(cb.id, '✅ تم الإلغاء واسترداد الرصيد!', true);
      await editMsg(chatId, msgId,
        `↩️ *تم إلغاء الرقم بنجاح*\n\n💰 *رصيدك الحالي:* \`${bal}\``,
        {
          inline_keyboard: [
            [{ text: '🛒 شراء رقم جديد',    callback_data: 'menu_services' }],
            [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu_main' }]
          ]
        }
      );
      return;
    }
  }

  // ── message ──────────────────────────────────────────────────────────────
  if (update.message) {
    const msg    = update.message;
    const chatId = String(msg.chat.id);
    const text   = (msg.text || '').trim();

    if (!isAllowedUser(chatId)) {
      await sendMsg(chatId, '⛔ هذا البوت خاص. تواصل مع المالك للحصول على صلاحية.');
      return;
    }

    // ── معالجة الأوامر ──
    if (text.startsWith('/')) {
      const handled = await handleCommand(chatId, text);
      if (handled) return;
    }

    // ── بحث عن دولة ──
    const sess = userSessions.get(chatId);
    if (sess?.action === 'search_country') {
      const code    = sess.service;
      const srv     = SERVICES_DATA[code] || { name: code };
      const q       = text.toLowerCase();
      const matches = COUNTRIES_DATA.filter(c =>
        c.name.toLowerCase().includes(q) || (c.aliases || []).some(a => a.toLowerCase().includes(q))
      );

      if (!matches.length) {
        await sendMsg(chatId,
          `❌ لم نجد دولة باسم *"${text}"*\nجرب اسماً آخر أو اختر من القائمة:`,
          { inline_keyboard: [[{ text: '🔙 قائمة الدول', callback_data: `svc_${code}` }]] }
        );
        return;
      }

      const prices = await heroGetPrices(code);
      const kb = matches.slice(0, 8).map(c => {
        const live = prices?.[c.id]?.[code]?.cost;
        const cost = live ? parseFloat(live) : c.cost;
        return [{ text: `${c.name}  ·  ${cost.toFixed(2)} $`, callback_data: `buy_now_${code}_${c.id}` }];
      });
      kb.push([{ text: '🔙 قائمة الدول', callback_data: `svc_${code}` }]);
      userSessions.delete(chatId);
      await sendMsg(chatId, `🎯 *نتائج البحث عن "${text}" - ${srv.name}:*`, { inline_keyboard: kb });
      return;
    }

    // ── الرسالة الترحيبية الافتراضية ──
    const { text: welcomeText, keyboard } = await getWelcomeMsg(chatId);
    await sendMsg(chatId, welcomeText, keyboard);
  }
}

// =========================================================================
//   مسارات Express
// =========================================================================

// Webhook من Telegram
app.post('/webhook', async (req, res) => {
  // التحقق من Webhook Secret (إن وُجد)
  if (WEBHOOK_SECRET && req.headers['x-telegram-bot-api-secret-token'] !== WEBHOOK_SECRET) {
    return res.sendStatus(403);
  }
  res.sendStatus(200);
  if (req.body) handleUpdate(req.body).catch(console.error);
});

// API للوحة الويب
app.get('/api/stats', async (req, res) => {
  const db  = loadDB();
  const bal = await heroGetBalance();
  res.json({
    balance:        bal,
    totalPurchases: db.totalPurchases || 0,
    totalSpent:     db.totalSpent     || 0,
    activeNumbers:  buildActiveNumbersMsg().length,
    recentPurchases: db.purchases.slice(0, 20),
    users:          Object.keys(db.users).length
  });
});

// صفحة الحالة
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// =========================================================================
//   بدء التشغيل
// =========================================================================

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  const bal = await heroGetBalance();
  console.log(`💰 Hero-SMS Balance: ${bal.toFixed(2)} $`);

  if (WEBHOOK_URL) {
    const hookUrl = `${WEBHOOK_URL}/webhook`;
    const hookBody = { url: hookUrl };
    if (WEBHOOK_SECRET) hookBody.secret_token = WEBHOOK_SECRET;
    const r = await tgCall('setWebhook', hookBody);
    console.log(`🔗 Webhook set to ${hookUrl}:`, r.description || r.ok);
  } else {
    await tgCall('deleteWebhook', {});
    console.log('💻 Local mode: Long Polling started');
    startPolling();
  }

  // فحص الرصيد كل 30 دقيقة
  setInterval(checkBalanceAlert, 30 * 60 * 1000);
  console.log('🔔 Balance alert monitor started');
});

async function startPolling() {
  let offset = 0;
  while (true) {
    try {
      const r = await tgCall('getUpdates', { offset, timeout: 20 });
      if (r.ok) for (const u of r.result) { offset = u.update_id + 1; handleUpdate(u).catch(console.error); }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 300));
  }
}
