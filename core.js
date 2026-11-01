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
];
export const DEFAULT_FEATURES = Object.fromEntries(FEATURES.map(([k]) => [k, k !== "fund"]));

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
  google: '',
};
export const icon = (n, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;
export const GOOGLE = `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

/* ---- money ---- */
export function shares(e, roster) {
  const out = {}; const sp = e.split || {}; const ids = (sp.members || []).filter(Boolean);
  if (sp.mode === "custom") { for (const [id, v] of Object.entries(sp.custom || {})) if (+v) out[id] = r2(v); return out; }
  if (!ids.length) return out;
  if (sp.mode === "weight") {
    const w = ids.map(id => +((roster.find(m => m.id === id) || {}).weight) || 1); const tw = w.reduce((a, b) => a + b, 0);
    ids.forEach((id, i) => out[id] = e.amount * w[i] / tw);
  } else ids.forEach(id => out[id] = e.amount / ids.length);
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
