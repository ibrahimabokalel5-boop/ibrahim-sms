/**
 * Hero-SMS Dedicated Telegram Bot - 100% Node.js
 * بوت شخصي مباشر لشراء أرقام التفعيل واستلام أكواد SMS تلقائياً
 */
require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

// =========================================================================
//   الإعدادات والمتغيرات
// =========================================================================

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '8742602166:AAHKetli1l6ny4DfyqmsDfPPnvGtQM45GkI').trim();
const TELEGRAM_ADMIN_CHAT_ID = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '6067874888').trim();
const HERO_SMS_KEY = (process.env.HERO_SMS_KEY || 'f144cA86391f362758c129f14dc33fc9').trim();
const PORT = process.env.PORT || 8080;
const WEBHOOK_URL = (process.env.WEBHOOK_URL || '').trim().replace(/\/$/, '');

const HERO_SMS_URL = 'https://hero-sms.com/stubs/handler_api.php';

// =========================================================================
//   بيانات التطبيقات والدول
// =========================================================================

const SERVICES_DATA = {
  wa: { name: 'واتساب', icon: '💬', code: 'wa' },
  tg: { name: 'تيليجرام', icon: '✈️', code: 'tg' },
  lf: { name: 'تيك توك', icon: '🎵', code: 'lf' },
  go: { name: 'جوجل / يوتيوب', icon: '🔍', code: 'go' },
  fb: { name: 'فيسبوك', icon: '📘', code: 'fb' },
  ig: { name: 'إنستغرام', icon: '📷', code: 'ig' },
  fu: { name: 'سناب شات', icon: '👻', code: 'fu' },
  tw: { name: 'تويتر / إكس', icon: '🐦', code: 'tw' },
  ds: { name: 'ديسكورد', icon: '👾', code: 'ds' },
  vi: { name: 'فايبر', icon: '📞', code: 'vi' },
  nf: { name: 'نتفليكس', icon: '🍿', code: 'nf' },
  ot: { name: 'أي تطبيق آخر', icon: '🌐', code: 'ot' }
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
    return isNaN(val) ? '0.00 $' : `${val.toFixed(2)} $`;
  }
  return '0.00 $';
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
  if (res.includes('NO_NUMBERS')) return { ok: false, error: '⚠️ لا توجد أرقام متوفرة حالياً لهذه الدولة / الخدمة.\nجرب دولة أخرى أو تطبيقاً آخر.' };
  if (res.includes('NO_BALANCE')) return { ok: false, error: '💳 رصيدك في Hero-SMS غير كافٍ.\nيرجى شحن حسابك أولاً.' };
  return { ok: false, error: `تعذر الشراء: ${res}` };
}

async function heroGetStatus(id) { return await heroApiCall({ action: 'getStatus', id }); }
async function heroCancelNumber(id) { return await heroApiCall({ action: 'setStatus', id, status: '8' }); }

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

const sendMsg = (chatId, text, replyMarkup = null) =>
  tgCall('sendMessage', { chat_id: chatId, text, parse_mode: 'Markdown', ...(replyMarkup && { reply_markup: replyMarkup }) });

const editMsg = (chatId, messageId, text, replyMarkup = null) =>
  tgCall('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown', ...(replyMarkup && { reply_markup: replyMarkup }) });

const answerCb = (id, text = '', alert = false) =>
  tgCall('answerCallbackQuery', { callback_query_id: id, text, show_alert: alert });

// =========================================================================
//   مراقبة وصول كود التفعيل تلقائياً
// =========================================================================

const activeMonitors = new Map();

async function monitorSmsCode(chatId, activationId, number, serviceName, countryName) {
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    if (activeMonitors.get(activationId) === 'cancelled') return;

    const st = await heroGetStatus(activationId);
    if (st.startsWith('STATUS_OK:')) {
      const code = st.split(':')[1];
      activeMonitors.delete(activationId);
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
          [{ text: '🛒 شراء رقم جديد', callback_data: 'menu_services' }],
          [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu_main' }]
        ]}
      );
      return;
    }
  }
  activeMonitors.delete(activationId);
  await sendMsg(chatId,
    `⏰ *انتهى وقت الانتظار دون وصول الكود.*\n\n` +
    `📱 الرقم: \`+${number}\`\n` +
    `يمكنك استرداد رصيدك عبر إلغاء الرقم.`,
    { inline_keyboard: [
      [{ text: '❌ إلغاء واسترداد الرصيد', callback_data: `cancel_num_${activationId}` }],
      [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu_main' }]
    ]}
  );
}

// =========================================================================
//   بناء الرسائل والأزرار
// =========================================================================

async function getWelcomeMsg() {
  const bal = await heroGetBalance();
  return {
    text:
      `🤖 *بوت أرقام التفعيل الشخصي*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `💰 *رصيدك الحالي:* \`${bal}\`\n\n` +
      `شراء أرقام تفعيل مؤقتة مباشرة من\n` +
      `*Hero-SMS* بنقرة واحدة فقط ⚡\n\n` +
      `👇 *اختر ما تريد:*`,
    keyboard: {
      inline_keyboard: [
        [{ text: '📱 شراء رقم تفعيل جديد', callback_data: 'menu_services' }],
        [
          { text: `💰 رصيدي: ${bal}`, callback_data: 'refresh_balance' },
          { text: '🔄 تحديث', callback_data: 'refresh_balance' }
        ]
      ]
    }
  };
}

function buildServicesKeyboard() {
  const entries = Object.entries(SERVICES_DATA);
  const kb = [];
  for (let i = 0; i < entries.length; i += 2) {
    const row = [];
    row.push({ text: `${entries[i][1].icon} ${entries[i][1].name}`, callback_data: `svc_${entries[i][0]}` });
    if (entries[i + 1]) row.push({ text: `${entries[i + 1][1].icon} ${entries[i + 1][1].name}`, callback_data: `svc_${entries[i + 1][0]}` });
    kb.push(row);
  }
  kb.push([{ text: '🏠 القائمة الرئيسية', callback_data: 'menu_main' }]);
  return { inline_keyboard: kb };
}

async function buildCountriesKeyboard(serviceCode, page = 0) {
  const pageSize = 8;
  const totalPages = Math.ceil(COUNTRIES_DATA.length / pageSize);
  page = Math.max(0, Math.min(page, totalPages - 1));
  const countries = COUNTRIES_DATA.slice(page * pageSize, (page + 1) * pageSize);
  const prices = await heroGetPrices(serviceCode);
  const kb = [];

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
  if (page > 0) nav.push({ text: '◀️ السابق', callback_data: `page_${serviceCode}_${page - 1}` });
  nav.push({ text: `${page + 1} / ${totalPages}`, callback_data: 'noop' });
  if (page < totalPages - 1) nav.push({ text: 'التالي ▶️', callback_data: `page_${serviceCode}_${page + 1}` });
  if (nav.length) kb.push(nav);

  kb.push([{ text: '🔍 ابحث عن دولة', callback_data: `search_country_${serviceCode}` }]);
  kb.push([
    { text: '◀️ رجوع للتطبيقات', callback_data: 'menu_services' },
    { text: '🏠 الرئيسية', callback_data: 'menu_main' }
  ]);

  return { inline_keyboard: kb };
}

const userSessions = new Map();

// =========================================================================
//   معالجة التحديثات
// =========================================================================

async function handleUpdate(update) {
  // ── callback_query ──────────────────────────────────────────────────────
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = String(cb.message.chat.id);
    const msgId = cb.message.message_id;
    const data = cb.data || '';

    if (chatId !== TELEGRAM_ADMIN_CHAT_ID) {
      await answerCb(cb.id, '⛔ البوت مخصص للمالك فقط.', true);
      return;
    }
    if (data === 'noop') { await answerCb(cb.id); return; }

    // ── القائمة الرئيسية ──
    if (data === 'menu_main') {
      await answerCb(cb.id);
      const { text, keyboard } = await getWelcomeMsg();
      await editMsg(chatId, msgId, text, keyboard);
      return;
    }

    // ── تحديث الرصيد ──
    if (data === 'refresh_balance') {
      const bal = await heroGetBalance();
      await answerCb(cb.id, `✅ تم التحديث! الرصيد: ${bal}`);
      const { text, keyboard } = await getWelcomeMsg();
      await editMsg(chatId, msgId, text, keyboard);
      return;
    }

    // ── قائمة التطبيقات ──
    if (data === 'menu_services') {
      await answerCb(cb.id);
      await editMsg(
        chatId, msgId,
        `📱 *اختر التطبيق المطلوب تفعيله:*\n\n_(الأسعار المعروضة تشمل الشراء الفوري)_`,
        buildServicesKeyboard()
      );
      return;
    }

    // ── اختيار تطبيق ──
    if (data.startsWith('svc_')) {
      const code = data.slice(4);
      const srv = SERVICES_DATA[code] || { name: code, icon: '📱' };
      await answerCb(cb.id);
      const kb = await buildCountriesKeyboard(code, 0);
      await editMsg(
        chatId, msgId,
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
      const srv = SERVICES_DATA[code] || { name: code };
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
      const parts = data.split('_');
      const service = parts[2];
      const countryId = parts[3];
      const srv = SERVICES_DATA[service] || { name: service, icon: '📱' };
      const country = COUNTRIES_DATA.find(c => c.id === countryId) || { name: `#${countryId}` };

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
            [{ text: '🔄 تجربة دولة أخرى', callback_data: `svc_${service}` }],
            [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu_main' }]
          ]
        });
        return;
      }

      const { activationId: actId, number: num } = res;
      activeMonitors.set(actId, 'active');
      monitorSmsCode(chatId, actId, num, service, country.name);

      await editMsg(chatId, msgId,
        `✅ *تم شراء الرقم بنجاح!*\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `${srv.icon} *التطبيق:* ${srv.name}\n` +
        `🌍 *الدولة:* ${country.name}\n` +
        `📱 *الرقم:* \`+${num}\`\n` +
        `🆔 *رقم العملية:* \`${actId}\`\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `⏳ *جارٍ انتظار كود SMS...*\n` +
        `سيصلك الكود هنا تلقائياً فور وصوله ✨`,
        {
          inline_keyboard: [
            [{ text: '🔄 فحص الكود يدوياً', callback_data: `check_code_${actId}_${num}` }],
            [{ text: '❌ إلغاء واسترداد الرصيد', callback_data: `cancel_num_${actId}` }],
            [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu_main' }]
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
        await answerCb(cb.id, '✅ وصل الكود!');
        await sendMsg(chatId,
          `🎉 *كود التفعيل للرقم* \`+${num}\`:\n\n` +
          `\`${code}\`\n\n_(اضغط لنسخه)_`
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
      await heroCancelNumber(actId);
      const bal = await heroGetBalance();
      await answerCb(cb.id, '✅ تم الإلغاء واسترداد الرصيد!', true);
      await editMsg(chatId, msgId,
        `↩️ *تم إلغاء الرقم بنجاح*\n\n` +
        `💰 *رصيدك الحالي:* \`${bal}\``,
        {
          inline_keyboard: [
            [{ text: '🛒 شراء رقم جديد', callback_data: 'menu_services' }],
            [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu_main' }]
          ]
        }
      );
      return;
    }
  }

  // ── message ──────────────────────────────────────────────────────────────
  if (update.message) {
    const msg = update.message;
    const chatId = String(msg.chat.id);
    const text = (msg.text || '').trim();

    if (chatId !== TELEGRAM_ADMIN_CHAT_ID) {
      await sendMsg(chatId, '⛔ هذا البوت شخصي ومخصص لمالكه فقط.');
      return;
    }

    // ── بحث عن دولة ──
    const sess = userSessions.get(chatId);
    if (sess?.action === 'search_country') {
      const code = sess.service;
      const srv = SERVICES_DATA[code] || { name: code };
      const q = text.toLowerCase();
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
    const { text: welcomeText, keyboard } = await getWelcomeMsg();
    await sendMsg(chatId, welcomeText, keyboard);
  }
}

// =========================================================================
//   مسارات Express
// =========================================================================

app.get('/', async (req, res) => {
  const bal = await heroGetBalance();
  res.json({ status: 'online', bot: 'Hero-SMS Personal Bot', runtime: `Node.js ${process.version}`, balance: bal });
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  if (req.body) handleUpdate(req.body).catch(console.error);
});

// =========================================================================
//   بدء التشغيل
// =========================================================================

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  const bal = await heroGetBalance();
  console.log(`💰 Hero-SMS Balance: ${bal}`);

  if (WEBHOOK_URL) {
    // وضع Webhook (على Railway أو أي سيرفر)
    const hookUrl = `${WEBHOOK_URL}/webhook`;
    const r = await tgCall('setWebhook', { url: hookUrl });
    console.log(`🔗 Webhook set to ${hookUrl}:`, r.description || r.ok);
  } else {
    // تشغيل محلي بـ Long Polling
    await tgCall('deleteWebhook', {});
    console.log('💻 Local mode: Long Polling started');
    startPolling();
  }
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
