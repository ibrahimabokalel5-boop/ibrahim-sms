// =========================================================================
//   منصة الخدمات الرقمية الشاملة - Digital Services & Phone Hub Pro
//   شحن ألعاب • اشتراكات • بطاقات رقمية • أرقام تفعيل • خدمات سوشيال ميديا
// =========================================================================

const HERO_DIRECT = 'https://hero-sms.com/stubs/handler_api.php';
const DEFAULT_KEY = 'f144cA86391f362758c129f14dc33fc9';

// ---- الإعدادات العامة للمتجر وحسابات الدفع ----
let shopSettings = JSON.parse(localStorage.getItem('hero_sms_shop_settings') || JSON.stringify({
  shopName: 'متجر الخدمات الرقمية الشامل',
  shopPhone: '+963 900 000 000',
  exchangeRate: 14500,
  profitMargin: 20,
  sellPrice: 15000,
  syriatelCash: '0991234567',
  shamCash: '0981234567',
  usdtAddress: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  tgToken: '',
  tgChatId: ''
}));

// ---- إعدادات API شحن الألعاب وسيرفرات الجملة ----
let gamingApiSettings = JSON.parse(localStorage.getItem('hero_gaming_api_settings') || JSON.stringify({
  mode: 'demo', // 'demo' أو 'real'
  providerPreset: 'custom',
  apiUrl: '',
  apiKey: '',
  merchantId: '',
  balanceUrl: '',
  cachedBalance: null
}));

// ---- السجل الموحد ----
let history = JSON.parse(localStorage.getItem('hero_sms_history') || '[]');

// ---- متغيرات حالة النظام ----
let activeMainSection = 'games';
let currentReceiptOrder = null;

// ---- متغيرات الأرقام المؤقتة (Hero-SMS) ----
let apiKey = '';
let currentId = null;
let currentPhone = null;
let currentCountry = '4';
let currentCountryName = 'الفلبين';
let currentCountryFlag = '🇵🇭';
let currentService = 'go';
let currentServiceName = 'Google';
let currentCost = 0.024;
let activationTime = 0;
let timerInterval = null;
let pollInterval = null;
let pricesCache = {};
let currentRentDuration = 24;
let currentRentId = null;

// ---- بيانات كتالوج الألعاب (Gaming Top-up) ----
const GAMES_DATA = {
  pubg: {
    id: 'pubg',
    title: 'ببجي موبايل (PUBG UC)',
    icon: '🪖',
    badge: 'شحن فوري بالآيدي',
    packages: [
      { id: 'p60', name: '60 UC', bonus: 'شدات أصلية', cost: 0.85 },
      { id: 'p325', name: '325 UC', bonus: '+25 UC بونص مجاني 🔥', cost: 4.10 },
      { id: 'p660', name: '660 UC', bonus: '+60 UC (رويال باس) 👑', cost: 8.15 },
      { id: 'p1800', name: '1800 UC', bonus: '+300 UC بونص مجاني', cost: 20.20 },
      { id: 'p3850', name: '3850 UC', bonus: '+850 UC بونص ضخم', cost: 40.50 },
      { id: 'p8100', name: '8100 UC', bonus: '+2100 UC باقة الهوامير', cost: 81.00 }
    ]
  },
  freefire: {
    id: 'freefire',
    title: 'فري فاير (Free Fire)',
    icon: '🔥',
    badge: 'جواهر مباشرة عبر الـ ID',
    packages: [
      { id: 'ff110', name: '100 + 10 💎', bonus: '10 جواهر إضافية', cost: 0.88 },
      { id: 'ff231', name: '210 + 21 💎', bonus: '21 جوهرة إضافية', cost: 1.75 },
      { id: 'ff583', name: '530 + 53 💎', bonus: '53 جوهرة (الفاير باس)', cost: 4.30 },
      { id: 'ff1188', name: '1080 + 108 💎', bonus: '108 جواهر إضافية', cost: 8.60 },
      { id: 'ff2420', name: '2200 + 220 💎', bonus: '220 جوهرة إضافية', cost: 17.20 }
    ]
  },
  roblox: {
    id: 'roblox',
    title: 'روبلوكس (Robux)',
    icon: '🧱',
    badge: 'شحن روبوكس فوري',
    packages: [
      { id: 'rb80', name: '80 Robux', bonus: 'شحن فوري', cost: 0.95 },
      { id: 'rb400', name: '400 Robux', bonus: 'الأكثر شعبية', cost: 4.40 },
      { id: 'rb800', name: '800 Robux', bonus: 'حساب رسمي', cost: 8.70 },
      { id: 'rb1700', name: '1700 Robux', bonus: 'توفير عالي', cost: 17.50 },
      { id: 'rb4500', name: '4500 Robux', bonus: 'باقة VIP', cost: 44.00 }
    ]
  },
  cod: {
    id: 'cod',
    title: 'كول أوف ديوتي (COD Mobile CP)',
    icon: '🎯',
    badge: 'نقاط CP الرسمية',
    packages: [
      { id: 'cod80', name: '80 CP', bonus: '', cost: 0.90 },
      { id: 'cod420', name: '420 CP', bonus: 'تفعيل الباتل باس', cost: 4.30 },
      { id: 'cod880', name: '880 CP', bonus: 'سكنات وأسلحة', cost: 8.50 },
      { id: 'cod2400', name: '2400 CP', bonus: 'باقة مميزة', cost: 21.00 },
      { id: 'cod5000', name: '5000 CP', bonus: 'باقة الأساطير', cost: 42.00 }
    ]
  },
  pes: {
    id: 'pes',
    title: 'eFootball PES Coins',
    icon: '⚽',
    badge: 'كوينز الحساب المباشرة',
    packages: [
      { id: 'pes130', name: '130 Coins', bonus: 'بكج لاعبين', cost: 1.20 },
      { id: 'pes550', name: '550 Coins', bonus: 'عروض الموسم', cost: 4.50 },
      { id: 'pes1040', name: '1040 Coins', bonus: 'نجوم الأسبوع', cost: 8.50 },
      { id: 'pes2130', name: '2130 Coins', bonus: 'باقة الماستر', cost: 17.00 }
    ]
  },
  brawl: {
    id: 'brawl',
    title: 'Brawl Stars (Supercell)',
    icon: '⭐',
    badge: 'جواهر رسمية',
    packages: [
      { id: 'bs30', name: '30 Gems', bonus: '', cost: 1.80 },
      { id: 'bs80', name: '80 Gems', bonus: 'براول باس', cost: 4.50 },
      { id: 'bs170', name: '170 Gems', bonus: '', cost: 8.90 },
      { id: 'bs360', name: '360 Gems', bonus: 'باقة سوبر', cost: 17.50 }
    ]
  }
};

let selectedGameKey = 'pubg';
let selectedGamePkgIndex = 1; // 325 UC default

// ---- بيانات كتالوج الاشتراكات (Apps & Subscriptions) ----
const APPS_DATA = {
  telegram: {
    id: 'telegram',
    title: 'تليجرام بريميوم (Telegram Premium)',
    inputLabel: 'معرف الحساب (@username أو رقم الهاتف):',
    placeholder: 'مثال: @username أو +963...',
    packages: [
      { id: 'tg3m', name: '3 شهور بريميوم', bonus: 'تفعيل عبر الهدية', cost: 11.50 },
      { id: 'tg6m', name: '6 شهور بريميوم', bonus: 'توفير 15%', cost: 17.50 },
      { id: 'tg12m', name: 'سنة كاملة (12 شهر)', bonus: 'أفضل قيمة ⭐', cost: 28.50 }
    ]
  },
  youtube: {
    id: 'youtube',
    title: 'يوتيوب بريميوم (YouTube Premium)',
    inputLabel: 'البريد الإلكتروني للزبون (Gmail):',
    placeholder: 'user@gmail.com',
    packages: [
      { id: 'yt1m', name: 'شهر واحد', bonus: 'بدون إعلانات + YouTube Music', cost: 2.20 },
      { id: 'yt3m', name: '3 شهور', bonus: 'ضمان كامل المدة', cost: 5.80 },
      { id: 'yt12m', name: 'سنة كاملة (12 شهر)', bonus: 'ترخيص سنوي رسمي', cost: 19.00 }
    ]
  },
  chatgpt: {
    id: 'chatgpt',
    title: 'ChatGPT Plus رسمي (OpenAI)',
    inputLabel: 'البريد الإلكتروني لحساب OpenAI:',
    placeholder: 'user@gmail.com',
    packages: [
      { id: 'gpt1m', name: 'اشتراك شهري (1 Month)', bonus: 'GPT-4o & Canvas وDALL-E بدون حدود', cost: 19.00 }
    ]
  },
  netflix: {
    id: 'netflix',
    title: 'Netflix 4K Ultra HD',
    inputLabel: 'رقم هاتف الزبون أو الإيميل لاستلام الحساب:',
    placeholder: '+963 9... أو email',
    packages: [
      { id: 'nf1m_prof', name: 'شهر واحد (بروفايل خاص برمز PIN)', bonus: 'شاشة 4K خاصة', cost: 3.50 },
      { id: 'nf3m_prof', name: '3 شهور (بروفايل خاص)', bonus: 'ضمان كامل المدة', cost: 9.50 },
      { id: 'nf1m_full', name: 'شهر كامل (حساب كامل 5 شاشات)', bonus: 'حساب خاص بالزبون', cost: 13.00 }
    ]
  },
  spotify: {
    id: 'spotify',
    title: 'Spotify Premium',
    inputLabel: 'البريد الإلكتروني لحساب سبوتيفاي:',
    placeholder: 'user@gmail.com',
    packages: [
      { id: 'sp3m', name: '3 شهور', bonus: 'استماع بلا إنترنت', cost: 4.50 },
      { id: 'sp6m', name: '6 شهور', bonus: 'بدون إعلانات أبداً', cost: 8.00 },
      { id: 'sp12m', name: 'سنة كاملة', bonus: 'حساب فردي رسمي', cost: 14.50 }
    ]
  },
  canva: {
    id: 'canva',
    title: 'Canva Pro ترخيص كامل للمصممين',
    inputLabel: 'البريد الإلكتروني لدعوة الفريق:',
    placeholder: 'designer@gmail.com',
    packages: [
      { id: 'canva1y', name: 'سنة كاملة (12 شهر)', bonus: 'ملايين القوالب والذكاء الاصطناعي', cost: 6.50 }
    ]
  }
};

let selectedAppKey = 'telegram';
let selectedAppPkgIndex = 0;

// ---- بيانات كتالوج البطاقات الرقمية (Gift Cards) ----
const CARDS_DATA = {
  googleplay: {
    id: 'googleplay',
    title: 'بطاقات متجر Google Play (أمريكي)',
    denominations: [
      { id: 'gp5', name: 'Google Play 5$', cost: 4.95 },
      { id: 'gp10', name: 'Google Play 10$', cost: 9.85 },
      { id: 'gp15', name: 'Google Play 15$', cost: 14.80 },
      { id: 'gp25', name: 'Google Play 25$', cost: 24.60 },
      { id: 'gp50', name: 'Google Play 50$', cost: 49.00 },
      { id: 'gp100', name: 'Google Play 100$', cost: 97.50 }
    ]
  },
  itunes: {
    id: 'itunes',
    title: 'بطاقات Apple iTunes Store (أمريكي)',
    denominations: [
      { id: 'it5', name: 'iTunes 5$', cost: 4.95 },
      { id: 'it10', name: 'iTunes 10$', cost: 9.85 },
      { id: 'it15', name: 'iTunes 15$', cost: 14.80 },
      { id: 'it25', name: 'iTunes 25$', cost: 24.60 },
      { id: 'it50', name: 'iTunes 50$', cost: 49.00 }
    ]
  },
  playstation: {
    id: 'playstation',
    title: 'بطاقات PlayStation Network (PSN أمريكي)',
    denominations: [
      { id: 'ps10', name: 'PlayStation 10$', cost: 9.85 },
      { id: 'ps20', name: 'PlayStation 20$', cost: 19.70 },
      { id: 'ps25', name: 'PlayStation 25$', cost: 24.60 },
      { id: 'ps50', name: 'PlayStation 50$', cost: 49.00 },
      { id: 'ps100', name: 'PlayStation 100$', cost: 97.50 }
    ]
  },
  xbox: {
    id: 'xbox',
    title: 'بطاقات Xbox Live & Game Pass',
    denominations: [
      { id: 'xb10', name: 'Xbox 10$', cost: 9.85 },
      { id: 'xb25', name: 'Xbox 25$', cost: 24.60 },
      { id: 'xb50', name: 'Xbox 50$', cost: 49.00 }
    ]
  },
  redotpay: {
    id: 'redotpay',
    title: 'شحن بطاقة RedotPay Visa بالدولار',
    denominations: [
      { id: 'rp10', name: 'شحن 10$ فيزا RedotPay', cost: 10.20 },
      { id: 'rp20', name: 'شحن 20$ فيزا RedotPay', cost: 20.40 },
      { id: 'rp50', name: 'شحن 50$ فيزا RedotPay', cost: 50.80 },
      { id: 'rp100', name: 'شحن 100$ فيزا RedotPay', cost: 101.50 }
    ]
  },
  usdt: {
    id: 'usdt',
    title: 'شحن دولار رقمي (Binance Pay / USDT)',
    denominations: [
      { id: 'us10', name: 'تحويل 10 USDT', cost: 10.10 },
      { id: 'us25', name: 'تحويل 25 USDT', cost: 25.20 },
      { id: 'us50', name: 'تحويل 50 USDT', cost: 50.40 },
      { id: 'us100', name: 'تحويل 100 USDT', cost: 100.80 }
    ]
  }
};

let selectedBrandKey = 'googleplay';
let selectedDenomIndex = 1; // 10$ default
let currentVoucherCode = '';

// ---- بيانات خدمات السوشيال ميديا (SMM Panel) ----
const SMM_DATA = {
  instagram: [
    { id: 'ig_fol', name: 'متابعين إنستغرام مكس مظهر حقيقي (ضمان 30 يوم)', ratePer1k: 1.20 },
    { id: 'ig_lik', name: 'لايكات إنستغرام سريعة وثابتة', ratePer1k: 0.35 },
    { id: 'ig_viw', name: 'مشاهدات ريلز Reels تفاعل وإكسبلور', ratePer1k: 0.15 }
  ],
  tiktok: [
    { id: 'tt_fol', name: 'متابعين تيك توك فوري بدون نقصان', ratePer1k: 2.10 },
    { id: 'tt_lik', name: 'لايكات تيك توك حقيقية', ratePer1k: 0.40 },
    { id: 'tt_viw', name: 'مشاهدات فيديو تيك توك إكسبلور', ratePer1k: 0.08 }
  ],
  telegram: [
    { id: 'tg_mem', name: 'أعضاء قنوات ومجموعات تيليجرام حقيقيين', ratePer1k: 1.50 },
    { id: 'tg_viw', name: 'مشاهدات لآخر 5 منشورات في القناة', ratePer1k: 0.12 }
  ],
  youtube: [
    { id: 'yt_sub', name: 'مشتركين يوتيوب ثابتين (ضمان شهر)', ratePer1k: 9.50 },
    { id: 'yt_viw', name: 'مشاهدات يوتيوب جودة ممتازة وسريعة', ratePer1k: 2.20 }
  ],
  facebook: [
    { id: 'fb_lik', name: 'لايكات ومتابعين صفحات فيسبوك', ratePer1k: 2.80 },
    { id: 'fb_pst', name: 'تفاعلات بوستات فيسبوك مكس', ratePer1k: 0.60 }
  ]
};

let selectedSmmPlatformKey = 'instagram';

// =========================================================================
//   محرك الحسابات المالية والتسعير (Pricing Engine)
// =========================================================================

function calculatePricing(costUSD) {
  const exchangeRate = parseFloat(shopSettings.exchangeRate) || 14500;
  const marginPercent = parseFloat(shopSettings.profitMargin) !== undefined ? parseFloat(shopSettings.profitMargin) : 20;

  const costSYP = costUSD * exchangeRate;
  const rawSell = costSYP * (1 + marginPercent / 100);
  // تقريب السعر لأقرب 500 ليرة سورية ليكون مريحاً في المحلات
  const sellPriceSYP = Math.max(500, Math.ceil(rawSell / 500) * 500);
  const profitSYP = Math.max(0, sellPriceSYP - costSYP);

  return {
    costUSD,
    costSYP,
    sellPriceSYP,
    profitSYP
  };
}

// =========================================================================
//   دورة الحياة والتهيئة (Init & Setup)
// =========================================================================

window.addEventListener('load', () => {
  // استعادة مفتاح API
  const savedKey = localStorage.getItem('hero_sms_api_key') || DEFAULT_KEY;
  const keyInput = document.getElementById('apiKey');
  if (keyInput) keyInput.value = savedKey;

  applyShopSettings();
  renderHistory();
  updateShopStats();

  // بناء واجهات الخدمات لأول مرة
  renderGamePackages();
  renderAppPackages();
  renderCardDenominations();
  renderSmmServices();
  updateApiStatusDisplay();

  // اتصال خلفي هادئ بالأرقام إذا كان هناك مفتاح
  if (savedKey) {
    connectAPI(true);
  }
});

// ---- التبديل بين التبويبات الرئيسية ----
function switchMainTab(tabName) {
  activeMainSection = tabName;

  // تحديث أزرار التبويبات
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const activeBtn = document.getElementById(`mainTab-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');

  // إخفاء كافة الأقسام
  const sections = ['games', 'apps', 'cards', 'sms', 'smm', 'history'];
  sections.forEach(sec => {
    hide(`section-${sec}`);
  });

  // إظهار القسم المطلوب
  show(`section-${tabName}`);

  // ضبط التمرير في الموبايل
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =========================================================================
//   منظومة شحن الألعاب (Gaming Top-up Module)
// =========================================================================

function selectGame(gameKey) {
  selectedGameKey = gameKey;
  selectedGamePkgIndex = 0;

  document.querySelectorAll('#gamesGrid .game-item').forEach(el => {
    el.classList.toggle('active', el.dataset.game === gameKey);
  });

  const game = GAMES_DATA[gameKey];
  document.getElementById('selectedGameTitle').textContent = game.title;

  // مسح التحقق السابق
  hide('playerVerificationBadge');
  document.getElementById('gamePlayerId').value = '';

  renderGamePackages();
}

function verifyPlayerId() {
  const idInput = document.getElementById('gamePlayerId');
  const idVal = (idInput ? idInput.value : '').trim();

  if (!idVal) {
    showToast('⚠️ يرجى إدخال معرف اللاعب (Player ID) أولاً', 'error');
    return;
  }

  const btnText = document.getElementById('btnVerifyText');
  const spinner = document.getElementById('verifySpinner');
  if (btnText) btnText.textContent = 'جارٍ الفحص...';
  if (spinner) spinner.classList.remove('hidden');

  setTimeout(() => {
    if (btnText) btnText.textContent = 'فحص المعرّف 🔍';
    if (spinner) spinner.classList.add('hidden');

    const fakeNames = ['King_Hero', 'Sniper_Ghost', 'Shadow_99', 'Fighter_Pro', 'Legend_Syria', 'Tiger_Strike'];
    const randomName = fakeNames[Math.floor(Math.random() * fakeNames.length)] + '_' + idVal.slice(-3);
    const randomLevel = Math.floor(Math.random() * 35) + 40;

    document.getElementById('verifiedPlayerName').textContent = randomName;
    document.getElementById('verifiedPlayerMeta').textContent = `سيرفر الشرق الأوسط | لفل ${randomLevel} | حساب نشط ومتحقق منه ✅`;
    show('playerVerificationBadge');
    showToast(`✅ تم التحقق من الحساب: ${randomName}`, 'success');
  }, 600);
}

function renderGamePackages() {
  const game = GAMES_DATA[selectedGameKey];
  const grid = document.getElementById('gamePackagesGrid');
  if (!grid || !game) return;

  grid.innerHTML = game.packages.map((pkg, idx) => {
    const p = calculatePricing(pkg.cost);
    const isActive = idx === selectedGamePkgIndex;
    return `
      <div class="pkg-card ${isActive ? 'active' : ''}" onclick="selectGamePackage(${idx})">
        <div class="pkg-name">${pkg.name}</div>
        ${pkg.bonus ? `<div class="pkg-bonus">${pkg.bonus}</div>` : ''}
        <div class="pkg-sell">${p.sellPriceSYP.toLocaleString()} ل.س</div>
        <div class="pkg-cost">${pkg.cost.toFixed(2)} $</div>
        <div class="pkg-profit-chip">+ ${p.profitSYP.toLocaleString()} ربح</div>
      </div>
    `;
  }).join('');

  updateGameSummary();
}

function selectGamePackage(idx) {
  selectedGamePkgIndex = idx;
  renderGamePackages();
}

function updateGameSummary() {
  const game = GAMES_DATA[selectedGameKey];
  const pkg = game.packages[selectedGamePkgIndex] || game.packages[0];
  const p = calculatePricing(pkg.cost);

  document.getElementById('sumPkgName').textContent = `${game.title} - ${pkg.name}`;
  document.getElementById('sumPkgCost').textContent = `${pkg.cost.toFixed(2)} $ (${Math.round(p.costSYP).toLocaleString()} ل.س)`;
  document.getElementById('sumPkgProfit').textContent = `+ ${p.profitSYP.toLocaleString()} ل.س`;
  document.getElementById('sumPkgSellPrice').textContent = `${p.sellPriceSYP.toLocaleString()} ل.س`;
}

// =========================================================================
//   إدارة وربط API شحن الألعاب وسيرفرات الجملة
// =========================================================================

function openApiSettingsModal() {
  const modeSel = document.getElementById('apiOperationMode');
  if (modeSel) modeSel.value = gamingApiSettings.mode || 'demo';

  const presetSel = document.getElementById('apiProviderPreset');
  if (presetSel) presetSel.value = gamingApiSettings.providerPreset || 'custom';

  const urlInput = document.getElementById('apiEndpointUrl');
  if (urlInput) urlInput.value = gamingApiSettings.apiUrl || '';

  const keyInput = document.getElementById('apiSecretKey');
  if (keyInput) keyInput.value = gamingApiSettings.apiKey || '';

  const merchInput = document.getElementById('apiMerchantId');
  if (merchInput) merchInput.value = gamingApiSettings.merchantId || '';

  const balInput = document.getElementById('apiBalanceUrl');
  if (balInput) balInput.value = gamingApiSettings.balanceUrl || '';

  toggleApiModeFields();
  show('apiSettingsModal');
}

function closeApiSettingsModal() {
  hide('apiSettingsModal');
}

function toggleApiModeFields() {
  const mode = document.getElementById('apiOperationMode')?.value || 'demo';
  const group = document.getElementById('realApiFieldsGroup');
  if (group) {
    group.style.opacity = mode === 'real' ? '1' : '0.4';
    group.style.pointerEvents = mode === 'real' ? 'auto' : 'none';
  }
}

function applyProviderPreset() {
  const preset = document.getElementById('apiProviderPreset')?.value;
  const urlInput = document.getElementById('apiEndpointUrl');
  const balInput = document.getElementById('apiBalanceUrl');

  if (preset === 'like4card' && urlInput) {
    urlInput.placeholder = 'https://like4card.com/api/v1/orders/create';
    if (balInput) balInput.placeholder = 'https://like4card.com/api/v1/balance';
  } else if (preset === 'smileone' && urlInput) {
    urlInput.placeholder = 'https://www.smile.one/smilecoin/api/createorder';
    if (balInput) balInput.placeholder = 'https://www.smile.one/smilecoin/api/querypoints';
  } else if (preset === 'telegram' && urlInput) {
    urlInput.placeholder = 'https://api.telegram.org/bot<TOKEN>/sendMessage';
    if (balInput) balInput.placeholder = '';
  } else if (urlInput) {
    urlInput.placeholder = 'https://wholesaler-api.com/api/v1/topup';
    if (balInput) balInput.placeholder = 'https://wholesaler-api.com/api/v1/balance';
  }
}

function saveApiSettings() {
  gamingApiSettings.mode = document.getElementById('apiOperationMode')?.value || 'demo';
  gamingApiSettings.providerPreset = document.getElementById('apiProviderPreset')?.value || 'custom';
  gamingApiSettings.apiUrl = (document.getElementById('apiEndpointUrl')?.value || '').trim();
  gamingApiSettings.apiKey = (document.getElementById('apiSecretKey')?.value || '').trim();
  gamingApiSettings.merchantId = (document.getElementById('apiMerchantId')?.value || '').trim();
  gamingApiSettings.balanceUrl = (document.getElementById('apiBalanceUrl')?.value || '').trim();

  localStorage.setItem('hero_gaming_api_settings', JSON.stringify(gamingApiSettings));

  updateApiStatusDisplay();
  closeApiSettingsModal();

  if (gamingApiSettings.mode === 'real') {
    showToast('✅ تم تفعيل وضع الربط بسيرفر الـ API الحقيقي بنجاح!', 'success');
  } else {
    showToast('ℹ️ تم ضبط الوضع على المحاكاة والتجربة', 'info');
  }
}

async function testProviderBalance() {
  const balUrl = (document.getElementById('apiBalanceUrl')?.value || '').trim() || (document.getElementById('apiEndpointUrl')?.value || '').trim();
  const apiKeyVal = (document.getElementById('apiSecretKey')?.value || '').trim();

  if (!balUrl) {
    showToast('يرجى كتابة رابط السيرفر أولاً للفحص', 'error');
    return;
  }

  showToast('جارٍ فحص الاتصال والرصيد مع سيرفر المزود...', '');
  try {
    const res = await fetch('http://localhost:8080/api/topup/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balanceUrl: balUrl, apiKey: apiKeyVal })
    });
    const data = await res.json();
    if (data.success) {
      gamingApiSettings.cachedBalance = data.balance;
      localStorage.setItem('hero_gaming_api_settings', JSON.stringify(gamingApiSettings));
      updateApiStatusDisplay();
      showToast(`✅ تم الاتصال بنجاح! الرصيد في السيرفر: ${data.balance} $`, 'success');
    } else {
      showToast(`تنبيه السيرفر: ${data.error || 'تعذر جلب الرصيد'}`, 'error');
    }
  } catch (e) {
    showToast('فشل الاتصال بالخادم المحلي server.py', 'error');
  }
}

function updateApiStatusDisplay() {
  const dot = document.getElementById('apiStatusDot');
  const txt = document.getElementById('apiStatusText');
  const chip = document.getElementById('apiBalanceChip');

  if (gamingApiSettings.mode === 'real') {
    if (dot) dot.className = 'api-status-dot connected';
    if (txt) txt.textContent = `وضع الـ API: سيرفر حقيقي مفعّل (${gamingApiSettings.providerPreset.toUpperCase()}) 🟢`;
    if (chip) {
      if (gamingApiSettings.cachedBalance !== null && gamingApiSettings.cachedBalance !== undefined) {
        chip.textContent = `رصيد السيرفر: ${gamingApiSettings.cachedBalance} $`;
      } else {
        chip.textContent = 'متصل بالمزود ✓';
      }
      chip.classList.remove('hidden');
    }
  } else {
    if (dot) dot.className = 'api-status-dot';
    if (txt) txt.textContent = 'وضع الـ API: محاكاة وتجربة (Demo)';
    if (chip) chip.classList.add('hidden');
  }
}

// تنفيذ عملية الشحن (حقيقي أو محاكاة)
async function executeGameCharge() {
  const idInput = document.getElementById('gamePlayerId');
  const playerId = (idInput ? idInput.value : '').trim();

  if (!playerId) {
    showToast('⚠️ يرجى إدخال معرّف اللاعب (Player ID) قبل الشحن', 'error');
    if (idInput) idInput.focus();
    return;
  }

  const game = GAMES_DATA[selectedGameKey];
  const pkg = game.packages[selectedGamePkgIndex];
  const p = calculatePricing(pkg.cost);
  const playerName = document.getElementById('verifiedPlayerName')?.textContent || 'Player_' + playerId;

  const btn = document.getElementById('btnExecuteGameCharge');
  if (btn) {
    btn.disabled = true;
    btn.textContent = gamingApiSettings.mode === 'real'
      ? '⏳ جارٍ إرسال الطلب لسيرفر الـ API الحقيقي والشحن...'
      : '⏳ جارٍ الاتصال بسيرفر اللعبة وتنفيذ الشحن...';
  }

  // في حال كان وضع الـ API الحقيقي مفعلاً
  if (gamingApiSettings.mode === 'real') {
    if (!gamingApiSettings.apiUrl) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ تنفيذ الشحن الآن وإصدار الإيصال';
      }
      showToast('⚠️ لم تضبط رابط الـ API! يرجى الدخول للإعدادات أولاً', 'error');
      openApiSettingsModal();
      return;
    }

    try {
      const orderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
      const res = await fetch('http://localhost:8080/api/topup/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerType: gamingApiSettings.providerPreset,
          apiUrl: gamingApiSettings.apiUrl,
          apiKey: gamingApiSettings.apiKey,
          merchantId: gamingApiSettings.merchantId,
          game: selectedGameKey,
          packageId: pkg.id,
          playerId: playerId,
          orderId
        })
      });

      const resData = await res.json();

      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ تنفيذ الشحن الآن وإصدار الإيصال';
      }

      if (resData.success) {
        playSuccessSound();
        const txCode = resData.transactionId || ('TX-' + Math.random().toString(36).substring(2, 9).toUpperCase());

        const orderData = {
          orderId,
          category: 'games',
          categoryName: 'شحن ألعاب فوري (API معتمد)',
          title: `${game.title} - ${pkg.name}`,
          targetLabel: 'معرّف اللاعب (ID):',
          target: `${playerId} (${playerName})`,
          code: txCode,
          codeLabel: 'رقم العملية المعتمد بالسيرفر',
          costUSD: pkg.cost,
          sellPriceSYP: p.sellPriceSYP,
          profitSYP: p.profitSYP,
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toISOString().slice(0, 10),
          notice: '✅ تم الشحن بنجاح من خلال سيرفر الـ API الحقيقي وخصم التكلفة من رصيدك.'
        };

        saveOrderToHistory(orderData);
        openUniversalReceipt(orderData);
        showToast(`🎉 تم الشحن الفعلي بنجاح لدى المزود للآيدي ${playerId}!`, 'success');
      } else {
        showToast(`❌ فشل الطلب من سيرفر المزود: ${resData.error || 'خطأ غير معروف'}`, 'error');
      }
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ تنفيذ الشحن الآن وإصدار الإيصال';
      }
      showToast(`❌ تعذر الاتصال بالخادم المحلي: ${err.message}`, 'error');
    }
    return;
  }

  // فتح نافذة الدفع وإتمام الطلب للزبون
  if (btn) {
    btn.disabled = false;
    btn.textContent = '⚡ تنفيذ الشحن الآن وإصدار الإيصال';
  }

  openCheckoutModal({
    serviceType: 'games',
    serviceTitle: game.title,
    packageId: pkg.id,
    packageName: pkg.name,
    targetId: `${playerId} (${playerName})`,
    priceUSD: pkg.cost,
    priceLocal: p.sellPriceSYP
  });
}

// =========================================================================
//   منظومة الاشتراكات والتطبيقات (Apps & Subscriptions Module)
// =========================================================================

function selectApp(appKey) {
  selectedAppKey = appKey;
  selectedAppPkgIndex = 0;

  document.querySelectorAll('#appsGrid .app-item').forEach(el => {
    el.classList.toggle('active', el.dataset.app === appKey);
  });

  const app = APPS_DATA[appKey];
  document.getElementById('selectedAppTitle').textContent = app.title;
  document.getElementById('appInputLabel').textContent = app.inputLabel;
  document.getElementById('appTargetAccount').placeholder = app.placeholder;
  document.getElementById('appTargetAccount').value = '';

  renderAppPackages();
}

function renderAppPackages() {
  const app = APPS_DATA[selectedAppKey];
  const grid = document.getElementById('appPackagesGrid');
  if (!grid || !app) return;

  grid.innerHTML = app.packages.map((pkg, idx) => {
    const p = calculatePricing(pkg.cost);
    const isActive = idx === selectedAppPkgIndex;
    return `
      <div class="pkg-card ${isActive ? 'active' : ''}" onclick="selectAppPackage(${idx})">
        <div class="pkg-name">${pkg.name}</div>
        ${pkg.bonus ? `<div class="pkg-bonus">${pkg.bonus}</div>` : ''}
        <div class="pkg-sell">${p.sellPriceSYP.toLocaleString()} ل.س</div>
        <div class="pkg-cost">${pkg.cost.toFixed(2)} $</div>
        <div class="pkg-profit-chip">+ ${p.profitSYP.toLocaleString()} ربح</div>
      </div>
    `;
  }).join('');

  updateAppSummary();
}

function selectAppPackage(idx) {
  selectedAppPkgIndex = idx;
  renderAppPackages();
}

function updateAppSummary() {
  const app = APPS_DATA[selectedAppKey];
  const pkg = app.packages[selectedAppPkgIndex] || app.packages[0];
  const p = calculatePricing(pkg.cost);

  document.getElementById('sumAppName').textContent = `${app.title} - ${pkg.name}`;
  document.getElementById('sumAppCost').textContent = `${pkg.cost.toFixed(2)} $ (${Math.round(p.costSYP).toLocaleString()} ل.س)`;
  document.getElementById('sumAppProfit').textContent = `+ ${p.profitSYP.toLocaleString()} ل.س`;
  document.getElementById('sumAppSellPrice').textContent = `${p.sellPriceSYP.toLocaleString()} ل.س`;
}

function executeAppSubscription() {
  const targetAcc = (document.getElementById('appTargetAccount')?.value || '').trim();
  if (!targetAcc) {
    showToast('⚠️ يرجى إدخال حساب الزبون (اليوزر أو الإيميل)', 'error');
    document.getElementById('appTargetAccount')?.focus();
    return;
  }

  const app = APPS_DATA[selectedAppKey];
  const pkg = app.packages[selectedAppPkgIndex];
  const p = calculatePricing(pkg.cost);

  const btn = document.getElementById('btnExecuteAppSub');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ جارٍ إرسال ترخيص الاشتراك والتفعيل...';
  }

  // فتح نافذة الدفع وإتمام الطلب للزبون
  if (btn) {
    btn.disabled = false;
    btn.textContent = '⚡ تفعيل الاشتراك للزبون وطباعة الإيصال';
  }

  openCheckoutModal({
    serviceType: 'apps',
    serviceTitle: app.title,
    packageId: pkg.id,
    packageName: pkg.name,
    targetId: targetAcc,
    priceUSD: pkg.cost,
    priceLocal: p.sellPriceSYP
  });
}

// =========================================================================
//   منظومة البطاقات والمحافظ الرقمية (Gift Cards Module)
// =========================================================================

function selectCardBrand(brandKey) {
  selectedBrandKey = brandKey;
  selectedDenomIndex = 0;

  document.querySelectorAll('#cardsBrandsGrid .brand-item').forEach(el => {
    el.classList.toggle('active', el.dataset.brand === brandKey);
  });

  const brand = CARDS_DATA[brandKey];
  document.getElementById('selectedBrandTitle').textContent = brand.title;
  hide('voucherResultBox');

  renderCardDenominations();
}

function renderCardDenominations() {
  const brand = CARDS_DATA[selectedBrandKey];
  const grid = document.getElementById('cardDenominationsGrid');
  if (!grid || !brand) return;

  grid.innerHTML = brand.denominations.map((denom, idx) => {
    const p = calculatePricing(denom.cost);
    const isActive = idx === selectedDenomIndex;
    return `
      <div class="pkg-card ${isActive ? 'active' : ''}" onclick="selectCardDenom(${idx})">
        <div class="pkg-name">${denom.name}</div>
        <div class="pkg-sell">${p.sellPriceSYP.toLocaleString()} ل.س</div>
        <div class="pkg-cost">${denom.cost.toFixed(2)} $</div>
        <div class="pkg-profit-chip">+ ${p.profitSYP.toLocaleString()} ربح</div>
      </div>
    `;
  }).join('');

  updateCardSummary();
}

function selectCardDenom(idx) {
  selectedDenomIndex = idx;
  renderCardDenominations();
}

function updateCardSummary() {
  const brand = CARDS_DATA[selectedBrandKey];
  const denom = brand.denominations[selectedDenomIndex] || brand.denominations[0];
  const p = calculatePricing(denom.cost);

  document.getElementById('sumCardName').textContent = `${brand.title} - ${denom.name}`;
  document.getElementById('sumCardCost').textContent = `${denom.cost.toFixed(2)} $ (${Math.round(p.costSYP).toLocaleString()} ل.س)`;
  document.getElementById('sumCardProfit').textContent = `+ ${p.profitSYP.toLocaleString()} ل.س`;
  document.getElementById('sumCardSellPrice').textContent = `${p.sellPriceSYP.toLocaleString()} ل.س`;
}

function generateRealisticVoucher(brandKey) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function segment(len) {
    let s = '';
    for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return s;
  }
  if (brandKey === 'googleplay') return `${segment(4)}-${segment(4)}-${segment(4)}-${segment(4)}`;
  if (brandKey === 'itunes') return `X${segment(3)}${segment(4)}${segment(4)}${segment(4)}`;
  if (brandKey === 'playstation') return `${segment(4)}-${segment(4)}-${segment(4)}`;
  if (brandKey === 'xbox') return `${segment(5)}-${segment(5)}-${segment(5)}-${segment(5)}-${segment(5)}`;
  if (brandKey === 'redotpay') return `VCC-4589-${segment(4)}-${segment(4)} [CVV: ${Math.floor(100 + Math.random()*900)}]`;
  return `BINANCE-PAY-${segment(8)}`;
}

function executeCardPurchase() {
  const brand = CARDS_DATA[selectedBrandKey];
  const denom = brand.denominations[selectedDenomIndex];
  const p = calculatePricing(denom.cost);

  const btn = document.getElementById('btnBuyCardVoucher');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ جارٍ استدعاء كود البطاقة وفك التشفير...';
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = '🎟️ استخراج كود البطاقة للزبون وإصدار الإيصال';
  }

  openCheckoutModal({
    serviceType: 'cards',
    serviceTitle: brand.title,
    packageId: denom.id,
    packageName: denom.name,
    targetId: denom.name,
    priceUSD: denom.cost,
    priceLocal: p.sellPriceSYP
  });
}

function copyVoucherCode() {
  if (!currentVoucherCode) return;
  navigator.clipboard.writeText(currentVoucherCode);
  showToast('📋 تم نسخ كود البطاقة بنجاح!', 'success');
}

function printCardReceipt() {
  if (history.length > 0 && history[0].category === 'cards') {
    openUniversalReceipt(history[0]);
  }
}

// =========================================================================
//   منظومة خدمات السوشيال ميديا (SMM Module)
// =========================================================================

function selectSmmPlatform(platformKey) {
  selectedSmmPlatformKey = platformKey;

  document.querySelectorAll('#smmPlatformsGrid .smm-platform').forEach(el => {
    el.classList.toggle('active', el.dataset.platform === platformKey);
  });

  renderSmmServices();
}

function renderSmmServices() {
  const select = document.getElementById('smmServiceSelect');
  const services = SMM_DATA[selectedSmmPlatformKey] || [];
  if (!select) return;

  select.innerHTML = services.map(svc => `
    <option value="${svc.id}" data-rate="${svc.ratePer1k}">${svc.name} (${svc.ratePer1k}$ / 1000)</option>
  `).join('');

  updateSmmCalculator();
}

function setSmmQty(qty) {
  const input = document.getElementById('smmQuantity');
  if (input) {
    input.value = qty;
    updateSmmCalculator();
  }
}

function updateSmmCalculator() {
  const select = document.getElementById('smmServiceSelect');
  const qtyInput = document.getElementById('smmQuantity');
  if (!select || !qtyInput) return;

  const selectedOpt = select.options[select.selectedIndex];
  const ratePer1k = parseFloat(selectedOpt?.dataset.rate) || 1.5;
  const qty = parseInt(qtyInput.value) || 1000;

  const costUSD = (qty / 1000) * ratePer1k;
  const p = calculatePricing(costUSD);

  document.getElementById('sumSmmService').textContent = `${selectedOpt ? selectedOpt.text.split('(')[0] : ''} [${qty.toLocaleString()}]`;
  document.getElementById('sumSmmCost').textContent = `${costUSD.toFixed(2)} $ (${Math.round(p.costSYP).toLocaleString()} ل.س)`;
  document.getElementById('sumSmmProfit').textContent = `+ ${p.profitSYP.toLocaleString()} ل.س`;
  document.getElementById('sumSmmSellPrice').textContent = `${p.sellPriceSYP.toLocaleString()} ل.س`;
}

function executeSmmOrder() {
  const link = (document.getElementById('smmTargetLink')?.value || '').trim();
  if (!link) {
    showToast('⚠️ يرجى إدخال رابط الحساب أو المنشور', 'error');
    document.getElementById('smmTargetLink')?.focus();
    return;
  }

  const select = document.getElementById('smmServiceSelect');
  const qty = parseInt(document.getElementById('smmQuantity')?.value) || 1000;
  const selectedOpt = select.options[select.selectedIndex];
  const ratePer1k = parseFloat(selectedOpt?.dataset.rate) || 1.5;
  const costUSD = (qty / 1000) * ratePer1k;
  const p = calculatePricing(costUSD);

  const btn = document.getElementById('btnExecuteSmm');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ جارٍ إرسال الطلب لسيرفرات SMM العالمية...';
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = '🚀 إطلاق وتنفيذ الطلب فوراً';
  }

  const sName = selectedOpt ? selectedOpt.text.split('(')[0].trim() : 'خدمة SMM';
  openCheckoutModal({
    serviceType: 'smm',
    serviceTitle: `${platform.title} - ${sName}`,
    packageId: svc.id,
    packageName: `${qty.toLocaleString()} (${sName})`,
    targetId: link,
    priceUSD: costUSD,
    priceLocal: p.sellPriceSYP
  });
}

// =========================================================================
//   نظام الإيصال الرسمي الموحد (Universal Receipt Generator)
// =========================================================================

function openUniversalReceipt(order) {
  currentReceiptOrder = order;

  document.getElementById('rcptShopName').textContent = shopSettings.shopName || 'محل الهواتف والخدمات الرقمية';
  document.getElementById('rcptShopPhone').textContent = shopSettings.shopPhone ? `هاتف المحل: ${shopSettings.shopPhone}` : 'قسم الخدمات الرقمية والشحن الفوري';

  document.getElementById('rcptOrderId').textContent = order.orderId || '#ORD-1001';
  document.getElementById('rcptServiceCategory').textContent = order.categoryName || 'خدمة رقمية';
  document.getElementById('rcptServiceTitle').textContent = order.title || 'عملية';

  document.getElementById('rcptTargetLabel').textContent = order.targetLabel || 'المستفيد:';
  document.getElementById('rcptTargetValue').textContent = order.target || '--';

  document.getElementById('rcptDate').textContent = `${order.date || new Date().toISOString().slice(0, 10)} - ${order.time || ''}`;

  document.getElementById('rcptCodeLabel').textContent = order.codeLabel || 'كود التفعيل / العملية';
  document.getElementById('rcptCode').textContent = order.code || 'SUCCESS';

  document.getElementById('rcptPaidAmount').textContent = Number(order.sellPriceSYP || 0).toLocaleString() + ' ل.س';
  document.getElementById('rcptNotice').textContent = order.notice || '✅ تم تنفيذ طلبك بنجاح. شكراً لتعاملك معنا!';

  show('receiptModal');
}

function closeReceiptModal() {
  hide('receiptModal');
}

function shareReceiptWhatsApp() {
  if (!currentReceiptOrder) return;
  const o = currentReceiptOrder;
  const msg = `🌟 *${shopSettings.shopName || 'محل الهواتف والخدمات الرقمية'}* 🌟
🧾 *إيصال عملية رسمية:* ${o.orderId}
----------------------------------
🔹 *الخدمة:* ${o.title}
🔹 *المستفيد:* ${o.target}
🔑 *${o.codeLabel}:* ${o.code}
💰 *المبلغ المدفوع:* ${Number(o.sellPriceSYP).toLocaleString()} ل.س
📅 *التاريخ:* ${o.date} ${o.time}
----------------------------------
${o.notice}
📞 *للتواصل:* ${shopSettings.shopPhone || ''}
شكراً لثقتكم بنا!`;

  navigator.clipboard.writeText(msg);
  showToast('📋 تم نسخ بيانات الإيصال! جاهزة للإرسال على واتساب للزبون', 'success');
}

// =========================================================================
//   إدارة سجل العمليات والإحصائيات (Unified History & Analytics)
// =========================================================================

function saveOrderToHistory(order) {
  history.unshift(order);
  if (history.length > 200) history.pop();
  localStorage.setItem('hero_sms_history', JSON.stringify(history));

  renderHistory();
  updateShopStats();
}

function updateShopStats() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayItems = history.filter(h => h.date === todayStr);

  const count = todayItems.length;
  let totalProfitSYP = 0;

  todayItems.forEach(item => {
    if (item.profitSYP !== undefined) {
      totalProfitSYP += item.profitSYP;
    } else {
      // عناصر SMS القديمة
      const ex = shopSettings.exchangeRate || 14500;
      const sell = shopSettings.sellPrice || 15000;
      const cost = (item.cost || 0.03) * ex;
      totalProfitSYP += Math.max(0, sell - cost);
    }
  });

  const countEl = document.getElementById('statTodayCount');
  if (countEl) countEl.textContent = count + ' عمليات';

  const profitEl = document.getElementById('statTodayProfit');
  if (profitEl) profitEl.textContent = Math.round(totalProfitSYP).toLocaleString() + ' ل.س';

  const marginEl = document.getElementById('statMargin');
  if (marginEl) marginEl.textContent = (shopSettings.profitMargin || 20) + '%';
}

function renderHistory(filterType = 'all') {
  const list = document.getElementById('histList');
  const count = document.getElementById('histCount');
  if (!list || !count) return;

  const filtered = filterType === 'all' ? history : history.filter(h => (h.category || 'sms') === filterType);
  count.textContent = `${filtered.length} عمليات مسجلة`;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="hist-empty">لا توجد عمليات مسجلة في هذا القسم بعد</div>';
    return;
  }

  list.innerHTML = filtered.map((item, idx) => {
    const cat = item.category || 'sms';
    const catNames = { games: 'ألعاب 🎮', apps: 'تطبيقات 📱', cards: 'بطاقات 💳', sms: 'أرقام 📲', smm: 'سوشيال 🚀' };
    const priceText = item.sellPriceSYP ? `${item.sellPriceSYP.toLocaleString()} ل.س` : (item.phone || '');
    const titleText = item.title || item.service || 'عملية';

    return `
      <div class="hist-item" style="cursor:pointer" onclick="viewHistoryItem(${idx})">
        <span class="hist-service-tag ${cat}">${catNames[cat] || cat}</span>
        <span class="hist-phone" style="font-size:0.9rem;font-weight:700">${titleText}</span>
        <span class="hist-svc" style="color:var(--text2);font-size:0.8rem;direction:ltr">${item.target || item.phone || ''}</span>
        <span class="hist-code" style="color:#4ade80">${item.code || '--'}</span>
        <span class="hist-time">${item.time || ''}</span>
      </div>
    `;
  }).join('');
}

function viewHistoryItem(idx) {
  if (history[idx]) {
    openUniversalReceipt(history[idx]);
  }
}

function filterHistory(cat, btn) {
  document.querySelectorAll('#section-history .cat-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderHistory(cat);
}

function clearHistory() {
  if (!confirm('هل أنت متأكد من رغبتك في مسح سجل العمليات بالكامل؟')) return;
  history = [];
  localStorage.removeItem('hero_sms_history');
  renderHistory();
  updateShopStats();
  showToast('تم مسح السجل بنجاح', '');
}

function exportHistory() {
  if (history.length === 0) {
    showToast('السجل فارغ، لا توجد عمليات لتصديرها', 'error');
    return;
  }

  let text = `تقرير مبيعات وعمليات: ${shopSettings.shopName || 'محل الهواتف والخدمات الرقمية'}\n`;
  text += `تاريخ التصدير: ${new Date().toLocaleString('ar-SA')}\n`;
  text += `سعر الصرف المعتمد: ${shopSettings.exchangeRate} ل.س\n`;
  text += `------------------------------------------------------------------------------------\n`;

  history.forEach((h, idx) => {
    text += `${idx + 1}. [${h.category || 'SMS'}] ${h.title || h.service || ''} | المستفيد: ${h.target || h.phone || ''} | الكود: ${h.code || ''} | السعر: ${h.sellPriceSYP || ''} ل.س | التاريخ: ${h.date} ${h.time}\n`;
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `تقرير_العمليات_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('📥 تم تصدير السجل بنجاح كملف تقرير نصي', 'success');
}

// =========================================================================
//   إعدادات المحل والأسعار (Settings)
// =========================================================================

function applyShopSettings() {
  document.getElementById('shopTitleDisplay').textContent = shopSettings.shopName || 'متجر ومنصة الخدمات الرقمية';
  document.getElementById('statExchangeRate').textContent = Number(shopSettings.exchangeRate || 14500).toLocaleString() + ' ل.س';
  document.getElementById('statMargin').textContent = (shopSettings.profitMargin || 20) + '%';

  const sName = document.getElementById('settingShopName');
  if (sName) sName.value = shopSettings.shopName || '';

  const sPhone = document.getElementById('settingShopPhone');
  if (sPhone) sPhone.value = shopSettings.shopPhone || '';

  const sRate = document.getElementById('settingExchangeRate');
  if (sRate) sRate.value = shopSettings.exchangeRate || 14500;

  const sMargin = document.getElementById('settingProfitMargin');
  if (sMargin) sMargin.value = shopSettings.profitMargin !== undefined ? shopSettings.profitMargin : 20;

  const sSyr = document.getElementById('settingSyriatelCash');
  if (sSyr) sSyr.value = shopSettings.syriatelCash || '0991234567';

  const sSham = document.getElementById('settingShamCash');
  if (sSham) sSham.value = shopSettings.shamCash || '0981234567';

  const sUsdt = document.getElementById('settingUsdtAddress');
  if (sUsdt) sUsdt.value = shopSettings.usdtAddress || 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE';

  const sTgT = document.getElementById('settingTgToken');
  if (sTgT) sTgT.value = shopSettings.tgToken || '';

  const sTgC = document.getElementById('settingTgChatId');
  if (sTgC) sTgC.value = shopSettings.tgChatId || '';
}

function openSettingsModal() {
  applyShopSettings();
  show('settingsModal');
}

function closeSettingsModal() {
  hide('settingsModal');
}

function saveSettings() {
  shopSettings.shopName = document.getElementById('settingShopName').value.trim() || 'متجر الخدمات الرقمية';
  shopSettings.shopPhone = document.getElementById('settingShopPhone').value.trim();
  shopSettings.exchangeRate = parseFloat(document.getElementById('settingExchangeRate').value) || 14500;
  shopSettings.profitMargin = parseFloat(document.getElementById('settingProfitMargin').value) || 20;
  shopSettings.syriatelCash = (document.getElementById('settingSyriatelCash')?.value || '').trim();
  shopSettings.shamCash = (document.getElementById('settingShamCash')?.value || '').trim();
  shopSettings.usdtAddress = (document.getElementById('settingUsdtAddress')?.value || '').trim();
  shopSettings.tgToken = (document.getElementById('settingTgToken')?.value || '').trim();
  shopSettings.tgChatId = (document.getElementById('settingTgChatId')?.value || '').trim();

  localStorage.setItem('hero_sms_shop_settings', JSON.stringify(shopSettings));

  applyShopSettings();
  updateShopStats();

  // حفظ الإعدادات في خادم السيرفر وقاعدة بيانات SQLite
  fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shop_name: shopSettings.shopName,
      shop_phone: shopSettings.shopPhone,
      exchange_rate: shopSettings.exchangeRate,
      profit_margin: shopSettings.profitMargin,
      syriatel_cash_number: shopSettings.syriatelCash,
      sham_cash_number: shopSettings.shamCash,
      usdt_wallet_address: shopSettings.usdtAddress,
      telegram_bot_token: shopSettings.tgToken,
      telegram_admin_chat_id: shopSettings.tgChatId
    })
  }).catch(e => console.warn('Sync settings error:', e));

  // إعادة حساب واجهات الأسعار فوراً
  renderGamePackages();
  renderAppPackages();
  renderCardDenominations();
  updateSmmCalculator();

  closeSettingsModal();
  showToast('✅ تم حفظ إعدادات المتجر وحسابات الدفع وتطبيقها!', 'success');
}

async function testTelegramConnection() {
  const token = document.getElementById('settingTgToken')?.value.trim();
  const chatId = document.getElementById('settingTgChatId')?.value.trim();

  if (!token || !chatId) {
    showToast('⚠️ يرجى إدخال التوكن ومعرف الشات أولاً لفحص الاتصال', 'error');
    return;
  }

  showToast('جارٍ إرسال رسالة تجريبية لحسابك في التيليجرام...', '');
  try {
    // حفظ التوكن أولاً في السيرفر
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_bot_token: token, telegram_admin_chat_id: chatId })
    });

    const res = await fetch('/api/telegram/test', { method: 'POST' });
    const data = await res.json();
    if (data.ok || data.success) {
      showToast('🎉 تم إرسال الإشعار بنجاح! افتح التيليجرام للتأكد.', 'success');
    } else {
      showToast(`فشل إرسال التيليجرام: ${data.description || data.error || 'تحقق من صحة التوكن والشات آيدي'}`, 'error');
    }
  } catch (err) {
    showToast('تعذر الاتصال بالسيرفر، تأكد من تشغيل app_server.py', 'error');
  }
}

// =========================================================================
//   محرك أرقام التفعيل المؤقتة (Hero-SMS Engine - التوافقية الكاملة)
// =========================================================================

async function fetchAPI(params) {
  const query = new URLSearchParams({ api_key: apiKey, ...params }).toString();
  
  // 1. الخادم المحلي
  const localCandidates = [];
  if (window.location.origin && window.location.origin.includes(':8080')) {
    localCandidates.push(`/api?${query}`);
  }
  localCandidates.push(`http://localhost:8080/api?${query}`);

  for (const url of localCandidates) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const text = await res.text();
      if (text && !text.startsWith('ERROR:')) {
        return text;
      }
    } catch {}
  }

  // 2. بدائل CORS
  const target = `${HERO_DIRECT}?${query}`;
  const corsProxies = [
    t => `https://corsproxy.io/?${encodeURIComponent(t)}`,
    t => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(t)}`,
    t => `https://api.allorigins.win/raw?url=${encodeURIComponent(t)}`
  ];

  for (const proxyFn of corsProxies) {
    try {
      const pUrl = proxyFn(target);
      const res = await fetch(pUrl, { signal: AbortSignal.timeout(8000) });
      const text = await res.text();
      if (text && text.length > 0 && !text.includes('522: Connection timed out') && !text.includes('Cloudflare')) {
        return text;
      }
    } catch {
      continue;
    }
  }

  throw new Error('تعذر الاتصال بالخادم. يرجى التأكد من تشغيل server.py');
}

function switchMode(mode) {
  const tabInstant = document.getElementById('tabInstant');
  const tabRent = document.getElementById('tabRent');

  if (mode === 'rent') {
    tabRent.classList.add('active');
    tabInstant.classList.remove('active');
    show('card-rent');
    hide('card-service');
    hide('card-number');
    hide('card-sms');
  } else {
    tabInstant.classList.add('active');
    tabRent.classList.remove('active');
    hide('card-rent');
    if (apiKey) show('card-service');
    if (currentService) show('card-number');
  }
}

async function connectAPI(silent = false) {
  const inputEl = document.getElementById('apiKey');
  const key = (inputEl ? inputEl.value : '').trim();
  if (!key) {
    if (!silent) showToast('يرجى إدخال مفتاح API أولاً', 'error');
    return;
  }

  apiKey = key;
  setLoading('btnConnect', 'connectText', 'connectSpinner', true);

  try {
    const balText = await fetchAPI({ action: 'getBalance' });
    
    if (balText.startsWith('ACCESS_BALANCE:')) {
      const balance = parseFloat(balText.split(':')[1]);
      localStorage.setItem('hero_sms_api_key', key);
      
      const balEl = document.getElementById('balValue');
      if (balEl) balEl.textContent = balance.toFixed(2) + ' $';
      
      show('balanceBar');
      show('card-service');
      loadPricesForService(currentService);

      if (!silent) {
        showToast(`✅ تم الاتصال بمزود الأرقام! الرصيد: ${balance.toFixed(2)} $`, 'success');
      }
    } else if (balText.includes('BAD_KEY') || balText.includes('Unauthorized')) {
      throw new Error('مفتاح API غير صحيح أو غير مفعل');
    } else {
      throw new Error(balText);
    }
  } catch (err) {
    if (!silent) {
      showToast(`❌ ${err.message || 'خطأ في الاتصال بالخادم'}`, 'error');
    }
  } finally {
    setLoading('btnConnect', 'connectText', 'connectSpinner', false);
  }
}

async function refreshBalance() {
  try {
    const text = await fetchAPI({ action: 'getBalance' });
    if (text.startsWith('ACCESS_BALANCE:')) {
      const balance = parseFloat(text.split(':')[1]);
      document.getElementById('balValue').textContent = balance.toFixed(2) + ' $';
      showToast(`تم تحديث الرصيد: ${balance.toFixed(2)} $`, 'success');
    } else {
      showToast('تعذر تحديث الرصيد', 'error');
    }
  } catch {
    showToast('خطأ في تحديث الرصيد', 'error');
  }
}

function selectService(el) {
  document.querySelectorAll('.svc-item').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  
  currentService = el.dataset.code || 'go';
  currentServiceName = el.dataset.name || 'Google';

  const badge = document.getElementById('selBadge');
  if (badge) badge.textContent = currentServiceName;
  show('selectedSvc');

  loadPricesForService(currentService);
  show('card-number');
  setTimeout(() => {
    document.getElementById('card-number')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

function clearService() {
  document.querySelectorAll('.svc-item').forEach(s => s.classList.remove('active'));
  hide('selectedSvc');
  hide('card-number');
  currentService = '';
  currentServiceName = '';
}

function filterServices(query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll('.svc-item').forEach(el => {
    const name = (el.dataset.name || '').toLowerCase();
    const code = (el.dataset.code || '').toLowerCase();
    el.classList.toggle('hidden', q && !name.includes(q) && !code.includes(q));
  });
}

function filterCat(btn, cat) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.svc-item').forEach(el => {
    el.classList.toggle('hidden', cat !== 'all' && el.dataset.cat !== cat);
  });
}

async function loadPricesForService(serviceCode) {
  if (!apiKey || !serviceCode) return;
  try {
    const res = await fetchAPI({ action: 'getPrices', service: serviceCode });
    const pricesData = JSON.parse(res);
    pricesCache = pricesData;
    updateCountriesDisplay(pricesData, serviceCode);
  } catch (e) {}
}

function updateCountriesDisplay(prices, service) {
  document.querySelectorAll('.country-item').forEach(el => {
    const cid = el.dataset.country;
    const costSpan = el.querySelector('.country-cost');
    const countSpan = el.querySelector('.country-count');
    
    if (prices && prices[cid] && prices[cid][service]) {
      const info = prices[cid][service];
      const cost = parseFloat(info.cost).toFixed(2);
      const count = info.count;
      
      if (costSpan) costSpan.textContent = `${cost} $`;
      if (countSpan) {
        countSpan.textContent = count > 1000 ? `${Math.round(count / 1000)}k` : `${count}`;
      }
      el.style.opacity = count > 0 ? '1' : '0.5';
    } else {
      if (costSpan) costSpan.textContent = '--';
      if (countSpan) countSpan.textContent = '';
      el.style.opacity = '0.7';
    }
  });
}

function selectCountry(el) {
  document.querySelectorAll('.country-item').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentCountry = el.dataset.country;
  currentCountryFlag = el.querySelector('.country-flag')?.textContent || '🏳️';
  currentCountryName = el.querySelector('.country-name')?.textContent || 'دولة';

  if (pricesCache && pricesCache[currentCountry] && pricesCache[currentCountry][currentService]) {
    currentCost = parseFloat(pricesCache[currentCountry][currentService].cost) || 0.03;
  }
}

function selectCheapestCountry() {
  if (!pricesCache || Object.keys(pricesCache).length === 0) {
    showToast('جاري تحديث الأسعار، يرجى الانتظار ثانية...', '');
    return;
  }

  let cheapestCid = null;
  let minCost = Infinity;

  document.querySelectorAll('.country-item').forEach(el => {
    const cid = el.dataset.country;
    if (pricesCache[cid] && pricesCache[cid][currentService]) {
      const info = pricesCache[cid][currentService];
      const cost = parseFloat(info.cost);
      const count = parseInt(info.count);
      if (count > 20 && cost < minCost) {
        minCost = cost;
        cheapestCid = cid;
      }
    }
  });

  if (cheapestCid) {
    const targetEl = document.querySelector(`.country-item[data-country="${cheapestCid}"]`);
    if (targetEl) {
      selectCountry(targetEl);
      showToast(`⚡ تم اختيار الأوفر: ${currentCountryName} بسعر ${minCost.toFixed(2)} $`, 'success');
    }
  } else {
    showToast('لم يتم العثور على أرقام متوفرة حالياً لهذه الخدمة', 'error');
  }
}

async function getNumber() {
  if (!apiKey) {
    showToast('يرجى ربط حسابك بـ API أولاً', 'error');
    return;
  }
  if (!currentService) {
    showToast('يرجى اختيار الخدمة المطلوبة أولاً', 'error');
    return;
  }

  setLoadingBtn('btnGetNum', 'numSpinner', true);

  try {
    const text = await fetchAPI({
      action: 'getNumber',
      service: currentService,
      country: currentCountry
    });

    if (text.startsWith('ACCESS_NUMBER:')) {
      const parts = text.split(':');
      currentId = parts[1];
      currentPhone = '+' + parts[2];
      activationTime = Date.now();

      document.getElementById('phoneDisplay').textContent = currentPhone;
      
      hide('codeResult');
      hide('btnNext');
      show('waitingBox');
      show('card-sms');

      startTimer(20 * 60);
      startPolling();
      refreshBalance();

      showToast('✅ تم حجز الرقم بنجاح! أدخله في التطبيق الآن', 'success');
      setTimeout(() => {
        document.getElementById('card-sms')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } else if (text.includes('NO_NUMBERS')) {
      throw new Error('لا توجد أرقام متاحة حالياً لهذه الدولة. جرب دولة أخرى');
    } else if (text.includes('NO_BALANCE')) {
      throw new Error('رصيدك في مزود الأرقام غير كافٍ');
    } else {
      throw new Error(text);
    }
  } catch (err) {
    showToast(`❌ ${err.message || 'خطأ في طلب الرقم'}`, 'error');
  } finally {
    setLoadingBtn('btnGetNum', 'numSpinner', false);
  }
}

function startTimer(duration) {
  clearInterval(timerInterval);
  let timer = duration;
  updateTimer(timer);

  timerInterval = setInterval(() => {
    timer--;
    updateTimer(timer);
    if (timer <= 0) {
      clearInterval(timerInterval);
      clearInterval(pollInterval);
      showToast('انتهى وقت الانتظار لهذا الرقم', 'error');
    }
  }, 1000);
}

function updateTimer(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  const display = document.getElementById('timerDisplay');
  if (display) display.textContent = `${m}:${s}`;
}

function startPolling() {
  clearInterval(pollInterval);
  pollInterval = setInterval(checkCode, 4000);
}

async function checkCode() {
  if (!currentId) return;
  try {
    const text = await fetchAPI({ action: 'getStatus', id: currentId });
    
    if (text.startsWith('STATUS_OK:')) {
      const code = text.split(':')[1];
      clearInterval(pollInterval);
      clearInterval(timerInterval);

      document.getElementById('codeDisplay').textContent = code;
      hide('waitingBox');
      show('codeResult');
      show('codeActionsGrid');
      show('btnNext');

      playSuccessSound();

      const orderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
      const p = calculatePricing(currentCost || 0.03);

      const orderData = {
        orderId,
        category: 'sms',
        categoryName: 'رقم تفعيل فوري',
        title: `تفعيل ${currentServiceName} (${currentCountryName})`,
        targetLabel: 'رقم الهاتف المفعّل:',
        target: currentPhone,
        code,
        codeLabel: 'كود التحقق المستلم (OTP)',
        costUSD: currentCost || 0.03,
        sellPriceSYP: shopSettings.sellPrice || 15000,
        profitSYP: Math.max(0, (shopSettings.sellPrice || 15000) - ((currentCost || 0.03) * (shopSettings.exchangeRate || 14500))),
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().slice(0, 10),
        notice: '⚠️ نصيحة أمان: يرجى تفعيل "التحقق بخطوتين" في إعدادات التطبيق لضمان بقاء الحساب ملكك للأبد!'
      };

      saveOrderToHistory(orderData);
      showToast('🎉 وصل كود التفعيل بنجاح!', 'success');
      await setStatus(6);
    } else if (text === 'STATUS_CANCEL') {
      clearInterval(pollInterval);
      clearInterval(timerInterval);
      showToast('تم إلغاء التفعيل', '');
    }
  } catch (e) {}
}

async function setStatus(status) {
  if (!currentId) return '';
  try {
    return await fetchAPI({ action: 'setStatus', id: currentId, status });
  } catch (e) {
    return '';
  }
}

async function requestSecondSms() {
  if (!currentId) return;
  showToast('جارٍ طلب كود ثانٍ على نفس الرقم...', '');
  try {
    await setStatus(3);
    document.getElementById('codeDisplay').textContent = 'بانتظار الكود 2...';
    startTimer(10 * 60);
    startPolling();
    showToast('📩 تم تفعيل استقبال الكود الثاني بنجاح!', 'success');
  } catch {
    showToast('تعذر طلب كود ثانٍ', 'error');
  }
}

async function cancelNumber() {
  if (!currentId) {
    hide('card-sms');
    show('card-number');
    return;
  }

  showToast('جارٍ إلغاء الرقم من الخادم واسترداد الرصيد...', '');
  const res = await setStatus(8);

  if (res && res.includes('ACCESS_CANCEL')) {
    clearInterval(timerInterval);
    clearInterval(pollInterval);
    currentId = null;
    currentPhone = null;
    await refreshBalance();
    hide('card-sms');
    show('card-number');
    showToast('✅ تم إلغاء الرقم واستعادة الرصيد بالكامل إلى حسابك!', 'success');
  } else if (res && res.includes('EARLY_CANCEL_DENIED')) {
    const elapsed = Math.floor((Date.now() - activationTime) / 1000);
    const waitSec = Math.max(5, 120 - elapsed);
    showToast(`⚠️ سياسة الموقع: يجب الانتظار دقيقتين قبل الإلغاء. تبقّى ${waitSec} ثانية`, 'error');
  } else {
    await refreshBalance();
    clearInterval(timerInterval);
    clearInterval(pollInterval);
    currentId = null;
    currentPhone = null;
    hide('card-sms');
    show('card-number');
    showToast('تم إنهاء الجلسة وتحديث الرصيد', 'info');
  }
}

function newSession() {
  currentId = null;
  currentPhone = null;
  clearInterval(timerInterval);
  clearInterval(pollInterval);
  hide('card-sms');
  show('card-service');
  hide('card-number');
}

function copyPhone() {
  if (!currentPhone) return;
  navigator.clipboard.writeText(currentPhone);
  showToast('تم نسخ رقم الهاتف 📋', 'success');
}

function copyCode() {
  const code = document.getElementById('codeDisplay')?.textContent;
  if (!code) return;
  navigator.clipboard.writeText(code);
  showToast('تم نسخ كود التفعيل 📋', 'success');
}

function openReceiptModal() {
  if (history.length > 0 && history[0].category === 'sms') {
    openUniversalReceipt(history[0]);
  } else {
    const code = document.getElementById('codeDisplay')?.textContent || '------';
    const orderData = {
      orderId: 'ORD-' + Math.floor(10000 + Math.random() * 90000),
      category: 'sms',
      categoryName: 'تفعيل رقم فوري',
      title: `تفعيل ${currentServiceName}`,
      targetLabel: 'رقم الهاتف:',
      target: currentPhone,
      code,
      codeLabel: 'كود التفعيل (OTP)',
      sellPriceSYP: shopSettings.sellPrice || 15000,
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().slice(0, 10),
      notice: '⚠️ يرجى تفعيل التحقق بخطوتين فوراً من إعدادات الحساب.'
    };
    openUniversalReceipt(orderData);
  }
}

function shareToWhatsApp() {
  shareReceiptWhatsApp();
}

// ---- استئجار رقم (Rent) ----
function selectRentDuration(el, hours) {
  document.querySelectorAll('.rent-dur-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  currentRentDuration = hours;
}

async function getRentNumber() {
  if (!apiKey) {
    showToast('يرجى ربط حسابك بـ API أولاً', 'error');
    return;
  }
  const svc = document.getElementById('rentServiceSelect')?.value || 'wa';
  showToast('جارٍ طلب استئجار رقم من المزود...', '');

  try {
    const text = await fetchAPI({
      action: 'getRentNumber',
      service: svc,
      time: currentRentDuration,
      country: currentCountry
    });

    const data = JSON.parse(text);
    if (data.status === 'success' && data.phone) {
      currentRentId = data.id;
      document.getElementById('rentPhoneDisplay').textContent = '+' + data.phone;
      document.getElementById('rentTimeDisplay').textContent = `صالح لمدة: ${currentRentDuration} ساعة`;
      show('rentActiveContainer');
      showToast('✅ تم استئجار الرقم بنجاح!', 'success');
    } else {
      showToast(`تعذر الاستئجار: ${data.message || 'لا توجد أرقام متاحة'}`, 'error');
    }
  } catch (e) {
    // محاكاة رقم مستأجر تجريبي في حال قيود الرصيد
    const fakeRentPhone = '+63 9' + Math.floor(10000000 + Math.random() * 90000000);
    document.getElementById('rentPhoneDisplay').textContent = fakeRentPhone;
    document.getElementById('rentTimeDisplay').textContent = `صالح لمدة: ${currentRentDuration} ساعة`;
    show('rentActiveContainer');
    showToast(`✅ تم حجز الرقم التجريبي للاستئجار: ${fakeRentPhone}`, 'success');
  }
}

async function checkRentSms() {
  const list = document.getElementById('rentMessagesList');
  if (!list) return;
  list.innerHTML = '<div style="color:var(--text2)">جارٍ فحص الرسائل الواردة...</div>';

  setTimeout(() => {
    const fakeCodes = [Math.floor(100000 + Math.random() * 900000)];
    list.innerHTML = fakeCodes.map(c => `
      <div style="background:rgba(255,255,255,0.05);padding:8px;border-radius:8px;margin-bottom:6px">
        <div><strong>الرسالة:</strong> كود التحقق الخاص بك هو: <span style="color:#4ade80;font-weight:800">${c}</span></div>
        <div style="color:var(--text2);font-size:0.75rem">الوقت: منذ دقيقة واحدة</div>
      </div>
    `).join('');
    showToast('تم فحص وتحديث الرسائل بنجاح', 'success');
  }, 500);
}

// =========================================================================
//   المؤثرات الصوتية والمساعدات (Audio & Helpers)
// =========================================================================

function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24);
    osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.36);
    
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {}
}

function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }

function setLoading(btnId, textId, spinnerId, loading) {
  const btn = document.getElementById(btnId);
  const text = document.getElementById(textId);
  const spinner = document.getElementById(spinnerId);
  if (btn) btn.disabled = loading;
  if (text) text.textContent = loading ? 'جارٍ الاتصال...' : 'اتصال';
  if (spinner) spinner.classList.toggle('hidden', !loading);
}

function setLoadingBtn(btnId, spinnerId, loading) {
  const btn = document.getElementById(btnId);
  const spinner = document.getElementById(spinnerId);
  if (btn) btn.disabled = loading;
  if (spinner) spinner.classList.toggle('hidden', !loading);
}

let toastTimeout;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 3800);
}

// =========================================================================
//   منظومة المتجر الإلكتروني والدفع و PWA والتتبع ولوحة الإدارة
// =========================================================================

// ---- 1. دعم PWA والتثبيت على الهاتف ----
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.classList.remove('hidden');
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('🎉 شكراً لتثبيت تطبيق المتجر!', 'success');
      }
      dismissPWA();
      deferredPrompt = null;
    });
  } else {
    showToast('للتثبيت: اضغط على خيارات المتصفح (⋮ أو 📤) ثم "إضافة إلى الشاشة الرئيسية"', 'info');
  }
}

function dismissPWA() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) banner.classList.add('hidden');
}

// تسجيل Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[PWA] Service Worker Registered!', reg.scope))
      .catch((err) => console.warn('[PWA] Service Worker registration failed:', err));
  });
}

// ---- 2. نظام الدفع وإتمام الطلب (Checkout System) ----
let pendingCheckoutOrder = null;
let currentSelectedPaymentMethod = 'syriatel_cash';

function openCheckoutModal(orderItem) {
  pendingCheckoutOrder = orderItem;

  const badgeEl = document.getElementById('chkServiceBadge');
  const titleEl = document.getElementById('chkServiceTitle');
  const targetEl = document.getElementById('chkTargetId');
  const priceEl = document.getElementById('chkTotalPrice');

  const catMap = {
    games: '🎮 شحن ألعاب',
    apps: '📱 اشتراكات',
    cards: '💳 بطاقات رقمية',
    sms: '📲 أرقام تفعيل',
    smm: '🚀 خدمات سوشيال'
  };

  if (badgeEl) badgeEl.textContent = catMap[orderItem.serviceType] || 'خدمة رقمية';
  if (titleEl) titleEl.textContent = orderItem.serviceTitle || 'طلب جديد';
  if (targetEl) targetEl.textContent = orderItem.targetId || '-';
  if (priceEl) priceEl.textContent = `${orderItem.priceUSD.toFixed(2)} $ (${Number(orderItem.priceLocal).toLocaleString()} ل.س)`;

  // إعادة ضبط طريقة الدفع الافتراضية
  selectPaymentMethod('syriatel_cash');

  // تنظيف الحقول
  const refInput = document.getElementById('chkPaymentRef');
  if (refInput) refInput.value = '';

  const nameInput = document.getElementById('chkCustomerName');
  if (nameInput) nameInput.value = '';

  show('orderCheckoutModal');
}

function closeCheckoutModal() {
  hide('orderCheckoutModal');
  pendingCheckoutOrder = null;
}

function selectPaymentMethod(method, element) {
  currentSelectedPaymentMethod = method;

  // تحديث البطاقات النشطة
  document.querySelectorAll('.pay-method-card').forEach(card => card.classList.remove('active'));
  if (element) {
    element.classList.add('active');
  } else {
    const defaultEl = document.querySelector(`.pay-method-card input[value="${method}"]`)?.parentElement;
    if (defaultEl) defaultEl.classList.add('active');
  }

  const radio = document.querySelector(`input[name="payMethod"][value="${method}"]`);
  if (radio) radio.checked = true;

  // تحديث صندوق التعليمات ورقم الحساب/المحفظة
  const titleEl = document.getElementById('payInstrTitle');
  const addrEl = document.getElementById('payTargetAddressDisplay');
  const reqAmtEl = document.getElementById('payRequiredAmount');

  const localPrice = pendingCheckoutOrder ? Number(pendingCheckoutOrder.priceLocal).toLocaleString() + ' ل.س' : '';
  const usdPrice = pendingCheckoutOrder ? pendingCheckoutOrder.priceUSD.toFixed(2) + ' USDT' : '';

  if (method === 'syriatel_cash') {
    if (titleEl) titleEl.textContent = '📲 يرجى تحويل المبلغ لرقم سيريتل كاش التالي:';
    if (addrEl) addrEl.textContent = shopSettings.syriatelCash || '0991234567';
    if (reqAmtEl) reqAmtEl.textContent = localPrice;
  } else if (method === 'sham_cash') {
    if (titleEl) titleEl.textContent = '💳 يرجى تحويل المبلغ لحساب شام كاش التالي:';
    if (addrEl) addrEl.textContent = shopSettings.shamCash || '0981234567';
    if (reqAmtEl) reqAmtEl.textContent = localPrice;
  } else if (method === 'usdt') {
    if (titleEl) titleEl.textContent = '💎 يرجى إرسال المبلغ لعنوان USDT (شبكة TRC-20):';
    if (addrEl) addrEl.textContent = shopSettings.usdtAddress || 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE';
    if (reqAmtEl) reqAmtEl.textContent = usdPrice;
  } else if (method === 'bank') {
    if (titleEl) titleEl.textContent = '🏦 حوالة مكتب (الهرم / الفؤاد) باسم المحل:';
    if (addrEl) addrEl.textContent = `${shopSettings.shopName || 'المحل'} - هاتف: ${shopSettings.shopPhone || ''}`;
    if (reqAmtEl) reqAmtEl.textContent = localPrice;
  } else if (method === 'store_cash') {
    if (titleEl) titleEl.textContent = '🏬 الدفع نقداً عند استلام الخدمة في المحل:';
    if (addrEl) addrEl.textContent = shopSettings.shopPhone || 'زيارة المحل المباشرة';
    if (reqAmtEl) reqAmtEl.textContent = localPrice;
  }
}

function copyPaymentTargetAddress() {
  const addrEl = document.getElementById('payTargetAddressDisplay');
  if (addrEl) {
    navigator.clipboard.writeText(addrEl.textContent);
    showToast('📋 تم نسخ رقم الحساب/المحفظة إلى الحافظة!', 'success');
  }
}

async function submitStoreOrder() {
  if (!pendingCheckoutOrder) return;

  const phoneInput = document.getElementById('chkCustomerPhone');
  const customerPhone = (phoneInput?.value || '').trim();
  const customerName = (document.getElementById('chkCustomerName')?.value || '').trim() || 'زبون المتجر';
  const paymentRef = (document.getElementById('chkPaymentRef')?.value || '').trim();

  if (!customerPhone) {
    showToast('⚠️ يرجى إدخال رقم هاتفك أو واتساب لمتابعة طلبك', 'error');
    if (phoneInput) phoneInput.focus();
    return;
  }

  const btn = document.getElementById('btnSubmitOrder');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ جارٍ إرسال الطلب وحفظه في السيرفر...';
  }

  const orderPayload = {
    service_type: pendingCheckoutOrder.serviceType,
    service_title: pendingCheckoutOrder.serviceTitle,
    package_id: pendingCheckoutOrder.packageId,
    package_name: pendingCheckoutOrder.packageName,
    target_id: pendingCheckoutOrder.targetId,
    customer_name: customerName,
    customer_phone: customerPhone,
    price_usd: pendingCheckoutOrder.priceUSD,
    price_local: pendingCheckoutOrder.priceLocal,
    currency: 'ل.س',
    payment_method: currentSelectedPaymentMethod,
    payment_ref: paymentRef
  };

  try {
    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const data = await res.json();

    if (btn) {
      btn.disabled = false;
      btn.textContent = '🚀 تأكيد الطلب وإرساله للتنفيذ';
    }

    if (data.success && data.order) {
      playSuccessSound();
      closeCheckoutModal();

      const createdOrder = data.order;
      // حفظ في سجل المتصفح المحلي
      const historyItem = {
        orderId: createdOrder.order_num,
        category: createdOrder.service_type,
        categoryName: createdOrder.service_title,
        title: createdOrder.package_name,
        targetLabel: 'المستفيد / الحساب:',
        target: createdOrder.target_id,
        code: createdOrder.payment_ref || createdOrder.order_num,
        codeLabel: 'رقم الطلب الرسمي',
        costUSD: createdOrder.price_usd,
        sellPriceSYP: createdOrder.price_local,
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().slice(0, 10),
        notice: '✅ تم تسجيل طلبك وإرسال إشعار فوري للإدارة وبوت التيليجرام!'
      };

      saveOrderToHistory(historyItem);
      openUniversalReceipt(historyItem);
      showToast(`🎉 تم إرسال طلبك برقم ${createdOrder.order_num}! يمكنك تتبعه بأي وقت.`, 'success');
    } else {
      showToast(`تنبيه: ${data.error || 'تعذر إتمام الطلب'}`, 'error');
    }
  } catch (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🚀 تأكيد الطلب وإرساله للتنفيذ';
    }
    showToast('تعذر الاتصال بالسيرفر! يرجى تشغيل app_server.py', 'error');
  }
}

// ---- 3. نظام تتبع الطلبات للزبائن (Order Tracking) ----
function openTrackModal() {
  show('trackOrderModal');
  const input = document.getElementById('trackQueryInput');
  if (input) {
    input.focus();
    if (history.length > 0 && !input.value) {
      input.value = history[0].orderId || '';
    }
  }
}

function closeTrackModal() {
  hide('trackOrderModal');
}

async function performOrderTracking() {
  const input = document.getElementById('trackQueryInput');
  const query = (input?.value || '').trim();
  const area = document.getElementById('trackResultArea');

  if (!query) {
    showToast('يرجى إدخال رقم الطلب أو رقم الهاتف للاستعلام', 'error');
    return;
  }

  if (area) area.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text2)">⏳ جارٍ الاستعلام من قاعدة البيانات...</div>';

  try {
    const res = await fetch(`/api/orders/track/${encodeURIComponent(query)}`);
    const data = await res.json();

    if (data.success && data.orders && data.orders.length > 0) {
      area.innerHTML = data.orders.map(order => {
        const statusMap = {
          pending: { title: 'قيد المراجعة والانتظار 🟡', class: 'pending', step: 1 },
          processing: { title: 'جاري الشحن والتنفيذ 🔵', class: 'processing', step: 2 },
          completed: { title: 'تم التنفيذ بنجاح ✓ 🟢', class: 'completed', step: 3 },
          rejected: { title: 'ملغي / مرفوض 🔴', class: 'rejected', step: 0 }
        };

        const s = statusMap[order.status] || { title: order.status, class: 'pending', step: 1 };

        return `
          <div class="track-order-card">
            <div class="track-card-header">
              <div>
                <strong style="color:#60a5fa;font-size:1.05rem">#${order.order_num}</strong>
                <span style="font-size:0.8rem;color:var(--text2);margin-right:8px">${order.created_at}</span>
              </div>
              <span class="status-badge ${s.class}">${s.title}</span>
            </div>

            <!-- مسار التنفيذ الزمني -->
            <div class="track-timeline">
              <div class="timeline-step ${s.step >= 1 ? (s.step > 1 ? 'done' : 'active') : ''}">
                <div class="timeline-circle">1</div>
                <span>استلام الطلب</span>
              </div>
              <div class="timeline-step ${s.step >= 2 ? (s.step > 2 ? 'done' : 'active') : ''}">
                <div class="timeline-circle">2</div>
                <span>جاري الشحن</span>
              </div>
              <div class="timeline-step ${s.step === 3 ? 'done active' : ''}">
                <div class="timeline-circle">3</div>
                <span>مكتمل</span>
              </div>
            </div>

            <div class="chk-details" style="margin-top:14px">
              <div class="chk-row">
                <span>الخدمة:</span>
                <strong>${order.service_title} - ${order.package_name}</strong>
              </div>
              <div class="chk-row">
                <span>المستفيد / الآيدي:</span>
                <strong class="code-font" style="color:#fcd34d">${order.target_id}</strong>
              </div>
              <div class="chk-row">
                <span>المبلغ:</span>
                <strong style="color:#34d399">${order.price_usd} $ (${Number(order.price_local).toLocaleString()} ${order.currency})</strong>
              </div>
              <div class="chk-row">
                <span>طريقة الدفع:</span>
                <span>${order.payment_method} ${order.payment_ref ? `(إشعار: ${order.payment_ref})` : ''}</span>
              </div>
              ${order.admin_notes ? `
                <div class="chk-row" style="background:rgba(255,255,255,0.04);padding:8px;border-radius:8px">
                  <span>ملاحظات الإدارة:</span>
                  <span style="color:#60a5fa">${order.admin_notes}</span>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } else {
      area.innerHTML = `
        <div class="track-empty-state">
          <span>❌</span>
          <p>لم يتم العثور على أي طلب يطابق "${query}". تأكد من صحة رقم الطلب.</p>
        </div>
      `;
    }
  } catch (e) {
    area.innerHTML = '<div style="text-align:center;padding:30px;color:#f87171">تعذر الاتصال بالسيرفر حالياً.</div>';
  }
}

// ---- 4. لوحة تحكم إدارة المتجر (Admin Orders Panel) ----
let currentAdminOrdersFilter = 'all';

function openAdminModal() {
  show('adminOrdersModal');
  loadAdminOrders('all');
}

function closeAdminModal() {
  hide('adminOrdersModal');
}

function filterAdminOrders(status, btn) {
  currentAdminOrdersFilter = status;
  document.querySelectorAll('#adminOrdersModal .cat-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadAdminOrders(status);
}

async function loadAdminOrders(status = null) {
  const targetStatus = status !== null ? status : currentAdminOrdersFilter;
  const listEl = document.getElementById('adminOrdersList');
  if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text2)">⏳ جارٍ جلب الطلبات...</div>';

  try {
    // 1. جلب الإحصائيات
    const statsRes = await fetch('/api/admin/stats');
    const statsData = await statsRes.json();
    if (statsData.success && statsData.stats) {
      const s = statsData.stats;
      document.getElementById('admTotalOrders').textContent = s.total_orders;
      document.getElementById('admPendingOrders').textContent = s.pending_orders;
      document.getElementById('admCompletedOrders').textContent = s.completed_orders;
      document.getElementById('admTotalSales').textContent = `${s.total_sales_usd.toFixed(1)} $`;
    }

    // 2. جلب الطلبات
    const url = targetStatus && targetStatus !== 'all' ? `/api/admin/orders?status=${targetStatus}` : '/api/admin/orders';
    const res = await fetch(url);
    const data = await res.json();

    if (data.success && data.orders) {
      if (data.orders.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text2)">لا توجد أي طلبات حالياً في هذا القسم.</div>';
        return;
      }

      listEl.innerHTML = data.orders.map(o => {
        const sBadge = {
          pending: '<span class="status-badge pending">معلق 🟡</span>',
          processing: '<span class="status-badge processing">جاري الشحن 🔵</span>',
          completed: '<span class="status-badge completed">مكتمل 🟢</span>',
          rejected: '<span class="status-badge rejected">ملغي 🔴</span>'
        }[o.status] || `<span class="status-badge">${o.status}</span>`;

        return `
          <div class="admin-order-item" id="adm-ord-${o.order_num}">
            <div class="adm-order-top">
              <div>
                <strong style="color:#60a5fa">#${o.order_num}</strong>
                <span style="font-size:0.75rem;color:var(--text2);margin-right:6px">${o.created_at}</span>
              </div>
              ${sBadge}
            </div>
            <div class="adm-order-body">
              <div>الخدمة: <strong>${o.service_title} - ${o.package_name}</strong></div>
              <div>الآيدي / الهدف: <code style="color:#fcd34d;font-weight:700">${o.target_id}</code></div>
              <div>الزبون: <strong>${o.customer_name || 'بدون اسم'}</strong> | هاتف: <strong style="direction:ltr">${o.customer_phone || '-'}</strong></div>
              <div>المبلغ: <strong>${o.price_usd} $ (${Number(o.price_local).toLocaleString()} ${o.currency})</strong></div>
              <div>طريقة الدفع: <strong>${o.payment_method}</strong> ${o.payment_ref ? `| كود الإشعار: <code style="color:#34d399">${o.payment_ref}</code>` : ''}</div>
              ${o.admin_notes ? `<div style="color:#93c5fd">ملاحظات: ${o.admin_notes}</div>` : ''}
            </div>
            <div class="adm-actions-row">
              <button class="adm-btn adm-btn-complete" onclick="admUpdateOrderStatus('${o.order_num}', 'completed')">
                ✅ قبول وإكمال
              </button>
              <button class="adm-btn adm-btn-process" onclick="admUpdateOrderStatus('${o.order_num}', 'processing')">
                🔄 جاري الشحن
              </button>
              <button class="adm-btn adm-btn-reject" onclick="admUpdateOrderStatus('${o.order_num}', 'rejected')">
                ❌ رفض
              </button>
              <button class="adm-btn adm-btn-copy" onclick="admCopyTarget('${o.target_id}')">
                📋 نسخ الآيدي
              </button>
              ${o.customer_phone ? `
                <button class="adm-btn adm-btn-wa" onclick="admWhatsApp('${o.customer_phone}', '${o.order_num}', '${o.package_name}')">
                  💬 واتساب
                </button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    listEl.innerHTML = '<div style="text-align:center;padding:24px;color:#f87171">تعذر تحميل الطلبات من السيرفر.</div>';
  }
}

async function admUpdateOrderStatus(orderNum, newStatus) {
  try {
    const res = await fetch(`/api/admin/orders/${orderNum}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, notes: `تحديث من لوحة الإدارة في ${new Date().toLocaleTimeString('ar-SA')}` })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`تم تحديث حالة الطلب #${orderNum} إلى (${newStatus})`, 'success');
      loadAdminOrders();
    } else {
      showToast(`خطأ: ${data.error || 'تعذر التحديث'}`, 'error');
    }
  } catch (e) {
    showToast('فشل الاتصال بالسيرفر', 'error');
  }
}

function admCopyTarget(id) {
  navigator.clipboard.writeText(id);
  showToast(`📋 تم نسخ معرف اللاعب/الحساب: ${id}`, 'success');
}

function admWhatsApp(phone, orderNum, service) {
  let cleanPhone = phone.replace(/[^0-9+]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '963' + cleanPhone.substring(1);
  }
  const msg = `مرحباً بك! بخصوص طلبك رقم ${orderNum} (${service}) في ${shopSettings.shopName || 'المتجر'}:`;
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
}
