import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, onSnapshot, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const root = document.getElementById("root");

/* ================= أدوات ================= */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const r2 = n => Math.round((+n || 0) * 100) / 100;
const AR = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":".","،":",","٬":"," };
const norm = s => String(s || "").replace(/[٠-٩٫،٬]/g, c => AR[c]).replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ًٌٍَُِّْـ]/g, "").toLowerCase().trim();
// «1,500» = ألف وخمسمية · «1,5» = واحد ونص
const toNum = t => r2(String(t).replace(/(\d)[,](\d{3})(?!\d)/g, "$1$2").replace(",", "."));
const ymd = d => { d = new Date(d); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const today = () => ymd(new Date());
const yesterday = () => ymd(Date.now() - 864e5);
const monthOf = d => String(d || "").slice(0, 7);
const monthName = (m, short) => { const [y, mm] = m.split("-"); return new Date(+y, +mm - 1, 1).toLocaleDateString("ar-EG", short ? { month: "short" } : { month: "long", year: "numeric" }); };
const shiftMonth = (m, k) => { const [y, mm] = m.split("-").map(Number); const d = new Date(y, mm - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const lastDay = m => { const [y, mm] = m.split("-").map(Number); return new Date(y, mm, 0).getDate(); };
const cur = () => S.cfg.currency || "ج";
const money = n => r2(n).toLocaleString("ar-EG", { maximumFractionDigits: 2 }) + " " + cur();
const pct = n => (n > 0 ? "+" : "") + Math.round(n) + "%";
const dayName = d => d === today() ? "النهارده" : d === yesterday() ? "امبارح" : new Date(d + "T00:00:00").toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "short" });
const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
const store = { get(k){ try{ return localStorage.getItem(k); }catch(_){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(_){} } };
const sum = a => a.reduce((s, i) => s + (+i.amount || 0), 0);
const uid = () => Math.random().toString(36).slice(2, 10);

/* ================= الفئات ================= */
const BASE_CATS = ["أكل وبقالة","مواصلات","فواتير","إيجار","صحة","لبس","خروج وترفيه","تعليم","هدايا","أخرى"];
const INCOME_CATS = ["مرتب","شغل إضافي","هدية","تحويل","أخرى"];
const WORDS = {
  "أكل وبقالة": ["اكل","بقاله","عشا","عشاء","غدا","غداء","فطار","خضار","فاكهه","لحمه","فراخ","عيش","سوبر","طلبات","سمك","رز","لبن","جبنه","بيض","شاي","قهوه","سكر","مكرونه"],
  "مواصلات": ["تاكسي","مواصلات","اوبر","بنزين","كريم","مترو","توكتوك","ميكروباص","اتوبيس","سواق","ركنه"],
  "فواتير": ["كهربا","كهرباء","ميه","مياه","غاز","نت","انترنت","باقه","رصيد","كارت","فاتوره","تليفون"],
  "إيجار": ["ايجار","شقه"], "صحة": ["دكتور","دوا","دواء","صيدليه","تحاليل","كشف","مستشفي"],
  "لبس": ["لبس","هدوم","جزمه","كوتشي","قميص","بنطلون","تيشيرت"],
  "خروج وترفيه": ["خروجه","سينما","كافيه","مطعم","نادي","جيم","رحله"],
  "تعليم": ["كورس","كتاب","كتب","دروس","مذكره","جامعه","مدرسه"], "هدايا": ["هديه","هدايا","عيديه"] };
const INCOME_WORDS = ["مرتب","قبضت","دخل","استلمت","جالي","فلوس جات","تحويل لي"];
const STOP = new Set(["انا","دفعت","دفع","جنيه","جنيها","ج","ب","في","حق","تمن","ثمن","مصروف","امبارح","امس","النهارده","اليوم","قبضت","استلمت","جالي"]);
const cats = () => S.cfg.cats?.length ? S.cfg.cats : BASE_CATS;
const catsFor = t => t === "income" ? INCOME_CATS : cats();
function guessCat(text, type){ const t = norm(text).split(/\s+/).map(w => w.replace(/^و?ال/, ""));
  if (type === "income") return INCOME_CATS.find(c => t.includes(norm(c))) || null;
  const own = cats().find(c => t.includes(norm(c).replace(/^ال/, ""))); if (own) return own;
  for (const [c, ws] of Object.entries(WORDS)) if (cats().includes(c) && t.some(w => ws.includes(w))) return c; return null; }
function parseLine(line){
  const raw = line.trim(); const n = norm(raw);
  const m = n.match(/\d+(?:[.,]\d+)*/); const amount = m ? toNum(m[0]) : 0;
  const date = /(^|\s)(امبارح|امس)(\s|$)/.test(n) ? yesterday() : today();
  const type = INCOME_WORDS.some(w => n.includes(w)) || /^\+/.test(raw) ? "income" : "expense";
  const title = raw.replace(/^\+/, "").split(/\s+/).filter(w => { const x = norm(w); return x && !STOP.has(x) && !/^\d+([.,]\d+)*$/.test(x); }).join(" ").trim();
  const category = guessCat(raw, type) || (type === "income" ? "أخرى" : "أخرى");
  return { amount, date, type, title: title || category, category, err: amount > 0 ? "" : "مفيش مبلغ" };
}

/* ================= الحالة ================= */
const S = { user: null, items: [], cfg: {}, loaded: false, view: "home", unsubs: [], pending: null,
  add: { mode: "amt", type: "expense", cat: store.get("h-cat") || BASE_CATS[0] },
  st: { from: monthOf(today()) + "-01", to: today(), cat: "", type: "", q: "", group: "day" }, monthsCat: "" };
{ const qs = new URLSearchParams(location.search); const shared = [qs.get("title"), qs.get("text"), qs.get("url")].filter(Boolean).join("\n").trim();
  if (shared) S.pending = shared; if (shared || qs.has("quick")) history.replaceState(null, "", location.pathname); }
const col = () => collection(db, "ledgers", S.user.uid, "items");
const cfgRef = () => doc(db, "ledgers", S.user.uid);
const saveCfg = patch => { S.cfg = { ...S.cfg, ...patch }; return setDoc(cfgRef(), patch, { merge: true }).catch(e => { console.error(e); toast("ما اتحفظش"); }); };
const expenses = () => S.items.filter(i => i.type !== "income");
const incomes = () => S.items.filter(i => i.type === "income");
const inMonth = (list, m) => list.filter(i => i.month === m);

/* ================= الثيم ================= */
function applyTheme(){ const t = store.get("h-theme"); if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
applyTheme();

/* ================= الدخول والبيانات ================= */
onAuthStateChanged(auth, u => {
  S.unsubs.forEach(f => f()); S.unsubs = []; S.user = u; S.items = []; S.cfg = {}; S.loaded = false;
  if (!u) return renderLogin();
  S.unsubs.push(onSnapshot(cfgRef(), s => { S.cfg = s.exists() ? s.data() : {}; S.cfgLoaded = true; autoRecurring(); render(); }, e => console.error(e)));
  S.unsubs.push(onSnapshot(col(), s => {
    S.items = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
    S.loaded = true; render();
  }, e => { console.error(e); S.loaded = true; render(); toast("فيه مشكلة في تحميل البيانات"); }));
  setDoc(cfgRef(), { name: u.displayName || "", lastSeen: new Date().toISOString() }, { merge: true }).catch(() => {});
  render();
});
// المصاريف الثابتة: بتتضاف لوحدها أول ما ميعادها ييجي — رقم المستند ثابت فمستحيل تتكرر
function autoRecurring(){
  if (!S.user || S.recurRan === today()) return; S.recurRan = today();
  const m = monthOf(today()), d = +today().slice(8);
  (S.cfg.recurring || []).forEach(r => { if (!r.on || !(r.amount > 0)) return; const day = Math.min(+r.day || 1, lastDay(m)); if (d < day) return;
    const date = `${m}-${String(day).padStart(2, "0")}`;
    setDoc(doc(col(), `rec-${r.id}-${m}`), { amount: r2(r.amount), title: r.title || r.category, category: r.category || "أخرى", type: r.type || "expense", date, month: m, note: "ثابت شهري", recurring: r.id, createdAt: new Date().toISOString() }).catch(() => {}); });
}
function renderLogin(){
  root.innerHTML = `<div class="center"><div class="hero"><div class="logo big">ح</div>
    <h2>حسابات</h2><p class="muted">سجّل مصاريفك في ثانية، واعرف فلوسك راحت فين كل شهر.</p>
    <button class="google" id="login"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> ادخل بحساب جوجل</button>
    <p class="tiny" style="margin-top:14px">حساباتك محدش يشوفها غيرك.</p></div></div>`;
  root.querySelector("#login").onclick = async () => { const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
    try { await signInWithPopup(auth, p); } catch (e) { if (String(e.code).includes("popup")) signInWithRedirect(auth, p); else { console.error(e); toast("ما قدرناش نسجّل الدخول"); } } };
}

/* ================= الهيكل ================= */
const NAV = [["home","سجّل","＋"],["summary","اللوحة","◔"],["statement","كشف حساب","☰"],["months","الشهور","▥"],["settings","الإعدادات","⚙"]];
function render(){
  if (!S.user) return;
  const ae = document.activeElement;
  if (ae && root.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ae.closest("[data-keep]")) { renderData(); return; }
  const u = S.user;
  root.innerHTML = `<div class="wrap">
   <header class="top"><div class="logo">ح</div><h1>${esc(S.view === "home" ? "حسابات" : NAV.find(n => n[0] === S.view)[1])}</h1>
     <button class="icon-btn" id="theme" aria-label="تبديل الوضع">${isDark() ? "☀️" : "🌙"}</button>
     <img class="avatar" alt="" src="${esc(u.photoURL || "")}" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"></header>
   <main id="view">${S.view === "home" ? homeShell() : ""}<div id="data"></div></main>
  </div>
  <nav class="tabbar">${NAV.map(([v, l, ic]) => `<button data-go="${v}" ${S.view === v ? 'aria-current="page"' : ""}><span class="ic">${ic}</span>${l}</button>`).join("")}</nav>
  ${S.view !== "home" ? `<button class="fab" id="fab" aria-label="سجّل مصروف">+</button>` : ""}`;
  root.querySelector("#theme").onclick = () => { store.set("h-theme", isDark() ? "light" : "dark"); applyTheme(); render(); };
  root.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
  const fab = root.querySelector("#fab"); fab && (fab.onclick = () => openAdd());
  if (S.view === "home") bindAdd(root.querySelector("#add"));
  renderData();
}
function go(v, patch){ S.view = v; if (patch) Object.assign(S.st, patch); render(); scrollTo({ top: 0 }); }
function renderData(){
  const box = root.querySelector("#data"); if (!box) return;
  if (!S.loaded) { box.innerHTML = `<div class="card"><p class="empty">جاري التحميل…</p></div>`; return; }
  ({ home: homeData, summary, statement, months, settings })[S.view](box);
}

/* ================= الإضافة (في الرئيسية أو كنافذة) ================= */
function addForm(){ return `<div class="seg" data-seg><button data-t="expense">مصروف</button><button data-t="income">دخل</button><button data-t="msg">برسالة</button></div>
  <div data-amt><input class="amt-in" data-in="amt" inputmode="decimal" autocomplete="off" placeholder="0">
    <input data-in="ttl" placeholder="على إيه؟ (اختياري)" maxlength="80" style="margin-top:8px">
    <div class="chips" data-cats></div></div>
  <div data-msg hidden><textarea data-in="msg" rows="5" placeholder="كل سطر حاجة، مثلًا:&#10;عيش 20&#10;أوبر ٨٥&#10;صيدلية 140 امبارح&#10;مرتب 15000"></textarea><div class="prev" data-prev></div></div>
  <button class="btn primary" data-save>سجّل</button><p class="tiny center-t" data-hint></p>`; }
function homeShell(){ return `<section class="card" id="add" data-keep>${addForm()}</section>`; }
function openAdd(){ const ov = modal(`<h3>تسجيل سريع</h3><div data-keep>${addForm()}</div>`); bindAdd(ov.querySelector(".modal"), () => closeModal()); }
function bindAdd(box, after){
  const $ = q => box.querySelector(q); const A = S.add; let lines = [];
  const drawCats = () => { const list = catsFor(A.type); if (!list.includes(A.cat)) A.cat = list[0];
    const n = {}; S.items.filter(i => (i.type || "expense") === A.type).forEach(i => n[i.category] = (n[i.category] || 0) + 1);
    $("[data-cats]").innerHTML = [...list].sort((a, b) => (n[b] || 0) - (n[a] || 0)).map(c => `<button class="chip" data-c="${esc(c)}" aria-pressed="${c === A.cat}">${esc(c)}</button>`).join(""); };
  const setMode = m => { if (m === "msg") A.mode = "msg"; else { A.mode = "amt"; A.type = m; }
    box.querySelectorAll("[data-t]").forEach(b => b.setAttribute("aria-pressed", b.dataset.t === (A.mode === "msg" ? "msg" : A.type)));
    $("[data-amt]").hidden = A.mode !== "amt"; $("[data-msg]").hidden = A.mode !== "msg";
    $("[data-hint]").textContent = A.mode === "amt" ? "بيتسجّل بتاريخ النهارده" : "«امبارح» في السطر = تاريخ امبارح · «مرتب» أو + في الأول = دخل";
    $("[data-in=amt]").placeholder = A.type === "income" ? "الدخل" : "0"; $(".btn.primary").classList.toggle("inc", A.mode === "amt" && A.type === "income");
    drawCats(); preview(); (A.mode === "amt" ? $("[data-in=amt]") : $("[data-in=msg]")).focus(); };
  const preview = () => { if (A.mode !== "msg") { $("[data-save]").textContent = A.type === "income" ? "سجّل الدخل" : "سجّل"; return; }
    lines = $("[data-in=msg]").value.split(/\n+/).map(t => t.trim()).filter(Boolean).map(parseLine); const ok = lines.filter(l => !l.err);
    $("[data-prev]").innerHTML = lines.map(l => `<div class="row"><div class="grow"><b>${esc(l.title)}</b><span class="tiny">${l.type === "income" ? "دخل · " : ""}${esc(l.category)}${l.date !== today() ? " · امبارح" : ""}</span></div>${l.err ? `<span class="val bad">${esc(l.err)}</span>` : `<span class="val ${l.type === "income" ? "pos" : ""}">${money(l.amount)}</span>`}</div>`).join("");
    $("[data-save]").textContent = ok.length > 1 ? `سجّل ${ok.length} بنود` : "سجّل"; };
  const save = () => {
    if (A.mode === "amt") { const amount = toNum(norm($("[data-in=amt]").value)); if (!(amount > 0)) { $("[data-in=amt]").focus(); return toast("اكتب المبلغ"); }
      const ids = add([{ amount, title: $("[data-in=ttl]").value.trim() || A.cat, category: A.cat, date: today(), type: A.type }]);
      $("[data-in=amt]").value = ""; $("[data-in=ttl]").value = ""; $("[data-in=amt]").focus();
      toast(`اتسجّل ${money(amount)}`, () => undo(ids)); budgetWarn(A.type, A.cat, amount); return after && after(); }
    const ok = lines.filter(l => !l.err); if (!ok.length) return toast("مفيش سطر فيه مبلغ");
    const ids = add(ok); $("[data-in=msg]").value = ""; preview();
    toast(`اتسجّل ${ok.length} بند` + (lines.length > ok.length ? ` · ${lines.length - ok.length} اتساب` : ""), () => undo(ids)); after && after(); };
  box.querySelectorAll("[data-t]").forEach(b => b.onclick = () => setMode(b.dataset.t));
  $("[data-cats]").onclick = e => { const b = e.target.closest("[data-c]"); if (!b) return; A.cat = b.dataset.c; if (A.type === "expense") store.set("h-cat", A.cat); drawCats(); $("[data-in=amt]").focus(); };
  $("[data-in=msg]").oninput = preview; $("[data-save]").onclick = save;
  [$("[data-in=amt]"), $("[data-in=ttl]")].forEach(i => i.onkeydown = e => { if (e.key === "Enter") save(); });
  $("[data-in=ttl]").oninput = () => { const g = guessCat($("[data-in=ttl]").value, A.type); if (g && g !== A.cat) { A.cat = g; drawCats(); } };
  $("[data-in=msg]").onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(); };
  if (S.pending) { $("[data-in=msg]").value = S.pending; S.pending = null; setMode("msg"); } else setMode(A.mode === "msg" ? "msg" : A.type);
}
function add(list){ const now = new Date().toISOString();
  // من غير انتظار السيرفر: بيتحفظ فورًا ويتزامن لوحده لو مفيش نت
  return list.map(l => { const ref = doc(col()); setDoc(ref, { amount: r2(l.amount), title: l.title, category: l.category, type: l.type || "expense", date: l.date, month: monthOf(l.date), note: l.note || "", createdAt: now })
    .catch(e => { console.error(e); toast("ما اتحفظش — حاول تاني"); }); return ref.id; }); }
function undo(ids){ ids.forEach(id => deleteDoc(doc(col(), id)).catch(() => {})); toast("اتلغى"); }
function budgetWarn(type, cat, amount){ if (type !== "expense") return; const m = monthOf(today()), ex = inMonth(expenses(), m);
  const cb = +(S.cfg.catBudgets || {})[cat], tb = +S.cfg.budget;
  const cs = sum(ex.filter(i => i.category === cat)) + amount, ts = sum(ex) + amount;
  setTimeout(() => { if (cb && cs > cb) toast(`⚠️ عدّيت ميزانية «${cat}» (${money(cs)} من ${money(cb)})`); else if (tb && ts > tb) toast(`⚠️ عدّيت ميزانية الشهر (${money(ts)} من ${money(tb)})`); else if (tb && ts > tb * .8) toast(`قربت من ميزانية الشهر: فاضل ${money(tb - ts)}`); }, 2600); }

/* ================= الرئيسية: بسيطة وسريعة ================= */
const addedAt = i => i.createdAt ? new Date(i.createdAt).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
function homeData(box){
  const m = monthOf(today()), ex = inMonth(expenses(), m);
  box.innerHTML = `<div class="stats"><div class="stat"><span class="tiny">النهارده</span><b>${money(sum(ex.filter(i => i.date === today())))}</b></div>
     <div class="stat"><span class="tiny">${esc(monthName(m))}</span><b>${money(sum(ex))}</b></div></div>
   <section class="card"><div class="row-h"><b>آخر حاجات</b><button class="link" data-more>لوحة التحكم ←</button></div>${rows(S.items.slice(0, 10), true) || `<p class="empty">ابدأ سجّل من فوق 👆</p>`}</section>`;
  box.querySelector("[data-more]").onclick = () => go("summary"); bindRows(box);
}
/* ================= لوحة التحكم ================= */
// ألوان الفئات: ثابتة لكل فئة حسب ترتيبها (مش حسب الترتيب في الرسم) — متختبرة لعمى الألوان
const PAL_L = ["#2a78d6","#eb6834","#1baf7a","#eda100","#e87ba4","#008300","#6250d6"], PAL_D = ["#3987e5","#d95926","#199e70","#c98500","#d55181","#0ca30c","#9085e9"];
const catColor = c => { const i = cats().filter(x => x !== "أخرى").indexOf(c); return i >= 0 && i < 7 ? (isDark() ? PAL_D : PAL_L)[i] : (isDark() ? "#6f7287" : "#a3a6b8"); };
const WD = ["السبت","الحد","الاتنين","التلات","الأربع","الخميس","الجمعة"]; // أسبوع مصر بيبدأ السبت
const wdOf = d => (new Date(d + "T00:00:00").getDay() + 1) % 7;
const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5) + 1;
const addDays = (d, k) => ymd(new Date(d + "T12:00:00").getTime() + k * 864e5);
const DASH = [["this","الشهر ده"],["last","الشهر اللي فات"],["3m","آخر ٣ شهور"],["year","السنة دي"]];
function dashRange(p){ const m = monthOf(today()), d = +today().slice(8);
  if (p === "last") { const l = shiftMonth(m, -1), l2 = shiftMonth(m, -2); return { from: l + "-01", to: `${l}-${lastDay(l)}`, pf: l2 + "-01", pt: `${l2}-${lastDay(l2)}`, full: `${l}-${lastDay(l)}`, month: l }; }
  if (p === "3m") { const f = shiftMonth(m, -2) + "-01", pf = shiftMonth(m, -5) + "-01"; return { from: f, to: today(), pf, pt: addDays(f, -1), full: today() }; }
  if (p === "year") { const y = +today().slice(0, 4); return { from: `${y}-01-01`, to: today(), pf: `${y - 1}-01-01`, pt: `${y - 1}${today().slice(4)}`, full: today() }; }
  const pm = shiftMonth(m, -1); return { from: m + "-01", to: today(), pf: pm + "-01", pt: `${pm}-${String(Math.min(d, lastDay(pm))).padStart(2, "0")}`, full: `${m}-${lastDay(m)}`, month: m, live: true }; }
const between = (list, a, b) => list.filter(i => i.date >= a && i.date <= b);
const kfmt = n => { n = +n || 0; return n >= 1e6 ? r2(n / 1e6).toLocaleString("ar-EG") + "م" : n >= 1e3 ? r2(n / 1e3).toLocaleString("ar-EG", { maximumFractionDigits: 1 }) + "ك" : Math.round(n).toLocaleString("ar-EG"); };
const niceMax = v => { if (v <= 0) return 1; const p = 10 ** Math.floor(Math.log10(v)), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };

/* رسم أعمدة: أقدم حاجة يمين (عربي) — كل عمود عليه تلميح لما تقف عليه */
function barsSvg(data, o = {}){
  const W = 560, H = o.h || 170, L = 8, R = 40, T = 10, B = 22, n = data.length, mx = niceMax(Math.max(...data.map(d => d.v), o.ref || 0));
  const cw = (W - L - R) / n, bw = Math.max(2, Math.min(28, cw - 2)), y = v => T + (H - T - B) * (1 - v / mx), xr = i => W - R - (i + 1) * cw + (cw - bw) / 2;
  const grid = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - R}" y1="${y(mx * f)}" y2="${y(mx * f)}" class="g"/><text x="${W - R + 6}" y="${y(mx * f) + 4}" class="ax">${kfmt(mx * f)}</text>`).join("");
  const step = Math.ceil(n / 8);
  const bars = data.map((d, i) => { const h = Math.max(0, (H - T - B) - (y(d.v) - T)), x = xr(i), r = Math.min(4, bw / 2, h);
    const path = h ? `M${x},${H - B} V${H - B - h + r} Q${x},${H - B - h} ${x + r},${H - B - h} H${x + bw - r} Q${x + bw},${H - B - h} ${x + bw},${H - B - h + r} V${H - B} Z` : "";
    return `<g class="hit" data-tip="${esc(d.tip)}"><rect x="${W - R - (i + 1) * cw}" y="${T}" width="${cw}" height="${H - T - B}" fill="transparent"/>${path ? `<path d="${path}" class="${d.hi ? "b hi" : "b"}"/>` : ""}</g>${i % step === 0 || i === n - 1 ? `<text x="${x + bw / 2}" y="${H - 6}" class="ax mid">${esc(d.label)}</text>` : ""}`; }).join("");
  const ref = o.ref ? `<line x1="${L}" x2="${W - R}" y1="${y(o.ref)}" y2="${y(o.ref)}" class="ref"/><text x="${L}" y="${y(o.ref) - 4}" class="ax ref-t">${esc(o.refLabel || "")}</text>` : "";
  return `<svg viewBox="0 0 ${W} ${H}" class="viz" role="img" aria-label="${esc(o.aria || "")}">${grid}${bars}${ref}</svg>`; }
/* خطوط تراكمي: نفس المحور لكل الخطوط (فلوس) */
function linesSvg(series, n, o = {}){
  const W = 560, H = 180, L = 8, R = 40, T = 12, B = 22, mx = niceMax(Math.max(o.ref || 0, ...series.flatMap(s => s.pts.filter(v => v != null))));
  const x = i => W - R - (n <= 1 ? 0 : i / (n - 1)) * (W - L - R), y = v => T + (H - T - B) * (1 - v / mx);
  const grid = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - R}" y1="${y(mx * f)}" y2="${y(mx * f)}" class="g"/><text x="${W - R + 6}" y="${y(mx * f) + 4}" class="ax">${kfmt(mx * f)}</text>`).join("");
  const lines = series.map(s => { const pts = s.pts.map((v, i) => v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`).filter(Boolean);
    const last = s.pts.map((v, i) => [v, i]).filter(p => p[0] != null).at(-1);
    return `<polyline points="${pts.join(" ")}" class="ln ${s.cls}"/>${last ? `<circle cx="${x(last[1])}" cy="${y(last[0])}" r="4" class="dot ${s.cls}"/>` : ""}`; }).join("");
  const ref = o.ref ? `<line x1="${L}" x2="${W - R}" y1="${y(o.ref)}" y2="${y(o.ref)}" class="ref"/><text x="${L}" y="${y(o.ref) - 4}" class="ax ref-t">${esc(o.refLabel)}</text>` : "";
  const hits = Array.from({ length: n }, (_, i) => `<rect class="hit" x="${x(i) - (W - L - R) / Math.max(1, n - 1) / 2}" y="${T}" width="${(W - L - R) / Math.max(1, n - 1)}" height="${H - T - B}" fill="transparent" data-tip="${esc(o.tip(i))}"/>`).join("");
  const labels = [0, Math.floor((n - 1) / 2), n - 1].map(i => `<text x="${x(i)}" y="${H - 6}" class="ax mid">${i + 1}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" class="viz" role="img" aria-label="${esc(o.aria || "")}">${grid}${ref}${lines}${labels}${hits}</svg>`; }

function summary(box){
  const p = S.dash || "this", R = dashRange(p), ex = expenses(), inc = incomes();
  const cur_ = between(ex, R.from, R.to), prev = between(ex, R.pf, R.pt), ci = between(inc, R.from, R.to);
  const spent = sum(cur_), pspent = sum(prev), income = sum(ci), net = income - spent;
  const days = daysBetween(R.from, R.to), avg = spent / days, delta = pspent ? (spent - pspent) / pspent * 100 : null;
  const tb = +S.cfg.budget || 0, forecast = R.live ? avg * lastDay(R.month) : null;
  const kpi = (label, val, sub, cls = "") => `<div class="kpi"><span class="tiny">${label}</span><b class="${cls}">${val}</b><span class="tiny">${sub || "&nbsp;"}</span></div>`;
  // يوم بيوم (للشهر) أو شهر بشهر (للفترات الطويلة)
  let trend = "";
  if (R.month) { const n = lastDay(R.month), by = {}; cur_.forEach(i => by[+i.date.slice(8)] = (by[+i.date.slice(8)] || 0) + i.amount);
    const lim = R.live ? +today().slice(8) : n;
    trend = barsSvg(Array.from({ length: n }, (_, k) => ({ v: k < lim ? by[k + 1] || 0 : 0, label: String(k + 1), hi: R.live && k + 1 === lim, tip: `${k + 1} ${monthName(R.month, true)}: ${money(by[k + 1] || 0)}` })),
      { ref: avg, refLabel: "متوسط " + kfmt(avg), aria: "الصرف اليومي" });
  } else { const ms = []; for (let m = monthOf(R.from); m <= monthOf(R.to); m = shiftMonth(m, 1)) ms.push(m);
    trend = barsSvg(ms.map(m => ({ v: sum(inMonth(cur_, m)), label: monthName(m, true), hi: m === monthOf(today()), tip: `${monthName(m)}: ${money(sum(inMonth(cur_, m)))}` })), { aria: "الصرف الشهري" }); }
  // تراكمي مقابل الشهر اللي فات والميزانية
  let cum = "";
  if (R.month) { const n = lastDay(R.month), lim = R.live ? +today().slice(8) : n, pmn = monthOf(R.pf), pn = lastDay(pmn);
    const acc = (list, upto) => { let t = 0; const by = {}; list.forEach(i => by[+i.date.slice(8)] = (by[+i.date.slice(8)] || 0) + i.amount); return Array.from({ length: n }, (_, k) => k < upto ? (t += by[k + 1] || 0) : null); };
    const a = acc(cur_, lim), b = acc(between(ex, pmn + "-01", `${pmn}-${pn}`), Math.min(n, pn));
    cum = `<div class="legend"><span><i class="sw cur"></i>${esc(monthName(R.month, true))}</span><span><i class="sw prv"></i>${esc(monthName(pmn, true))}</span>${tb ? `<span><i class="sw rf"></i>الميزانية</span>` : ""}</div>`
      + linesSvg([{ pts: b, cls: "prv" }, { pts: a, cls: "cur" }], n, { ref: tb, refLabel: tb ? "الميزانية " + kfmt(tb) : "", aria: "الصرف التراكمي", tip: i => `يوم ${i + 1}: ${a[i] != null ? money(a[i]) : "—"} · الشهر اللي فات ${b[i] != null ? money(b[i]) : "—"}` }); }
  // توزيع الفئات + التغيير عن الفترة اللي فاتت
  const byCat = groupSum(cur_, i => i.category), pc = Object.fromEntries(groupSum(prev, i => i.category));
  const comp = byCat.length ? `<div class="stack">${byCat.map(([c, v]) => `<i style="flex:${v};background:${catColor(c)}" data-tip="${esc(c)}: ${money(v)} (${Math.round(v / spent * 100)}%)"></i>`).join("")}</div>
    <div class="clist">${byCat.map(([c, v]) => { const pv = pc[c] || 0, ch = pv ? (v - pv) / pv * 100 : null, cb = +(S.cfg.catBudgets || {})[c];
      return `<button class="crow" data-cat="${esc(c)}"><i class="sw" style="background:${catColor(c)}"></i><span class="grow">${esc(c)}${cb ? `<small class="${v > cb ? "neg" : ""}"> · ${Math.round(v / cb * 100)}% من ميزانيتها</small>` : ""}</span><span class="tiny">${Math.round(v / spent * 100)}%</span>${ch !== null ? `<span class="tiny ${ch > 0 ? "neg" : "pos"}">${ch > 0 ? "▲" : "▼"} ${Math.abs(Math.round(ch))}%</span>` : `<span class="tiny">جديد</span>`}<b class="val">${money(v)}</b></button>`; }).join("")}</div>` : `<p class="empty">مفيش مصاريف في الفترة دي</p>`;
  // أيام الأسبوع: متوسط الصرف لكل يوم
  const wdSum = Array(7).fill(0), wdCnt = Array(7).fill(0);
  for (let d = R.from; d <= R.to; d = addDays(d, 1)) wdCnt[wdOf(d)]++;
  cur_.forEach(i => wdSum[wdOf(i.date)] += i.amount);
  const wdAvg = wdSum.map((v, k) => wdCnt[k] ? v / wdCnt[k] : 0), wdMax = wdAvg.indexOf(Math.max(...wdAvg));
  const week = barsSvg(wdAvg.map((v, k) => ({ v, label: WD[k], hi: k === wdMax && v > 0, tip: `${WD[k]}: متوسط ${money(v)}` })), { h: 140, aria: "متوسط الصرف حسب يوم الأسبوع" });
  // ملاحظات ذكية
  const tips = [], big = cur_.slice().sort((a, b) => b.amount - a.amount)[0];
  if (delta !== null && Math.abs(delta) >= 5) tips.push([delta > 0 ? "▲" : "▼", `صرفت ${Math.abs(Math.round(delta))}% ${delta > 0 ? "أكتر" : "أقل"} من ${p === "this" ? "نفس الوقت الشهر اللي فات" : "الفترة اللي قبلها"} (${money(pspent)}).`, delta > 0 ? "neg" : "pos"]);
  if (forecast) tips.push(["◷", `بالمعدل ده هتقفل الشهر على حوالي ${money(forecast)}${tb ? (forecast > tb ? ` — يعني هتعدّي الميزانية بـ ${money(forecast - tb)}` : ` — جوه الميزانية بفرق ${money(tb - forecast)}`) : ""}.`, tb && forecast > tb ? "neg" : ""]);
  const jump = byCat.map(([c, v]) => [c, v, pc[c] || 0]).filter(([, v, pv]) => pv > 0 && v - pv > Math.max(100, pv * .3)).sort((a, b) => (b[1] - b[2]) - (a[1] - a[2]))[0];
  if (jump) tips.push(["!", `«${jump[0]}» زادت ${money(jump[1] - jump[2])} عن الفترة اللي فاتت.`, "neg"]);
  if (byCat[0] && spent) tips.push(["◔", `«${byCat[0][0]}» واخدة ${Math.round(byCat[0][1] / spent * 100)}% من مصاريفك.`, ""]);
  if (big) tips.push(["$", `أكبر مصروف: «${big.title}» ${money(big.amount)} — ${dayName(big.date)}.`, ""]);
  if (wdAvg[wdMax] > 0) tips.push(["◷", `${WD[wdMax]} هو أكتر يوم بتصرف فيه (متوسط ${money(wdAvg[wdMax])}).`, ""]);
  const zero = (() => { let z = 0; const set = new Set(cur_.map(i => i.date)); for (let d = R.from; d <= R.to; d = addDays(d, 1)) if (!set.has(d)) z++; return z; })();
  if (zero && cur_.length) tips.push(["✓", `${zero} يوم من غير ولا مصروف.`, "pos"]);
  if (income) tips.push([net >= 0 ? "✓" : "!", net >= 0 ? `وفّرت ${Math.round(net / income * 100)}% من دخلك (${money(net)}).` : `صرفت ${money(-net)} أكتر من دخلك.`, net >= 0 ? "pos" : "neg"]);

  box.innerHTML = `
   <div class="seg" data-dash>${DASH.map(([k, l]) => `<button data-p="${k}" aria-pressed="${k === p}">${l}</button>`).join("")}</div>
   <div class="kpis">
     ${kpi("المصروف", money(spent), delta !== null ? `<span class="${delta > 0 ? "neg" : "pos"}">${delta > 0 ? "▲" : "▼"} ${Math.abs(Math.round(delta))}%</span> عن اللي قبلها` : "", "")}
     ${kpi(forecast ? "المتوقع لآخر الشهر" : "متوسط اليوم", money(forecast || avg), forecast ? `متوسط اليوم ${money(avg)}` : `${days} يوم`, forecast && tb && forecast > tb ? "neg" : "")}
     ${kpi("الدخل", money(income), income ? `الصافي <span class="${net >= 0 ? "pos" : "neg"}">${money(net)}</span>` : "سجّل دخلك من «سجّل ← دخل»")}
     ${kpi(tb && R.month ? "الميزانية" : "نسبة الادخار", tb && R.month ? `${Math.round(spent / tb * 100)}%` : income ? `${Math.round(net / income * 100)}%` : "—", tb && R.month ? (spent > tb ? `عدّيت بـ ${money(spent - tb)}` : `فاضل ${money(tb - spent)}`) : "من الدخل", tb && R.month && spent > tb ? "neg" : "")}
   </div>
   ${tips.length ? `<section class="card insights"><h3>ملاحظات</h3>${tips.slice(0, 6).map(([ic, t, c]) => `<p><span class="ii ${c}">${ic}</span>${esc(t)}</p>`).join("")}</section>` : ""}
   <section class="card"><div class="row-h"><h3>${R.month ? "الصرف يوم بيوم" : "الصرف شهر بشهر"}</h3><span class="tiny">${esc(fmtDate(R.from))} ← ${esc(fmtDate(R.to))}</span></div>${trend}</section>
   ${cum ? `<section class="card"><h3>الصرف التراكمي</h3>${cum}</section>` : ""}
   <section class="card"><div class="row-h"><h3>صرفت فين</h3><button class="link" data-st>كشف الحساب ←</button></div>${comp}</section>
   <section class="card"><h3>أيام الأسبوع</h3><p class="tiny">متوسط اللي بتصرفه في كل يوم</p>${week}</section>
   ${cur_.length ? `<section class="card"><h3>أكبر ٥ مصاريف</h3>${rows(cur_.slice().sort((a, b) => b.amount - a.amount).slice(0, 5), true)}</section>` : ""}`;
  box.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { S.dash = b.dataset.p; renderData(); });
  box.querySelector("[data-st]").onclick = () => go("statement", { from: R.from, to: R.to, cat: "", type: "expense", q: "", group: "cat" });
  box.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => go("statement", { from: R.from, to: R.to, cat: b.dataset.cat, type: "expense", q: "", group: "day" }));
  bindRows(box);
}
/* تلميح الرسوم: يظهر جنب الماوس أو الصباع */
{ const tip = document.createElement("div"); tip.className = "viz-tip"; tip.hidden = true; document.body.appendChild(tip);
  const show = e => { const t = e.target.closest?.("[data-tip]"); if (!t || !root.contains(t)) { tip.hidden = true; return; } tip.textContent = t.dataset.tip; tip.hidden = false;
    const x = Math.min(innerWidth - tip.offsetWidth - 8, Math.max(8, e.clientX - tip.offsetWidth / 2)); tip.style.left = x + "px"; tip.style.top = Math.max(8, e.clientY - tip.offsetHeight - 14) + "px"; };
  document.addEventListener("pointermove", show); document.addEventListener("pointerdown", show); document.addEventListener("scroll", () => tip.hidden = true, true); }
const groupSum = (list, key) => { const o = {}; list.forEach(i => { const k = key(i); o[k] = (o[k] || 0) + (+i.amount || 0); }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
function rows(list, withDate){ return list.map(i => `<button class="row item" data-edit="${esc(i.id)}"><div class="grow"><b>${esc(i.title)}</b><span class="tiny">${esc(i.category)}${withDate ? " · " + esc(dayName(i.date)) : ""}${i.note ? " · " + esc(i.note) : ""}${i.createdAt ? ` · <span class="added">اتضاف ${esc(addedAt(i))}</span>` : ""}</span></div><span class="val ${i.type === "income" ? "pos" : ""}">${i.type === "income" ? "+" : ""}${money(i.amount)}</span></button>`).join(""); }
function bindRows(box){ box.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editItem(b.dataset.edit)); }

/* ================= كشف الحساب ================= */
const PRESETS = [["this","الشهر ده"],["last","الشهر اللي فات"],["3m","آخر ٣ شهور"],["year","السنة دي"],["all","الكل"]];
function presetRange(p){ const m = monthOf(today()); return p === "this" ? [m + "-01", today()] : p === "last" ? [shiftMonth(m, -1) + "-01", shiftMonth(m, -1) + "-" + lastDay(shiftMonth(m, -1))]
  : p === "3m" ? [shiftMonth(m, -2) + "-01", today()] : p === "year" ? [today().slice(0, 4) + "-01-01", today()] : ["2000-01-01", "2100-12-31"]; }
function filtered(){ const f = S.st, q = norm(f.q);
  return S.items.filter(i => i.date >= f.from && i.date <= f.to && (!f.cat || i.category === f.cat) && (!f.type || (i.type || "expense") === f.type) && (!q || norm(i.title + " " + (i.note || "") + " " + i.category).includes(q))); }
function statement(box){
  const f = S.st, list = filtered(), ex = list.filter(i => i.type !== "income"), inc = list.filter(i => i.type === "income");
  const allCats = [...new Set([...cats(), ...INCOME_CATS, ...S.items.map(i => i.category)])];
  const active = PRESETS.find(([k]) => { const [a, b] = presetRange(k); return a === f.from && b === f.to; })?.[0];
  let body = "";
  if (f.group === "cat") { const g = groupSum(ex, i => i.category), t = sum(ex);
    body = g.length ? g.map(([c, v]) => `<details class="grp"><summary><span class="grow"><b>${esc(c)}</b><span class="tiny">${ex.filter(i => i.category === c).length} بند · ${t ? Math.round(v / t * 100) : 0}%</span></span><span class="val">${money(v)}</span></summary>${rows(ex.filter(i => i.category === c), true)}</details>`).join("")
      + (inc.length ? `<div class="day"><span>الدخل</span><span class="pos">${money(sum(inc))}</span></div>` + groupSum(inc, i => i.category).map(([c, v]) => `<div class="row"><div class="grow"><b>${esc(c)}</b></div><span class="val pos">+${money(v)}</span></div>`).join("") : "") : "";
  } else if (f.group === "month") { const ms = [...new Set(list.map(i => i.month))].sort().reverse();
    body = ms.map(m => { const e = sum(ex.filter(i => i.month === m)), n = sum(inc.filter(i => i.month === m));
      return `<details class="grp"><summary><span class="grow"><b>${esc(monthName(m))}</b><span class="tiny">${n ? `دخل ${money(n)} · صافي ${money(n - e)}` : `${list.filter(i => i.month === m).length} بند`}</span></span><span class="val neg">${money(e)}</span></summary>${rows(list.filter(i => i.month === m), true)}</details>`; }).join("");
  } else { const days = [...new Set(list.map(i => i.date))].sort().reverse();
    body = days.map(d => { const di = list.filter(i => i.date === d); return `<div class="day"><span>${esc(dayName(d))}</span><span>${money(sum(di.filter(i => i.type !== "income")))}</span></div>${rows(di)}`; }).join(""); }
  box.innerHTML = `
   <section class="card filters no-print" data-keep>
     <div class="chips tight">${PRESETS.map(([k, l]) => `<button class="chip" data-p="${k}" aria-pressed="${active === k}">${l}</button>`).join("")}</div>
     <div class="grid2"><label>من<input type="date" data-f="from" value="${esc(f.from)}"></label><label>إلى<input type="date" data-f="to" value="${esc(f.to)}"></label></div>
     <div class="grid2"><select data-f="cat"><option value="">كل الفئات</option>${allCats.map(c => `<option ${c === f.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
       <select data-f="type"><option value="">مصروف ودخل</option><option value="expense" ${f.type === "expense" ? "selected" : ""}>مصروف بس</option><option value="income" ${f.type === "income" ? "selected" : ""}>دخل بس</option></select></div>
     <input type="search" data-f="q" placeholder="دوّر في البنود…" value="${esc(f.q)}">
   </section>
   <div class="print-head"><b>كشف حساب — ${esc(S.user.displayName || "")}</b><span>${esc(fmtDate(f.from < "2001" ? (S.items.at(-1)?.date || today()) : f.from))} ← ${esc(fmtDate(f.to > "2099" ? today() : f.to))}</span></div>
   <div class="stats three"><div class="stat"><span class="tiny">المصروف</span><b class="neg">${money(sum(ex))}</b></div><div class="stat"><span class="tiny">الدخل</span><b class="pos">${money(sum(inc))}</b></div><div class="stat"><span class="tiny">الصافي</span><b class="${sum(inc) - sum(ex) >= 0 ? "pos" : "neg"}">${money(sum(inc) - sum(ex))}</b></div></div>
   <div class="seg no-print" data-g><button data-gv="day">باليوم</button><button data-gv="cat">بالفئة</button><button data-gv="month">بالشهر</button></div>
   <section class="card">${body || `<p class="empty">مفيش حاجة بالفلتر ده</p>`}</section>
   ${list.length ? `<div class="links no-print"><button id="csv">تنزيل Excel (CSV)</button><button id="print">طباعة / PDF</button></div>` : ""}`;
  box.querySelectorAll("[data-gv]").forEach(b => { b.setAttribute("aria-pressed", b.dataset.gv === f.group); b.onclick = () => { f.group = b.dataset.gv; renderData(); }; });
  box.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { [f.from, f.to] = presetRange(b.dataset.p); renderData(); });
  box.querySelectorAll("[data-f]").forEach(el => { const k = el.dataset.f; el[k === "q" ? "oninput" : "onchange"] = () => { f[k] = el.value; if (k === "q") { clearTimeout(S.qt); S.qt = setTimeout(() => { renderData(); const s = root.querySelector("[data-f=q]"); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }, 250); } else renderData(); }; });
  const c = box.querySelector("#csv"); c && (c.onclick = () => exportCsv(list)); const p = box.querySelector("#print"); p && (p.onclick = () => print());
  bindRows(box);
}
function exportCsv(list){
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const out = [["التاريخ", "النوع", "البند", "الفئة", "المبلغ", "ملاحظة", "وقت الإضافة"], ...list.slice().reverse().map(i => [i.date, i.type === "income" ? "دخل" : "مصروف", i.title, i.category, i.type === "income" ? i.amount : -i.amount, i.note || "", i.createdAt ? addedAt(i) : ""])];
  const blob = new Blob(["﻿" + out.map(r => r.map(q).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `كشف-حساب-${S.st.from}-${S.st.to}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ================= الشهور ================= */
function months(box){
  const now = monthOf(today()), first = S.items.length ? S.items.at(-1).month : now;
  const list = []; for (let m = now, k = 0; m >= first && k < 24; m = shiftMonth(m, -1), k++) list.push(m);
  const c = S.monthsCat, ex = expenses().filter(i => !c || i.category === c);
  const data = list.map(m => ({ m, e: sum(inMonth(ex, m)), n: c ? 0 : sum(inMonth(incomes(), m)) }));
  const mx = Math.max(1, ...data.map(d => d.e)), done = data.filter(d => d.m !== now && d.e), avg = done.length ? sum(done.map(d => ({ amount: d.e }))) / done.length : 0;
  const top = groupSum(inMonth(expenses(), now), i => i.category)[0];
  box.innerHTML = `
   <section class="card" data-keep><select id="mc"><option value="">كل المصاريف</option>${cats().map(x => `<option ${x === c ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></section>
   <div class="stats"><div class="stat"><span class="tiny">متوسط الشهر${c ? " · " + esc(c) : ""}</span><b>${money(avg)}</b><span class="tiny">من ${done.length} شهر خلصوا</span></div>
     <div class="stat"><span class="tiny">الشهر ده</span><b class="${avg && data[0].e > avg ? "neg" : ""}">${money(data[0].e)}</b><span class="tiny">${!c && top ? `أكتر حاجة: ${esc(top[0])}` : avg ? (data[0].e > avg ? "فوق المتوسط" : "تحت المتوسط") : ""}</span></div></div>
   <section class="card chart"><div class="cols">${data.slice(0, 12).reverse().map(d => `<button class="col" data-m="${d.m}" title="${esc(monthName(d.m))}: ${money(d.e)}"><i style="height:${Math.max(2, d.e / mx * 100)}%" class="${d.m === now ? "now" : ""}"></i><small>${esc(monthName(d.m, true))}</small></button>`).join("")}</div></section>
   <section class="card">${data.map((d, i) => { const p = data[i + 1]; const ch = p && p.e ? (d.e - p.e) / p.e * 100 : null;
     return `<button class="row item" data-m="${d.m}"><div class="grow"><b>${esc(monthName(d.m))}</b><span class="tiny">${d.n ? `دخل ${money(d.n)} · صافي ${money(d.n - d.e)}` : ""}${ch !== null && d.e ? `${d.n ? " · " : ""}<span class="${ch > 0 ? "neg" : "pos"}">${pct(ch)}</span> عن اللي قبله` : ""}</span></div><span class="val">${money(d.e)}</span></button>`; }).join("")}</section>`;
  box.querySelector("#mc").onchange = e => { S.monthsCat = e.target.value; renderData(); };
  box.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { const m = b.dataset.m; go("statement", { from: m + "-01", to: m + "-" + lastDay(m), cat: c, type: c ? "expense" : "", q: "", group: "cat" }); });
}

/* ================= الإعدادات ================= */
function settings(box){
  const cfg = S.cfg, cb = cfg.catBudgets || {}, rec = cfg.recurring || [];
  box.innerHTML = `
   <section class="card" data-keep><h3>الميزانية الشهرية</h3><p class="tiny">بيظهرلك قد إيه فاضل، وبينبهك لو قربت أو عدّيت.</p>
     <label class="lbl">ميزانية الشهر كله<input inputmode="decimal" id="tb" value="${cfg.budget || ""}" placeholder="مثلًا 8000"></label>
     <details><summary class="tiny">ميزانية لكل فئة (اختياري)</summary>${cats().map(c => `<label class="lbl inline">${esc(c)}<input inputmode="decimal" data-cb="${esc(c)}" value="${cb[c] || ""}" placeholder="—"></label>`).join("")}</details>
     <button class="btn primary" id="saveB">احفظ الميزانية</button></section>
   <section class="card" data-keep><h3>مصاريف ثابتة كل شهر</h3><p class="tiny">زي الإيجار والنت والاشتراكات — بتتسجّل لوحدها في اليوم اللي تحدده.</p>
     ${rec.map(r => `<div class="row"><div class="grow"><b>${esc(r.title)}</b><span class="tiny">${r.type === "income" ? "دخل · " : ""}${esc(r.category)} · يوم ${+r.day} في الشهر${r.on ? "" : " · متوقف"}</span></div><span class="val">${money(r.amount)}</span>
       <button class="del" data-rt="${esc(r.id)}" title="${r.on ? "إيقاف" : "تشغيل"}">${r.on ? "⏸" : "▶"}</button><button class="del" data-rd="${esc(r.id)}" aria-label="حذف">✕</button></div>`).join("")}
     <div class="grid2" style="margin-top:8px"><input id="rTitle" placeholder="الاسم (إيجار، نت…)"><input id="rAmt" inputmode="decimal" placeholder="المبلغ"></div>
     <div class="grid2"><select id="rCat">${cats().map(c => `<option>${esc(c)}</option>`).join("")}<optgroup label="دخل">${INCOME_CATS.map(c => `<option value="in:${esc(c)}">${esc(c)} (دخل)</option>`).join("")}</optgroup></select><input id="rDay" type="number" min="1" max="31" placeholder="يوم كام في الشهر" value="1"></div>
     <button class="btn" id="addR" style="width:100%;margin-top:8px">+ ضيف</button></section>
   <section class="card" data-keep><h3>الفئات</h3><div class="chips">${cats().map(c => `<span class="chip">${esc(c)} <button class="x" data-dc="${esc(c)}" aria-label="شيل">✕</button></span>`).join("")}</div>
     <div class="grid2" style="margin-top:8px"><input id="nc" placeholder="فئة جديدة" maxlength="30"><button class="btn" id="addC">ضيف</button></div>
     <p class="tiny">شيل الفئة مش بيمسح بنودها القديمة.</p></section>
   <section class="card" data-keep><h3>عام</h3><label class="lbl inline">العملة<input id="curr" value="${esc(cur())}" maxlength="6"></label>
     <div class="links" style="justify-content:flex-start"><button id="bk">نسخة احتياطية (JSON)</button><button id="out">تسجيل خروج</button></div>
     <p class="tiny">${S.items.length} بند متسجّل · ${esc(S.user.email || "")}</p></section>`;
  const $ = q => box.querySelector(q);
  $("#saveB").onclick = () => { const o = {}; box.querySelectorAll("[data-cb]").forEach(i => { const v = toNum(norm(i.value)); if (v > 0) o[i.dataset.cb] = v; });
    saveCfg({ budget: toNum(norm($("#tb").value)) || 0, catBudgets: o }); toast("اتحفظت الميزانية"); };
  $("#addR").onclick = () => { const amount = toNum(norm($("#rAmt").value)), v = $("#rCat").value, inc = v.startsWith("in:");
    if (!(amount > 0)) return toast("اكتب المبلغ"); const r = { id: uid(), title: $("#rTitle").value.trim() || v.replace("in:", ""), amount, category: v.replace("in:", ""), type: inc ? "income" : "expense", day: Math.min(31, Math.max(1, +$("#rDay").value || 1)), on: true };
    saveCfg({ recurring: [...rec, r] }).then(() => { S.recurRan = null; autoRecurring(); }); toast("اتضاف — هيتسجّل لوحده كل شهر"); render(); };
  box.querySelectorAll("[data-rt]").forEach(b => b.onclick = () => { saveCfg({ recurring: rec.map(r => r.id === b.dataset.rt ? { ...r, on: !r.on } : r) }); render(); });
  box.querySelectorAll("[data-rd]").forEach(b => b.onclick = () => { saveCfg({ recurring: rec.filter(r => r.id !== b.dataset.rd) }); toast("اتشال (اللي اتسجّل قبل كده فاضل)"); render(); });
  $("#addC").onclick = () => { const n = $("#nc").value.trim(); if (!n) return; if (cats().includes(n)) return toast("موجودة"); saveCfg({ cats: [...cats().filter(c => c !== "أخرى"), n, "أخرى"] }); render(); };
  box.querySelectorAll("[data-dc]").forEach(b => b.onclick = () => { if (b.dataset.dc === "أخرى") return toast("«أخرى» لازم تفضل"); saveCfg({ cats: cats().filter(c => c !== b.dataset.dc) }); render(); });
  $("#curr").onchange = e => { saveCfg({ currency: e.target.value.trim() || "ج" }); render(); };
  $("#bk").onclick = () => { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), settings: S.cfg, items: S.items }, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `حسابات-نسخة-${today()}.json`; a.click(); };
  $("#out").onclick = e => { if (e.target.dataset.sure) return signOut(auth); e.target.dataset.sure = 1; e.target.textContent = "متأكد؟ دوس تاني"; };
}

/* ================= تعديل بند ================= */
function editItem(id){
  const i = S.items.find(x => x.id === id); if (!i) return; const t = i.type || "expense";
  const ov = modal(`<h3>تعديل</h3>
    <div class="seg"><button data-et="expense" aria-pressed="${t === "expense"}">مصروف</button><button data-et="income" aria-pressed="${t === "income"}">دخل</button></div>
    <input class="amt-in" id="eA" inputmode="decimal" value="${i.amount}">
    <label class="lbl">البند<input id="eT" value="${esc(i.title)}" maxlength="80"></label>
    <div class="grid2"><label class="lbl">الفئة<select id="eC"></select></label><label class="lbl">التاريخ<input id="eD" type="date" value="${esc(i.date)}"></label></div>
    <label class="lbl">ملاحظة<input id="eN" value="${esc(i.note || "")}" maxlength="140"></label>
    <p class="tiny">${i.createdAt ? "اتضاف " + esc(addedAt(i)) : ""}${i.updatedAt ? " · آخر تعديل " + esc(addedAt({ createdAt: i.updatedAt })) : ""}</p>
    <div class="mfoot"><button class="btn primary" id="eS">احفظ</button><button class="btn danger" id="eX">امسح</button></div>`);
  const $ = q => ov.querySelector(q); let type = t;
  const fill = () => { const list = [...new Set([...catsFor(type), i.category])]; $("#eC").innerHTML = list.map(c => `<option ${c === i.category ? "selected" : ""}>${esc(c)}</option>`).join(""); };
  ov.querySelectorAll("[data-et]").forEach(b => b.onclick = () => { type = b.dataset.et; ov.querySelectorAll("[data-et]").forEach(x => x.setAttribute("aria-pressed", x === b)); fill(); }); fill();
  $("#eS").onclick = () => { const amount = toNum(norm($("#eA").value)), date = $("#eD").value; if (!(amount > 0)) return toast("المبلغ لازم يكون أكبر من صفر"); if (!date) return toast("اختار التاريخ");
    setDoc(doc(col(), id), { ...stripId(i), amount, title: $("#eT").value.trim() || $("#eC").value, category: $("#eC").value, type, date, month: monthOf(date), note: $("#eN").value.trim(), updatedAt: new Date().toISOString() }).catch(() => toast("ما اتحفظش"));
    closeModal(); toast("اتحفظ"); };
  $("#eX").onclick = () => { deleteDoc(doc(col(), id)).catch(() => toast("ما اتمسحش")); closeModal(); toast(`اتمسح «${i.title}»`, () => { setDoc(doc(col(), id), stripId(i)); toast("رجع"); }); };
}
const stripId = ({ id, ...d }) => d;

/* ================= نافذة + تنبيه ================= */
function modal(html){ closeModal(); const ov = document.createElement("div"); ov.className = "overlay"; ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><button class="icon-btn close" data-close aria-label="إغلاق">✕</button>${html}</div>`;
  ov.onclick = e => { if (e.target === ov || e.target.closest("[data-close]")) closeModal(); }; document.body.appendChild(ov);
  const f = ov.querySelector("input:not([type=date]),textarea"); f && setTimeout(() => f.focus(), 30); return ov; }
function closeModal(){ document.querySelectorAll(".overlay").forEach(o => o.remove()); }
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
let tt = 0;
function toast(msg, onUndo){
  document.querySelectorAll(".toast").forEach(t => t.remove()); clearTimeout(tt);
  const t = document.createElement("div"); t.className = "toast"; t.innerHTML = `<span>${esc(msg)}</span>${onUndo ? `<button>تراجع</button>` : ""}`;
  if (onUndo) t.querySelector("button").onclick = () => { t.remove(); onUndo(); };
  document.body.appendChild(t); tt = setTimeout(() => t.remove(), onUndo ? 5000 : 3000);
}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
