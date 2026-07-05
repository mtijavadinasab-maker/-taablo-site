/*
  تابلو — script.js
  ----------------------------------------------------------------
  این فایل سه کار می‌کند:
  1) گرفتن نرخ لحظه‌ای چند ارز جهانی از یک API رایگان (بدون کلید)
  2) رسم یک نمودار روند نمونه با Chart.js
  3) نمایش «سیگنال‌های اقتصادی» و «سناریوها» — که فعلاً داده نمونه هستند

  نکته مهم برای توسعه آینده (به README هم مراجعه کن):
  - API رایگان فعلی (open.er-api.com) نرخ *رسمی* ریال را می‌دهد، نه نرخ بازار آزاد.
    برای نرخ واقعی بازار آزاد باید یک منبع داخلی (مثلاً یک API پولی مثل navasan.tech)
    جایگزین شود. جای دقیق تغییر در تابع fetchRates() مشخص شده.
  - سیگنال‌ها و سناریوها الان hardcode و نمونه هستند. در فاز بعدی باید از یک
    دیتابیس یا فید خبری واقعی خوانده شوند.
*/

const RATES_API = "https://open.er-api.com/v6/latest/USD";
const HISTORY_API = (start, end) =>
  `https://api.frankfurter.app/${start}..${end}?from=USD&to=EUR`;

// --- نرخ واقعی بازار ایران (دلار/طلا/سکه) از BrsApi ---
// یک کلید رایگان (تا ۱۵۰۰ درخواست در روز) از brsapi.ir بگیر و همینجا جایگزین کن.
// اگه کلید نگذاری، این بخش به‌صورت خودکار داده نمونه نشون می‌ده تا سایت خراب نشه.
const BRSAPI_KEY = "BvyHfrNEsPrp6c3L1jhtRVHLFcu5x85k";
const BRSAPI_URL = `https://BrsApi.ir/Api/Market/Gold_Currency.php?key=${BRSAPI_KEY}`;
// اگه به‌خاطر محدودیت CORS مرورگر مستقیم به BrsApi وصل نشد، از این پروکسی عمومی
// به‌عنوان پشتیبان استفاده می‌کنیم (برای سایت‌های شخصی/آموزشی مشکلی ندارد).
const CORS_FALLBACK = (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`;

const CURRENCIES = [
  { code: "EUR", label: "یورو / دلار" },
  { code: "GBP", label: "پوند / دلار" },
  { code: "TRY", label: "لیر ترکیه / دلار" },
];

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function fetchRates() {
  try {
    const res = await fetch(RATES_API);
    const data = await res.json();
    return data.rates;
  } catch (err) {
    console.warn("خطا در دریافت نرخ ارز، استفاده از داده نمونه:", err);
    // داده نمونه برای زمانی که شبکه/اجازه دسترسی وجود ندارد
    return { EUR: 0.92, GBP: 0.78, TRY: 32.1, IRR: 610000 };
  }
}

function renderTicker(rates) {
  const ticker = document.getElementById("ticker");
  const items = CURRENCIES.map((c) => {
    const val = rates[c.code];
    if (!val) return "";
    return `<span>${c.label}: <span class="mono up">${formatNumber(val)}</span></span>`;
  }).join("");
  // دو بار تکرار می‌کنیم تا اسکرول بی‌وقفه به نظر بیاید
  ticker.innerHTML = items + items;
}

function renderCards(rates) {
  const container = document.getElementById("cards");
  container.innerHTML = CURRENCIES.map((c) => {
    const val = rates[c.code];
    const fake_change = (Math.random() * 2 - 1).toFixed(2); // نمونه تا داده تاریخی واقعی وصل شود
    const dir = fake_change >= 0 ? "up" : "down";
    return `
      <div class="card">
        <div class="label">${c.label}</div>
        <div class="value mono">${val ? formatNumber(val) : "—"}</div>
        <div class="change ${dir}">${dir === "up" ? "▲" : "▼"} ${Math.abs(fake_change)}٪ (نمونه)</div>
      </div>`;
  }).join("");
}

function formatNumber(n) {
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// نمونه داده برای زمانی که کلید تنظیم نشده یا درخواست شکست بخورد
const SAMPLE_IRR_ITEMS = [
  { name: "دلار آمریکا", price: 610000, unit: "تومان" },
  { name: "طلای ۱۸ عیار (گرم)", price: 6200000, unit: "تومان" },
  { name: "سکه امامی", price: 42000000, unit: "تومان" },
];

async function fetchIrrData() {
  const note = document.getElementById("irr-note");

  if (!BRSAPI_KEY || BRSAPI_KEY === "YOUR_API_KEY") {
    note.textContent =
      "⚠️ هنوز کلید BrsApi تنظیم نشده — داده نمونه نشان داده می‌شود. کلید رایگان را از brsapi.ir بگیر و در script.js جای YOUR_API_KEY بگذار.";
    return SAMPLE_IRR_ITEMS;
  }

  const tryFetch = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  };

  let raw;
  try {
    raw = await tryFetch(BRSAPI_URL);
  } catch (err1) {
    console.warn("درخواست مستقیم به BrsApi ناموفق بود، تلاش با پروکسی CORS:", err1);
    try {
      raw = await tryFetch(CORS_FALLBACK(BRSAPI_URL));
    } catch (err2) {
      console.error("درخواست با پروکسی هم ناموفق بود:", err2);
      note.textContent =
        "⚠️ اتصال به BrsApi ناموفق بود (به Console مرورگر نگاه کن). فعلاً داده نمونه نشان داده می‌شود.";
      return SAMPLE_IRR_ITEMS;
    }
  }

  console.log("پاسخ خام BrsApi (برای بررسی ساختار داده):", raw);

  // ساختار دقیق پاسخ ممکن است کمی فرق داشته باشد؛ چند حالت رایج را امتحان می‌کنیم.
  const items = [];
  const pools = [raw.gold, raw.currency, raw.data, raw.result, raw].filter(Array.isArray);
  const list = pools.length ? pools.flat() : [];

  if (!list.length) {
    note.textContent =
      "⚠️ داده از BrsApi رسید ولی ساختار آن با کد فعلی هم‌خوان نبود. جزئیات در Console مرورگر است — همان را برای من بفرست تا تنظیمش کنم.";
    return SAMPLE_IRR_ITEMS;
  }

  list.forEach((item) => {
    const name = item.name || item.name_fa || item.symbol || "نامشخص";
    const price = item.price || item.value || item.close || null;
    if (name && price) items.push({ name, price, unit: "تومان" });
  });

  if (!items.length) return SAMPLE_IRR_ITEMS;

  note.textContent = "منبع: BrsApi.ir — به‌روزرسانی لحظه‌ای بازار آزاد.";
  return items.slice(0, 6);
}

function renderIrrCards(items) {
  document.getElementById("irr-cards").innerHTML = items
    .map(
      (it) => `
      <div class="card">
        <div class="label">${it.name}</div>
        <div class="value mono">${formatNumber(it.price)}</div>
        <div class="change">${it.unit}</div>
      </div>`
    )
    .join("");
}

async function renderTrendChart() {
  const ctx = document.getElementById("trendChart");
  let labels = [];
  let values = [];
  try {
    const start = todayISO(-30);
    const end = todayISO(0);
    const res = await fetch(HISTORY_API(start, end));
    const data = await res.json();
    const entries = Object.entries(data.rates);
    labels = entries.map(([date]) => date.slice(5));
    values = entries.map(([, v]) => v.EUR);
  } catch (err) {
    console.warn("خطا در دریافت تاریخچه، استفاده از داده نمونه:", err);
    labels = Array.from({ length: 30 }, (_, i) => `روز ${i + 1}`);
    values = Array.from({ length: 30 }, () => 0.9 + Math.random() * 0.05);
  }

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderColor: "#c9a24b",
          backgroundColor: "rgba(201,162,75,0.08)",
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#8b93a3", font: { size: 10 } }, grid: { color: "#232a38" } },
        y: { ticks: { color: "#8b93a3", font: { size: 10 } }, grid: { color: "#232a38" } },
      },
    },
  });
}

// --- داده نمونه: سیگنال‌ها و سناریوها (در فاز بعدی با داده واقعی جایگزین می‌شوند) ---

const SAMPLE_SIGNALS = [
  {
    tag: "نمونه · انرژی",
    type: "negative",
    text: "کاهش صادرات نفت در گزارش هفته اخیر می‌تواند فشار بر ذخایر ارزی را افزایش دهد.",
  },
  {
    tag: "نمونه · سیاست پولی",
    type: "positive",
    text: "ثبات نسبی نرخ بهره در بازارهای جهانی، ریسک نوسان کوتاه‌مدت را کاهش داده است.",
  },
  {
    tag: "نمونه · تحریم",
    type: "negative",
    text: "اخبار مربوط به مذاکرات بین‌المللی همچنان مهم‌ترین متغیر غیرقابل‌پیش‌بینی برای نرخ ارز باقی مانده.",
  },
];

const SAMPLE_SCENARIOS = [
  {
    title: "سناریوی ثبات نسبی",
    text: "در صورت عدم تغییر شرایط سیاسی، انتظار می‌رود نوسان نرخ ارز در بازه‌ای محدود باقی بماند.",
    confidence: "اطمینان نمونه: ۴۵٪",
  },
  {
    title: "سناریوی افزایش تنش",
    text: "تشدید اخبار منفی سیاسی می‌تواند به افزایش سریع تقاضای ارز و رشد نرخ منجر شود.",
    confidence: "اطمینان نمونه: ۳۰٪",
  },
  {
    title: "سناریوی بهبود مذاکرات",
    text: "پیشرفت در مذاکرات بین‌المللی معمولاً با کاهش موقت نرخ ارز در بازار همراه بوده است.",
    confidence: "اطمینان نمونه: ۲۵٪",
  },
];

function renderSignals() {
  document.getElementById("signals").innerHTML = SAMPLE_SIGNALS.map(
    (s) => `
    <div class="signal ${s.type}">
      <div class="tag">${s.tag}</div>
      <div class="text">${s.text}</div>
    </div>`
  ).join("");
}

function renderScenarios() {
  document.getElementById("scenarios").innerHTML = SAMPLE_SCENARIOS.map(
    (s) => `
    <div class="scenario">
      <h3>${s.title}</h3>
      <p>${s.text}</p>
      <div class="confidence">${s.confidence}</div>
    </div>`
  ).join("");
}

// --- اجرا ---
(async function init() {
  const rates = await fetchRates();
  renderTicker(rates);
  renderCards(rates);
  renderTrendChart();
  renderSignals();
  renderScenarios();

  const irrItems = await fetchIrrData();
  renderIrrCards(irrItems);
})();

