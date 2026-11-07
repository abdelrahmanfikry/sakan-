// Shared helpers, icons, money logic. No Firebase here.
export const CATS = ["إيجار","كهرباء","مياه","غاز","إنترنت","أكل وبقالة","منظفات","صيانة","أثاث وأدوات","مواصلات","أخرى"];
export const FUND = "__fund__";

export const FEATURES = [
  ["payments","التسويات والدفعات","تسجيل التحويلات بين السكان وتأكيد الاستلام"],
  ["instapay","الدفع بإنستاباي والمحافظ","زر «ادفع بإنستاباي» ونسخ العنوان والمحفظة جنب كل تحويل"],
  ["whatsapp","تذكير واتساب","زر يبعت رسالة تذكير جاهزة بالمبلغ واللينك"],
  ["receipts","صور الإيصالات","إرفاق صورة الفاتورة مع المصروف"],
  ["recurring","الفواتير الثابتة","إيجار وإنترنت وغيرهم يتضافوا كل شهر بضغطة مع تنبيه الاستحقاق"],
  ["budgets","الميزانية","حد شهري لكل فئة وتنبيه لو اتخطّى"],
  ["fund","الصندوق المشترك (جمعية)","اشتراك شهري ثابت والمصاريف تتدفع منه"],
  ["meters","عدادات الكهرباء والمياه والغاز","قراءات شهرية وحساب الاستهلاك والفاتورة"],
  ["deposits","التأمين والعهد","تأمين كل ساكن، عهد البيت، وتسوية الخروج"],
  ["shopping","قائمة المشتريات","الناقص في البيت، واللي يشتريه يسجّله مصروف"],
  ["chores","المهام بالدور","تنضيف وزبالة وغيرهم — الدور بيلف لوحده"],
  ["board","لوحة الإعلانات","إعلانات للسكن مع التثبيت"],
  ["polls","التصويت","استفتاءات سريعة بين السكان"],
  ["contacts","أرقام مهمة وقوانين السكن","صاحب الشقة والسبّاك… وقواعد البيت"],
  ["stats","الإحصائيات","تحليل المصاريف بالفئة والشهر"],
  ["activity","سجل النشاط","مين عمل إيه وإمتى"],
  ["statement","كشف الحساب","حركات كل ساكن بالرصيد التراكمي"],
  ["summary","ملخص الشهر","نص جاهز بالأرقام والتسويات للمشاركة على واتساب"],
  ["notifications","الإشعارات","تنبيهات بكل جديد يخصك، وإشعار على الجهاز"],
  ["guests","الضيوف","الضيف بيزوّد حصة اللي مستضيفه في المصاريف"],
  ["closing","قفل الشهر والتقرير","قفل حساب الشهر وتقرير يتطبع أو يتحفظ PDF"],
  ["loans","السلف بين السكان","فلوس شخصية بين السكان منفصلة عن حسابات الشقة"],
  ["audit","سجل التعديلات","كل إضافة وتعديل وحذف ومين عمله"],
  ["autoRecurring","إضافة الفواتير الثابتة تلقائيًا","تتسجّل لوحدها يوم استحقاقها لما مدير يفتح الموقع"],
  ["quickAdd","الإضافة بجملة","تكتب «أحمد دفع 300 أكل على الكل» والمصروف يتملي لوحده"],
  ["prices","ذاكرة الأسعار","سعر كل حاجة بتشتروها، وتنبيه لو غليت، وأرخص محل"],
  ["rentJar","حصالة الإيجار","كل واحد يحوّش نصيبه من الإيجار بمبلغ صغير كل يوم"],
  ["weekly","تقرير الأسبوع","ملخص الأسبوع بالهزار جاهز يتبعت على الجروب"],
];
export const OFF_BY_DEFAULT = ["fund","meters","deposits","contacts","polls","board","chores"];
export const DEFAULT_FEATURES = Object.fromEntries(FEATURES.map(([k]) => [k, !OFF_BY_DEFAULT.includes(k)]));

export const PERMS = [
  ["expOthers", false, "العضو يسجّل مصروف باسم غيره", "لو مقفولة، العضو يسجّل اللي دفعه هو بس"],
  ["editOwn", true, "العضو يعدّل ويحذف بنوده", "في الشهور اللي مش مقفولة"],
  ["payConfirm", true, "الدفعة تحتاج تأكيد المستلم", "الدفعة اللي يسجّلها الدافع ما تتحسبش إلا لما المستلم يأكد"],
  ["seeAll", true, "العضو يشوف أرصدة الكل", "لو مقفولة، يشوف رصيده هو وتحويلاته بس"],
  ["memberShopping", true, "العضو يضيف للمشتريات", ""],
  ["memberNotes", true, "العضو ينشر إعلانات", ""],
  ["memberPolls", true, "العضو يعمل تصويت", ""],
  ["memberMeters", true, "العضو يسجّل قراءة عداد", ""],
  ["memberFund", true, "العضو يسجّل اشتراكه في الصندوق", "بتستنى تأكيد المدير"],
  ["memberGuests", true, "العضو يسجّل ضيوفه", ""],
  ["memberLoans", true, "العضو يسجّل سلف", "السلفة بتستنى تأكيد اللي استلم الفلوس"],
  ["autoJoin", true, "الانضمام بالكود مفتوح", "لو مقفولة، كود الدعوة مش هيدخّل حد جديد"],
];
export const DEFAULT_PERMS = Object.fromEntries(PERMS.map(([k, d]) => [k, d]));

export const ROLES = { admin: "مدير", member: "عضو", viewer: "مشاهد" };

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const r2 = n => Math.round((+n || 0) * 100) / 100;
export const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
export const monthOf = d => (d || "").slice(0, 7);
export const monthName = m => { if (!m) return "كل الشهور"; const [y, mm] = m.split("-"); return new Date(+y, +mm - 1, 1).toLocaleDateString("ar-EG", { month: "long", year: "numeric" }); };
export const iso = () => new Date().toISOString();
export const fmtDT = s => { if (!s) return ""; const d = new Date(s); return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" }); };
export const safeUrl = u => /^https:\/\/[^\s"'<>]+$/i.test(String(u || "").trim()) ? String(u).trim() : "";
export const waPhone = p => { let d = String(p || "").replace(/\D/g, ""); if (!d) return ""; if (d.startsWith("00")) d = d.slice(2); else if (d.startsWith("0")) d = "20" + d.slice(1); return d; };
export const code6 = () => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; const r = crypto.getRandomValues(new Uint32Array(6)); for (const x of r) s += a[x % a.length]; return s; };

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  swap: '<path d="M7 7h13l-4-4"/><path d="M17 17H4l4 4"/>',
  piggy: '<path d="M19 9c1.5.5 2 1.5 2 3h-2c-.4 1.6-1.4 3-3 3.8V19h-3v-2h-3v2H7v-3.3A6 6 0 0 1 4 11c0-3.3 3-6 7-6h3l3-2v3.4c.8.6 1.5 1.5 2 2.6z"/><circle cx="15" cy="10" r=".6"/>',
  cart: '<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2 3h3l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.4-1.1L21 8H6"/>',
  broom: '<path d="M14 4 20 10"/><path d="M17 7 9.5 14.5"/><path d="M9.5 14.5c-2 0-4.5 1.5-5.5 5.5 4-1 5.5-3.5 5.5-5.5z"/><path d="m7 17 2 2"/>',
  mega: '<path d="M3 10v4h3l7 4V6L6 10z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
  poll: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8.5 19z"/><path d="M9 9.5c.3 2 2.3 4.2 4.5 4.6l1.2-1.1 1.8.9c-.3 1.2-1.3 1.8-2.4 1.6A7 7 0 0 1 8 10c-.2-1 .4-2.1 1.6-2.4l.9 1.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  logout: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
  wallet: '<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7V6a2 2 0 0 1 2-2h11v3"/><circle cx="16.5" cy="13.5" r="1"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
  pin: '<path d="M12 17v5"/><path d="M8 3h8l-1 6 3 3v2H6v-2l3-3z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  door: '<path d="M4 21h16"/><path d="M6 21V4h10v17"/><circle cx="13" cy="12.5" r=".8"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  hand: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.7-2.7-3-6-3"/>',
  guest: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/>',
  file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  sparkle: '<path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  google: '',
};
export const icon = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;
export const GOOGLE = `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

/* ---- money ---- */
export const ctx = { on: false, guests: [], cats: [] };
export const GUEST_CATS = ["أكل وبقالة","كهرباء","مياه","غاز","منظفات"];
export function guestExtra(e) {
  const out = {}; if (!ctx.on || e.noGuests || !e.date || !ctx.cats.includes(e.category)) return out;
  for (const g of ctx.guests) { const to = g.to || g.from; if (g.from && g.from <= e.date && e.date <= to) out[g.hostId] = (out[g.hostId] || 0) + (+g.factor || 1); }
  return out;
}
export function shares(e, roster) {
  const out = {}; const sp = e.split || {}; const ids = (sp.members || []).filter(Boolean);
  if (sp.mode === "custom") { for (const [id, v] of Object.entries(sp.custom || {})) if (+v) out[id] = r2(v); return out; }
  if (!ids.length) return out;
  const gx = guestExtra(e);
  const w = ids.map(id => (sp.mode === "weight" ? (+((roster.find(m => m.id === id) || {}).weight) || 1) : 1) + (gx[id] || 0));
  const tw = w.reduce((a, b) => a + b, 0);
  ids.forEach((id, i) => out[id] = e.amount * w[i] / tw);
  return out;
}
export const confirmed = p => p.status !== "pending";

export function balances({ roster, expenses, payments, fund }, month) {
  const b = {}; roster.forEach(m => b[m.id] = { paid: 0, share: 0, sent: 0, recv: 0 });
  b[FUND] = { paid: 0, share: 0, sent: 0, recv: 0 };
  const ok = d => !month || monthOf(d) === month;
  for (const e of expenses) { if (!ok(e.date)) continue;
    if (b[e.paidBy]) b[e.paidBy].paid += +e.amount || 0;
    for (const [id, v] of Object.entries(shares(e, roster))) if (b[id]) b[id].share += v; }
  for (const p of payments) { if (!ok(p.date) || !confirmed(p)) continue;
    if (b[p.from]) b[p.from].sent += +p.amount || 0; if (b[p.to]) b[p.to].recv += +p.amount || 0; }
  for (const f of fund || []) { if (!ok(f.date) || !confirmed(f)) continue;
    if (b[f.memberId]) b[f.memberId].sent += +f.amount || 0; b[FUND].recv += +f.amount || 0; }
  for (const id in b) { const x = b[id]; x.net = r2(x.paid - x.share + x.sent - x.recv); }
  return b;
}
export function settlePlan(b) {
  const cr = [], db = [];
  for (const id in b) { if (id === FUND) continue; const n = b[id].net; if (n > 0.009) cr.push({ id, v: n }); else if (n < -0.009) db.push({ id, v: -n }); }
  cr.sort((a, c) => c.v - a.v); db.sort((a, c) => c.v - a.v);
  const plan = []; let i = 0, j = 0;
  while (i < db.length && j < cr.length) { const v = Math.min(db[i].v, cr[j].v); plan.push({ from: db[i].id, to: cr[j].id, amount: r2(v) });
    db[i].v -= v; cr[j].v -= v; if (db[i].v < 0.01) i++; if (cr[j].v < 0.01) j++; }
  return plan;
}
export function choreTurn(c, roster) {
  const ids = (c.members || []).filter(id => roster.find(m => m.id === id)); if (!ids.length) return { who: null, next: null, daysLeft: 0, periodStart: today() };
  const every = Math.max(1, +c.everyDays || 7); const start = new Date((c.start || today()) + "T00:00:00"); const now = new Date(today() + "T00:00:00");
  const days = Math.max(0, Math.floor((now - start) / 864e5)); const k = Math.floor(days / every);
  return { who: ids[k % ids.length], next: ids[(k + 1) % ids.length], daysLeft: every - (days % every), periodStart: new Date(start.getTime() + k * every * 864e5).toISOString().slice(0, 10) };
}

/* compress an image file to a JPEG data URL under ~700KB */
export async function compressImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    let max = 1280, q = .72, out = "";
    for (let t = 0; t < 5; t++) {
      const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      out = c.toDataURL("image/jpeg", q); if (out.length < 700000) return out; max *= .8; q -= .08;
    }
    return out.length < 950000 ? out : null;
  } finally { URL.revokeObjectURL(url); }
}

/* ---- personal loans: money from F to T means T owes F ---- */
export function loanNets(loans) {
  const pair = {};
  for (const l of loans) { if (!confirmed(l)) continue; const [p, q] = l.from < l.to ? [l.from, l.to] : [l.to, l.from]; const k = p + "|" + q;
    pair[k] = (pair[k] || 0) + (l.from === p ? 1 : -1) * (+l.amount || 0); }
  return Object.entries(pair).filter(([, v]) => Math.abs(v) > 0.009).map(([k, v]) => { const [p, q] = k.split("|");
    return v > 0 ? { debtor: q, creditor: p, amount: r2(v) } : { debtor: p, creditor: q, amount: r2(-v) }; });
}
export const slug = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.codePointAt(0)) >>> 0; return h.toString(36); };

/* ---- quick add parser: "أحمد دفع 300 أكل على الكل" ---- */
const AR_DIG = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":"." };
export const norm = s => String(s || "").replace(/[٠-٩٫]/g, c => AR_DIG[c]).replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ًٌٍَُِّْـ]/g, "").toLowerCase().trim();
const CAT_WORDS = {
  "أكل وبقالة": ["اكل","بقاله","عشا","عشاء","غدا","غداء","فطار","خضار","فاكهه","لحمه","فراخ","عيش","سوبر","طلبات","اكلنا"],
  "كهرباء": ["كهربا","كهرباء"], "مياه": ["ميه","مياه","مية"], "غاز": ["غاز","انبوبه"],
  "إنترنت": ["نت","انترنت","راوتر","باقه","واي","wifi"], "إيجار": ["ايجار"],
  "منظفات": ["منظفات","صابون","كلور","مسحوق","تنظيف"], "صيانة": ["صيانه","سباك","كهربائي","تصليح","نجار"],
  "مواصلات": ["تاكسي","مواصلات","اوبر","بنزين","كريم","مترو","توكتوك","ميكروباص","اتوبيس"], "أثاث وأدوات": ["اثاث","ادوات","مكنسه","غساله"] };
const STOP = new Set(["انا","اني","دفعت","دفع","دفعنا","جنيه","جنيها","ج","ريال","رس","في","ب","حق","تمن","ثمن","ل","عن","مصروف"]);
export function parseQuick(text, roster, myId) {
  const rawToks = String(text || "").trim().split(/\s+/).filter(Boolean);
  const toks = rawToks.map(norm);
  const people = roster.map(m => ({ id: m.id, active: m.active !== false, toks: norm(m.name).split(/\s+/).filter(Boolean) })).filter(x => x.toks.length);
  const tokIds = {}; people.forEach(p => p.toks.forEach(t => { (tokIds[t] = tokIds[t] || new Set()).add(p.id); }));
  const isName = t => !!tokIds[t];
  const clean = t => { if (isName(t)) return t; if (t.length > 2 && t[0] === "و" && isName(t.slice(1))) return t.slice(1); return t; };
  const who = t => { const ids = tokIds[clean(t)]; return ids && ids.size === 1 ? [...ids][0] : null; };
  let ai = toks.findIndex(t => t === "علي" || t === "عليه" || t === "علينا"); if (ai < 0) ai = toks.length;
  const head = toks.slice(0, ai), seg = toks.slice(ai + 1);
  const numTok = head.find(t => /^\d+([.,]\d+)?$/.test(t)) || (head.join(" ").match(/\d+(?:[.,]\d+)?/) || [])[0];
  const amount = numTok ? r2(String(numTok).replace(",", ".")) : 0;
  let paidBy = null; const di = head.findIndex(t => t.startsWith("دفع"));
  if (head.includes("انا") || head.includes("اني") || head.includes("دفعت")) paidBy = myId;
  for (const t of (di >= 0 ? head.slice(0, di) : head)) { const id = who(t); if (id) { paidBy = id; break; } }
  let members = [], hint = "";
  const all = people.filter(p => p.active).map(p => p.id);
  if (seg.length) {
    if (seg.some(t => /^(الكل|كلنا|كله|الجميع|كلهم)$/.test(t))) members = all;
    else { seg.forEach(t => { const id = who(t); if (id) members.push(id); if ((t === "وانا" || t === "انا" || t === "ومعايا") && myId) members.push(myId); });
      const cnt = seg.find(t => /^\d+$/.test(t)); if (!members.length && cnt) hint = `علّم على الـ${cnt} اللي هيتقسم عليهم`; }
  }
  if (!members.length) members = all;
  members = [...new Set(members)];
  let category = "أخرى";
  outer: for (const [c, ws] of Object.entries(CAT_WORDS)) for (const t of head) { const b = t.replace(/^و?ال/, ""); if (ws.includes(t) || ws.includes(b)) { category = c; break outer; } }
  const title = rawToks.slice(0, ai).filter((rt, i) => { const t = head[i]; return !STOP.has(t) && !/^\d+([.,]\d+)?$/.test(t) && !tokIds[clean(t)]; }).join(" ").trim();
  return { amount, paidBy, members, category, title: title || (category === "أخرى" ? "مصروف" : category), hint };
}

/* ---------- ذاكرة الأسعار ---------- */
export const itemKey = s => norm(String(s || "")).replace(/\s+/g, " ").trim();
export function priceGroups(prices) {
  const g = {};
  prices.forEach(p => { const k = itemKey(p.item); if (!k) return; (g[k] = g[k] || { key: k, name: p.item, list: [] }).list.push(p); });
  return Object.values(g).map(x => {
    const l = x.list.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
    const last = l[0], prev = l.find((p, i) => i > 0 && (p.shop || "") === (last.shop || "")) || l[1] || null;
    const change = prev && +prev.price > 0 ? r2((last.price - prev.price) / prev.price * 100) : 0;
    const shops = {}; l.forEach(p => { const sh = (p.shop || "").trim() || "—"; if (!shops[sh]) shops[sh] = p; });
    const cheap = Object.values(shops).sort((a, b) => a.price - b.price)[0];
    return { ...x, name: last.item, list: l, last, prev, change, cheap, shops: Object.keys(shops).length };
  }).sort((a, b) => (b.last.date || "").localeCompare(a.last.date || ""));
}

/* ---------- حصالة الإيجار ---------- */
const addMonths = (d, n) => { const x = new Date(d + "T00:00:00Z"); const day = x.getUTCDate(); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() + n); x.setUTCDate(Math.min(day, 28)); return x.toISOString().slice(0, 10); };
export const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 864e5);
export function jarCycle(dueDay, t = today()) {
  const d = Math.min(28, Math.max(1, +dueDay || 1)); const thisDue = t.slice(0, 8) + String(d).padStart(2, "0");
  const next = t <= thisDue ? thisDue : addMonths(thisDue, 1); const prev = addMonths(next, -1);
  return { prev, next, daysLeft: Math.max(1, daysBetween(t, next) + 1), total: daysBetween(prev, next) };
}
export function jarStatus(cfg, roster, jar, t = today()) {
  const act = roster.filter(m => m.active !== false && (!cfg.members || cfg.members.includes(m.id))); const amount = +cfg.amount || 0;
  const W = act.reduce((a, m) => a + (+m.weight || 1), 0) || 1; const cy = jarCycle(cfg.dueDay, t);
  const rows = act.map(m => {
    const share = r2(amount * (+m.weight || 1) / W);
    const mine = jar.filter(j => j.memberId === m.id && j.date > cy.prev && j.date <= cy.next);
    const saved = r2(mine.reduce((a, j) => a + (+j.amount || 0), 0)); const left = Math.max(0, r2(share - saved));
    const daily = Math.ceil(left / cy.daysLeft); const todayIn = r2(mine.filter(j => j.date === t).reduce((a, j) => a + (+j.amount || 0), 0));
    const days = new Set(mine.map(j => j.date)).size;
    return { id: m.id, share, saved, left, daily, todayIn, days, pct: share ? Math.min(100, Math.round(saved / share * 100)) : 0, list: mine };
  });
  return { cy, rows, amount };
}

/* ---------- تقرير الأسبوع ---------- */
export function weekRange(offset = 0, t = today()) {
  const end = new Date(t + "T00:00:00Z"); end.setUTCDate(end.getUTCDate() - 7 * offset);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 6);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}
