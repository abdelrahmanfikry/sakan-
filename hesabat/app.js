import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, onSnapshot, addDoc, deleteDoc, setDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const root = document.getElementById("root");

/* ---------- أدوات ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const r2 = n => Math.round((+n || 0) * 100) / 100;
const AR = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":".","،":",","٬":"," };
const norm = s => String(s || "").replace(/[٠-٩٫،٬]/g, c => AR[c]).replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[ًٌٍَُِّْـ]/g, "").toLowerCase().trim();
const ymd = d => { d = new Date(d); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
// «1,500» = ألف وخمسمية · «1,5» = واحد ونص
const toNum = t => r2(String(t).replace(/(\d)[,](\d{3})(?!\d)/g, "$1$2").replace(",", "."));
const today = () => ymd(new Date());
const yesterday = () => ymd(Date.now() - 864e5);
const monthOf = d => d.slice(0, 7);
const monthName = m => { const [y, mm] = m.split("-"); return new Date(+y, +mm - 1, 1).toLocaleDateString("ar-EG", { month: "long", year: "numeric" }); };
const shiftMonth = (m, k) => { const [y, mm] = m.split("-").map(Number); const d = new Date(y, mm - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const money = n => r2(n).toLocaleString("ar-EG", { maximumFractionDigits: 2 }) + " ج";
const dayName = d => d === today() ? "النهارده" : d === yesterday() ? "امبارح" : new Date(d + "T00:00:00").toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "short" });
const store = { get(k){ try{ return localStorage.getItem(k); }catch(_){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(_){} } };

/* ---------- الفئات والتعرّف عليها من الكلام ---------- */
const CATS = ["أكل وبقالة","مواصلات","فواتير","إيجار","صحة","لبس","خروج وترفيه","تعليم","هدايا","أخرى"];
const WORDS = {
  "أكل وبقالة": ["اكل","بقاله","عشا","عشاء","غدا","غداء","فطار","خضار","فاكهه","لحمه","فراخ","عيش","سوبر","طلبات","سمك","رز","لبن","جبنه","بيض","شاي","قهوه","سكر","مكرونه"],
  "مواصلات": ["تاكسي","مواصلات","اوبر","بنزين","كريم","مترو","توكتوك","ميكروباص","اتوبيس","سواق","ركنه"],
  "فواتير": ["كهربا","كهرباء","ميه","مياه","غاز","نت","انترنت","باقه","رصيد","كارت","فاتوره","تليفون"],
  "إيجار": ["ايجار","شقه"], "صحة": ["دكتور","دوا","دواء","صيدليه","تحاليل","كشف","مستشفي"],
  "لبس": ["لبس","هدوم","جزمه","كوتشي","قميص","بنطلون","تيشيرت"],
  "خروج وترفيه": ["خروجه","سينما","كافيه","قهوه برا","مطعم","نادي","جيم","رحله"],
  "تعليم": ["كورس","كتاب","كتب","دروس","مذكره","جامعه","مدرسه"], "هدايا": ["هديه","هدايا","عيديه"] };
const STOP = new Set(["انا","دفعت","دفع","جنيه","جنيها","ج","ب","في","حق","تمن","ثمن","مصروف","امبارح","امس","النهارده","اليوم"]);
function guessCat(text){ const t = norm(text).split(/\s+/).map(w => w.replace(/^و?ال/, "")); for (const [c, ws] of Object.entries(WORDS)) if (t.some(w => ws.includes(w))) return c; return null; }
function parseLine(line){
  const raw = line.trim(); const n = norm(raw);
  const m = n.match(/\d+(?:[.,]\d+)*/); const amount = m ? toNum(m[0]) : 0;
  const date = /(^|\s)(امبارح|امس)(\s|$)/.test(n) ? yesterday() : today();
  const title = raw.split(/\s+/).filter(w => { const x = norm(w); return !STOP.has(x) && !/^\d+([.,]\d+)*$/.test(x); }).join(" ").trim();
  const category = guessCat(raw) || "أخرى";
  return { amount, date, title: title || category, category, err: amount > 0 ? "" : "مفيش مبلغ" };
}

/* ---------- الحالة ---------- */
const S = { user: null, month: monthOf(today()), items: [], unsub: null, mode: "amt", cat: store.get("h-cat") || CATS[0], loaded: false, pending: null };
{ // فتح من اختصار الأيقونة أو من «مشاركة» رسالة
  const qs = new URLSearchParams(location.search); const shared = [qs.get("title"), qs.get("text"), qs.get("url")].filter(Boolean).join("\n").trim();
  if (shared) S.pending = shared; if (shared || qs.has("quick")) history.replaceState(null, "", location.pathname);
}
const col = () => collection(db, "ledgers", S.user.uid, "items");

/* ---------- الثيم ---------- */
function applyTheme(){ const t = store.get("h-theme"); if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; };
applyTheme();

/* ---------- تسجيل الدخول ---------- */
onAuthStateChanged(auth, u => {
  S.user = u; S.unsub && S.unsub(); S.items = []; S.loaded = false;
  if (!u) return renderLogin();
  ensureLedger(); watch(); render();
});
function renderLogin(){
  root.innerHTML = `<div class="center"><div class="hero"><div class="logo" style="margin:0 auto;width:64px;height:64px;font-size:1.8rem;border-radius:20px">ح</div>
    <h2>حسابات</h2><p class="muted">سجّل مصاريفك في ثانية — المبلغ والفئة وخلاص، أو الصق رسالة.</p>
    <button class="google" id="login"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> ادخل بحساب جوجل</button>
    <p class="tiny" style="margin-top:14px">مصاريفك محدش يشوفها غيرك.</p></div></div>`;
  root.querySelector("#login").onclick = async () => { const p = new GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
    try { await signInWithPopup(auth, p); } catch (e) { if (String(e.code).includes("popup")) signInWithRedirect(auth, p); else { console.error(e); toast("ما قدرناش نسجّل الدخول"); } } };
}
function ensureLedger(){ setDoc(doc(db, "ledgers", S.user.uid), { name: S.user.displayName || "", lastSeen: new Date().toISOString() }, { merge: true }).catch(() => {}); }
function watch(){
  S.unsub && S.unsub(); S.loaded = false;
  S.unsub = onSnapshot(query(col(), where("month", "==", S.month)), s => {
    S.items = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
    S.loaded = true; renderData();
  }, e => { console.error(e); S.loaded = true; renderData(); toast("فيه مشكلة في تحميل البيانات"); });
}

/* ---------- الواجهة ---------- */
function render(){
  const u = S.user;
  root.innerHTML = `<div class="wrap">
   <header class="top"><div class="logo">ح</div><h1>حسابات</h1>
     <button class="icon-btn" id="theme" aria-label="تبديل الوضع">${isDark() ? "☀️" : "🌙"}</button>
     <button class="icon-btn" id="out" aria-label="خروج" title="خروج"><img class="avatar" alt="" src="${esc(u.photoURL || "")}" referrerpolicy="no-referrer" onerror="this.replaceWith('⎋')"></button></header>
   <section class="card" id="add">
     <div class="seg"><button data-m="amt">بالمبلغ</button><button data-m="msg">برسالة</button></div>
     <div id="amtBox"><input class="amt-in" id="amt" inputmode="decimal" autocomplete="off" placeholder="0">
       <input id="ttl" placeholder="على إيه؟ (اختياري)" maxlength="80" style="margin-top:8px">
       <div class="chips" id="cats"></div></div>
     <div id="msgBox" hidden><textarea id="msg" rows="5" placeholder="كل سطر مصروف، مثلًا:&#10;عيش 20&#10;أوبر ٨٥&#10;صيدلية 140 امبارح"></textarea><div class="prev" id="prev"></div></div>
     <button class="btn primary" id="save">سجّل</button>
     <p class="tiny" style="text-align:center;margin-top:8px" id="hint">بيتسجّل بتاريخ النهارده</p>
   </section>
   <div id="data"></div>
  </div>`;
  const $ = q => root.querySelector(q);
  $("#theme").onclick = () => { store.set("h-theme", isDark() ? "light" : "dark"); applyTheme(); render(); };
  $("#out").onclick = () => { if (confirmLogout()) signOut(auth); };
  root.querySelectorAll("[data-m]").forEach(b => b.onclick = () => setMode(b.dataset.m));
  $("#cats").onclick = e => { const b = e.target.closest("[data-c]"); if (!b) return; S.cat = b.dataset.c; store.set("h-cat", S.cat); drawCats(); $("#amt").focus(); };
  $("#msg").oninput = preview; $("#save").onclick = save;
  [$("#amt"), $("#ttl")].forEach(i => i.onkeydown = e => { if (e.key === "Enter") save(); });
  $("#ttl").oninput = () => { const g = guessCat($("#ttl").value); if (g && g !== S.cat) { S.cat = g; drawCats(); } };
  $("#msg").onkeydown = e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save(); };
  drawCats();
  if (S.pending) { $("#msg").value = S.pending; S.pending = null; setMode("msg"); } else setMode(S.mode);
  renderData();
}
function confirmLogout(){ const b = root.querySelector("#out"); if (b.dataset.sure) return true; b.dataset.sure = 1; toast("دوس تاني علشان تخرج"); setTimeout(() => delete b.dataset.sure, 3000); return false; }
function setMode(m){ S.mode = m; const $ = q => root.querySelector(q);
  root.querySelectorAll("[data-m]").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === m));
  $("#amtBox").hidden = m !== "amt"; $("#msgBox").hidden = m !== "msg";
  $("#hint").textContent = m === "amt" ? "بيتسجّل بتاريخ النهارده" : "اكتب «امبارح» في السطر لو المصروف من امبارح";
  (m === "amt" ? $("#amt") : $("#msg")).focus(); preview(); }
function drawCats(){ root.querySelector("#cats").innerHTML = usedCats().map(c => `<button class="chip" data-c="${esc(c)}" aria-pressed="${c === S.cat}">${esc(c)}</button>`).join(""); }
function usedCats(){ const n = {}; S.items.forEach(i => n[i.category] = (n[i.category] || 0) + 1); return [...CATS].sort((a, b) => (n[b] || 0) - (n[a] || 0)); }
let lines = [];
function preview(){
  if (S.mode !== "msg") { root.querySelector("#save").textContent = "سجّل"; return; }
  lines = root.querySelector("#msg").value.split(/\n+/).map(t => t.trim()).filter(Boolean).map(parseLine);
  const ok = lines.filter(l => !l.err);
  root.querySelector("#prev").innerHTML = lines.map(l => `<div class="row"><div class="grow"><b>${esc(l.title)}</b><span class="tiny">${esc(l.category)}${l.date !== today() ? " · امبارح" : ""}</span></div>${l.err ? `<span class="val bad">${esc(l.err)}</span>` : `<span class="val">${money(l.amount)}</span>`}</div>`).join("");
  root.querySelector("#save").textContent = ok.length > 1 ? `سجّل ${ok.length} مصاريف · ${money(ok.reduce((a, l) => a + l.amount, 0))}` : "سجّل";
}
function add(list){
  const now = new Date().toISOString();
  // من غير انتظار السيرفر: بيتحفظ فورًا ويتزامن لوحده لو مفيش نت
  return list.map(l => { const ref = doc(col()); setDoc(ref, { amount: r2(l.amount), title: l.title, category: l.category, date: l.date, month: monthOf(l.date), createdAt: now }).catch(e => { console.error(e); toast("ما اتحفظش — حاول تاني"); }); return ref.id; });
}
function save(){
  const $ = q => root.querySelector(q);
  if (S.mode === "amt") {
    const amount = toNum(norm($("#amt").value)); if (!(amount > 0)) { $("#amt").focus(); return toast("اكتب المبلغ"); }
    const ids = add([{ amount, title: $("#ttl").value.trim() || S.cat, category: S.cat, date: today() }]);
    $("#amt").value = ""; $("#ttl").value = ""; $("#amt").focus();
    return toast(`اتسجّل ${money(amount)}`, () => undo(ids));
  }
  const ok = lines.filter(l => !l.err); if (!ok.length) return toast("مفيش سطر فيه مبلغ");
  const ids = add(ok); $("#msg").value = ""; preview();
  toast(`اتسجّل ${ok.length} مصروف` + (lines.length > ok.length ? ` · ${lines.length - ok.length} اتساب` : ""), () => undo(ids));
}
function undo(ids){ ids.forEach(id => deleteDoc(doc(col(), id)).catch(() => {})); toast("اتلغى"); }
function renderData(){
  const box = root.querySelector("#data"); if (!box) return;
  if (S.mode === "amt") drawCats();
  const m = S.month, it = S.items, tot = it.reduce((a, i) => a + (+i.amount || 0), 0);
  const tdy = it.filter(i => i.date === today()).reduce((a, i) => a + (+i.amount || 0), 0);
  const byCat = {}; it.forEach(i => byCat[i.category] = (byCat[i.category] || 0) + (+i.amount || 0));
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]); const mx = Math.max(1, ...cats.map(c => c[1]));
  const days = {}; it.forEach(i => (days[i.date] = days[i.date] || []).push(i));
  const isNow = m === monthOf(today());
  box.innerHTML = `
   <div class="month"><button class="icon-btn" id="next" aria-label="الشهر اللي بعده" ${isNow ? "disabled style='opacity:.35'" : ""}>›</button>
     <b>${esc(monthName(m))}</b><button class="icon-btn" id="prevM" aria-label="الشهر اللي قبله">‹</button></div>
   <div class="stats"><div class="stat"><span class="tiny">إجمالي الشهر</span><b>${money(tot)}</b></div>
     <div class="stat"><span class="tiny">${isNow ? "النهارده" : "عدد البنود"}</span><b>${isNow ? money(tdy) : it.length}</b></div></div>
   ${cats.length ? `<section class="card">${cats.map(([c, v]) => `<div class="bar"><span>${esc(c)}</span><span class="track"><i style="width:${Math.max(3, v / mx * 100)}%"></i></span><span class="val">${money(v)}</span></div>`).join("")}</section>` : ""}
   <section class="card">${!S.loaded ? `<p class="empty">جاري التحميل…</p>` : it.length ? Object.keys(days).sort().reverse().map(d => `
     <div class="day"><span>${esc(dayName(d))}</span><span>${money(days[d].reduce((a, i) => a + (+i.amount || 0), 0))}</span></div>
     ${days[d].map(i => `<div class="row"><div class="grow"><b>${esc(i.title)}</b><span class="tiny">${esc(i.category)}</span></div><span class="val">${money(i.amount)}</span><button class="del" data-del="${esc(i.id)}" aria-label="حذف">✕</button></div>`).join("")}`).join("")
     : `<p class="empty">مفيش مصاريف في الشهر ده</p>`}</section>
   ${it.length ? `<div class="links"><button id="csv">تنزيل Excel (CSV)</button></div>` : ""}`;
  box.querySelector("#prevM").onclick = () => { S.month = shiftMonth(S.month, -1); watch(); renderData(); };
  const nx = box.querySelector("#next"); nx.onclick = () => { if (!isNow) { S.month = shiftMonth(S.month, 1); watch(); renderData(); } };
  box.onclick = e => { const b = e.target.closest("[data-del]"); if (!b) return; const i = S.items.find(x => x.id === b.dataset.del); if (!i) return;
    deleteDoc(doc(col(), i.id)).catch(() => toast("ما اتمسحش"));
    toast(`اتمسح «${i.title}»`, () => { const { id, ...d } = i; setDoc(doc(col(), id), d); toast("رجع"); }); };
  const csv = box.querySelector("#csv"); csv && (csv.onclick = exportCsv);
}
function exportCsv(){
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [["التاريخ", "البند", "الفئة", "المبلغ"], ...S.items.slice().reverse().map(i => [i.date, i.title, i.category, i.amount])];
  const blob = new Blob(["﻿" + rows.map(r => r.map(q).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `حسابات-${S.month}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
let tt = 0;
function toast(msg, onUndo){
  document.querySelectorAll(".toast").forEach(t => t.remove()); clearTimeout(tt);
  const t = document.createElement("div"); t.className = "toast"; t.innerHTML = `<span>${esc(msg)}</span>${onUndo ? `<button>تراجع</button>` : ""}`;
  if (onUndo) t.querySelector("button").onclick = () => { t.remove(); onUndo(); };
  document.body.appendChild(t); tt = setTimeout(() => t.remove(), onUndo ? 5000 : 2500);
}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
