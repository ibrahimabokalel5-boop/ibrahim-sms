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
const RENDER_EXTERNAL_URL = (process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/$/, '');

const HERO_SMS_URL = 'https://hero-sms.com/stubs/handler_api.php';

// =========================================================================
//   بيانات التطبيقات والدول
// =========================================================================

const SERVICES_DATA = {
  wa: { name: 'واتساب (WhatsApp)', icon: '💬', code: 'wa' },
  tg: { name: 'تيليجرام (Telegram)', icon: '✈️', code: 'tg' },
  lf: { name: 'تيك توك (TikTok)', icon: '🎵', code: 'lf' },
  go: { name: 'جوجل ويوتيوب (Google)', icon: '🔍', code: 'go' },
  fb: { name: 'فيسبوك (Facebook)', icon: '📘', code: 'fb' },
  ig: { name: 'إنستغرام (Instagram)', icon: '📷', code: 'ig' },
  fu: { name: 'سناب شات (Snapchat)', icon: '👻', code: 'fu' },
  tw: { name: 'تويتر / إكس (Twitter)', icon: '🐦', code: 'tw' },
  ds: { name: 'ديسكورد (Discord)', icon: '👾', code: 'ds' },
  vi: { name: 'فايبر (Viber)', icon: '📞', code: 'vi' },
  nf: { name: 'نتفليكس (Netflix)', icon: '🍿', code: 'nf' },
  ot: { name: 'أي تطبيق آخر (Any Other)', icon: '🌐', code: 'ot' }
};

const COUNTRIES_DATA = [
  { id: '4', name: '🇵🇭 الفلبين', cost: 0.05, aliases: ['فلبين', 'philippines'] },
  { id: '6', name: '🇮🇩 إندونيسيا', cost: 0.08, aliases: ['اندونيسيا', 'indonesia'] },
  { id: '0', name: '🇷🇺 روسيا', cost: 0.35, aliases: ['روسيا', 'russia'] },
  { id: '1', name: '🇺🇦 أوكرانيا', cost: 0.40, aliases: ['اوكرانيا', 'ukraine'] },
  { id: '2', name: '🇰🇿 كازاخستان', cost: 0.35, aliases: ['كازاخستان', 'kazakhstan'] },
  { id: '37', name: '🇲🇦 المغرب', cost: 0.15, aliases: ['المغرب', 'morocco'] },
  { id: '21', name: '🇪🇬 مصر', cost: 0.20, aliases: ['مصر', 'egypt'] },
  { id: '62', name: '🇹🇷 تركيا', cost: 0.80, aliases: ['تركيا', 'turkey'] },
  { id: '16', name: '🇬🇧 بريطانيا', cost: 0.70, aliases: ['بريطانيا', 'انكلترا', 'uk'] },
  { id: '187', name: '🇺🇸 أمريكا', cost: 0.85, aliases: ['امريكا', 'usa'] },
  { id: '73', name: '🇧🇷 البرازيل', cost: 0.45, aliases: ['البرازيل', 'brazil'] },
  { id: '22', name: '🇮🇳 الهند', cost: 0.12, aliases: ['الهند', 'india'] },
  { id: '10', name: '🇻🇳 فيتنام', cost: 0.15, aliases: ['فيتنام', 'vietnam'] },
  { id: '19', name: '🇳🇬 نيجيريا', cost: 0.10, aliases: ['نيجيريا', 'nigeria'] },
  { id: '58', name: '🇩🇿 الجزائر', cost: 0.30, aliases: ['الجزائر', 'algeria'] },
  { id: '47', name: '🇮🇶 العراق', cost: 0.45, aliases: ['العراق', 'iraq'] },
  { id: '116', name: '🇯🇴 الأردن', cost: 0.45, aliases: ['الاردن', 'jordan'] },
  { id: '30', name: '🇾🇪 اليمن', cost: 0.50, aliases: ['اليمن', 'yemen'] },
  { id: '53', name: '🇸🇦 السعودية', cost: 0.90, aliases: ['السعودية', 'saudi'] },
  { id: '95', name: '🇦🇪 الإمارات', cost: 0.90, aliases: ['الامارات', 'uae'] },
  { id: '43', name: '🇩🇪 ألمانيا', cost: 0.85, aliases: ['المانيا', 'germany'] },
  { id: '78', name: '🇫🇷 فرنسا', cost: 0.85, aliases: ['فرنسا', 'france'] },
  { id: '48', name: '🇳🇱 هولندا', cost: 0.80, aliases: ['هولندا', 'netherlands'] },
  { id: '36', name: '🇨🇦 كندا', cost: 0.85, aliases: ['كندا', 'canada'] },
  { id: '15', name: '🇵🇱 بولندا', cost: 0.50, aliases: ['بولندا', 'poland'] },
  { id: '86', name: '🇮🇹 إيطاليا', cost: 0.85, aliases: ['ايطاليا', 'italy'] },
  { id: '56', name: '🇪🇸 إسبانيا', cost: 0.80, aliases: ['اسبانيا', 'spain'] },
  { id: '32', name: '🇷🇴 رومانيا', cost: 0.40, aliases: ['رومانيا', 'romania'] },
  { id: '33', name: '🇨🇴 كولومبيا', cost: 0.35, aliases: ['كولومبيا', 'colombia'] },
  { id: '31', name: '🇿🇦 جنوب أفريقيا', cost: 0.30, aliases: ['جنوب افريقيا'] },
  { id: '114', name: '🇱🇰 سريلانكا', cost: 0.25, aliases: ['سريلانكا'] },
  { id: '40', name: '🇺🇿 أوزبكستان', cost: 0.35, aliases: ['اوزبكستان'] },
  { id: '11', name: '🇰🇬 قيرغيزستان', cost: 0.35, aliases: ['قيرغيزستان'] },
  { id: '7', name: '🇲🇾 ماليزيا', cost: 0.30, aliases: ['ماليزيا'] },
  { id: '8', name: '🇰🇪 كينيا', cost: 0.20, aliases: ['كينيا'] },
  { id: '35', name: '🇦🇿 أذربيجان', cost: 0.35, aliases: ['اذربيجان'] },
  { id: '34', name: '🇪🇪 إستونيا', cost: 0.60, aliases: ['استونيا'] },
  { id: '3', name: '🇨🇳 الصين', cost: 0.45, aliases: ['الصين', 'china'] },
  { id: '14', name: '🇭🇰 هونغ كونغ', cost: 0.50, aliases: ['هونغ كونغ'] }
];

// =========================================================================
//   Hero-SMS API
// =========================================================================

async function heroApiCall(params) {
  const query = new URLSearchParams({ api_key: HERO_SMS_KEY, ...params }).toString();
  try {
    const res = await fetch(`${HERO_SMS_URL}?${query}`, { signal: AbortSignal.timeout(12000) });
    const text = await res.text();
    return text.trim();
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
  if (pricesCache[service] && now - (pricesCacheTime[service] || 0) < 60000) {
    return pricesCache[service];
  }
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
  } else if (res.includes('NO_NUMBERS')) {
    return { ok: false, error: 'لا توجد أرقام متوفرة حالياً لهذه الدولة/الخدمة، جرب دولة أخرى.' };
  } else if (res.includes('NO_BALANCE')) {
    return { ok: false, error: 'رصيدك في Hero-SMS غير كافٍ لإتمام عملية الشراء.' };
  }
  return { ok: false, error: `تعذر الشراء: ${res}` };
}

async function heroGetStatus(activationId) {
  return await heroApiCall({ action: 'getStatus', id: activationId });
}

async function heroCancelNumber(activationId) {
  return await heroApiCall({ action: 'setStatus', id: activationId, status: '8' });
}

// =========================================================================
//   Telegram API
// =========================================================================

async function tgCall(method, body) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    return await res.json();
  } catch (err) {
    console.error(`Telegram ${method} Error:`, err.message);
    return { ok: false, error: err.message };
  }
}

async function sendMsg(chatId, text, replyMarkup = null) {
  const body = { chat_id: chatId, text, parse_mode: 'Markdown' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return await tgCall('sendMessage', body);
}

async function editMsg(chatId, messageId, text, replyMarkup = null) {
  const body = { chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  return await tgCall('editMessageText', body);
}

async function answerCb(callbackQueryId, text = '', alert = false) {
  return await tgCall('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: alert
  });
}

// =========================================================================
//   مراقبة وصول كود التفعيل
// =========================================================================

const activeMonitors = new Map();

async function monitorSmsCode(chatId, activationId, number, serviceName, countryName) {
  const maxChecks = 40; // 40 * 3 ثوانٍ = دقيقتين
  for (let i = 0; i < maxChecks; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    if (activeMonitors.get(activationId) === 'cancelled') return;

    const st = await heroGetStatus(activationId);
    if (st.startsWith('STATUS_OK:')) {
      const code = st.split(':')[1];
      activeMonitors.delete(activationId);
      const text =
        `🎉 *وصل كود التفعيل بنجاح!*\n\n` +
        `💬 *التطبيق:* ${serviceName}\n` +
        `🌍 *الدولة:* ${countryName}\n` +
        `📱 *الرقم:* \`+${number}\`\n\n` +
        `🔑 *كود التفعيل (SMS Code):*\n` +
        `\`${code}\`\n\n` +
        `_(اضغط على الكود لنسخه فوراً)_`;

      await sendMsg(chatId, text, {
        inline_keyboard: [
          [{ text: '🛒 شراء رقم جديد', callback_data: 'menu_services' }],
          [{ text: '🔙 القائمة الرئيسية', callback_data: 'menu_main' }]
        ]
      });
      return;
    }
  }
  activeMonitors.delete(activationId);
}

// =========================================================================
//   لوحات المفاتيح والأزرار
// =========================================================================

async function buildMainKeyboard() {
  const bal = await heroGetBalance();
  return {
    inline_keyboard: [
      [{ text: '📱 شراء رقم تفعيل جديد (SMS)', callback_data: 'menu_services' }],
      [
        { text: `💰 رصيدي الحالي: ${bal}`, callback_data: 'refresh_balance' },
        { text: '🔄 تحديث', callback_data: 'refresh_balance' }
      ]
    ]
  };
}

function buildServicesKeyboard() {
  const kb = [];
  let row = [];
  for (const [code, s] of Object.entries(SERVICES_DATA)) {
    row.push({ text: `${s.icon} ${s.name.split('(')[0].trim()}`, callback_data: `svc_${code}` });
    if (row.length === 2) {
      kb.push(row);
      row = [];
    }
  }
  if (row.length > 0) kb.push(row);
  kb.push([{ text: '🔙 القائمة الرئيسية', callback_data: 'menu_main' }]);
  return { inline_keyboard: kb };
}

async function buildCountriesKeyboard(serviceCode, page = 0) {
  const pageSize = 8;
  const totalPages = Math.ceil(COUNTRIES_DATA.length / pageSize);
  page = Math.max(0, Math.min(page, totalPages - 1));

  const start = page * pageSize;
  const countries = COUNTRIES_DATA.slice(start, start + pageSize);
  const prices = await heroGetPrices(serviceCode);

  const kb = [];
  if (page === 0) {
    const cheapest = COUNTRIES_DATA.reduce((prev, curr) => (curr.cost < prev.cost ? curr : prev));
    kb.push([
      {
        text: `⚡ أرخص دولة: ${cheapest.name} (~${cheapest.cost.toFixed(2)}$)`,
        callback_data: `buy_now_${serviceCode}_${cheapest.id}`
      }
    ]);
  }

  for (const c of countries) {
    const live = prices?.[c.id]?.[serviceCode]?.cost;
    const cost = live ? parseFloat(live) : c.cost;
    kb.push([
      {
        text: `${c.name} ⇦ ${cost.toFixed(2)}$ (شراء فوري)`,
        callback_data: `buy_now_${serviceCode}_${c.id}`
      }
    ]);
  }

  const navRow = [];
  if (page > 0) navRow.push({ text: '⬅️ السابق', callback_data: `page_${serviceCode}_${page - 1}` });
  navRow.push({ text: `📄 ${page + 1}/${totalPages}`, callback_data: 'noop' });
  if (page < totalPages - 1) navRow.push({ text: 'التالي ➡️', callback_data: `page_${serviceCode}_${page + 1}` });
  if (navRow.length > 0) kb.push(navRow);

  kb.push([{ text: '🔍 بحث عن دولة بالاسم', callback_data: `search_country_${serviceCode}` }]);
  kb.push([{ text: '🔙 رجوع للتطبيقات', callback_data: 'menu_services' }]);
  return { inline_keyboard: kb };
}

const userSessions = new Map();

// =========================================================================
//   معالجة التحديثات
// =========================================================================

async function handleUpdate(update) {
  if (update.callback_query) {
    const cb = update.callback_query;
    const cbId = cb.id;
    const chatId = String(cb.message.chat.id);
    const msgId = cb.message.message_id;
    const data = cb.data || '';

    // حماية البوت للمالك فقط
    if (chatId !== TELEGRAM_ADMIN_CHAT_ID) {
      await answerCb(cbId, '⛔ هذا البوت مخصص لصاحب الحساب فقط.', true);
      return;
    }

    if (data === 'noop') {
      await answerCb(cbId);
      return;
    }

    if (data === 'menu_main') {
      await answerCb(cbId);
      const bal = await heroGetBalance();
      const kb = await buildMainKeyboard();
      await editMsg(
        chatId,
        msgId,
        `👋 أهلاً بك في بوت أرقام التفعيل الشخصي المباشر.\n\n💰 *رصيدك الحالي في Hero-SMS:* \`${bal}\`\n👇 اختر الخدمة المطلوبة:`,
        kb
      );
      return;
    }

    if (data === 'refresh_balance') {
      const bal = await heroGetBalance();
      await answerCb(cbId, `تم التحديث! الرصيد: ${bal}`, false);
      const kb = await buildMainKeyboard();
      await editMsg(
        chatId,
        msgId,
        `👋 أهلاً بك في بوت أرقام التفعيل الشخصي المباشر.\n\n💰 *رصيدك الحالي في Hero-SMS:* \`${bal}\`\n👇 اختر الخدمة المطلوبة:`,
        kb
      );
      return;
    }

    if (data === 'menu_services') {
      await answerCb(cbId);
      await editMsg(chatId, msgId, '📱 *اختر التطبيق المطلوب تفعيله:*', buildServicesKeyboard());
      return;
    }

    if (data.startsWith('svc_')) {
      const code = data.split('_')[1];
      const srv = SERVICES_DATA[code] || { name: code };
      await answerCb(cbId);
      const kb = await buildCountriesKeyboard(code, 0);
      await editMsg(
        chatId,
        msgId,
        `🌍 *اختر الدولة لتفعيل ${srv.name}:*\n_(يتم خصم السعر وتوفير الرقم فوراً بنقرة واحدة)_`,
        kb
      );
      return;
    }

    if (data.startsWith('page_')) {
      const [, code, pageStr] = data.split('_');
      const page = parseInt(pageStr, 10);
      const srv = SERVICES_DATA[code] || { name: code };
      await answerCb(cbId);
      const kb = await buildCountriesKeyboard(code, page);
      await editMsg(chatId, msgId, `🌍 *اختر الدولة لتفعيل ${srv.name}:*`, kb);
      return;
    }

    if (data.startsWith('search_country_')) {
      const code = data.replace('search_country_', '');
      const srv = SERVICES_DATA[code] || { name: code };
      userSessions.set(chatId, { action: 'search_country', service: code });
      await answerCb(cbId);
      await sendMsg(
        chatId,
        `🔎 أرسل اسم الدولة التي تريد تفعيل ${srv.name} لها (مثال: مصر، تركيا، روسيا، فلبين...):`
      );
      return;
    }

    if (data.startsWith('buy_now_')) {
      const [, , service, countryId] = data.split('_');
      const srv = SERVICES_DATA[service] || { name: service };
      const country = COUNTRIES_DATA.find((c) => c.id === countryId) || { name: `الدولة #${countryId}` };

      await answerCb(cbId, '⏳ جاري طلب الرقم من Hero-SMS...');
      await editMsg(chatId, msgId, `⏳ جاري طلب رقم ${country.name} لتطبيق ${srv.name} من Hero-SMS...`);

      const res = await heroBuyNumber(service, countryId);
      if (!res.ok) {
        await editMsg(chatId, msgId, `❌ *فشل الشراء:*\n${res.error}`, {
          inline_keyboard: [
            [{ text: '🔄 تجربة دولة أخرى', callback_data: `svc_${service}` }],
            [{ text: '🔙 القائمة الرئيسية', callback_data: 'menu_main' }]
          ]
        });
        return;
      }

      const actId = res.activationId;
      const num = res.number;
      activeMonitors.set(actId, 'active');

      // تشغيل مراقبة الكود في الخلفية
      monitorSmsCode(chatId, actId, num, srv.name, country.name);

      const msgText =
        `✅ *تم شراء الرقم بنجاح!*\n\n` +
        `💬 *التطبيق:* ${srv.name}\n` +
        `🌍 *الدولة:* ${country.name}\n` +
        `📱 *الرقم:* \`+${num}\`\n` +
        `🆔 *معرّف العملية:* \`${actId}\`\n\n` +
        `⏳ *جارٍ انتظار كود التفعيل (SMS)...*\n` +
        `سيصلك الكود هنا تلقائياً فور وروده في غضون ثوانٍ.\n\n` +
        `_(إذا لم يصل الكود، يمكنك إلغاء الرقم واسترجاع رصيدك كاملاً أدناه)_`;

      await editMsg(chatId, msgId, msgText, {
        inline_keyboard: [
          [{ text: '🔄 فحص الكود الآن', callback_data: `check_code_${actId}_${num}` }],
          [{ text: '❌ إلغاء الرقم واسترداد الرصيد', callback_data: `cancel_num_${actId}` }],
          [{ text: '🔙 القائمة الرئيسية', callback_data: 'menu_main' }]
        ]
      });
      return;
    }

    if (data.startsWith('check_code_')) {
      const [, , actId, num] = data.split('_');
      const st = await heroGetStatus(actId);
      if (st.startsWith('STATUS_OK:')) {
        const code = st.split(':')[1];
        activeMonitors.delete(actId);
        await answerCb(cbId, 'وصل الكود!');
        await sendMsg(chatId, `🎉 *كود التفعيل للرقم \`+${num}\`:* \`${code}\``);
      } else if (st.includes('STATUS_WAIT_CODE')) {
        await answerCb(cbId, '⏳ لم يصل الكود بعد، يرجى الانتظار...', true);
      } else if (st.includes('STATUS_CANCEL')) {
        await answerCb(cbId, 'تم إلغاء هذا الرقم مسبقاً.', true);
      } else {
        await answerCb(cbId, `الحالة: ${st}`, true);
      }
      return;
    }

    if (data.startsWith('cancel_num_')) {
      const actId = data.replace('cancel_num_', '');
      activeMonitors.set(actId, 'cancelled');
      await heroCancelNumber(actId);
      const bal = await heroGetBalance();
      await answerCb(cbId, 'تم إلغاء الرقم واسترجاع الرصيد بنجاح!', true);
      await editMsg(chatId, msgId, `↩️ *تم إلغاء الرقم واسترداد الرصيد بنجاح!*\n💰 رصيدك الحالي: \`${bal}\``, {
        inline_keyboard: [
          [{ text: '🛒 شراء رقم جديد', callback_data: 'menu_services' }],
          [{ text: '🔙 القائمة الرئيسية', callback_data: 'menu_main' }]
        ]
      });
      return;
    }
  } else if (update.message) {
    const msg = update.message;
    const chatId = String(msg.chat.id);
    const text = (msg.text || '').trim();

    if (chatId !== TELEGRAM_ADMIN_CHAT_ID) {
      await sendMsg(chatId, '⛔ هذا البوت شخصي ومخصص لمالكه فقط.');
      return;
    }

    const sess = userSessions.get(chatId);
    if (sess && sess.action === 'search_country') {
      const code = sess.service;
      const srv = SERVICES_DATA[code] || { name: code };
      const q = text.toLowerCase();
      const matches = COUNTRIES_DATA.filter((c) => {
        const aliases = c.aliases || [];
        return c.name.toLowerCase().includes(q) || aliases.some((a) => a.toLowerCase().includes(q));
      });

      if (matches.length === 0) {
        await sendMsg(chatId, `❌ لم نجد دولة باسم \`${text}\`.\nيرجى تجربة اسم آخر أو الاختيار من القائمة:`, {
          inline_keyboard: [[{ text: '🔙 العودة لقائمة الدول', callback_data: `svc_${code}` }]]
        });
        return;
      }

      const prices = await heroGetPrices(code);
      const kb = [];
      for (const c of matches.slice(0, 8)) {
        const live = prices?.[c.id]?.[code]?.cost;
        const cost = live ? parseFloat(live) : c.cost;
        kb.push([
          {
            text: `${c.name} ⇦ ${cost.toFixed(2)}$ (شراء فوري)`,
            callback_data: `buy_now_${code}_${c.id}`
          }
        ]);
      }
      kb.push([{ text: '🔙 العودة لقائمة الدول', callback_data: `svc_${code}` }]);
      userSessions.delete(chatId);
      await sendMsg(chatId, `🎯 *نتائج البحث عن (${text}) لتفعيل ${srv.name}:*`, { inline_keyboard: kb });
      return;
    }

    const bal = await heroGetBalance();
    const kb = await buildMainKeyboard();
    await sendMsg(
      chatId,
      `👋 أهلاً بك في بوت أرقام التفعيل الشخصي المباشر.\n\n💰 *رصيدك الحقيقي في Hero-SMS:* \`${bal}\`\n👇 اضغط للبدء:`,
      kb
    );
  }
}

// =========================================================================
//   مسارات Express
// =========================================================================

app.get('/', async (req, res) => {
  const bal = await heroGetBalance();
  res.json({
    status: 'online',
    bot: 'Hero-SMS Personal Bot',
    runtime: 'Node.js ' + process.version,
    hero_sms_balance: bal
  });
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  if (req.body) {
    try {
      await handleUpdate(req.body);
    } catch (err) {
      console.error('Error handling update:', err);
    }
  }
});

// =========================================================================
//   بدء التشغيل
// =========================================================================

app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 خادم Node.js يعمل الآن على المنفذ: ${PORT}`);
  console.log(`🔑 Bot Token: ${TELEGRAM_BOT_TOKEN.slice(0, 10)}...`);
  console.log(`👑 Admin Chat ID: ${TELEGRAM_ADMIN_CHAT_ID}`);

  const bal = await heroGetBalance();
  console.log(`💰 رصيدك في Hero-SMS: ${bal}`);
  console.log(`=======================================================`);

  // إذا كنا على Render وفيه رابط خارجي، نسجل الـ Webhook تلقائياً
  if (RENDER_EXTERNAL_URL) {
    const hookUrl = `${RENDER_EXTERNAL_URL}/webhook`;
    console.log(`🔗 جاري ربط الـ Webhook مع Render: ${hookUrl}`);
    const hookRes = await tgCall('setWebhook', { url: hookUrl });
    console.log(`✓ نتيجة ربط الـ Webhook:`, hookRes);
  } else {
    // تشغيل محلي بدون Render: نستخدم Long Polling
    console.log(`💻 تشغيل محلي: جاري تفعيل الاستماع المباشر (Long Polling)...`);
    await tgCall('deleteWebhook', {});
    startPollingLoop();
  }
});

// تشغيل Polling محلياً
async function startPollingLoop() {
  let offset = 0;
  while (true) {
    try {
      const res = await tgCall('getUpdates', { offset, timeout: 20 });
      if (res.ok && Array.isArray(res.result)) {
        for (const upd of res.result) {
          offset = upd.update_id + 1;
          handleUpdate(upd).catch(console.error);
        }
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 3000));
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}
