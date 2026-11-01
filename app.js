import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, onSnapshot, addDoc as fbAdd, setDoc as fbSet, updateDoc as fbUpd, deleteDoc as fbDel, getDoc, writeBatch, deleteField, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import * as C from "./core.js";
const { esc, r2, today, monthOf, monthName, iso, fmtDT, safeUrl, waPhone, icon, FUND } = C;

const root = document.getElementById("root");
const configured = firebaseConfig && firebaseConfig.apiKey && !/PASTE|ضع/i.test(firebaseConfig.apiKey);

/* ---------------- theme ---------------- */
const store = { get(k){ try{ return localStorage.getItem(k); }catch(_){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(_){} } };
function applyTheme(){ const t=store.get("sakan-theme"); if(t) document.documentElement.dataset.theme=t; else delete document.documentElement.dataset.theme; }
applyTheme();
function isDark(){ const t=document.documentElement.dataset.theme; return t ? t==="dark" : matchMedia("(prefers-color-scheme: dark)").matches; }
function toggleTheme(){ store.set("sakan-theme", isDark()?"light":"dark"); applyTheme(); render(); }

/* ---------------- toast / copy / modal ---------------- */
function toast(msg){ document.querySelectorAll(".toast").forEach(t=>t.remove()); const t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2800); }
function fail(e){ console.error(e); const c=e&&e.code||"";
  if(c.includes("permission")) toast("مش مسموحلك تعمل ده — الصلاحية مقفولة أو الشهر مقفول");
  else if(c.includes("unavailable")) toast("مفيش نت — التعديل هيتحفظ أول ما النت يرجع");
  else toast("حصلت مشكلة — جرّب تاني"); }
async function copy(text,msg){ try{ await navigator.clipboard.writeText(text); toast(msg||"اتنسخ"); }
  catch(_){ modal(`<h3>انسخ النص</h3><textarea id="cpT" rows="6">${esc(text)}</textarea><div class="mfoot"><button class="btn" data-close>تمام</button></div>`,ov=>{const t=ov.querySelector("#cpT");t.focus();t.select();}); } }
function modal(html,onMount,wide){ const mr=document.getElementById("modalRoot"); mr.innerHTML=`<div class="overlay" role="dialog" aria-modal="true"><div class="modal ${wide?"wide":""}">${html}</div></div>`;
  const ov=mr.firstElementChild; ov.addEventListener("click",e=>{ if(e.target===ov||e.target.closest("[data-close]")) closeModal(); const c=e.target.closest("[data-copy]"); if(c) copy(c.dataset.copy,c.dataset.msg); });
  onMount&&onMount(ov); const f=ov.querySelector("input:not([type=checkbox]):not([type=file]),select,textarea"); f&&f.focus({preventScroll:true}); return ov; }
function closeModal(){ document.getElementById("modalRoot").innerHTML=""; if(S.dirty){ S.dirty=false; render(); } }
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeModal(); });
function confirmBox(title,btn,fn,body="الخطوة دي مش هتترجع."){ modal(`<h3>${esc(title)}</h3><p class="sub" style="margin:0">${esc(body)}</p><div class="mfoot"><button class="btn danger" id="cOk">${esc(btn)}</button><button class="btn" data-close>إلغاء</button></div>`,ov=>ov.querySelector("#cOk").onclick=async()=>{ closeModal(); await fn(); }); }

/* ---------------- not configured ---------------- */
if(!configured){
  root.innerHTML=`<div class="center"><div class="welcome"><div class="logo">${icon("home")}</div><h1>سكن</h1>
  <p>الموقع محتاج يتربط بمشروع Firebase الأول.</p>
  <div class="card" style="text-align:right"><b>المطلوب:</b><ol style="margin:8px 0 0;padding-inline-start:20px;line-height:2">
  <li>اعمل مشروع مجاني على console.firebase.google.com</li><li>فعّل Authentication ← Google، وFirestore Database</li>
  <li>انسخ إعدادات الويب في ملف <code>firebase-config.js</code></li><li>انسخ محتوى <code>firestore.rules</code> في Firestore ← Rules</li></ol>
  <p class="sub" style="margin-top:10px">التفاصيل خطوة بخطوة في ملف README.md</p></div></div></div>`;
  throw new Error("Firebase not configured");
}

/* ---------------- firebase ---------------- */
const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
let db; try{ db = initializeFirestore(fb,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})}); }catch(_){ db = initializeFirestore(fb,{}); }
const H = (...p) => doc(db,"houses",S.hid,...p);
const HC = name => collection(db,"houses",S.hid,name);

/* ---------------- audited writes ---------------- */
const AUDIT_SKIP=new Set(["audit","receipts"]);
function auditInfo(ref){ const p=ref.path.split("/"); if(p[0]!=="houses"||!S.hid||p[1]!==S.hid) return null; if(p.length===2) return {col:"house",id:S.hid}; if(p.length===4&&!AUDIT_SKIP.has(p[2])) return {col:p[2],id:p[3]}; return null; }
function beforeOf(col,id){ if(col==="house") return S.house; if(col==="users") return S.users[id]||null; const a=S[col]; return Array.isArray(a)?(a.find(x=>x.id===id)||null):null; }
const slim=o=>{ if(!o) return null; const c={}; for(const [k,v] of Object.entries(o)){ if(["id","log","votes","seenAt"].includes(k)) continue; c[k]=v; } return JSON.parse(JSON.stringify(c)); };
async function audit(action,info,before,after){ if(!info||!S.user||!S.house) return; try{ await fbAdd(collection(db,"houses",S.hid,"audit"),{at:iso(),uid:S.user.uid,action,col:info.col,refId:info.id,before:slim(before),after:slim(after)}); }catch(e){ console.warn("audit",e); } }
const quiet=(info,patch)=>info&&info.col==="users"&&Object.keys(patch||{}).every(k=>k==="seenAt");
async function addDoc(colRef,data){ const r=await fbAdd(colRef,data); const p=colRef.path.split("/"); if(p[0]==="houses"&&p[1]===S.hid&&p.length===3&&!AUDIT_SKIP.has(p[2])) audit("create",{col:p[2],id:r.id},null,data); return r; }
async function updateDoc(ref,patch){ const info=auditInfo(ref); const b=info?beforeOf(info.col,info.id):null; await fbUpd(ref,patch); if(info&&!quiet(info,patch)) audit("update",info,b,patch); }
async function deleteDoc(ref){ const info=auditInfo(ref); const b=info?beforeOf(info.col,info.id):null; await fbDel(ref); if(info) audit("delete",info,b,null); }
async function setDoc(ref,d,o){ const info=auditInfo(ref); const b=info?beforeOf(info.col,info.id):null; await fbSet(ref,d,o); if(info) audit(b?"update":"create",info,b,d); }

/* ---------------- state ---------------- */
const LISTS=["users","roster","expenses","payments","fund","shopping","chores","notes","polls","meters","items","contacts","guests","loans","audit","closings"];
const S = { user:null, memberships:{}, hid:null, house:null, users:{}, roster:[], expenses:[], payments:[], fund:[], shopping:[], chores:[], notes:[], polls:[], meters:[], items:[], contacts:[],
  guests:[], loans:[], audit:[], closings:[], autoRec:new Set(), seenBefore:null,
  loaded:{}, unsubs:[], view:"home", f:{month:"",cat:"",mem:"",q:""}, showBought:false, dirty:false, booting:true };
const F = k => ({...C.DEFAULT_FEATURES, ...(S.house?.features||{})})[k] !== false;
const PM = k => { const p={...C.DEFAULT_PERMS, ...(S.house?.perms||{})}; return p[k]; };
const me = () => S.users[S.user?.uid] || {};
const role = () => me().role || "viewer";
const isAdmin = () => role()==="admin";
const canWrite = () => role()==="admin" || role()==="member";
const myMember = () => me().memberId || null;
const isOwner = () => S.house?.ownerUid === S.user?.uid;
const cur = () => S.house?.currency || "ج.م";
const money = n => r2(n).toLocaleString("ar-EG",{maximumFractionDigits:2})+" "+cur();
const active = () => S.roster.filter(m=>m.active!==false);
const mName = id => id===FUND ? "الصندوق" : (S.roster.find(m=>m.id===id)||{}).name || "عضو محذوف";
const locked = d => (S.house?.lockedMonths||[]).includes(monthOf(d));
const uidOf = mid => Object.keys(S.users).find(u=>S.users[u].memberId===mid) || null;
const data = () => ({roster:S.roster, expenses:S.expenses, payments:S.payments, fund:F("fund")?S.fund:[]});
function payInfo(mid){ const m=S.roster.find(x=>x.id===mid)||{}; const u=S.users[uidOf(mid)]||{};
  return { instapay:safeUrl(u.instapay||m.instapay), ipa:(u.ipa||m.ipa||"").trim(), wallet:(u.wallet||m.wallet||"").trim(), phone:(u.phone||m.phone||"").trim() }; }
const canModify = d => isAdmin() || (canWrite() && d.createdBy===S.user.uid && PM("editOwn") && !locked(d.date));
const canAddExp = () => canWrite() && S.roster.length && (isAdmin() || myMember());
const pendingForMe = () => S.payments.filter(p=>!C.confirmed(p) && (isAdmin() || p.to===myMember()));
const pendingFund = () => isAdmin() ? S.fund.filter(f=>!C.confirmed(f)) : [];
function dueBills(){ if(!F("recurring")) return []; const m=monthOf(today()), day=+today().slice(8,10);
  const added=new Set(S.expenses.filter(e=>monthOf(e.date)===m&&e.recurring).map(e=>e.title));
  return (S.house?.recurring||[]).filter(r=>!added.has(r.title)).map(r=>({...r,left:(+r.dueDay||1)-day})).sort((a,b)=>a.left-b.left); }

/* ---------------- auth ---------------- */
getRedirectResult(auth).catch(e=>console.warn(e));
onAuthStateChanged(auth, async u=>{
  S.user=u; stopHouse();
  if(!u){ S.booting=false; return renderWelcome(); }
  onSnapshot(doc(db,"memberships",u.uid), async s=>{
    S.memberships = s.exists() ? (s.data().houses||{}) : {};
    const jc = joinCodeFromHash();
    if(jc){ history.replaceState(null,"",location.pathname); return joinFlow(jc); }
    const ids=Object.keys(S.memberships); const saved=store.get("sakan-house");
    const want = S.hid && S.memberships[S.hid] ? S.hid : (saved && S.memberships[saved] ? saved : ids[0]);
    if(!want){ S.booting=false; stopHouse(); return renderNoHouse(); }
    if(want!==S.hid) openHouse(want);
  }, e=>{ console.error(e); renderNoHouse(); });
});
async function login(){ const p=new GoogleAuthProvider(); p.setCustomParameters({prompt:"select_account"});
  try{ await signInWithPopup(auth,p); }catch(e){ if(String(e.code).includes("popup")) signInWithRedirect(auth,p); else { console.error(e); toast(e.code==="auth/unauthorized-domain"?"الدومين ده مش مضاف في Firebase ← Authentication ← Authorized domains":"ما قدرناش نسجّل الدخول"); } } }
function joinCodeFromHash(){ const m=location.hash.match(/join[=-]([A-Z0-9]{6})/i); return m?m[1].toUpperCase():null; }

/* ---------------- house subscriptions ---------------- */
function stopHouse(){ S.unsubs.forEach(f=>f()); S.unsubs=[]; S.loaded={}; LISTS.forEach(k=>S[k]= k==="users"?{}:[]); S.house=null; }
function openHouse(hid){
  stopHouse(); S.hid=hid; store.set("sakan-house",hid); S.booting=true; render();
  const done=k=>{ S.loaded[k]=true; schedule(); };
  const err=k=>e=>{ console.error(k,e); done(k); };
  S.unsubs.push(onSnapshot(doc(db,"houses",hid), s=>{ if(!s.exists()){ leaveLocal(hid); return; } S.house={id:s.id,...s.data()}; done("house"); }, err("house")));
  S.unsubs.push(onSnapshot(collection(db,"houses",hid,"users"), s=>{ S.users={}; s.docs.forEach(d=>S.users[d.id]=d.data()); done("users");
    if(S.user && !S.users[S.user.uid] && S.loaded.house===true){ leaveLocal(hid); } }, err("users")));
  const sorters={roster:(a,b)=>(a.order??0)-(b.order??0)};
  ["roster","expenses","payments","fund","shopping","chores","notes","polls","meters","items","contacts","guests","loans","closings"].forEach(k=>
    S.unsubs.push(onSnapshot(collection(db,"houses",hid,k), s=>{ S[k]=s.docs.map(d=>({id:d.id,...d.data()})); sorters[k]&&S[k].sort(sorters[k]); done(k); }, err(k))));
  S.unsubs.push(onSnapshot(query(collection(db,"houses",hid,"audit"),orderBy("at","desc"),limit(300)), s=>{ S.audit=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at||"").localeCompare(a.at||"")); done("audit"); }, err("audit")));
}
async function leaveLocal(hid){ try{ await setDoc(doc(db,"memberships",S.user.uid),{houses:{[hid]:deleteField()}},{merge:true}); }catch(_){} if(S.hid===hid){ S.hid=null; } }
let raf=0; function schedule(){ cancelAnimationFrame(raf); raf=requestAnimationFrame(()=>{ render(); afterData(); }); }

/* ---------------- welcome / no house / join ---------------- */
function renderWelcome(){
  root.innerHTML=`<div class="center"><div class="welcome">
   <div class="logo">${icon("home")}</div><h1>سكن</h1>
   <p>حسابات الشقة المشتركة من غير خناق: مين دفع، مين عليه، وادفع على طول بإنستاباي.</p>
   <div class="features">
     <div>${icon("swap")}تقسيم وتسويات ذكية</div><div>${icon("wallet")}دفع بإنستاباي</div>
     <div>${icon("bolt")}عدادات وفواتير</div><div>${icon("piggy")}صندوق مشترك</div>
     <div>${icon("broom")}مهام بالدور</div><div>${icon("shield")}صلاحيات كاملة</div></div>
   <button class="gbtn" id="gLogin">${C.GOOGLE} الدخول بحساب جوجل</button>
   <p class="tiny">بياناتك محفوظة في قاعدة بيانات السكن بتاعكم بس.</p>
   <button class="btn ghost sm" id="thBtn" style="justify-self:center">${icon(isDark()?"sun":"moon")} ${isDark()?"الوضع الفاتح":"الوضع الغامق"}</button></div></div>`;
  root.querySelector("#gLogin").onclick=login; root.querySelector("#thBtn").onclick=()=>{ toggleTheme(); renderWelcome(); };
}
function renderNoHouse(){
  root.innerHTML=`<div class="center"><div class="welcome">
   <div class="logo">${icon("home")}</div><h1>أهلًا ${esc((S.user.displayName||"").split(" ")[0])}</h1>
   <p>إنت لسه مش في أي سكن. اعمل سكن جديد وتبقى انت المدير، أو ادخل بكود الدعوة اللي معاك.</p>
   <div class="card" style="text-align:right;display:grid;gap:12px">
     <label class="f">اسم السكن الجديد<input id="nhName" placeholder="مثلًا: شقة المعادي" maxlength="50"></label>
     <label class="f">العملة<select id="nhCur">${["ج.م","ر.س","د.إ","د.ك","$","€"].map(c=>`<option>${c}</option>`).join("")}</select></label>
     <button class="btn primary" id="nhCreate">${icon("plus")} اعمل السكن</button></div>
   <div class="card" style="text-align:right;display:grid;gap:12px">
     <label class="f">عندك كود دعوة؟<input id="jCode" dir="ltr" placeholder="ABC123" maxlength="6" style="text-transform:uppercase;letter-spacing:.2em;text-align:center"></label>
     <button class="btn" id="jGo">انضم</button></div>
   ${S.hid?`<button class="btn sm" id="nhBack" style="justify-self:center">رجوع للسكن</button>`:""}<button class="btn ghost sm" id="lo" style="justify-self:center">${icon("logout")} خروج</button></div></div>`;
  root.querySelector("#nhCreate").onclick=createHouse;
  const bk=root.querySelector("#nhBack"); bk&&(bk.onclick=()=>render());
  root.querySelector("#jGo").onclick=()=>{ const c=root.querySelector("#jCode").value.trim().toUpperCase(); if(c.length!==6) return toast("الكود 6 حروف"); joinFlow(c); };
  root.querySelector("#lo").onclick=()=>signOut(auth);
}
async function createHouse(){
  const name=root.querySelector("#nhName").value.trim(); if(!name) return toast("اكتب اسم السكن");
  const u=S.user; const hid=doc(collection(db,"houses")).id; const code=C.code6();
  const b=writeBatch(db);
  b.set(doc(db,"houses",hid),{name, currency:root.querySelector("#nhCur").value, ownerUid:u.uid, joinCode:code, features:C.DEFAULT_FEATURES, perms:C.DEFAULT_PERMS, lockedMonths:[], recurring:[], budgets:{}, createdAt:iso()});
  b.set(doc(db,"houses",hid,"users",u.uid),{role:"admin", name:u.displayName||"", email:u.email||"", photo:u.photoURL||"", joinedAt:iso()});
  b.set(doc(db,"codes",code),{hid});
  b.set(doc(db,"memberships",u.uid),{houses:{[hid]:name}},{merge:true});
  store.set("sakan-house",hid); try{ await b.commit(); openHouse(hid); toast("السكن اتعمل — ضيف السكان من «الأعضاء»"); }catch(e){ fail(e); }
}
async function joinFlow(code){
  try{
    const c=await getDoc(doc(db,"codes",code)); if(!c.exists()){ toast("الكود ده مش صحيح"); return S.hid?render():renderNoHouse(); }
    const hid=c.data().hid; const u=S.user;
    if(S.memberships[hid]){ toast("انت عضو في السكن ده بالفعل"); return openHouse(hid); }
    store.set("sakan-house",hid);
    await setDoc(doc(db,"houses",hid,"users",u.uid),{role:"member", joinCode:code, name:u.displayName||"", email:u.email||"", photo:u.photoURL||"", joinedAt:iso()});
    const h=await getDoc(doc(db,"houses",hid));
    await setDoc(doc(db,"memberships",u.uid),{houses:{[hid]:h.exists()?h.data().name:"سكن"}},{merge:true});
    openHouse(hid); toast("أهلًا بيك في السكن! اختار اسمك من القائمة");
  }catch(e){ console.error(e); toast("ما قدرناش ندخلك — الكود اتغيّر أو الانضمام مقفول"); if(!S.hid) renderNoHouse(); }
}

/* ---------------- navigation ---------------- */
const NAV=[
  ["home","الرئيسية","home",null],["notifs","الإشعارات","bell","notifications"],["expenses","المصاريف","receipt",null],["payments","التسويات","swap","payments"],["loans","السلف","hand","loans"],["fund","الصندوق","piggy","fund"],
  ["shopping","المشتريات","cart","shopping"],["chores","المهام","broom","chores"],["guests","الضيوف","guest","guests"],["board","الإعلانات","mega","board"],["polls","التصويت","poll","polls"],
  ["meters","العدادات","bolt","meters"],["deposits","التأمين والعهد","shield","deposits"],["contacts","أرقام وقوانين","phone","contacts"],
  ["members","الأعضاء","users",null],["stats","الإحصائيات","chart","stats"],["closing","قفل الشهر","file","closing"],["activity","النشاط","clock","activity"],["audit","سجل التعديلات","history","audit"],["settings","الإدارة","gear","@admin"]];
const navItems = () => NAV.filter(([, , , f])=> f===null || (f==="@admin"?isAdmin():F(f)));
function badgeFor(v){ if(v==="notifs") return unread(); if(v==="loans") return F("loans")?pendingLoans().length:0; if(v==="payments") return pendingForMe().length; if(v==="shopping") return S.shopping.filter(x=>!x.bought).length; if(v==="fund") return pendingFund().length; return 0; }
function go(v){ if(v==="notifs"&&F("notifications")&&S.user){ S.seenBefore=me().seenAt||""; updateDoc(H("users",S.user.uid),{seenAt:iso()}).catch(()=>{}); } S.view=v; closeModal(); render(); window.scrollTo({top:0}); }

/* ---------------- render ---------------- */
function render(){
  if(!S.user) return;
  if(!S.hid) return;
  const ae=document.activeElement;
  if(ae && ae.closest && ae.closest("#content") && /INPUT|TEXTAREA/.test(ae.tagName) && ae.value){ S.dirty=true; return; }
  if(document.querySelector("#modalRoot .overlay")) { S.dirty=true; }
  const ready=["house","users","roster","expenses","payments"].every(k=>S.loaded[k]);
  C.ctx.on=F("guests"); C.ctx.guests=S.guests; C.ctx.cats=S.house?.guestCats||C.GUEST_CATS;
  const items=navItems(); if(!items.find(i=>i[0]===S.view)) S.view="home";
  const h=S.house||{}; const m=me();
  const navBtn=([v,l,ic])=>{ const b=badgeFor(v); return `<button class="nav-btn" data-go="${v}" ${S.view===v?'aria-current="page"':""}>${icon(ic)}<span>${l}</span>${b?`<span class="nav-badge">${b}</span>`:""}</button>`; };
  const tabs=["home","expenses",F("payments")?"payments":null,"members"].filter(Boolean).map(v=>items.find(i=>i[0]===v)).filter(Boolean);
  const moreActive=!tabs.find(t=>t[0]===S.view);
  const houses=Object.entries(S.memberships);
  root.innerHTML=`<div class="shell">
   <aside class="side" aria-label="القائمة">
     <div class="brand"><div class="logo">${icon("home")}</div><div><b>${esc(h.name||"سكن")}</b><small>${esc(C.ROLES[role()])}</small></div></div>
     ${items.map(navBtn).join("")}
     <div class="grow"></div>
     ${houses.length>1?`<select id="houseSel" aria-label="تبديل السكن">${houses.map(([id,n])=>`<option value="${id}" ${id===S.hid?"selected":""}>${esc(n)}</option>`).join("")}</select>`:""}
     <button class="nav-btn" data-act="newHouse">${icon("plus")}<span>سكن جديد أو انضم بكود</span></button>
     <button class="nav-btn" data-act="theme">${icon(isDark()?"sun":"moon")}<span>${isDark()?"الوضع الفاتح":"الوضع الغامق"}</span></button>
     <div class="me"><img class="avatar" alt="" src="${esc(S.user.photoURL||"")}" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"><div><b>${esc(S.user.displayName||"")}</b><span class="tiny">${myMember()?esc(mName(myMember())):"مش مربوط باسم"}</span></div><button class="btn icon ghost" data-act="logout" title="خروج">${icon("logout")}</button></div>
   </aside>
   <div class="mobile-top"><div class="brand"><div class="logo">${icon("home")}</div><div><b>${esc(h.name||"سكن")}</b><small>${esc(C.ROLES[role()])}${myMember()?" · "+esc(mName(myMember())):""}</small></div></div>
     <div class="actions">${ready&&F("notifications")?`<button class="btn icon ghost bell" data-go="notifs" aria-label="الإشعارات">${icon("bell")}${unread()?`<span class="nav-badge">${unread()}</span>`:""}</button>`:""}<button class="btn icon ghost" data-act="theme" aria-label="تبديل الوضع">${icon(isDark()?"sun":"moon")}</button><img class="avatar" alt="" src="${esc(S.user.photoURL||"")}" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"></div></div>
   <main class="main"><div class="content" id="content">${ready?viewHtml():`<div class="skeleton"></div><div class="skeleton"></div>`}</div></main>
   <nav class="tabbar" aria-label="التنقل">
     ${tabs.map(([v,l,ic])=>{const b=badgeFor(v); return `<button data-go="${v}" ${S.view===v?'aria-current="page"':""}>${icon(ic)}<span>${l}</span>${b?`<span class="nav-badge">${b}</span>`:""}</button>`;}).join("")}
     <button data-act="more" ${moreActive?'aria-current="page"':""}>${icon("more")}<span>المزيد</span></button></nav>
   ${ready && canWrite() ? `<button class="fab" data-act="quick" aria-label="إضافة سريعة">${icon("plus")}</button>`:""}
  </div>`;
  const hs=root.querySelector("#houseSel"); hs&&(hs.onchange=()=>openHouse(hs.value));
  if(ready) bindView();
}
function viewHtml(){
  const V={home,notifs,expenses,payments,loans,fund,shopping,chores,guests,board,polls,meters,deposits,contacts,members,stats,closing,activity,audit:auditView,settings};
  const head=(t,s,tools="")=>`<div class="topbar"><div><h1>${t}</h1>${s?`<div class="sub">${s}</div>`:""}</div><div class="tools">${tools}</div></div>`;
  return (V[S.view]||home)(head);
}

/* ---------------- shared bits ---------------- */
function linkBanner(){
  if(myMember() || !S.roster.length || !canWrite()) return "";
  const taken=new Set(Object.values(S.users).map(u=>u.memberId).filter(Boolean));
  const opts=active().filter(m=>!taken.has(m.id)).map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("");
  return `<div class="card"><div class="card-head"><h2 class="h">انت مين في السكن؟</h2></div><p class="sub" style="margin:0 0 12px">اختار اسمك علشان تسجّل مصاريفك ودفعاتك وتشوف رصيدك.</p>
  ${opts?`<div class="actions"><select id="linkSel" style="max-width:280px">${opts}</select><button class="btn primary" data-act="link">ده أنا</button></div>`:`<div class="notice">كل الأسماء مربوطة. اطلب من المدير يضيف اسمك.</div>`}</div>`;
}
const emptyBox=(ic,t,s)=>`<div class="empty"><div class="ic-round acc">${icon(ic)}</div><b>${t}</b>${s||""}</div>`;
function monthOptions(sel){ const ms=new Set([monthOf(today()),...S.expenses.map(e=>monthOf(e.date)),...S.payments.map(p=>monthOf(p.date))].filter(Boolean));
  return `<option value="">كل الشهور</option>`+[...ms].sort().reverse().map(m=>`<option value="${m}" ${m===sel?"selected":""}>${esc(monthName(m))}${locked(m+"-01")?" (مقفول)":""}</option>`).join(""); }
function settleCard(p){
  const mine=myMember(), info=payInfo(p.to), payer=mine===p.from, recv=mine===p.to;
  const canRec=canWrite() && (isAdmin()||payer||recv) && F("payments");
  const msg=`يا ${mName(p.from)}، عليك ${money(p.amount)} لـ ${mName(p.to)} من حسابات ${S.house?.name||"السكن"}.`+(F("instapay")&&info.instapay?`\nادفع على إنستاباي: ${info.instapay}`:"")+(F("instapay")&&info.ipa?`\nعنوان إنستاباي: ${info.ipa}`:"")+(F("instapay")&&info.wallet?`\nمحفظة: ${info.wallet}`:"");
  return `<div class="scard"><div class="top"><b>${esc(mName(p.from))}</b>${payer?'<span class="chip acc">انت</span>':""}<span class="arrow">←</span><b>${esc(mName(p.to))}</b>${recv?'<span class="chip acc">انت</span>':""}<span class="amt">${money(p.amount)}</span></div>
   <div class="actions">
    ${F("instapay")&&info.instapay?`<a class="btn sm insta" href="${esc(info.instapay)}" target="_blank" rel="noopener noreferrer">${icon("wallet")} ادفع بإنستاباي</a>`:""}
    ${F("instapay")&&info.ipa?`<button class="btn sm" data-copy="${esc(info.ipa)}" data-msg="اتنسخ عنوان إنستاباي">${icon("copy")} ${esc(info.ipa)}</button>`:""}
    ${F("instapay")&&info.wallet?`<button class="btn sm" data-copy="${esc(info.wallet)}" data-msg="اتنسخ رقم المحفظة">${icon("copy")} محفظة</button>`:""}
    <button class="btn sm" data-copy="${r2(p.amount)}" data-msg="اتنسخ المبلغ">${icon("copy")} المبلغ</button>
    ${canRec?`<button class="btn sm primary" data-act="quickpay" data-from="${p.from}" data-to="${p.to}" data-amt="${p.amount}">${icon("check")} ${payer?"دفعت":"اتدفعت"}</button>`:""}
    ${F("whatsapp")?`<a class="btn sm" href="https://wa.me/${waPhone(payInfo(p.from).phone)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener noreferrer">${icon("wa")} ذكّره</a>`:""}
   </div>${F("instapay")&&!info.instapay&&!info.ipa&&!info.wallet?`<div class="tiny">${esc(mName(p.to))} لسه ما حطّش بيانات الدفع.</div>`:""}</div>`;
}
const splitLabel=e=>{ const sp=e.split||{}; if(sp.mode==="custom") return "مبالغ مخصّصة"; const n=(sp.members||[]).length; return sp.mode==="weight"?`بالأوزان على ${n}`:(n===active().length?"بالتساوي على الكل":`بالتساوي على ${n}`); };
function expRows(list,compact){
  if(!list.length) return emptyBox("receipt","مفيش مصاريف هنا", canAddExp()?"دوس + وسجّل أول فاتورة.":"");
  return `<div class="list">${list.map(e=>`<div class="row-item"><div class="ic-round ${e.paidBy===FUND?"ins":"acc"}">${icon(e.paidBy===FUND?"piggy":"receipt")}</div>
    <div class="grow"><b>${esc(e.title)}</b><div class="tiny">${esc(e.date)} · ${esc(e.category||"أخرى")} · دفعه ${esc(mName(e.paidBy))} · ${splitLabel(e)}${e.recurring?" · ثابت":""}${locked(e.date)?" · مقفول":""}</div>${e.note?`<div class="sub">${esc(e.note)}</div>`:""}</div>
    <div style="display:grid;gap:6px;justify-items:end"><span class="amt">${money(e.amount)}</span>
    ${compact?"":`<div class="actions">${e.receiptId&&F("receipts")?`<button class="btn sm icon" data-act="viewReceipt" data-id="${e.receiptId}" title="الإيصال">${icon("image")}</button>`:""}${canModify(e)?`<button class="btn sm icon" data-act="editExp" data-id="${e.id}" title="تعديل">${icon("edit")}</button><button class="btn sm icon danger" data-act="delExp" data-id="${e.id}" title="حذف">${icon("trash")}</button>`:""}</div>`}</div></div>`).join("")}</div>`;
}

/* ---------------- views ---------------- */
function home(head){
  if(!S.roster.length) return head(`أهلًا ${esc((S.user.displayName||"").split(" ")[0])}`)+onboarding();
  const m=monthOf(today()), bAll=C.balances(data(),""), mine=myMember();
  const totM=S.expenses.filter(e=>monthOf(e.date)===m).reduce((a,e)=>a+(+e.amount||0),0);
  const plan=C.settlePlan(bAll), myPlan=mine?plan.filter(p=>p.from===mine||p.to===mine):[];
  const others=(PM("seeAll")||isAdmin())?(mine?plan.filter(p=>p.from!==mine&&p.to!==mine):plan):[];
  const myNet=mine?bAll[mine]?.net||0:null;
  const alerts=[];
  pendingForMe().forEach(p=>alerts.push(`<div class="row-item"><div class="ic-round ins">${icon("wallet")}</div><div class="grow"><b>${esc(mName(p.from))} بيقول إنه دفع ${money(p.amount)}${p.to!==mine?" لـ "+esc(mName(p.to)):""}</b><div class="tiny">${esc(p.date)} · ${esc(p.method||"")}${p.note?" · "+esc(p.note):""}</div></div><div class="actions"><button class="btn sm primary" data-act="confirmPay" data-id="${p.id}">${icon("check")} وصل</button><button class="btn sm danger" data-act="rejectPay" data-id="${p.id}">ما وصلش</button></div></div>`));
  if(F("loans")) pendingLoans().forEach(l=>alerts.push(`<div class="row-item"><div class="ic-round ins">${icon("hand")}</div><div class="grow"><b>${esc(mName(l.from))} ${l.type==="repay"?"بيقول إنه سدّد":"بيقول إنه سلّف"} ${money(l.amount)}${l.to!==mine?" لـ "+esc(mName(l.to)):""}</b><div class="tiny">${esc(l.date)}${l.note?" · "+esc(l.note):""}</div></div><div class="actions"><button class="btn sm primary" data-act="confirmLoan" data-id="${l.id}">${icon("check")} تأكيد</button><button class="btn sm danger" data-act="delLoan" data-id="${l.id}">لأ</button></div></div>`));
  pendingFund().forEach(f=>alerts.push(`<div class="row-item"><div class="ic-round ins">${icon("piggy")}</div><div class="grow"><b>${esc(mName(f.memberId))} دفع اشتراك الصندوق ${money(f.amount)}</b><div class="tiny">${esc(f.date)}</div></div><button class="btn sm primary" data-act="confirmFund" data-id="${f.id}">${icon("check")} تأكيد</button></div>`));
  dueBills().filter(b=>b.left<=5).forEach(b=>alerts.push(`<div class="row-item"><div class="ic-round neg">${icon("clock")}</div><div class="grow"><b>${esc(b.title)} — ${money(b.amount)}</b><div class="tiny">${b.left<0?`متأخرة ${-b.left} يوم`:b.left===0?"مستحقة النهارده":`مستحقة بعد ${b.left} يوم`}</div></div>${isAdmin()?`<button class="btn sm" data-act="applyRec">سجّل الثابتة</button>`:""}</div>`));
  if(F("budgets")){ const bud=S.house.budgets||{}; Object.entries(bud).forEach(([c,v])=>{ const s=S.expenses.filter(e=>monthOf(e.date)===m&&e.category===c).reduce((a,e)=>a+(+e.amount||0),0); if(+v>0&&s>v) alerts.push(`<div class="row-item"><div class="ic-round neg">${icon("chart")}</div><div class="grow"><b>تخطّيتوا ميزانية «${esc(c)}»</b><div class="tiny">${money(s)} من ${money(v)}</div></div></div>`); }); }
  const turns=F("chores")?S.chores.map(c=>({c,t:C.choreTurn(c,S.roster)})).filter(x=>x.t.who&&(!mine||x.t.who===mine)):[];
  const pinned=F("board")?S.notes.filter(n=>n.pinned).slice(0,2):[];
  const openPolls=F("polls")?S.polls.filter(p=>!p.closed&&!(p.votes||{})[S.user.uid]).length:0;
  const fundBal = F("fund") ? -(bAll[FUND]?.net||0) : null;
  const heroVal = mine ? Math.abs(myNet) : totM;
  const heroLbl = mine ? (myNet>0.009?"ليك عند السكن":myNet<-0.009?"عليك للسكن":"حسابك متصفّي") : `مصاريف ${monthName(m)}`;
  return `${linkBanner()}
  <section class="hero"><div class="l">${heroLbl}</div><div class="big num">${money(heroVal)}</div>
    <div class="row"><span class="pill">مصاريف الشهر ${money(totM)}</span><span class="pill">${plan.length} تحويل مطلوب</span>${fundBal!==null?`<span class="pill">الصندوق ${money(fundBal)}</span>`:""}${openPolls?`<span class="pill">${openPolls} تصويت مستني صوتك</span>`:""}</div>
    <div class="row">${canAddExp()?`<button class="btn" data-act="addExp">${icon("plus")} مصروف</button>`:""}${F("summary")?`<button class="btn ghost" data-act="summary">${icon("share")} ملخص الشهر</button>`:""}${mine&&F("statement")?`<button class="btn ghost" data-act="statement" data-id="${mine}">${icon("receipt")} كشف حسابي</button>`:""}</div></section>
  ${quickAddBox()}
  ${alerts.length?`<section class="card"><div class="card-head"><h2 class="h">محتاج انتباهك</h2><span class="chip neg">${alerts.length}</span></div><div class="list">${alerts.join("")}</div></section>`:""}
  ${myPlan.length&&F("payments")?`<section class="card"><div class="card-head"><h2 class="h">تحويلاتك</h2></div><div class="settle">${myPlan.map(settleCard).join("")}</div></section>`:""}
  <div class="grid">
   ${(PM("seeAll")||isAdmin())?`<section class="card"><div class="card-head"><h2 class="h">مين ليه ومين عليه</h2><span class="tiny">اضغط الاسم لكشف الحساب</span></div>${balBars(bAll)}</section>`:""}
   ${F("payments")&&(PM("seeAll")||isAdmin())?`<section class="card"><div class="card-head"><h2 class="h">${mine?"باقي التحويلات":"أقل عدد تحويلات للتصفية"}</h2></div><div class="settle">${others.length?others.map(settleCard).join(""):emptyBox("check",plan.length?"مفيش تحويلات تانية":"الحسابات متصفّية")}</div></section>`:""}
  </div>
  ${turns.length||pinned.length?`<div class="grid">
   ${turns.length?`<section class="card"><div class="card-head"><h2 class="h">${mine?"دورك":"مين دوره"}</h2><button class="btn sm ghost" data-go="chores">الكل</button></div><div class="list">${turns.map(({c,t})=>`<div class="row-item"><div class="ic-round acc">${icon("broom")}</div><div class="grow"><b>${esc(c.title)}</b><div class="tiny">دور ${esc(mName(t.who))} · فاضل ${t.daysLeft} يوم</div></div></div>`).join("")}</div></section>`:""}
   ${pinned.length?`<section class="card"><div class="card-head"><h2 class="h">مثبّت</h2><button class="btn sm ghost" data-go="board">الكل</button></div><div class="list">${pinned.map(n=>`<div class="row-item pinned"><div class="grow note-text">${esc(n.text)}</div></div>`).join("")}</div></section>`:""}</div>`:""}
  <section class="card"><div class="card-head"><h2 class="h">آخر المصاريف</h2><button class="btn sm ghost" data-go="expenses">الكل</button></div>${expRows([...S.expenses].sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||"")).slice(0,5),true)}</section>`;
}
function balBars(b){
  const list=active().concat(S.roster.filter(x=>x.active===false&&Math.abs(b[x.id]?.net||0)>0.009));
  const mx=Math.max(1,...list.map(x=>Math.abs(b[x.id]?.net||0)));
  return `<div class="bal">${list.map(x=>{ const n=b[x.id]?.net||0, w=Math.abs(n)/mx*50;
    return `<div class="balrow"><div class="who"><button data-act="statement" data-id="${x.id}">${esc(x.name)}</button>${x.id===myMember()?'<span class="chip acc">انت</span>':""}</div>
    <div class="bar"><span class="mid"></span><i style="${n>=0?`left:50%;right:auto;width:${w}%`:`right:50%;width:${w}%`};background:${n>=0?"var(--pos)":"var(--neg)"}"></i></div>
    <div class="num ${n>0.009?"pos":n<-0.009?"neg":""}">${n>0.009?"+":""}${money(n)}</div></div>`; }).join("")}</div>`;
}
function onboarding(){
  if(!isAdmin()) return `<div class="card">${emptyBox("users","لسه مفيش سكان مسجّلين","المدير لازم يضيف الأعضاء الأول، وبعدها تختار اسمك.")}</div>`;
  return `<div class="card"><div class="empty"><div class="ic-round acc">${icon("home")}</div><b>ابدأ في ٤ خطوات</b></div>
   <div class="list">${[["users","ضيف سكان الشقة","من «الأعضاء» — ولكل واحد وزن لو الأوض مختلفة","addMem"],["key","ابعت كود الدعوة","السكان يدخلوا بحساب جوجل ويختاروا أسماءهم","invite"],["receipt","حدد الفواتير الثابتة","الإيجار والإنترنت يتضافوا كل شهر بضغطة","goSettings"],["gear","اختار المزايا والصلاحيات","شغّل اللي محتاجه بس من «الإدارة»","goSettings"]].map(([ic,t,s,a],i)=>`<div class="row-item"><div class="ic-round acc">${icon(ic)}</div><div class="grow"><b>${i+1}. ${t}</b><div class="tiny">${s}</div></div><button class="btn sm" data-act="${a}">ابدأ</button></div>`).join("")}</div></div>`;
}
function filtered(){ const f=S.f,q=f.q.trim();
  return S.expenses.filter(e=>(!f.month||monthOf(e.date)===f.month)&&(!f.cat||e.category===f.cat)&&(!f.mem||e.paidBy===f.mem||(e.split?.members||[]).includes(f.mem)||Object.keys(e.split?.custom||{}).includes(f.mem))&&(!q||(e.title||"").includes(q)||(e.note||"").includes(q)))
    .sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||"").localeCompare(a.createdAt||"")); }
function expenses(head){
  const list=filtered(), tot=list.reduce((a,e)=>a+(+e.amount||0),0);
  return head("المصاريف",`${list.length} بند · ${money(tot)}`,`${canAddExp()?`<button class="btn primary" data-act="addExp">${icon("plus")} مصروف</button>`:""}<button class="btn" data-act="csv">${icon("download")} CSV</button>`)+linkBanner()+
  `<section class="card"><div class="filters"><select id="fMonth">${monthOptions(S.f.month)}</select>
   <select id="fCat"><option value="">كل الفئات</option>${C.CATS.map(c=>`<option ${c===S.f.cat?"selected":""}>${c}</option>`).join("")}</select>
   <select id="fMem"><option value="">كل الأعضاء</option>${S.roster.map(m=>`<option value="${m.id}" ${m.id===S.f.mem?"selected":""}>${esc(m.name)}</option>`).join("")}</select>
   <input id="fQ" type="search" placeholder="بحث…" value="${esc(S.f.q)}"></div>${expRows(list,false)}</section>`;
}
function payments(head){
  const mine=myMember(), plan=C.settlePlan(C.balances(data(),""));
  const visible=p=>PM("seeAll")||isAdmin()||p.from===mine||p.to===mine;
  const list=S.payments.filter(p=>(!S.f.month||monthOf(p.date)===S.f.month)&&visible(p)).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||"").localeCompare(a.createdAt||""));
  return head("التسويات",PM("payConfirm")?"الدفعة اللي يسجّلها الدافع بتستنى تأكيد المستلم":"",canAddExp()?`<button class="btn primary" data-act="addPay">${icon("plus")} دفعة</button>`:"")+linkBanner()+
  `<section class="card"><div class="card-head"><h2 class="h">المطلوب دلوقتي</h2></div><div class="settle">${plan.filter(visible).length?plan.filter(visible).map(settleCard).join(""):emptyBox("check","مفيش تحويلات مطلوبة")}</div></section>
  <section class="card"><div class="card-head"><h2 class="h">سجل الدفعات</h2><select id="fMonth" style="max-width:200px">${monthOptions(S.f.month)}</select></div>
  ${list.length?`<div class="list">${list.map(p=>{ const canConf=!C.confirmed(p)&&(isAdmin()||p.to===mine);
    return `<div class="row-item"><div class="ic-round ${C.confirmed(p)?"pos":"neg"}">${icon(C.confirmed(p)?"check":"clock")}</div><div class="grow"><b>${esc(mName(p.from))} ← ${esc(mName(p.to))}</b><div class="tiny">${esc(p.date)} · ${esc(p.method||"")} · ${C.confirmed(p)?"مؤكدة":"مستنية تأكيد"}${p.note?" · "+esc(p.note):""}</div></div>
    <div style="display:grid;gap:6px;justify-items:end"><span class="amt">${money(p.amount)}</span><div class="actions">${canConf?`<button class="btn sm primary" data-act="confirmPay" data-id="${p.id}">وصل</button>`:""}${(isAdmin()||(p.createdBy===S.user.uid&&!C.confirmed(p)))?`<button class="btn sm icon" data-act="editPay" data-id="${p.id}">${icon("edit")}</button><button class="btn sm icon danger" data-act="delPay" data-id="${p.id}">${icon("trash")}</button>`:""}</div></div></div>`}).join("")}</div>`:emptyBox("swap","مفيش دفعات","بعد ما تدفع بإنستاباي دوس «دفعت» تحت التحويل.")}</section>`;
}
function fund(head){
  const f=S.house.fundCfg||{}; const monthly=+f.monthly||0; const m=monthOf(today());
  const b=C.balances(data(),""); const bal=-(b[FUND]?.net||0);
  const paidThis=new Set(S.fund.filter(x=>monthOf(x.date)===m&&C.confirmed(x)).map(x=>x.memberId));
  const pend=new Set(S.fund.filter(x=>monthOf(x.date)===m&&!C.confirmed(x)).map(x=>x.memberId));
  const spent=S.expenses.filter(e=>e.paidBy===FUND).reduce((a,e)=>a+(+e.amount||0),0);
  const list=[...S.fund].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const mine=myMember();
  return head("الصندوق المشترك",monthly?`الاشتراك الشهري ${money(monthly)} للفرد`:"المدير يحدد الاشتراك من «الإدارة»",
    canWrite()&&(isAdmin()||(PM("memberFund")&&mine))?`<button class="btn primary" data-act="addFund">${icon("plus")} اشتراك</button>`:"")+
  `<section class="hero"><div class="l">رصيد الصندوق</div><div class="big num">${money(bal)}</div><div class="row"><span class="pill">اتصرف منه ${money(spent)}</span><span class="pill">دفعوا الشهر ده ${paidThis.size} من ${active().length}</span></div></section>
  <section class="card"><div class="card-head"><h2 class="h">اشتراك ${esc(monthName(m))}</h2></div><div class="list">${active().map(x=>`<div class="row-item"><div class="ic-round ${paidThis.has(x.id)?"pos":pend.has(x.id)?"":"neg"}">${icon(paidThis.has(x.id)?"check":pend.has(x.id)?"clock":"x")}</div><div class="grow"><b>${esc(x.name)}</b><div class="tiny">${paidThis.has(x.id)?"دفع":pend.has(x.id)?"مستني تأكيد المدير":"لسه ما دفعش"}</div></div>${!paidThis.has(x.id)&&!pend.has(x.id)&&monthly&&canWrite()&&(isAdmin()||x.id===mine)?`<button class="btn sm" data-act="addFund" data-mem="${x.id}">سجّل</button>`:""}</div>`).join("")}</div>
  <p class="tiny" style="margin:12px 0 0">علشان تصرف من الصندوق: سجّل مصروف واختار في «مين دفع» ← الصندوق.</p></section>
  <section class="card"><div class="card-head"><h2 class="h">الحركات</h2></div>${list.length?`<div class="list">${list.map(x=>`<div class="row-item"><div class="ic-round ins">${icon("piggy")}</div><div class="grow"><b>${esc(mName(x.memberId))}</b><div class="tiny">${esc(x.date)} · ${C.confirmed(x)?"مؤكد":"مستني تأكيد"}${x.note?" · "+esc(x.note):""}</div></div><span class="amt">${money(x.amount)}</span>
   ${isAdmin()&&!C.confirmed(x)?`<button class="btn sm primary" data-act="confirmFund" data-id="${x.id}">تأكيد</button>`:""}${isAdmin()||(x.createdBy===S.user.uid&&!C.confirmed(x))?`<button class="btn sm icon danger" data-act="delFund" data-id="${x.id}">${icon("trash")}</button>`:""}</div>`).join("")}</div>`:emptyBox("piggy","مفيش اشتراكات لسه")}</section>`;
}
function shopping(head){
  const open=S.shopping.filter(x=>!x.bought).sort((a,b)=>(a.createdAt||"").localeCompare(b.createdAt||""));
  const done=S.shopping.filter(x=>x.bought).sort((a,b)=>(b.boughtAt||"").localeCompare(a.boughtAt||""));
  const can=canWrite()&&(isAdmin()||(PM("memberShopping")&&myMember()));
  return head("قائمة المشتريات",`${open.length} محتاجين يتشروا`)+linkBanner()+
  `<section class="card">${can?`<div class="actions" style="margin-bottom:14px"><input id="shItem" placeholder="ناقص إيه؟" maxlength="60" style="flex:2 1 200px"><input id="shQty" placeholder="الكمية" maxlength="20" style="flex:1 1 90px"><button class="btn primary" data-act="addShop">${icon("plus")} أضف</button></div>`:""}
   ${open.length?`<div class="list">${open.map(x=>`<div class="row-item"><div class="ic-round acc">${icon("cart")}</div><div class="grow"><b>${esc(x.item)}${x.qty?` <span class="sub">× ${esc(x.qty)}</span>`:""}</b><div class="tiny">طلبه ${esc(mName(x.addedBy))}</div></div>
    <div class="actions">${canAddExp()?`<button class="btn sm primary" data-act="buyShop" data-id="${x.id}">اشتريته</button>`:""}${isAdmin()||x.createdBy===S.user.uid?`<button class="btn sm icon danger" data-act="delShop" data-id="${x.id}">${icon("trash")}</button>`:""}</div></div>`).join("")}</div>`:emptyBox("cart","القائمة فاضية","أي حاجة تخلص في البيت اكتبها هنا.")}
   ${done.length?`<div class="actions" style="margin-top:14px"><button class="btn sm" data-act="toggleBought">${S.showBought?"إخفاء":"عرض"} اللي اتشرى (${done.length})</button>${isAdmin()?`<button class="btn sm" data-act="clearBought">مسح اللي اتشرى</button>`:""}</div>
   ${S.showBought?`<div class="list" style="margin-top:10px">${done.slice(0,40).map(x=>`<div class="row-item done"><div class="grow"><b>${esc(x.item)}</b><div class="tiny">اشتراه ${esc(mName(x.boughtBy))} · ${esc(fmtDT(x.boughtAt))}</div></div></div>`).join("")}</div>`:""}`:""}</section>`;
}
function chores(head){
  const mine=myMember();
  return head("المهام بالدور","الدور بيلف لوحده على المشاركين",isAdmin()?`<button class="btn primary" data-act="addChore">${icon("plus")} مهمة</button>`:"")+linkBanner()+
  `<section class="card">${S.chores.length?`<div class="list">${S.chores.map(c=>{ const t=C.choreTurn(c,S.roster); const dn=c.lastDone&&c.lastDone.date>=t.periodStart;
    return `<div class="row-item ${dn?"done":""}"><div class="ic-round ${t.who===mine?"acc":""}">${icon("broom")}</div><div class="grow"><b>${esc(c.title)}</b><div class="tiny">كل ${+c.everyDays||7} يوم · الدور على <b style="display:inline" class="acc">${esc(t.who?mName(t.who):"—")}</b>${t.who===mine?" (انت)":""} · فاضل ${t.daysLeft} يوم · بعده ${esc(t.next?mName(t.next):"—")}</div>${c.lastDone?`<div class="tiny">آخر مرة: ${esc(mName(c.lastDone.by))} — ${esc(c.lastDone.date)}</div>`:""}</div>
    <div class="actions">${canWrite()&&!dn?`<button class="btn sm primary" data-act="doneChore" data-id="${c.id}">${icon("check")} خلصت</button>`:""}${dn?'<span class="chip pos">اتعملت</span>':""}${isAdmin()?`<button class="btn sm icon danger" data-act="delChore" data-id="${c.id}">${icon("trash")}</button>`:""}</div></div>`}).join("")}</div>`:emptyBox("broom","مفيش مهام",isAdmin()?"دوس «مهمة» واختار المشاركين.":"")}</section>`;
}
function board(head){
  const can=canWrite()&&(isAdmin()||(PM("memberNotes")&&myMember()));
  const list=[...S.notes].sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0)||(b.createdAt||"").localeCompare(a.createdAt||""));
  return head("لوحة الإعلانات","")+linkBanner()+`<section class="card">${can?`<div class="actions" style="margin-bottom:14px;align-items:stretch"><textarea id="ntText" rows="2" maxlength="600" placeholder="اكتب إعلان للسكن…" style="flex:1 1 260px"></textarea><button class="btn primary" data-act="addNote">انشر</button></div>`:""}
  ${list.length?`<div class="list">${list.map(n=>`<div class="row-item ${n.pinned?"pinned":""}"><div class="ic-round acc">${icon(n.pinned?"pin":"mega")}</div><div class="grow"><div class="note-text">${esc(n.text)}</div><div class="tiny">${esc(n.memberId?mName(n.memberId):"المدير")} · ${esc(fmtDT(n.createdAt))}</div></div>
   <div class="actions">${isAdmin()?`<button class="btn sm" data-act="pinNote" data-id="${n.id}">${n.pinned?"فك":"ثبّت"}</button>`:""}${isAdmin()||n.createdBy===S.user.uid?`<button class="btn sm icon danger" data-act="delNote" data-id="${n.id}">${icon("trash")}</button>`:""}</div></div>`).join("")}</div>`:emptyBox("mega","مفيش إعلانات")}</section>`;
}
function polls(head){
  const can=canWrite()&&(isAdmin()||PM("memberPolls"));
  const list=[...S.polls].sort((a,b)=>(a.closed?1:0)-(b.closed?1:0)||(b.createdAt||"").localeCompare(a.createdAt||""));
  return head("التصويت","",can?`<button class="btn primary" data-act="addPoll">${icon("plus")} تصويت</button>`:"")+
  `<div class="grid">${list.length?list.map(p=>{ const votes=p.votes||{}; const tot=Object.keys(votes).length; const mineV=votes[S.user.uid];
    const counts=(p.options||[]).map((_,i)=>Object.values(votes).filter(v=>v===i).length);
    return `<section class="card"><div class="card-head"><h2 class="h">${esc(p.question)}</h2>${p.closed?'<span class="chip">اتقفل</span>':`<span class="chip acc">${tot} صوت</span>`}</div>
    <div class="list">${(p.options||[]).map((o,i)=>`<button class="poll-opt ${mineV===i?"mine":""}" data-act="vote" data-id="${p.id}" data-i="${i}" ${p.closed||!canWrite()?"disabled":""}><span style="display:flex;justify-content:space-between;gap:8px"><span>${esc(o)}</span><span class="num tiny">${counts[i]}${tot?` · ${Math.round(counts[i]/tot*100)}٪`:""}</span></span><span class="bar"><i style="width:${tot?counts[i]/tot*100:0}%"></i></span></button>`).join("")}</div>
    <div class="actions" style="margin-top:12px"><span class="tiny">${esc(fmtDT(p.createdAt))}</span>${isAdmin()||p.createdBy===S.user.uid?`<button class="btn sm" data-act="closePoll" data-id="${p.id}">${p.closed?"افتح":"اقفل"}</button><button class="btn sm icon danger" data-act="delPoll" data-id="${p.id}">${icon("trash")}</button>`:""}</div></section>`; }).join(""):`<section class="card">${emptyBox("poll","مفيش تصويت","نجيب مكنسة جديدة؟ نغيّر باقة النت؟ اسأل السكن.")}</section>`}</div>`;
}
function meters(head){
  const types=["كهرباء","مياه","غاز"]; const prices=S.house.meterPrices||{};
  const can=canWrite()&&(isAdmin()||PM("memberMeters"));
  const byType=t=>S.meters.filter(r=>r.type===t).sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  return head("العدادات","سجّل القراية كل شهر، والاستهلاك والفاتورة بيتحسبوا لوحدهم",can?`<button class="btn primary" data-act="addMeter">${icon("plus")} قراية</button>`:"")+
  `<div class="grid">${types.map(t=>{ const rs=byType(t); const pr=prices[t]||{};
    const rows=rs.map((r,i)=>{ const prev=rs[i-1]; const cons=prev?r2(r.reading-prev.reading):null; const cost=cons!=null&&pr.unit?r2(cons*(+pr.unit)+(+pr.fixed||0)):null; return {r,cons,cost}; }).reverse();
    return `<section class="card"><div class="card-head"><h2 class="h">${icon("bolt")} ${t}</h2><span class="tiny">${pr.unit?`${money(pr.unit)} للوحدة${pr.fixed?` + ${money(pr.fixed)} ثابت`:""}`:"السعر مش متحدد"}</span></div>
    ${rows.length?`<div class="list">${rows.slice(0,8).map(({r,cons,cost})=>`<div class="row-item"><div class="grow"><b class="num" style="text-align:right">${r.reading}</b><div class="tiny">${esc(r.date)}${cons!=null?` · استهلاك ${cons}`:" · أول قراية"}</div></div>
     ${cost!=null?`<span class="amt">${money(cost)}</span>`:""}<div class="actions">${cost!=null&&canAddExp()&&!r.expenseId?`<button class="btn sm primary" data-act="meterToExp" data-id="${r.id}" data-cost="${cost}" data-cons="${cons}">مصروف</button>`:""}${r.expenseId?'<span class="chip pos">اتسجّل</span>':""}${isAdmin()||r.createdBy===S.user.uid?`<button class="btn sm icon danger" data-act="delMeter" data-id="${r.id}">${icon("trash")}</button>`:""}</div></div>`).join("")}</div>`:emptyBox("bolt","مفيش قرايات")}</section>`; }).join("")}</div>`;
}
function deposits(head){
  const holder=S.house.depositHolder||""; const totalDep=S.roster.reduce((a,m)=>a+(+m.deposit||0),0);
  return head("التأمين والعهد","تأمين الشقة اللي دفعه كل ساكن، وحاجات البيت مع مين",isAdmin()?`<button class="btn primary" data-act="addItem">${icon("plus")} عهدة</button>`:"")+
  `<div class="grid3"><div class="stat"><div class="l"><span class="ic">${icon("shield")}</span>إجمالي التأمين</div><div class="v">${money(totalDep)}</div></div>
   <div class="stat"><div class="l"><span class="ic">${icon("wallet")}</span>التأمين مع</div><div class="v" style="font-size:1.1rem">${esc(holder?(holder==="landlord"?"صاحب الشقة":mName(holder)):"مش متحدد")}</div></div>
   <div class="stat"><div class="l"><span class="ic">${icon("key")}</span>عدد العهد</div><div class="v">${S.items.length}</div></div></div>
  <section class="card"><div class="card-head"><h2 class="h">تأمين كل ساكن</h2>${isAdmin()?`<button class="btn sm" data-act="depHolder">مين ماسك التأمين؟</button>`:""}</div>
   <div class="list">${S.roster.map(m=>`<div class="row-item"><div class="ic-round ${m.active===false?"":"acc"}">${icon("shield")}</div><div class="grow"><b>${esc(m.name)}</b><div class="tiny">${m.active===false?"ساب السكن":"ساكن"}${m.joined?" · من "+esc(m.joined):""}</div></div><span class="amt">${money(m.deposit||0)}</span>
   ${isAdmin()?`<div class="actions"><button class="btn sm icon" data-act="editMem" data-id="${m.id}">${icon("edit")}</button>${m.active!==false?`<button class="btn sm" data-act="moveOut" data-id="${m.id}">${icon("door")} تسوية خروج</button>`:""}</div>`:""}</div>`).join("")||emptyBox("users","مفيش سكان")}</div></section>
  <section class="card"><div class="card-head"><h2 class="h">عهد البيت</h2></div>${S.items.length?`<div class="list">${S.items.map(it=>`<div class="row-item"><div class="ic-round">${icon("key")}</div><div class="grow"><b>${esc(it.name)}</b><div class="tiny">مع ${esc(it.holder?mName(it.holder):"البيت")}${it.value?" · قيمتها "+money(it.value):""}${it.note?" · "+esc(it.note):""}</div></div>${isAdmin()?`<div class="actions"><button class="btn sm icon" data-act="editItem" data-id="${it.id}">${icon("edit")}</button><button class="btn sm icon danger" data-act="delItem" data-id="${it.id}">${icon("trash")}</button></div>`:""}</div>`).join("")}</div>`:emptyBox("key","مفيش عهد","مفاتيح، ريموت التكييف، الغسالة… سجّلها هنا.")}</section>`;
}
function contacts(head){
  return head("أرقام مهمة وقوانين السكن","",isAdmin()?`<button class="btn primary" data-act="addContact">${icon("plus")} رقم</button>`:"")+
  `<div class="grid"><section class="card"><div class="card-head"><h2 class="h">أرقام مهمة</h2></div>${S.contacts.length?`<div class="list">${S.contacts.map(c=>`<div class="row-item"><div class="ic-round acc">${icon("phone")}</div><div class="grow"><b>${esc(c.name)}</b><div class="tiny">${esc(c.role||"")} · <span class="num">${esc(c.phone||"")}</span></div></div>
   <div class="actions"><button class="btn sm icon" data-copy="${esc(c.phone||"")}" data-msg="اتنسخ الرقم" title="نسخ">${icon("copy")}</button>${waPhone(c.phone)?`<a class="btn sm icon" href="https://wa.me/${waPhone(c.phone)}" target="_blank" rel="noopener noreferrer" title="واتساب">${icon("wa")}</a>`:""}${isAdmin()?`<button class="btn sm icon danger" data-act="delContact" data-id="${c.id}">${icon("trash")}</button>`:""}</div></div>`).join("")}</div>`:emptyBox("phone","مفيش أرقام","صاحب الشقة، البوّاب، السبّاك، الكهربائي…")}</section>
  <section class="card"><div class="card-head"><h2 class="h">قوانين السكن</h2>${isAdmin()?`<button class="btn sm" data-act="editRules">${icon("edit")} تعديل</button>`:""}</div>${S.house.rulesText?`<div class="note-text">${esc(S.house.rulesText)}</div>`:emptyBox("door","مفيش قوانين مكتوبة","مواعيد الهدوء، الضيوف، النضافة…")}</section></div>`;
}
function members(head){
  const b=C.balances(data(),""), mine=myMember(), u=me();
  const usersList=Object.entries(S.users);
  return head("الأعضاء",`${active().length} ساكن`,isAdmin()?`<button class="btn primary" data-act="addMem">${icon("plus")} عضو</button><button class="btn" data-act="invite">${icon("key")} كود الدعوة</button>`:"")+linkBanner()+
  `${mine&&canWrite()&&F("instapay")?`<section class="card"><div class="card-head"><h2 class="h">بيانات الدفع بتاعتي</h2></div><p class="sub" style="margin:0 0 12px">بتظهر للسكان جنب أي تحويل ليك. لينك إنستاباي من الأبلكيشن: «استلام أموال» ← «مشاركة رابط الدفع».</p>
   <div class="form"><label class="f full">لينك إنستاباي<input id="myInsta" dir="ltr" value="${esc(u.instapay||"")}" placeholder="https://ipn.eg/S/..." maxlength="300"></label>
   <label class="f">عنوان إنستاباي<input id="myIpa" dir="ltr" value="${esc(u.ipa||"")}" placeholder="name@instapay" maxlength="60"></label>
   <label class="f">رقم المحفظة<input id="myWallet" dir="ltr" value="${esc(u.wallet||"")}" placeholder="01xxxxxxxxx" maxlength="20"></label>
   <label class="f">واتساب<input id="myPhone" dir="ltr" value="${esc(u.phone||"")}" placeholder="01xxxxxxxxx" maxlength="20"></label>
   <div class="full actions"><button class="btn primary" data-act="saveMyPay">حفظ</button>${F("statement")?`<button class="btn" data-act="statement" data-id="${mine}">كشف حسابي</button>`:""}</div></div></section>`:""}
  <section class="card"><div class="card-head"><h2 class="h">سكان الشقة</h2></div>${S.roster.length?`<div class="list">${S.roster.map(m=>{ const x=b[m.id]||{net:0}; const pi=payInfo(m.id); const showBal=PM("seeAll")||isAdmin()||m.id===mine;
    return `<div class="row-item"><div class="ic-round ${m.active===false?"":"acc"}">${icon("users")}</div><div class="grow"><b>${esc(m.name)} ${m.id===mine?'<span class="chip acc">انت</span>':""}</b><div class="tiny">${m.active===false?"ساب السكن":"ساكن"}${m.room?" · "+esc(m.room):""} · وزن ${+m.weight||1}${uidOf(m.id)?" · مربوط بحساب":""}</div>
    <div class="actions" style="margin-top:4px">${F("instapay")&&pi.instapay?`<a class="chip ins" href="${esc(pi.instapay)}" target="_blank" rel="noopener noreferrer">إنستاباي ↗</a>`:""}${F("instapay")&&pi.ipa?`<button class="chip ins" data-copy="${esc(pi.ipa)}">${esc(pi.ipa)}</button>`:""}</div></div>
    ${showBal?`<span class="amt num ${x.net>0.009?"pos":x.net<-0.009?"neg":""}">${money(x.net)}</span>`:""}
    <div class="actions">${F("statement")&&showBal?`<button class="btn sm icon" data-act="statement" data-id="${m.id}" title="كشف حساب">${icon("receipt")}</button>`:""}${isAdmin()?`<button class="btn sm icon" data-act="editMem" data-id="${m.id}" title="تعديل">${icon("edit")}</button>`:""}</div></div>`}).join("")}</div>`:onboarding()}</section>
  ${isAdmin()?`<section class="card"><div class="card-head"><h2 class="h">الحسابات والصلاحيات</h2><span class="tiny">مين داخل الموقع ودوره</span></div><div class="list">${usersList.map(([uid,x])=>`<div class="row-item"><img class="avatar" alt="" src="${esc(x.photo||"")}" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"><div class="grow"><b>${esc(x.name||x.email||"مستخدم")}</b><div class="tiny">${esc(x.email||"")} · ${x.memberId?"مربوط بـ "+esc(mName(x.memberId)):"مش مربوط"}${uid===S.house.ownerUid?" · المالك":""}</div></div>
    <div class="actions"><select data-role="${uid}" ${uid===S.house.ownerUid?"disabled":""} style="width:auto">${Object.entries(C.ROLES).map(([k,l])=>`<option value="${k}" ${x.role===k?"selected":""}>${l}</option>`).join("")}</select>
    <select data-bind="${uid}" style="width:auto"><option value="">— الاسم —</option>${S.roster.map(m=>`<option value="${m.id}" ${x.memberId===m.id?"selected":""}>${esc(m.name)}</option>`).join("")}</select>
    ${uid!==S.house.ownerUid?`<button class="btn sm icon danger" data-act="kick" data-id="${uid}" title="إخراج">${icon("x")}</button>`:""}</div></div>`).join("")}</div></section>`:""}`;
}
function stats(head){
  const m=S.f.month, list=S.expenses.filter(e=>!m||monthOf(e.date)===m), tot=list.reduce((a,e)=>a+(+e.amount||0),0);
  const byCat={}; list.forEach(e=>byCat[e.category||"أخرى"]=(byCat[e.category||"أخرى"]||0)+(+e.amount||0));
  const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]), mx=Math.max(1,...cats.map(c=>c[1]));
  const byM={}; S.expenses.forEach(e=>{const k=monthOf(e.date); byM[k]=(byM[k]||0)+(+e.amount||0);});
  const months=Object.entries(byM).sort().slice(-12), mm=Math.max(1,...months.map(x=>x[1]));
  const prev=months.length>1?months[months.length-2][1]:0, last=months.length?months[months.length-1][1]:0;
  const b=C.balances(data(),m); const bm=monthOf(today()); const bud=F("budgets")?Object.entries(S.house.budgets||{}).filter(([,v])=>+v>0):[];
  const spentC=c=>S.expenses.filter(e=>monthOf(e.date)===bm&&e.category===c).reduce((a,e)=>a+(+e.amount||0),0);
  return head("الإحصائيات","",`<select id="fMonth" style="width:auto">${monthOptions(m)}</select>`)+
  `<div class="grid3"><div class="stat"><div class="l"><span class="ic">${icon("receipt")}</span>الإجمالي</div><div class="v">${money(tot)}</div></div>
   <div class="stat"><div class="l"><span class="ic">${icon("chart")}</span>متوسط الشهر</div><div class="v">${money(months.length?months.reduce((a,x)=>a+x[1],0)/months.length:0)}</div></div>
   <div class="stat"><div class="l"><span class="ic">${icon("swap")}</span>آخر شهر مقابل اللي قبله</div><div class="v ${last>prev?"neg":"pos"}">${prev?Math.round((last-prev)/prev*100)+"٪":"—"}</div></div>
   <div class="stat"><div class="l"><span class="ic">${icon("users")}</span>نصيب الفرد</div><div class="v">${money(active().length?tot/active().length:0)}</div></div></div>
  ${bud.length?`<section class="card"><div class="card-head"><h2 class="h">الميزانية — ${esc(monthName(bm))}</h2></div><div class="list">${bud.map(([c,v])=>{const s=spentC(c); return `<div class="hbar"><span>${esc(c)}</span><div class="bar"><i class="${s>v?"over":""}" style="width:${Math.min(100,s/v*100)}%"></i></div><span class="num ${s>v?"neg":""}">${money(s)} / ${money(v)}</span></div>`;}).join("")}</div></section>`:""}
  <div class="grid"><section class="card"><div class="card-head"><h2 class="h">حسب الفئة</h2></div>${cats.length?`<div class="list">${cats.map(([c,v])=>`<div class="hbar"><span>${esc(c)}</span><div class="bar"><i style="width:${v/mx*100}%"></i></div><span class="num">${money(v)} <span class="tiny">${Math.round(v/tot*100)}٪</span></span></div>`).join("")}</div>`:emptyBox("chart","مفيش بيانات")}</section>
  <section class="card"><div class="card-head"><h2 class="h">كل شهر</h2></div>${months.length?`<div class="list">${months.map(([k,v])=>`<div class="hbar"><span>${esc(monthName(k))}</span><div class="bar"><i style="width:${v/mm*100}%"></i></div><span class="num">${money(v)}</span></div>`).join("")}</div>`:emptyBox("chart","مفيش بيانات")}</section></div>
  ${PM("seeAll")||isAdmin()?`<section class="card"><div class="card-head"><h2 class="h">دفع مقابل نصيبه</h2></div><div class="tablebox"><table><thead><tr><th>العضو</th><th class="n">دفع</th><th class="n">نصيبه</th><th class="n">بعت</th><th class="n">استلم</th><th class="n">الصافي</th></tr></thead><tbody>${S.roster.map(x=>{const v=b[x.id]; return `<tr><td>${esc(x.name)}</td><td class="n">${money(v.paid)}</td><td class="n">${money(v.share)}</td><td class="n">${money(v.sent)}</td><td class="n">${money(v.recv)}</td><td class="n ${v.net>0.009?"pos":v.net<-0.009?"neg":""}">${money(v.net)}</td></tr>`;}).join("")}</tbody></table></div></section>`:""}`;
}
function activity(head){
  const ev=[]; const who=uid=>{ const u=S.users[uid]; return u ? (u.memberId?mName(u.memberId):(u.name||"مستخدم")) : "حد من السكن"; };
  S.expenses.forEach(e=>{ ev.push([e.createdAt,e.createdBy,`سجّل «${e.title}» ${money(e.amount)}`]); if(e.updatedAt) ev.push([e.updatedAt,e.updatedBy,`عدّل «${e.title}»`]); });
  S.payments.forEach(p=>{ ev.push([p.createdAt,p.createdBy,`سجّل دفعة ${money(p.amount)} من ${mName(p.from)} لـ ${mName(p.to)}`]); if(p.confirmedAt) ev.push([p.confirmedAt,p.confirmedBy,`أكّد استلام ${money(p.amount)}`]); });
  S.fund.forEach(f=>ev.push([f.createdAt,f.createdBy,`اشتراك صندوق ${money(f.amount)} لـ ${mName(f.memberId)}`]));
  S.shopping.forEach(x=>{ ev.push([x.createdAt,x.createdBy,`طلب «${x.item}»`]); if(x.boughtAt) ev.push([x.boughtAt,x.boughtByUid,`اشترى «${x.item}»`]); });
  S.chores.forEach(c=>(c.log||[]).forEach(l=>ev.push([l.at,l.uid,`خلّص «${c.title}»`])));
  S.notes.forEach(n=>ev.push([n.createdAt,n.createdBy,"نشر إعلان"])); S.polls.forEach(p=>ev.push([p.createdAt,p.createdBy,`عمل تصويت «${p.question}»`]));
  S.meters.forEach(r=>ev.push([r.createdAt,r.createdBy,`سجّل قراية ${r.type} ${r.reading}`]));
  const list=ev.filter(x=>x[0]).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,120);
  return head("سجل النشاط",`آخر ${list.length} حركة`)+`<section class="card">${list.length?`<div class="log">${list.map(([t,u,txt])=>`<div><time>${esc(fmtDT(t))}</time><span><b>${esc(who(u))}</b> ${esc(txt)}</span></div>`).join("")}</div>`:emptyBox("clock","مفيش نشاط")}</section>`;
}
function settings(head){
  const h=S.house, f={...C.DEFAULT_FEATURES,...(h.features||{})}, p={...C.DEFAULT_PERMS,...(h.perms||{})};
  const thisM=monthOf(today()); const ms=[...new Set([thisM,...S.expenses.map(e=>monthOf(e.date))].filter(Boolean))].sort().reverse();
  const sw=(attr,key,on,title,sub)=>`<div class="toggle"><div class="grow"><b>${title}</b>${sub?`<span class="tiny">${sub}</span>`:""}</div><label class="switch"><input type="checkbox" ${attr}="${key}" ${on?"checked":""} aria-label="${esc(title)}"><span></span></label></div>`;
  const mp=h.meterPrices||{}; const fc=h.fundCfg||{};
  return head("الإدارة","انت متحكم في كل حاجة — أي تغيير بيتطبّق على الكل فورًا")+
  `<section class="card"><div class="card-head"><h2 class="h">بيانات السكن</h2></div><div class="form">
    <label class="f">اسم السكن<input id="sName" value="${esc(h.name||"")}" maxlength="50"></label>
    <label class="f">العملة<select id="sCur">${["ج.م","ر.س","د.إ","د.ك","$","€"].map(c=>`<option ${c===cur()?"selected":""}>${c}</option>`).join("")}</select></label>
    <div class="full"><button class="btn primary" data-act="saveHouse">حفظ</button></div></div></section>
  <div class="grid">
   <section class="card"><div class="card-head"><h2 class="h">المزايا</h2><span class="tiny">شغّل أو اقفل أي ميزة</span></div><div class="toggle-list">${C.FEATURES.map(([k,t,s])=>sw("data-feat",k,f[k]!==false,t,s)).join("")}</div></section>
   <section class="card"><div class="card-head"><h2 class="h">صلاحيات الأعضاء</h2><span class="tiny">المدير دايمًا يقدر يعمل كل حاجة</span></div><div class="toggle-list">${C.PERMS.map(([k,,t,s])=>sw("data-perm",k,!!p[k],t,s)).join("")}</div>
    <p class="tiny" style="margin:12px 0 0">الأدوار: <b>مدير</b> يتحكم في كل حاجة · <b>عضو</b> حسب الصلاحيات دي · <b>مشاهد</b> يتفرّج بس. تغيّر دور أي حد من «الأعضاء».</p></section>
  </div>
  ${f.guests!==false?`<section class="card"><div class="card-head"><h2 class="h">الضيوف</h2></div><p class="sub" style="margin:0 0 12px">الفئات اللي الضيف بيزوّد فيها حصة المستضيف:</p><div class="checks">${C.CATS.map(c=>`<label><input type="checkbox" data-gcat="${c}" ${(h.guestCats||C.GUEST_CATS).includes(c)?"checked":""}> ${c}</label>`).join("")}</div><div class="actions" style="margin-top:12px"><button class="btn primary" data-act="saveGuestCats">حفظ</button></div></section>`:""}
  <section class="card"><div class="card-head"><h2 class="h">كود الدعوة</h2></div><div class="actions"><button class="btn" data-act="invite">${icon("key")} عرض الكود واللينك</button><button class="btn" data-act="newCode">كود جديد (يلغي القديم)</button></div></section>
  ${f.recurring!==false?`<section class="card"><div class="card-head"><h2 class="h">الفواتير الثابتة</h2><div class="actions"><button class="btn sm" data-act="addRec">${icon("plus")} بند</button><button class="btn sm primary" data-act="applyRec" ${(h.recurring||[]).length?"":"disabled"}>أضفها لـ ${esc(monthName(thisM))}</button></div></div>
   ${(h.recurring||[]).length?`<div class="list">${h.recurring.map((r,i)=>`<div class="row-item"><div class="grow"><b>${esc(r.title)}</b><div class="tiny">${esc(r.category)} · يدفعه ${esc(mName(r.paidBy))} · ${r.mode==="weight"?"بالأوزان":"بالتساوي"} · يوم ${+r.dueDay||1}</div></div><span class="amt">${money(r.amount)}</span><button class="btn sm icon danger" data-act="delRec" data-i="${i}">${icon("trash")}</button></div>`).join("")}</div>`:`<p class="sub" style="margin:0">زي الإيجار والإنترنت.</p>`}</section>`:""}
  ${f.budgets!==false?`<section class="card"><div class="card-head"><h2 class="h">الميزانية الشهرية</h2></div><div class="form">${C.CATS.map(c=>`<label class="f">${c}<input type="number" min="0" data-budget="${c}" value="${(h.budgets||{})[c]||""}"></label>`).join("")}<div class="full"><button class="btn primary" data-act="saveBudgets">حفظ</button></div></div></section>`:""}
  ${f.meters!==false?`<section class="card"><div class="card-head"><h2 class="h">أسعار العدادات</h2></div><div class="form">${["كهرباء","مياه","غاز"].map(t=>`<label class="f">${t} — سعر الوحدة<input type="number" min="0" step="0.01" data-mp="${t}" data-k="unit" value="${(mp[t]||{}).unit||""}"></label><label class="f">${t} — رسوم ثابتة<input type="number" min="0" step="0.01" data-mp="${t}" data-k="fixed" value="${(mp[t]||{}).fixed||""}"></label>`).join("")}<div class="full"><button class="btn primary" data-act="saveMeters">حفظ</button></div></div></section>`:""}
  ${f.fund?`<section class="card"><div class="card-head"><h2 class="h">الصندوق</h2></div><div class="form"><label class="f">الاشتراك الشهري للفرد<input id="fMonthly" type="number" min="0" value="${fc.monthly||""}"></label><div class="full"><button class="btn primary" data-act="saveFund">حفظ</button></div></div></section>`:""}
  <section class="card"><div class="card-head"><h2 class="h">قفل الشهور</h2></div><p class="sub" style="margin:0 0 12px">الشهر المقفول محدش يعدّل فيه غير المدير.</p><div class="checks">${ms.map(m=>`<label><input type="checkbox" data-lock="${m}" ${(h.lockedMonths||[]).includes(m)?"checked":""}> ${esc(monthName(m))}</label>`).join("")}</div></section>
  <section class="card"><div class="card-head"><h2 class="h">البيانات</h2></div><div class="actions"><button class="btn" data-act="backup">${icon("download")} نسخة احتياطية JSON</button><button class="btn" data-act="csv">${icon("download")} المصاريف CSV</button></div></section>
  <section class="card"><div class="card-head"><h2 class="h neg">منطقة الخطر</h2></div><div class="actions">${isOwner()?`<button class="btn danger" data-act="deleteHouse">${icon("trash")} حذف السكن نهائيًا</button>`:`<button class="btn danger" data-act="leave">${icon("door")} خروج من السكن</button>`}</div></section>`;
}

/* ---------------- new features ---------------- */
const pendingLoans = () => S.loans.filter(l=>!C.confirmed(l) && (isAdmin() || l.to===myMember()));
function myEvents(){
  const mid=myMember(), uid=S.user?.uid, ev=[]; if(!uid) return ev;
  S.expenses.forEach(e=>{ if(e.createdBy===uid||!mid) return; const sh=C.shares(e,S.roster)[mid]; if(sh) ev.push({at:e.createdAt,ic:"receipt",go:"expenses",t:`${mName(e.paidBy)} دفع «${e.title}» — نصيبك ${money(sh)}`}); });
  S.payments.forEach(p=>{ if(p.to===mid&&p.createdBy!==uid) ev.push({at:p.createdAt,ic:"wallet",go:"payments",t:`${mName(p.from)} ${C.confirmed(p)?"سجّل إنه دفعلك":"بيقول إنه دفعلك — أكّد الاستلام:"} ${money(p.amount)}`});
    if(p.from===mid&&p.confirmedAt&&p.confirmedBy!==uid) ev.push({at:p.confirmedAt,ic:"check",go:"payments",t:`${mName(p.to)} أكّد استلام ${money(p.amount)} منك`}); });
  if(F("loans")) S.loans.forEach(l=>{ if(l.to===mid&&l.createdBy!==uid) ev.push({at:l.createdAt,ic:"hand",go:"loans",t:`${mName(l.from)} سجّل ${l.type==="repay"?"إنه سدّدلك":"إنه سلّفك"} ${money(l.amount)}${C.confirmed(l)?"":" — أكّد"}`});
    if(l.from===mid&&l.confirmedAt&&l.confirmedBy!==uid) ev.push({at:l.confirmedAt,ic:"check",go:"loans",t:`${mName(l.to)} أكّد ${l.type==="repay"?"السداد":"السلفة"} ${money(l.amount)}`}); });
  if(F("fund")) S.fund.forEach(f=>{ if(f.memberId===mid&&f.confirmedAt&&f.confirmedBy!==uid) ev.push({at:f.confirmedAt,ic:"piggy",go:"fund",t:`المدير أكّد اشتراكك في الصندوق ${money(f.amount)}`}); });
  if(F("board")) S.notes.forEach(n=>{ if(n.createdBy!==uid) ev.push({at:n.createdAt,ic:"mega",go:"board",t:`إعلان: ${String(n.text||"").slice(0,70)}`}); });
  if(F("polls")) S.polls.forEach(p=>{ if(p.createdBy!==uid) ev.push({at:p.createdAt,ic:"poll",go:"polls",t:`تصويت جديد: ${p.question}`}); });
  if(F("chores")&&mid) S.chores.forEach(c=>{ const t=C.choreTurn(c,S.roster); if(t.who===mid) ev.push({at:t.periodStart+"T05:00:00.000Z",ic:"broom",go:"chores",t:`دورك في «${c.title}» — فاضل ${t.daysLeft} يوم`}); });
  if(F("guests")) S.guests.forEach(g=>{ if(g.createdBy!==uid) ev.push({at:g.createdAt,ic:"guest",go:"guests",t:`${mName(g.hostId)} عنده ضيف (${g.name}) من ${g.from} لـ ${g.to||g.from}`}); });
  if(F("closing")) S.closings.forEach(c=>{ if(c.closedBy!==uid) ev.push({at:c.closedAt,ic:"file",go:"closing",t:`اتقفل حساب ${monthName(c.month)} — التقرير جاهز`}); });
  const now=iso(); return ev.filter(x=>x.at&&x.at<=now).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,100);
}
const unread = () => { if(!F("notifications")||!S.user) return 0; const seen=me().seenAt||""; return myEvents().filter(e=>e.at>seen).length; };
function notifs(head){
  const ev=myEvents(), seen=S.seenBefore??(me().seenAt||"");
  const perm=("Notification" in window)?Notification.permission:"unsupported";
  return head("الإشعارات","كل جديد يخصك")+
  `${perm!=="granted"&&perm!=="unsupported"?`<section class="card"><div class="card-head"><h2 class="h">${icon("bell")} إشعارات الجهاز</h2></div><p class="sub" style="margin:0 0 12px">فعّلها علشان يطلعلك تنبيه على الموبايل أو الكمبيوتر بالجديد. التنبيه بيوصل طول ما الموقع أو التطبيق مفتوح ولو في الخلفية.</p><button class="btn primary" data-act="enableNotif">${icon("bell")} فعّل الإشعارات</button>${perm==="denied"?`<div class="notice" style="margin-top:10px">الإشعارات مقفولة من إعدادات المتصفح للموقع ده — افتحها من أيقونة القفل جنب العنوان.</div>`:""}</section>`:""}
  <section class="card">${ev.length?`<div class="list">${ev.map(e=>{ const n=e.at>seen; return `<button class="row-item" data-go="${e.go}" style="text-align:right;cursor:pointer;width:100%${n?";border-color:var(--accent)":""}"><div class="ic-round ${n?"acc":""}">${icon(e.ic)}</div><div class="grow"><b>${esc(e.t)}</b><div class="tiny">${esc(fmtDT(e.at))}</div></div>${n?'<span class="chip acc">جديد</span>':""}</button>`; }).join("")}</div>`:emptyBox("bell","مفيش إشعارات","أي حاجة جديدة تخصك هتظهر هنا.")}</section>`;
}
function sysNotify(){
  if(!F("notifications")||!("Notification" in window)||Notification.permission!=="granted") return;
  const key="sakan-notified-"+S.hid, last=store.get(key), ev=myEvents();
  if(!last){ store.set(key,iso()); return; }
  const fresh=ev.filter(e=>e.at>last).slice(0,5); if(!fresh.length) return;
  store.set(key,fresh[0].at);
  if(!document.hidden) return;
  const title=S.house?.name||"سكن";
  fresh.forEach(e=>{ const opt={body:e.t,icon:"icon-192.png",badge:"icon-192.png",tag:"sakan-"+e.at,lang:"ar",dir:"rtl"};
    const fallback=()=>{ try{ new Notification(title,opt); }catch(_){} };
    if(navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then(r=>r.showNotification(title,opt)).catch(fallback); else fallback(); });
}
function autoRecurring(){
  if(!isAdmin()||!F("autoRecurring")||!F("recurring")||!active().length) return; const m=monthOf(today());
  for(const r of dueBills()){ if(r.left>0) continue; const id=`rec_${m}_${C.slug(r.title)}`; if(S.autoRec.has(id)||S.expenses.some(e=>e.id===id)||(S.house.recSkip||[]).includes(id)) continue; S.autoRec.add(id);
    const date=`${m}-${String(+r.dueDay||1).padStart(2,"0")}`;
    setDoc(H("expenses",id),{title:r.title,amount:r2(r.amount),category:r.category,paidBy:r.paidBy,date,month:m,split:{mode:r.mode,members:active().map(x=>x.id)},note:"بند شهري ثابت — اتضاف تلقائيًا",recurring:true,receiptId:null,createdBy:S.user.uid,createdAt:iso()})
      .then(()=>toast(`اتضاف «${r.title}» تلقائيًا`)).catch(e=>console.warn(e)); }
}
function afterData(){ if(!S.user||!S.hid||!S.house) return; if(!["house","users","roster","expenses","payments"].every(k=>S.loaded[k])) return; autoRecurring(); sysNotify(); }
function quickAddBox(){ if(!F("quickAdd")||!canAddExp()) return "";
  return `<section class="card"><div class="card-head"><h2 class="h">${icon("sparkle")} إضافة بجملة</h2><span class="tiny">مثال: أحمد دفع 300 أكل على الكل</span></div><div class="actions"><input id="qaText" placeholder="مين دفع كام على إيه وعلى مين…" maxlength="160" style="flex:1 1 240px"><button class="btn primary" data-act="quickParse">كمّل</button></div></section>`; }
const nights=g=>Math.max(1,Math.round((new Date((g.to||g.from)+"T00:00:00")-new Date(g.from+"T00:00:00"))/864e5)+1);
function guests(head){
  const td=today(), can=canWrite()&&(isAdmin()||(PM("memberGuests")&&myMember()));
  const cur=S.guests.filter(g=>g.from<=td&&td<=(g.to||g.from)), up=S.guests.filter(g=>g.from>td), past=S.guests.filter(g=>(g.to||g.from)<td).sort((a,b)=>(b.from||"").localeCompare(a.from||""));
  const cats=S.house.guestCats||C.GUEST_CATS;
  const row=g=>`<div class="row-item"><div class="ic-round acc">${icon("guest")}</div><div class="grow"><b>${esc(g.name)} — ضيف ${esc(mName(g.hostId))}</b><div class="tiny">${esc(g.from)}${g.to&&g.to!==g.from?" ← "+esc(g.to):""} · ${nights(g)} يوم · حصته ×${+g.factor||1}${g.note?" · "+esc(g.note):""}</div></div>${isAdmin()||g.createdBy===S.user.uid?`<div class="actions"><button class="btn sm icon" data-act="editGuest" data-id="${g.id}">${icon("edit")}</button><button class="btn sm icon danger" data-act="delGuest" data-id="${g.id}">${icon("trash")}</button></div>`:""}</div>`;
  const sec=(t,l)=>l.length?`<section class="card"><div class="card-head"><h2 class="h">${t}</h2><span class="chip">${l.length}</span></div><div class="list">${l.map(row).join("")}</div></section>`:"";
  return head("الضيوف",cats.length?`الضيف بيزوّد حصة اللي مستضيفه في: ${cats.join("، ")}`:"مفيش فئات متحددة للضيوف من «الإدارة»",can?`<button class="btn primary" data-act="addGuest">${icon("plus")} ضيف</button>`:"")+linkBanner()+
   (S.guests.length?sec("موجودين دلوقتي",cur)+sec("جايين",up)+sec("مشيوا",past.slice(0,30)):`<section class="card">${emptyBox("guest","مفيش ضيوف","لما حد يجيب ضيف يقعد أيام، سجّله هنا — المصاريف اللي في الفترة دي هتزوّد على المستضيف حصة الضيف لوحدها.")}</section>`)+
   `<section class="card"><div class="card-head"><h2 class="h">إزاي بيتحسب؟</h2></div><p class="sub" style="margin:0">مثال: أكل 600 على 3 سكان، وعند أحمد ضيف حصته ×1 يوم المصروف ← يتقسم على 4 حصص: أحمد عليه حصتين (300) والاتنين التانيين 150 لكل واحد. ده بيحصل بس لو المستضيف من اللي اتقسم عليهم المصروف، وتقدر تلغيه لأي مصروف من علامة «ما تحسبش الضيوف».</p></section>`;
}
function loans(head){
  const mine=myMember(), nets=C.loanNets(S.loans), can=canWrite()&&(isAdmin()||(PM("memberLoans")&&mine));
  const vis=l=>PM("seeAll")||isAdmin()||l.from===mine||l.to===mine;
  const list=S.loans.filter(vis).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||"").localeCompare(a.createdAt||""));
  const nv=nets.filter(n=>PM("seeAll")||isAdmin()||n.debtor===mine||n.creditor===mine);
  return head("السلف بين السكان","فلوس شخصية بين السكان — منفصلة عن حسابات الشقة",can?`<button class="btn primary" data-act="addLoan">${icon("plus")} سلفة</button>`:"")+linkBanner()+
  `<section class="card"><div class="card-head"><h2 class="h">مين مديون لمين</h2></div>${nv.length?`<div class="list">${nv.map(n=>`<div class="row-item"><div class="ic-round neg">${icon("hand")}</div><div class="grow"><b>${esc(mName(n.debtor))} مديون لـ ${esc(mName(n.creditor))}</b>${n.debtor===mine?'<div class="tiny">انت</div>':n.creditor===mine?'<div class="tiny">ليك</div>':""}</div><span class="amt">${money(n.amount)}</span>${can&&(isAdmin()||n.debtor===mine||n.creditor===mine)?`<button class="btn sm primary" data-act="repayLoan" data-from="${n.debtor}" data-to="${n.creditor}" data-amt="${n.amount}">سدّد</button>`:""}</div>`).join("")}</div>`:emptyBox("check","مفيش سلف مفتوحة")}</section>
  <section class="card"><div class="card-head"><h2 class="h">السجل</h2></div>${list.length?`<div class="list">${list.map(l=>{ const canConf=!C.confirmed(l)&&(isAdmin()||l.to===mine);
    return `<div class="row-item"><div class="ic-round ${C.confirmed(l)?(l.type==="repay"?"pos":"acc"):"neg"}">${icon(l.type==="repay"?"check":"hand")}</div><div class="grow"><b>${l.type==="repay"?`${esc(mName(l.from))} سدّد لـ ${esc(mName(l.to))}`:`${esc(mName(l.from))} سلّف ${esc(mName(l.to))}`}</b><div class="tiny">${esc(l.date)} · ${C.confirmed(l)?"مؤكدة":"مستنية تأكيد "+esc(mName(l.to))}${l.note?" · "+esc(l.note):""}</div></div>
    <span class="amt">${money(l.amount)}</span><div class="actions">${canConf?`<button class="btn sm primary" data-act="confirmLoan" data-id="${l.id}">تأكيد</button>`:""}${isAdmin()||(!C.confirmed(l)&&(l.createdBy===S.user.uid||l.to===mine))?`<button class="btn sm icon danger" data-act="delLoan" data-id="${l.id}">${icon("trash")}</button>`:""}</div></div>`; }).join("")}</div>`:emptyBox("hand","مفيش سلف متسجّلة")}</section>`;
}
function monthSnapshot(m){
  const list=S.expenses.filter(e=>monthOf(e.date)===m); const total=r2(list.reduce((a,e)=>a+(+e.amount||0),0));
  const byCat={}; list.forEach(e=>byCat[e.category||"أخرى"]=r2((byCat[e.category||"أخرى"]||0)+(+e.amount||0)));
  const b=C.balances(data(),m); const balances={}; S.roster.forEach(x=>{ const v=b[x.id]; if(v) balances[x.id]={name:x.name,paid:r2(v.paid),share:r2(v.share),net:v.net}; });
  return {total,count:list.length,byCat,balances,plan:C.settlePlan(C.balances(data(),""))};
}
function closing(head){
  const closed=Object.fromEntries(S.closings.map(c=>[c.month,c]));
  const ms=[...new Set([monthOf(today()),...S.expenses.map(e=>monthOf(e.date)),...S.closings.map(c=>c.month)].filter(Boolean))].sort().reverse();
  return head("قفل الشهر والتقارير","التقرير بيتطبع أو يتحفظ PDF من المتصفح")+`<section class="card"><div class="list">${ms.map(m=>{ const c=closed[m]; const tot=S.expenses.filter(e=>monthOf(e.date)===m).reduce((a,e)=>a+(+e.amount||0),0);
   return `<div class="row-item"><div class="ic-round ${c?"pos":"acc"}">${icon(c?"lock":"file")}</div><div class="grow"><b>${esc(monthName(m))}</b><div class="tiny">${money(tot)} · ${c?`اتقفل ${esc(fmtDT(c.closedAt))}`:locked(m+"-01")?"مقفول":"مفتوح"}</div></div><div class="actions"><button class="btn sm" data-act="report" data-m="${m}">${icon("file")} التقرير</button>${isAdmin()?(c?`<button class="btn sm" data-act="reopenMonth" data-m="${m}">افتح</button>`:`<button class="btn sm primary" data-act="closeMonth" data-m="${m}">${icon("lock")} اقفل</button>`):""}</div></div>`; }).join("")}</div>
   <p class="tiny" style="margin:12px 0 0">قفل الشهر بيحفظ نسخة من أرقامه، ويمنع الأعضاء من إضافة أو تعديل أي حاجة فيه.</p></section>`;
}
function printReport(m){
  const list=S.expenses.filter(e=>monthOf(e.date)===m).sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  const pays=S.payments.filter(p=>monthOf(p.date)===m&&C.confirmed(p)).sort((a,b)=>(a.date||"").localeCompare(b.date||""));
  const snap=monthSnapshot(m), cl=S.closings.find(c=>c.month===m);
  const tr=cells=>`<tr>${cells.map(c=>`<td>${c}</td>`).join("")}</tr>`;
  document.getElementById("printRoot").innerHTML=`<div class="rep">
   <h1>${esc(S.house.name||"سكن")} — تقرير ${esc(monthName(m))}</h1><p>اتطبع ${esc(fmtDT(iso()))}${cl?` · الشهر مقفول من ${esc(fmtDT(cl.closedAt))}`:""}</p>
   <h2>الملخص</h2><table><tbody>${tr(["إجمالي المصاريف",money(snap.total)])}${tr(["عدد البنود",snap.count])}${tr(["نصيب الفرد تقريبًا",money(active().length?snap.total/active().length:0)])}</tbody></table>
   <h2>حسب الفئة</h2><table><thead><tr><th>الفئة</th><th>المبلغ</th></tr></thead><tbody>${Object.entries(snap.byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>tr([esc(c),money(v)])).join("")}</tbody></table>
   <h2>كل ساكن في الشهر</h2><table><thead><tr><th>الاسم</th><th>دفع</th><th>نصيبه</th><th>الصافي</th></tr></thead><tbody>${Object.values(snap.balances).map(v=>tr([esc(v.name),money(v.paid),money(v.share),money(v.net)])).join("")}</tbody></table>
   <h2>التسويات المطلوبة (الرصيد الكلي)</h2>${snap.plan.length?`<table><tbody>${snap.plan.map(p=>tr([`${esc(mName(p.from))} يدفع لـ ${esc(mName(p.to))}`,money(p.amount)])).join("")}</tbody></table>`:"<p>الحسابات متصفّية.</p>"}
   <h2>المصاريف</h2><table><thead><tr><th>التاريخ</th><th>البند</th><th>الفئة</th><th>دفعه</th><th>المبلغ</th></tr></thead><tbody>${list.map(e=>tr([esc(e.date),esc(e.title),esc(e.category||""),esc(mName(e.paidBy)),money(e.amount)])).join("")}</tbody></table>
   ${pays.length?`<h2>الدفعات</h2><table><thead><tr><th>التاريخ</th><th>من</th><th>إلى</th><th>المبلغ</th></tr></thead><tbody>${pays.map(p=>tr([esc(p.date),esc(mName(p.from)),esc(mName(p.to)),money(p.amount)])).join("")}</tbody></table>`:""}</div>`;
  setTimeout(()=>window.print(),150);
}
window.addEventListener("afterprint",()=>{ const pr=document.getElementById("printRoot"); if(pr) pr.innerHTML=""; });
const COL_AR={expenses:"مصروف",payments:"دفعة",fund:"اشتراك صندوق",roster:"ساكن",users:"حساب",house:"إعدادات السكن",shopping:"مشتريات",chores:"مهمة",notes:"إعلان",polls:"تصويت",meters:"قراية عداد",items:"عهدة",contacts:"رقم",guests:"ضيف",loans:"سلفة",closings:"قفل شهر"};
const ACT_AR={create:"أضاف",update:"عدّل",delete:"حذف"};
const FIELD_AR={title:"البند",amount:"المبلغ",date:"التاريخ",category:"الفئة",paidBy:"دفعه",split:"التقسيم",note:"ملاحظة",from:"من",to:"إلى",status:"الحالة",method:"الطريقة",name:"الاسم",weight:"الوزن",active:"ساكن",role:"الدور",memberId:"مربوط بـ",deposit:"التأمين",item:"الحاجة",qty:"الكمية",bought:"اتشرى",text:"النص",pinned:"مثبّت",reading:"القراية",type:"النوع",hostId:"المستضيف",factor:"الحصة",lockedMonths:"الشهور المقفولة",noGuests:"من غير ضيوف",room:"الأوضة",lastDone:"آخر مرة",closed:"مقفول"};
function fmtVal(k,v){ if(v==null||v==="") return "—"; if(["paidBy","from","to","memberId","hostId","addedBy","boughtBy"].includes(k)) return mName(v); if(k==="amount"||k==="deposit") return money(v);
  if(k==="split") return v.mode==="custom"?Object.entries(v.custom||{}).map(([a,b])=>`${mName(a)}: ${b}`).join("، "):(v.members||[]).map(mName).join("، ");
  if(k==="role") return C.ROLES[v]||v; if(k==="status") return v==="pending"?"مستنية تأكيد":"مؤكدة"; if(typeof v==="boolean") return v?"أيوه":"لأ"; if(Array.isArray(v)) return v.join("، ")||"—"; if(typeof v==="object") return JSON.stringify(v).slice(0,80); return String(v); }
function auditView(head){
  const who=uid=>{ const u=S.users[uid]; return u?(u.memberId?mName(u.memberId):(u.name||"مستخدم")):"حد خرج من السكن"; };
  const skip=new Set(["createdBy","createdAt","updatedAt","updatedBy","confirmedAt","confirmedBy","month","receiptId","order","log","votes","joinedAt","photo","email","boughtByUid","boughtAt","expenseId","joinCode"]);
  const gp=(o,k)=>k.split(".").reduce((x,p)=>x==null?undefined:x[p],o);
  const f=S.f.audit||""; const list=S.audit.filter(a=>!f||a.action===f);
  const ttl=a=>{ const o=a.after&&a.action!=="update"?a.after:(a.before||a.after||{}); return o.title||o.name||o.item||o.question||(o.text?String(o.text).slice(0,40):"")||(o.amount?money(o.amount):"")||(a.col==="closings"?monthName(a.refId):""); };
  const line=a=>{ let rows=[];
    if(a.action==="update") rows=Object.keys(a.after||{}).filter(k=>!skip.has(k.split(".")[0])).map(k=>{ const bv=gp(a.before||{},k), v=a.after[k]; if(JSON.stringify(bv)===JSON.stringify(v)) return ""; const label=k.startsWith("features.")?"ميزة «"+((C.FEATURES.find(x=>x[0]===k.slice(9))||[])[1]||k)+"»":k.startsWith("perms.")?"صلاحية «"+((C.PERMS.find(x=>x[0]===k.slice(6))||[])[2]||k)+"»":(FIELD_AR[k]||k); return `<div class="tiny">${esc(label)}: <s>${esc(fmtVal(k,bv))}</s> ← <b style="display:inline">${esc(fmtVal(k,v))}</b></div>`; }).filter(Boolean);
    else { const o=(a.action==="delete"?a.before:a.after)||{}; rows=["amount","date","paidBy","from","to","hostId"].filter(k=>o[k]!=null&&o[k]!=="").map(k=>`<div class="tiny">${esc(FIELD_AR[k]||k)}: ${esc(fmtVal(k,o[k]))}</div>`); }
    return `<div class="row-item" style="align-items:flex-start"><div class="ic-round ${a.action==="delete"?"neg":a.action==="create"?"pos":"acc"}">${icon(a.action==="delete"?"trash":a.action==="create"?"plus":"edit")}</div><div class="grow"><b>${esc(who(a.uid))} ${ACT_AR[a.action]||a.action} ${esc(COL_AR[a.col]||a.col)} ${esc(ttl(a))}</b>${rows.join("")}<div class="tiny">${esc(fmtDT(a.at))}</div></div></div>`; };
  return head("سجل التعديلات","كل إضافة وتعديل وحذف — ومحدش يقدر يمسحه",`<select id="fAudit" style="width:auto"><option value="">الكل</option><option value="create" ${f==="create"?"selected":""}>إضافة</option><option value="update" ${f==="update"?"selected":""}>تعديل</option><option value="delete" ${f==="delete"?"selected":""}>حذف</option></select>`)+
   `<section class="card">${list.length?`<div class="list">${list.slice(0,200).map(line).join("")}</div>`:emptyBox("history","مفيش تعديلات متسجّلة لسه","من دلوقتي أي إضافة أو تعديل أو حذف هيتسجّل هنا.")}</section>`;
}

/* ---------------- modals: data entry ---------------- */
function expModal(e,preset){
  const isNew=!e; const mine=myMember();
  e=e||{date:today(),category:"أكل وبقالة",paidBy:isAdmin()?(mine||active()[0]?.id):mine,split:{mode:"equal",members:active().map(m=>m.id)},...(preset||{})};
  const sp=JSON.parse(JSON.stringify(e.split||{mode:"equal",members:[]})); let receipt=null, receiptId=e.receiptId||null;
  let payers=(isAdmin()||PM("expOthers"))?S.roster.filter(m=>m.active!==false||m.id===e.paidBy):S.roster.filter(m=>m.id===mine);
  const payerOpts=payers.map(m=>`<option value="${m.id}" ${m.id===e.paidBy?"selected":""}>${esc(m.name)}</option>`).join("")+(F("fund")&&isAdmin()?`<option value="${FUND}" ${e.paidBy===FUND?"selected":""}>الصندوق المشترك</option>`:"");
  const pool=S.roster.filter(m=>m.active!==false||(sp.members||[]).includes(m.id)||(sp.custom||{})[m.id]);
  modal(`<h3>${isNew?"مصروف جديد":"تعديل مصروف"}<button class="btn icon ghost" data-close>${icon("x")}</button></h3><div class="form">
   <label class="f full">البند<input id="eTitle" value="${esc(e.title||"")}" placeholder="مثلًا: فاتورة كهرباء" maxlength="80"></label>
   <label class="f">المبلغ (${esc(cur())})<input id="eAmt" type="number" inputmode="decimal" min="0" step="0.01" value="${e.amount??""}"></label>
   <label class="f">التاريخ<input id="eDate" type="date" value="${esc(e.date)}"></label>
   <label class="f">الفئة<select id="eCat">${C.CATS.map(c=>`<option ${c===e.category?"selected":""}>${c}</option>`).join("")}</select></label>
   <label class="f">مين دفع<select id="ePaid">${payerOpts}</select></label>
   <div class="full"><div class="seg" id="eMode">${[["equal","بالتساوي"],["weight","بالأوزان"],["custom","مبالغ مخصّصة"]].map(([k,l])=>`<button type="button" data-mode="${k}" aria-pressed="${(sp.mode||"equal")===k}">${l}</button>`).join("")}</div></div>
   <div class="full"><div class="actions" style="margin-bottom:8px"><button class="btn sm" type="button" id="eAll">الكل</button><button class="btn sm" type="button" id="eNone">ولا حد</button></div><div class="checks" id="eMembers"></div><div class="tiny" id="eHint" style="margin-top:6px"></div></div>
   ${F("guests")?`<label class="full" style="display:flex;gap:8px;align-items:center;font-size:.85rem;color:var(--muted)"><input type="checkbox" id="eNoG" ${e.noGuests?"checked":""}> ما تحسبش الضيوف في المصروف ده</label>`:""}
   <label class="f full">ملاحظة<textarea id="eNote" rows="2" maxlength="200">${esc(e.note||"")}</textarea></label>
   ${F("receipts")?`<div class="full" id="eRcpt"></div>`:""}</div>
   <div class="mfoot"><button class="btn primary" id="eSave">${isNew?"إضافة":"حفظ"}</button><button class="btn" data-close>إلغاء</button></div>`,ov=>{
    sp.mode=sp.mode||"equal";
    const box=ov.querySelector("#eMembers"), hint=ov.querySelector("#eHint"), rc=ov.querySelector("#eRcpt");
    const drawR=()=>{ if(!rc) return; rc.innerHTML=(receipt||receiptId?`<div class="actions" style="margin-bottom:8px">${receipt?`<img class="thumb" alt="" src="${receipt}">`:`<span class="chip acc">${icon("image")} فيه إيصال</span>`}<button class="btn sm" type="button" id="rRm">شيل</button></div>`:"")+`<label class="f">صورة الإيصال (اختياري)<input type="file" id="rFile" accept="image/*"></label>`;
      const rm=rc.querySelector("#rRm"); rm&&(rm.onclick=()=>{ receipt=null; receiptId=null; drawR(); });
      rc.querySelector("#rFile").onchange=async ev2=>{ const fl=ev2.target.files[0]; if(!fl) return; toast("بنجهّز الصورة…"); const d=await C.compressImage(fl).catch(()=>null); if(!d) return toast("الصورة كبيرة أوي"); receipt=d; receiptId=null; drawR(); }; };
    drawR();
    const draw=()=>{ ov.querySelectorAll("#eMode button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.mode===sp.mode));
      box.innerHTML=pool.map(m=>sp.mode==="custom"?`<label>${esc(m.name)} <input type="number" step="0.01" min="0" data-cm="${m.id}" value="${(sp.custom||{})[m.id]??""}"></label>`
        :`<label><input type="checkbox" data-sm="${m.id}" ${(sp.members||[]).includes(m.id)?"checked":""}> ${esc(m.name)}${sp.mode==="weight"?` <span class="tiny">×${+m.weight||1}</span>`:""}</label>`).join(""); calc(); };
    const calc=()=>{ const amt=+ov.querySelector("#eAmt").value||0;
      if(sp.mode==="custom"){ const s=Object.values(sp.custom||{}).reduce((a,b)=>a+(+b||0),0), d=r2(amt-s); hint.innerHTML=d===0?`<span class="pos">مضبوط</span>`:`<span class="neg">${d>0?"فاضل":"زيادة"} ${money(Math.abs(d))}</span>`; }
      else { const ex={amount:amt,split:sp,date:ov.querySelector("#eDate").value,category:ov.querySelector("#eCat").value,noGuests:!!ov.querySelector("#eNoG")?.checked}; const s=C.shares(ex,S.roster); const gx=C.guestExtra(ex); const gt=Object.keys(gx).filter(id=>(sp.members||[]).includes(id)).map(mName).join("، ");
        hint.textContent=(sp.members||[]).length?sp.members.map(id=>`${mName(id)}: ${money(s[id])}`).join(" · ")+(gt?` — شامل ضيوف عند ${gt}`:""):"اختار عضو واحد على الأقل"; } };
    ov.querySelector("#eMode").onclick=ev2=>{ const b=ev2.target.closest("[data-mode]"); if(!b) return; sp.mode=b.dataset.mode; if(sp.mode!=="custom"&&!(sp.members||[]).length) sp.members=active().map(m=>m.id); draw(); };
    ov.querySelector("#eAll").onclick=()=>{ sp.members=active().map(m=>m.id); draw(); };
    ov.querySelector("#eNone").onclick=()=>{ sp.members=[]; sp.custom={}; draw(); };
    box.addEventListener("input",()=>{ if(sp.mode==="custom"){ sp.custom={}; box.querySelectorAll("[data-cm]").forEach(i=>{ if(+i.value) sp.custom[i.dataset.cm]=+i.value; }); } else sp.members=[...box.querySelectorAll("[data-sm]:checked")].map(i=>i.dataset.sm); calc(); });
    ov.querySelector("#eAmt").oninput=calc; ["#eDate","#eCat","#eNoG"].forEach(q=>{ const el=ov.querySelector(q); el&&el.addEventListener("change",calc); }); draw();
    ov.querySelector("#eSave").onclick=async()=>{
      const title=ov.querySelector("#eTitle").value.trim(), amount=r2(ov.querySelector("#eAmt").value), date=ov.querySelector("#eDate").value;
      if(!title) return toast("اكتب اسم البند"); if(!(amount>0)) return toast("المبلغ لازم يكون أكبر من صفر"); if(!date) return toast("اختار التاريخ");
      if(locked(date)&&!isAdmin()) return toast("الشهر ده مقفول");
      const split={mode:sp.mode};
      if(sp.mode==="custom"){ split.custom={}; Object.entries(sp.custom||{}).forEach(([k,v])=>{ if(+v) split.custom[k]=r2(v); }); if(Math.abs(Object.values(split.custom).reduce((a,b)=>a+b,0)-amount)>.01) return toast("مجموع المبالغ لازم يساوي الإجمالي"); }
      else { split.members=sp.members||[]; if(!split.members.length) return toast("اختار عضو واحد على الأقل"); }
      const btn=ov.querySelector("#eSave"); btn.disabled=true;
      try{
        if(receipt){ const r=await addDoc(HC("receipts"),{data:receipt,createdBy:S.user.uid,createdAt:iso()}); receiptId=r.id; }
        const d={title,amount,date,month:monthOf(date),category:ov.querySelector("#eCat").value,paidBy:ov.querySelector("#ePaid").value,split,note:ov.querySelector("#eNote").value.trim(),receiptId:receiptId||null,noGuests:!!ov.querySelector("#eNoG")?.checked};
        if(isNew){ const ref=await addDoc(HC("expenses"),{...d,recurring:!!e.recurring,createdBy:S.user.uid,createdAt:iso()});
          if(preset?._shopId) await updateDoc(H("shopping",preset._shopId),{bought:true,boughtBy:d.paidBy,boughtByUid:S.user.uid,boughtAt:iso(),expenseId:ref.id});
          if(preset?._meterId) await updateDoc(H("meters",preset._meterId),{expenseId:ref.id});
          toast("اتسجّل المصروف"); }
        else { await updateDoc(H("expenses",e.id),{...d,updatedAt:iso(),updatedBy:S.user.uid}); toast("اتحفظ"); }
        closeModal();
      }catch(err){ btn.disabled=false; fail(err); } };
  });
}
function payModal(p,preset){
  const isNew=!p, mine=myMember();
  p=p||{date:today(),from:preset?.from||(isAdmin()?active()[0]?.id:mine),to:preset?.to||"",amount:preset?.amount||"",method:"إنستاباي"};
  const opts=sel=>S.roster.map(m=>`<option value="${m.id}" ${m.id===sel?"selected":""}>${esc(m.name)}</option>`).join("");
  modal(`<h3>${isNew?"تسجيل دفعة":"تعديل دفعة"}<button class="btn icon ghost" data-close>${icon("x")}</button></h3><div class="form">
   <label class="f">من (الدافع)<select id="pFrom">${opts(p.from)}</select></label><label class="f">إلى (المستلم)<select id="pTo">${opts(p.to)}</select></label>
   <label class="f">المبلغ<input id="pAmt" type="number" min="0" step="0.01" value="${p.amount}"></label><label class="f">التاريخ<input id="pDate" type="date" value="${esc(p.date)}"></label>
   <label class="f">الطريقة<select id="pMethod">${["إنستاباي","محفظة","كاش","تحويل بنكي"].map(x=>`<option ${x===p.method?"selected":""}>${x}</option>`).join("")}</select></label>
   <label class="f">ملاحظة / رقم العملية<input id="pNote" value="${esc(p.note||"")}" maxlength="120"></label></div><div id="pInfo" style="margin-top:12px"></div>
   <div class="mfoot"><button class="btn primary" id="pSave">${isNew?"تسجيل":"حفظ"}</button><button class="btn" data-close>إلغاء</button></div>`,ov=>{
    const info=()=>{ const to=ov.querySelector("#pTo").value, pi=payInfo(to), el=ov.querySelector("#pInfo"); if(!F("instapay")) return;
      el.innerHTML=(pi.instapay||pi.ipa||pi.wallet)?`<div class="payinfo"><b>ادفع لـ ${esc(mName(to))}</b>${pi.instapay?`<div class="line"><a class="btn sm insta" href="${esc(pi.instapay)}" target="_blank" rel="noopener noreferrer">${icon("wallet")} افتح إنستاباي</a></div>`:""}${pi.ipa?`<div class="line">IPA <code>${esc(pi.ipa)}</code><button class="btn sm" data-copy="${esc(pi.ipa)}">نسخ</button></div>`:""}${pi.wallet?`<div class="line">محفظة <code>${esc(pi.wallet)}</code><button class="btn sm" data-copy="${esc(pi.wallet)}">نسخ</button></div>`:""}</div>`:""; };
    ov.querySelector("#pTo").onchange=info; info();
    ov.querySelector("#pSave").onclick=async()=>{
      const d={from:ov.querySelector("#pFrom").value,to:ov.querySelector("#pTo").value,amount:r2(ov.querySelector("#pAmt").value),date:ov.querySelector("#pDate").value,method:ov.querySelector("#pMethod").value,note:ov.querySelector("#pNote").value.trim()};
      d.month=monthOf(d.date);
      if(d.from===d.to) return toast("الدافع والمستلم لازم يختلفوا"); if(!(d.amount>0)) return toast("اكتب المبلغ"); if(!d.date) return toast("اختار التاريخ");
      if(!isAdmin()&&d.from!==mine&&d.to!==mine) return toast("لازم تكون الدافع أو المستلم"); if(!isAdmin()&&locked(d.date)) return toast("الشهر ده مقفول");
      const ok=isAdmin()||d.to===mine||!PM("payConfirm"); const btn=ov.querySelector("#pSave"); btn.disabled=true;
      try{ if(isNew) await addDoc(HC("payments"),{...d,status:ok?"confirmed":"pending",...(ok?{confirmedAt:iso(),confirmedBy:S.user.uid}:{}),createdBy:S.user.uid,createdAt:iso()});
        else await updateDoc(H("payments",p.id),{...d,updatedAt:iso(),updatedBy:S.user.uid});
        toast(isNew&&!ok?`اتسجّلت — مستنية ${mName(d.to)} يأكد`:"اتسجّلت"); closeModal(); }catch(err){ btn.disabled=false; fail(err); } };
  });
}
function memModal(m){
  const isNew=!m; m=m||{weight:1,active:true};
  modal(`<h3>${isNew?"عضو جديد":"تعديل عضو"}<button class="btn icon ghost" data-close>${icon("x")}</button></h3><div class="form">
   <label class="f full">الاسم<input id="mName" value="${esc(m.name||"")}" maxlength="40"></label>
   <label class="f">الأوضة<input id="mRoom" value="${esc(m.room||"")}" maxlength="40"></label><label class="f">الوزن في التقسيم<input id="mW" type="number" min="0.1" step="0.1" value="${+m.weight||1}"></label>
   <label class="f">تاريخ السكن<input id="mJoined" type="date" value="${esc(m.joined||"")}"></label><label class="f">التأمين المدفوع<input id="mDep" type="number" min="0" value="${m.deposit||""}"></label>
   <label class="f full">لينك إنستاباي<input id="mInsta" dir="ltr" value="${esc(m.instapay||"")}" placeholder="https://ipn.eg/S/..." maxlength="300"></label>
   <label class="f">عنوان إنستاباي<input id="mIpa" dir="ltr" value="${esc(m.ipa||"")}" maxlength="60"></label><label class="f">محفظة<input id="mWallet" dir="ltr" value="${esc(m.wallet||"")}" maxlength="20"></label>
   <label class="f">واتساب<input id="mPhone" dir="ltr" value="${esc(m.phone||"")}" maxlength="20"></label>
   ${isNew?"":`<label class="f full" style="flex-direction:row;display:flex;gap:8px;align-items:center"><input type="checkbox" id="mAct" ${m.active!==false?"checked":""}> لسه ساكن</label>`}</div>
   <p class="tiny">لو العضو حط بيانات الدفع بنفسه، بياناته هي اللي بتظهر.</p>
   <div class="mfoot"><button class="btn primary" id="mSave">${isNew?"إضافة":"حفظ"}</button><button class="btn" data-close>إلغاء</button>${!isNew?`<button class="btn danger" id="mDel" style="margin-inline-start:auto">حذف</button>`:""}</div>`,ov=>{
    ov.querySelector("#mSave").onclick=async()=>{ const name=ov.querySelector("#mName").value.trim(); if(!name) return toast("اكتب الاسم");
      const ins=ov.querySelector("#mInsta").value.trim(); if(ins&&!safeUrl(ins)) return toast("لينك إنستاباي لازم يبدأ بـ https://");
      const d={name,room:ov.querySelector("#mRoom").value.trim(),weight:Math.max(.1,+ov.querySelector("#mW").value||1),joined:ov.querySelector("#mJoined").value,deposit:r2(ov.querySelector("#mDep").value),instapay:ins,ipa:ov.querySelector("#mIpa").value.trim(),wallet:ov.querySelector("#mWallet").value.trim(),phone:ov.querySelector("#mPhone").value.trim()};
      if(!isNew) d.active=ov.querySelector("#mAct").checked;
      try{ if(isNew) await addDoc(HC("roster"),{...d,active:true,order:S.roster.length,createdAt:iso()}); else await updateDoc(H("roster",m.id),d); toast("اتحفظ"); closeModal(); }catch(e){ fail(e); } };
    const del=ov.querySelector("#mDel"); del&&(del.onclick=()=>{ const used=S.expenses.some(e=>e.paidBy===m.id||(e.split?.members||[]).includes(m.id)||(e.split?.custom||{})[m.id])||S.payments.some(p=>p.from===m.id||p.to===m.id);
      if(used) return toast("العضو ليه حركات — شيل علامة «لسه ساكن» بدل الحذف");
      confirmBox(`حذف ${m.name}؟`,"احذف",async()=>{ try{ await deleteDoc(H("roster",m.id)); toast("اتحذف"); }catch(e){ fail(e); } }); });
  });
}
function simpleModal(title,fields,onSave){
  modal(`<h3>${title}<button class="btn icon ghost" data-close>${icon("x")}</button></h3><div class="form">${fields.map(f=>`<label class="f ${f.full?"full":""}">${f.label}${f.type==="select"?`<select id="sf_${f.id}">${f.options.map(([v,l])=>`<option value="${esc(v)}" ${v===f.value?"selected":""}>${esc(l)}</option>`).join("")}</select>`:f.type==="textarea"?`<textarea id="sf_${f.id}" rows="${f.rows||4}" maxlength="${f.max||2000}">${esc(f.value||"")}</textarea>`:`<input id="sf_${f.id}" type="${f.type||"text"}" value="${esc(f.value??"")}" ${f.attrs||""} ${f.dir?`dir="${f.dir}"`:""} placeholder="${esc(f.ph||"")}">`}</label>`).join("")}</div>
  <div class="mfoot"><button class="btn primary" id="sfSave">حفظ</button><button class="btn" data-close>إلغاء</button></div>`,ov=>{
    ov.querySelector("#sfSave").onclick=async()=>{ const v={}; fields.forEach(f=>v[f.id]=ov.querySelector("#sf_"+f.id).value.trim()); const btn=ov.querySelector("#sfSave"); btn.disabled=true;
      try{ const r=await onSave(v); if(r===false){ btn.disabled=false; return; } closeModal(); }catch(e){ btn.disabled=false; fail(e); } }; });
}
function choreModal(){
  modal(`<h3>مهمة بالدور<button class="btn icon ghost" data-close>${icon("x")}</button></h3><div class="form">
   <label class="f full">المهمة<input id="cT" placeholder="مثلًا: تنضيف الحمام" maxlength="60"></label><label class="f">كل كام يوم<input id="cE" type="number" min="1" max="60" value="7"></label><label class="f">تبدأ من<input id="cS" type="date" value="${today()}"></label>
   <div class="full"><div class="tiny" style="margin-bottom:6px">المشاركين بالترتيب</div><div class="checks">${active().map(m=>`<label><input type="checkbox" data-cm="${m.id}" checked> ${esc(m.name)}</label>`).join("")}</div></div></div>
   <div class="mfoot"><button class="btn primary" id="cSave">إضافة</button><button class="btn" data-close>إلغاء</button></div>`,ov=>{
    ov.querySelector("#cSave").onclick=async()=>{ const title=ov.querySelector("#cT").value.trim(), ids=[...ov.querySelectorAll("[data-cm]:checked")].map(i=>i.dataset.cm);
      if(!title) return toast("اكتب المهمة"); if(!ids.length) return toast("اختار مشارك");
      try{ await addDoc(HC("chores"),{title,members:ids,everyDays:Math.max(1,+ov.querySelector("#cE").value||7),start:ov.querySelector("#cS").value||today(),log:[],createdBy:S.user.uid,createdAt:iso()}); toast("اتضافت"); closeModal(); }catch(e){ fail(e); } }; });
}
function pollModal(){
  modal(`<h3>تصويت جديد<button class="btn icon ghost" data-close>${icon("x")}</button></h3><div class="form"><label class="f full">السؤال<input id="poQ" maxlength="120"></label>
   <label class="f full">الاختيارات (كل اختيار في سطر)<textarea id="poO" rows="4" placeholder="أيوه&#10;لأ&#10;مش فارقة"></textarea></label></div>
   <div class="mfoot"><button class="btn primary" id="poS">انشر</button><button class="btn" data-close>إلغاء</button></div>`,ov=>{
    ov.querySelector("#poS").onclick=async()=>{ const q=ov.querySelector("#poQ").value.trim(), o=ov.querySelector("#poO").value.split("\n").map(x=>x.trim()).filter(Boolean).slice(0,8);
      if(!q) return toast("اكتب السؤال"); if(o.length<2) return toast("محتاج اختيارين على الأقل");
      try{ await addDoc(HC("polls"),{question:q,options:o,votes:{},closed:false,createdBy:S.user.uid,createdAt:iso()}); toast("اتنشر"); closeModal(); }catch(e){ fail(e); } }; });
}
function statementModal(mid){
  const lines=[];
  S.expenses.forEach(e=>{ const sh=C.shares(e,S.roster)[mid]||0, pd=e.paidBy===mid?+e.amount:0; if(sh||pd) lines.push([e.date,e.createdAt||"",e.title,pd,sh]); });
  S.payments.filter(C.confirmed).forEach(p=>{ if(p.from===mid) lines.push([p.date,p.createdAt||"",`دفعة لـ ${mName(p.to)}`,+p.amount,0]); if(p.to===mid) lines.push([p.date,p.createdAt||"",`استلم من ${mName(p.from)}`,0,+p.amount]); });
  if(F("fund")) S.fund.filter(C.confirmed).forEach(f=>{ if(f.memberId===mid) lines.push([f.date,f.createdAt||"","اشتراك الصندوق",+f.amount,0]); });
  lines.sort((a,b)=>(a[0]||"").localeCompare(b[0]||"")||a[1].localeCompare(b[1]));
  let run=0; const rows=lines.map(l=>{ run=r2(run+l[3]-l[4]); return `<tr><td class="n">${esc(l[0])}</td><td>${esc(l[2])}</td><td class="n pos">${l[3]?money(l[3]):""}</td><td class="n neg">${l[4]?money(l[4]):""}</td><td class="n ${run>0.009?"pos":run<-0.009?"neg":""}">${money(run)}</td></tr>`; }).join("");
  modal(`<h3>كشف حساب — ${esc(mName(mid))}<button class="btn icon ghost" data-close>${icon("x")}</button></h3>${lines.length?`<div class="tablebox"><table><thead><tr><th class="n">التاريخ</th><th>البيان</th><th class="n">له</th><th class="n">عليه</th><th class="n">الرصيد</th></tr></thead><tbody>${rows}</tbody></table></div>
   <p style="margin:14px 0 0;font-weight:600">الرصيد النهائي: <span class="${run>0.009?"pos":run<-0.009?"neg":""}">${money(Math.abs(run))} ${run>0.009?"ليه":run<-0.009?"عليه":"متصفّي"}</span></p>`:emptyBox("receipt","مفيش حركات")}
   <div class="mfoot"><button class="btn" data-close>إغلاق</button></div>`,null,true);
}
function moveOutModal(mid){
  const m=S.roster.find(x=>x.id===mid); const net=C.balances(data(),"")[mid]?.net||0; const dep=+m.deposit||0; const items=S.items.filter(i=>i.holder===mid);
  const final=r2(net+dep);
  modal(`<h3>تسوية خروج — ${esc(m.name)}<button class="btn icon ghost" data-close>${icon("x")}</button></h3>
   <div class="list"><div class="row-item"><div class="grow"><b>رصيده في الحسابات</b></div><span class="amt ${net>0?"pos":net<0?"neg":""}">${money(net)}</span></div>
   <div class="row-item"><div class="grow"><b>التأمين اللي دفعه</b><div class="tiny">مع ${esc(S.house.depositHolder?(S.house.depositHolder==="landlord"?"صاحب الشقة":mName(S.house.depositHolder)):"مش متحدد")}</div></div><span class="amt">${money(dep)}</span></div>
   <div class="row-item" style="border-color:var(--accent)"><div class="grow"><b>${final>=0?"يستلم عند الخروج":"عليه يدفع قبل الخروج"}</b><div class="tiny">الرصيد + التأمين</div></div><span class="amt ${final>=0?"pos":"neg"}">${money(Math.abs(final))}</span></div></div>
   ${items.length?`<div class="notice" style="margin-top:12px">لازم يسلّم العهد دي: ${items.map(i=>esc(i.name)).join("، ")}</div>`:""}
   <p class="tiny" style="margin-top:12px">بعد ما الفلوس تتسلّم سجّلها كدفعة، وبعدين علّمه إنه ساب السكن (حساباته القديمة بتفضل محفوظة).</p>
   <div class="mfoot"><button class="btn primary" id="moDone">${icon("door")} علّمه إنه ساب السكن</button><button class="btn" data-close>إلغاء</button></div>`,ov=>{
    ov.querySelector("#moDone").onclick=async()=>{ try{ await updateDoc(H("roster",mid),{active:false,leftAt:today()}); for(const it of items) await updateDoc(H("items",it.id),{holder:""}); toast("اتسجّل خروجه"); closeModal(); }catch(e){ fail(e); } }; });
}
function inviteModal(){
  const code=S.house.joinCode; const link=`${location.origin}${location.pathname}#join=${code}`;
  modal(`<h3>دعوة السكان<button class="btn icon ghost" data-close>${icon("x")}</button></h3>
   ${PM("autoJoin")?"":`<div class="notice" style="margin-bottom:12px">الانضمام بالكود مقفول من الصلاحيات — افتحه الأول.</div>`}
   <div class="code-box">${esc(code)}</div><p class="sub" style="text-align:center">أو ابعتلهم اللينك ده — بيدخلوا بحساب جوجل وينضموا على طول</p>
   <div class="payinfo"><code>${esc(link)}</code></div>
   <div class="mfoot"><button class="btn primary" data-copy="${esc(link)}" data-msg="اتنسخ اللينك">${icon("copy")} انسخ اللينك</button><a class="btn" href="https://wa.me/?text=${encodeURIComponent(`انضم لحسابات ${S.house.name} على سكن: ${link}`)}" target="_blank" rel="noopener noreferrer">${icon("wa")} ابعت واتساب</a><button class="btn" data-close>تمام</button></div>`);
}
function quickSheet(){
  const opts=[["addExp","receipt","مصروف",canAddExp()],["addPay","swap","دفعة",F("payments")&&canAddExp()],["addFund","piggy","اشتراك صندوق",F("fund")&&canWrite()&&(isAdmin()||PM("memberFund"))&&myMember()],
    ["quickShop","cart","حاجة ناقصة",F("shopping")&&canWrite()&&(isAdmin()||PM("memberShopping"))],["addMeter","bolt","قراية عداد",F("meters")&&canWrite()&&(isAdmin()||PM("memberMeters"))],["addPoll","poll","تصويت",F("polls")&&canWrite()&&(isAdmin()||PM("memberPolls"))]].filter(o=>o[3]);
  modal(`<h3>إضافة سريعة<button class="btn icon ghost" data-close>${icon("x")}</button></h3><div class="sheet-grid">${opts.map(([a,ic,l])=>`<button data-qa="${a}"><span class="ic-round acc">${icon(ic)}</span>${l}</button>`).join("")}</div>`,ov=>{
    ov.querySelector(".sheet-grid").onclick=e=>{ const b=e.target.closest("[data-qa]"); if(!b) return; closeModal(); handle(b.dataset.qa,b); }; });
}
function moreSheet(){
  const tabs=["home","expenses","payments","members"]; const rest=navItems().filter(i=>!tabs.includes(i[0]));
  modal(`<h3>كل الأقسام<button class="btn icon ghost" data-close>${icon("x")}</button></h3><div class="sheet-grid">${rest.map(([v,l,ic])=>`<button data-gv="${v}"><span class="ic-round acc">${icon(ic)}</span>${l}${badgeFor(v)?` <span class="chip neg">${badgeFor(v)}</span>`:""}</button>`).join("")}
   <button data-gv="@new"><span class="ic-round">${icon("plus")}</span>سكن جديد أو انضم بكود</button>
   <button data-gv="@logout"><span class="ic-round">${icon("logout")}</span>خروج</button></div>
   ${Object.keys(S.memberships).length>1?`<label class="f" style="margin-top:14px">تبديل السكن<select id="hsM">${Object.entries(S.memberships).map(([id,n])=>`<option value="${id}" ${id===S.hid?"selected":""}>${esc(n)}</option>`).join("")}</select></label>`:""}`,ov=>{
    ov.querySelector(".sheet-grid").onclick=e=>{ const b=e.target.closest("[data-gv]"); if(!b) return; if(b.dataset.gv==="@logout"){ closeModal(); return signOut(auth); } if(b.dataset.gv==="@new"){ closeModal(); return renderNoHouse(); } go(b.dataset.gv); };
    const hs=ov.querySelector("#hsM"); hs&&(hs.onchange=()=>{ closeModal(); openHouse(hs.value); }); });
}
function summaryText(){
  const m=monthOf(today()), b=C.balances(data(),""), plan=C.settlePlan(b);
  const tot=S.expenses.filter(e=>monthOf(e.date)===m).reduce((a,e)=>a+(+e.amount||0),0);
  const byCat={}; S.expenses.filter(e=>monthOf(e.date)===m).forEach(e=>byCat[e.category]=(byCat[e.category]||0)+(+e.amount||0));
  let t=`📊 ملخص ${S.house.name} — ${monthName(m)}\n\nإجمالي المصاريف: ${money(tot)}\nنصيب الفرد تقريبًا: ${money(active().length?tot/active().length:0)}\n\n`;
  t+=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`• ${c}: ${money(v)}`).join("\n");
  t+=`\n\n💰 التسويات المطلوبة:\n`+(plan.length?plan.map(p=>{ const pi=payInfo(p.to); return `• ${mName(p.from)} ← ${mName(p.to)}: ${money(p.amount)}${F("instapay")&&pi.instapay?`\n  ${pi.instapay}`:""}`; }).join("\n"):"الحسابات متصفّية ✅");
  return t;
}

/* ---------------- actions ---------------- */
function bindView(){
  const on=(id,ev,fn)=>{ const el=document.getElementById(id); el&&el.addEventListener(ev,fn); };
  on("fMonth","change",e=>{S.f.month=e.target.value; render();}); on("fCat","change",e=>{S.f.cat=e.target.value; render();}); on("fMem","change",e=>{S.f.mem=e.target.value; render();});
  on("fQ","input",e=>{ S.f.q=e.target.value; clearTimeout(bindView.t); bindView.t=setTimeout(()=>{ const pos=e.target.selectionStart; e.target.blur(); render(); const q=document.getElementById("fQ"); if(q){ q.focus(); q.setSelectionRange(pos,pos);} },300); });
  on("shItem","keydown",e=>{ if(e.key==="Enter") handle("addShop"); });
  on("qaText","keydown",e=>{ if(e.key==="Enter") handle("quickParse"); });
  on("fAudit","change",e=>{ S.f.audit=e.target.value; render(); });
  const c=document.getElementById("content");
  c.querySelectorAll("[data-feat]").forEach(i=>i.onchange=()=>upHouse({["features."+i.dataset.feat]:i.checked},i.checked?"اتشغّلت":"اتقفلت"));
  c.querySelectorAll("[data-perm]").forEach(i=>i.onchange=()=>upHouse({["perms."+i.dataset.perm]:i.checked},"اتحفظت الصلاحية"));
  c.querySelectorAll("[data-lock]").forEach(i=>i.onchange=()=>{ const s=new Set(S.house.lockedMonths||[]); i.checked?s.add(i.dataset.lock):s.delete(i.dataset.lock); upHouse({lockedMonths:[...s]},i.checked?"الشهر اتقفل":"الشهر اتفتح"); });
  c.querySelectorAll("[data-role]").forEach(s=>s.onchange=async()=>{ try{ await updateDoc(H("users",s.dataset.role),{role:s.value}); toast("اتغيّر الدور"); }catch(e){ fail(e); } });
  c.querySelectorAll("[data-bind]").forEach(s=>s.onchange=async()=>{ try{ await updateDoc(H("users",s.dataset.bind),{memberId:s.value||null}); toast("اتحفظ"); }catch(e){ fail(e); } });
}
async function upHouse(patch,msg){ try{ await updateDoc(doc(db,"houses",S.hid),patch); msg&&toast(msg); }catch(e){ fail(e); } }
document.addEventListener("focusout",()=>{ setTimeout(()=>{ if(S.dirty && !document.querySelector("#modalRoot .overlay")){ const ae=document.activeElement; if(!(ae&&ae.closest&&ae.closest("#content")&&/INPUT|TEXTAREA/.test(ae.tagName)&&ae.value)){ S.dirty=false; render(); } } },50); });
root.addEventListener("click",e=>{
  const cp=e.target.closest("[data-copy]"); if(cp) return copy(cp.dataset.copy,cp.dataset.msg);
  const g=e.target.closest("[data-go]"); if(g) return go(g.dataset.go);
  const b=e.target.closest("[data-act]"); if(b) handle(b.dataset.act,b);
});
async function run(fn,ok){ try{ await fn(); ok&&toast(ok); }catch(e){ fail(e); } }
function handle(a,b={dataset:{}}){
  const id=b.dataset?.id; const E=S.expenses.find(x=>x.id===id), P=S.payments.find(x=>x.id===id), M=S.roster.find(x=>x.id===id);
  switch(a){
    case "theme": return toggleTheme();
    case "newHouse": return renderNoHouse();
    case "logout": return signOut(auth);
    case "quick": return quickSheet();
    case "more": return moreSheet();
    case "goSettings": return go("settings");
    case "addExp": return expModal();
    case "editExp": return E&&expModal(E);
    case "delExp": return E&&confirmBox(`حذف «${E.title}»؟`,"احذف",()=>run(async()=>{ await deleteDoc(H("expenses",id)); if(id.startsWith("rec_")&&isAdmin()) await updateDoc(doc(db,"houses",S.hid),{recSkip:[...new Set([...(S.house.recSkip||[]),id])].slice(-60)}); if(E.receiptId) await deleteDoc(H("receipts",E.receiptId)).catch(()=>{}); },"اتحذف"));
    case "viewReceipt": return (async()=>{ try{ const s=await getDoc(H("receipts",id)); if(!s.exists()) return toast("الإيصال مش موجود"); modal(`<h3>الإيصال<button class="btn icon ghost" data-close>${icon("x")}</button></h3><img class="receipt-full" alt="صورة الإيصال" src="${esc(s.data().data)}">`,null,true); }catch(e){ fail(e); } })();
    case "addPay": return payModal();
    case "quickpay": return payModal(null,{from:b.dataset.from,to:b.dataset.to,amount:+b.dataset.amt});
    case "editPay": return P&&payModal(P);
    case "delPay": return P&&confirmBox("حذف الدفعة؟","احذف",()=>run(()=>deleteDoc(H("payments",id)),"اتحذفت"));
    case "confirmPay": return run(()=>updateDoc(H("payments",id),{status:"confirmed",confirmedAt:iso(),confirmedBy:S.user.uid}),"اتأكدت");
    case "rejectPay": return confirmBox("الدفعة ما وصلتكش؟","شيلها",()=>run(()=>deleteDoc(H("payments",id)),"اتشالت"),"هتتشال من السجل والرصيد مش هيتغيّر.");
    case "statement": return statementModal(id);
    case "summary": { const t=summaryText(); return modal(`<h3>ملخص الشهر<button class="btn icon ghost" data-close>${icon("x")}</button></h3><textarea rows="12" readonly>${esc(t)}</textarea><div class="mfoot"><button class="btn primary" data-copy="${esc(t)}">${icon("copy")} نسخ</button><a class="btn" href="https://wa.me/?text=${encodeURIComponent(t)}" target="_blank" rel="noopener noreferrer">${icon("wa")} واتساب</a></div>`); }
    case "addMem": return memModal();
    case "editMem": return M&&memModal(M);
    case "link": { const v=document.getElementById("linkSel")?.value; return v&&run(()=>updateDoc(H("users",S.user.uid),{memberId:v}),"أهلًا يا "+mName(v)); }
    case "saveMyPay": { const ins=document.getElementById("myInsta").value.trim(); if(ins&&!safeUrl(ins)) return toast("اللينك لازم يبدأ بـ https://");
      return run(()=>updateDoc(H("users",S.user.uid),{instapay:ins,ipa:document.getElementById("myIpa").value.trim(),wallet:document.getElementById("myWallet").value.trim(),phone:document.getElementById("myPhone").value.trim()}),"اتحفظت بيانات الدفع"); }
    case "invite": return inviteModal();
    case "newCode": return confirmBox("تعمل كود دعوة جديد؟","كود جديد",()=>run(async()=>{ const c=C.code6(), old=S.house.joinCode; const bt=writeBatch(db); bt.set(doc(db,"codes",c),{hid:S.hid}); bt.update(doc(db,"houses",S.hid),{joinCode:c}); if(old) bt.delete(doc(db,"codes",old)); await bt.commit(); },"اتعمل كود جديد"),"الكود القديم مش هيشتغل تاني.");
    case "kick": { const u=S.users[id]; return confirmBox(`إخراج ${u?.name||"المستخدم"} من السكن؟`,"إخراج",()=>run(()=>deleteDoc(H("users",id)),"اتشال"),"حساباته في الجداول بتفضل زي ما هي."); }
    case "saveHouse": { const n=document.getElementById("sName").value.trim(); if(!n) return toast("اكتب الاسم"); return run(async()=>{ await updateDoc(doc(db,"houses",S.hid),{name:n,currency:document.getElementById("sCur").value}); await setDoc(doc(db,"memberships",S.user.uid),{houses:{[S.hid]:n}},{merge:true}); },"اتحفظ"); }
    case "saveBudgets": { const o={}; document.querySelectorAll("[data-budget]").forEach(i=>{ if(+i.value>0) o[i.dataset.budget]=+i.value; }); return upHouse({budgets:o},"اتحفظت الميزانية"); }
    case "saveMeters": { const o={}; document.querySelectorAll("[data-mp]").forEach(i=>{ o[i.dataset.mp]=o[i.dataset.mp]||{}; o[i.dataset.mp][i.dataset.k]=+i.value||0; }); return upHouse({meterPrices:o},"اتحفظت الأسعار"); }
    case "saveFund": return upHouse({fundCfg:{monthly:+document.getElementById("fMonthly").value||0}},"اتحفظ");
    case "addRec": return simpleModal("بند شهري ثابت",[{id:"title",label:"البند",full:true,ph:"إيجار الشقة"},{id:"amount",label:"المبلغ",type:"number"},{id:"category",label:"الفئة",type:"select",options:C.CATS.map(c=>[c,c]),value:"إيجار"},
      {id:"paidBy",label:"مين بيدفعه",type:"select",options:[...active().map(m=>[m.id,m.name]),...(F("fund")?[[FUND,"الصندوق"]]:[])]},{id:"mode",label:"التقسيم",type:"select",options:[["equal","بالتساوي"],["weight","بالأوزان"]]},{id:"dueDay",label:"يوم الاستحقاق",type:"number",value:1,attrs:'min="1" max="28"'}],
      async v=>{ if(!v.title||!(+v.amount>0)) { toast("كمّل البيانات"); return false; } await updateDoc(doc(db,"houses",S.hid),{recurring:[...(S.house.recurring||[]),{...v,amount:r2(v.amount),dueDay:Math.min(28,Math.max(1,+v.dueDay||1))}]}); toast("اتضاف"); });
    case "delRec": { const r=[...(S.house.recurring||[])]; r.splice(+b.dataset.i,1); return upHouse({recurring:r}); }
    case "applyRec": { const m=monthOf(today()), todo=dueBills(); if(!todo.length) return toast("الثابتة متسجّلة للشهر ده");
      return run(async()=>{ for(const r of todo){ const date=`${m}-${String(+r.dueDay||1).padStart(2,"0")}`; await addDoc(HC("expenses"),{title:r.title,amount:r2(r.amount),category:r.category,paidBy:r.paidBy,date,month:m,split:{mode:r.mode,members:active().map(x=>x.id)},note:"بند شهري ثابت",recurring:true,receiptId:null,createdBy:S.user.uid,createdAt:iso()}); } },`اتضاف ${todo.length} بند`); }
    case "addFund": { const mid=b.dataset?.mem||myMember(); const monthly=+(S.house.fundCfg||{}).monthly||0;
      return simpleModal("اشتراك الصندوق",[{id:"memberId",label:"العضو",type:"select",options:(isAdmin()?active():active().filter(x=>x.id===myMember())).map(m=>[m.id,m.name]),value:mid},{id:"amount",label:"المبلغ",type:"number",value:monthly||""},{id:"date",label:"التاريخ",type:"date",value:today()},{id:"note",label:"ملاحظة"}],
        async v=>{ if(!(+v.amount>0)){ toast("اكتب المبلغ"); return false; } await addDoc(HC("fund"),{memberId:v.memberId,amount:r2(v.amount),date:v.date||today(),month:monthOf(v.date||today()),note:v.note,status:isAdmin()?"confirmed":"pending",createdBy:S.user.uid,createdAt:iso()}); toast(isAdmin()?"اتسجّل":"اتسجّل — مستني تأكيد المدير"); }); }
    case "confirmFund": return run(()=>updateDoc(H("fund",id),{status:"confirmed",confirmedAt:iso(),confirmedBy:S.user.uid}),"اتأكد");
    case "delFund": return confirmBox("حذف الاشتراك؟","احذف",()=>run(()=>deleteDoc(H("fund",id)),"اتحذف"));
    case "addShop": { const it=document.getElementById("shItem")?.value.trim(); if(!it) return toast("اكتب الحاجة"); const q=document.getElementById("shQty")?.value.trim()||""; document.getElementById("shItem").value=""; document.getElementById("shQty").value="";
      return run(()=>addDoc(HC("shopping"),{item:it,qty:q,addedBy:myMember(),bought:false,createdBy:S.user.uid,createdAt:iso()}),"اتضافت"); }
    case "quickShop": return simpleModal("حاجة ناقصة",[{id:"item",label:"إيه الناقص؟",full:true},{id:"qty",label:"الكمية"}],async v=>{ if(!v.item){ toast("اكتب الحاجة"); return false; } await addDoc(HC("shopping"),{item:v.item,qty:v.qty,addedBy:myMember(),bought:false,createdBy:S.user.uid,createdAt:iso()}); toast("اتضافت"); });
    case "buyShop": { const x=S.shopping.find(s=>s.id===id); return x&&expModal(null,{title:x.item+(x.qty?` (${x.qty})`:""),category:"أكل وبقالة",_shopId:id}); }
    case "delShop": return run(()=>deleteDoc(H("shopping",id)));
    case "toggleBought": S.showBought=!S.showBought; return render();
    case "clearBought": return confirmBox("مسح اللي اتشرى؟","امسح",()=>run(async()=>{ const bt=writeBatch(db); S.shopping.filter(s=>s.bought).slice(0,400).forEach(s=>bt.delete(H("shopping",s.id))); await bt.commit(); },"اتمسح"));
    case "addChore": return choreModal();
    case "doneChore": { const c=S.chores.find(x=>x.id===id); if(!c) return; const by=myMember()||C.choreTurn(c,S.roster).who; return run(()=>updateDoc(H("chores",id),{lastDone:{date:today(),by},log:[...(c.log||[]).slice(-29),{at:iso(),uid:S.user.uid,by}]}),"عاش!"); }
    case "delChore": return confirmBox("شيل المهمة؟","شيل",()=>run(()=>deleteDoc(H("chores",id)),"اتشالت"));
    case "addNote": { const t=document.getElementById("ntText")?.value.trim(); if(!t) return toast("اكتب الإعلان"); document.getElementById("ntText").value=""; return run(()=>addDoc(HC("notes"),{text:t,memberId:myMember(),pinned:false,createdBy:S.user.uid,createdAt:iso()}),"اتنشر"); }
    case "pinNote": { const n=S.notes.find(x=>x.id===id); return n&&run(()=>updateDoc(H("notes",id),{pinned:!n.pinned})); }
    case "delNote": return run(()=>deleteDoc(H("notes",id)),"اتحذف");
    case "addPoll": return pollModal();
    case "vote": return run(()=>updateDoc(H("polls",id),{["votes."+S.user.uid]:+b.dataset.i}),"اتسجّل صوتك");
    case "closePoll": { const p=S.polls.find(x=>x.id===id); return p&&run(()=>updateDoc(H("polls",id),{closed:!p.closed})); }
    case "delPoll": return confirmBox("حذف التصويت؟","احذف",()=>run(()=>deleteDoc(H("polls",id)),"اتحذف"));
    case "addMeter": return simpleModal("قراية عداد",[{id:"type",label:"العداد",type:"select",options:[["كهرباء","كهرباء"],["مياه","مياه"],["غاز","غاز"]]},{id:"reading",label:"القراية",type:"number",attrs:'step="0.01" min="0"'},{id:"date",label:"التاريخ",type:"date",value:today()}],
      async v=>{ if(v.reading===""){ toast("اكتب القراية"); return false; } const prev=S.meters.filter(r=>r.type===v.type).sort((a,b)=>(b.date||"").localeCompare(a.date||""))[0]; if(prev&&+v.reading<+prev.reading){ toast("القراية أقل من اللي قبلها"); return false; }
        await addDoc(HC("meters"),{type:v.type,reading:+v.reading,date:v.date||today(),createdBy:S.user.uid,createdAt:iso()}); toast("اتسجّلت"); });
    case "meterToExp": { const r=S.meters.find(x=>x.id===id); return r&&expModal(null,{title:`${r.type} — استهلاك ${b.dataset.cons}`,amount:+b.dataset.cost,category:["كهرباء","مياه","غاز"].includes(r.type)?r.type:"أخرى",date:r.date,_meterId:id}); }
    case "delMeter": return confirmBox("حذف القراية؟","احذف",()=>run(()=>deleteDoc(H("meters",id)),"اتحذفت"));
    case "depHolder": return simpleModal("مين ماسك فلوس التأمين؟",[{id:"h",label:"",type:"select",options:[["","مش متحدد"],["landlord","صاحب الشقة"],...S.roster.map(m=>[m.id,m.name])],value:S.house.depositHolder||""}],async v=>{ await updateDoc(doc(db,"houses",S.hid),{depositHolder:v.h}); toast("اتحفظ"); });
    case "moveOut": return moveOutModal(id);
    case "addItem": case "editItem": { const it=S.items.find(x=>x.id===id)||{};
      return simpleModal(a==="addItem"?"عهدة جديدة":"تعديل عهدة",[{id:"name",label:"الحاجة",full:true,value:it.name,ph:"مفتاح الشقة"},{id:"holder",label:"مع مين",type:"select",options:[["","البيت"],...active().map(m=>[m.id,m.name])],value:it.holder||""},{id:"value",label:"القيمة (اختياري)",type:"number",value:it.value||""},{id:"note",label:"ملاحظة",value:it.note}],
        async v=>{ if(!v.name){ toast("اكتب اسمها"); return false; } const d={name:v.name,holder:v.holder,value:r2(v.value),note:v.note}; if(it.id) await updateDoc(H("items",it.id),d); else await addDoc(HC("items"),{...d,createdAt:iso()}); toast("اتحفظ"); }); }
    case "delItem": return confirmBox("حذف العهدة؟","احذف",()=>run(()=>deleteDoc(H("items",id)),"اتحذفت"));
    case "addContact": return simpleModal("رقم مهم",[{id:"name",label:"الاسم",full:true},{id:"role",label:"الصفة",ph:"صاحب الشقة"},{id:"phone",label:"الرقم",dir:"ltr"}],async v=>{ if(!v.name||!v.phone){ toast("الاسم والرقم مطلوبين"); return false; } await addDoc(HC("contacts"),{...v,createdAt:iso()}); toast("اتضاف"); });
    case "delContact": return run(()=>deleteDoc(H("contacts",id)),"اتحذف");
    case "editRules": return simpleModal("قوانين السكن",[{id:"t",label:"",type:"textarea",full:true,rows:10,value:S.house.rulesText||"",max:5000}],async v=>{ await updateDoc(doc(db,"houses",S.hid),{rulesText:v.t}); toast("اتحفظت"); });
    case "quickParse": { const t=document.getElementById("qaText")?.value.trim(); if(!t) return toast("اكتب الجملة الأول"); const r=C.parseQuick(t,S.roster,myMember()); if(!r.amount) return toast("ما لقيتش المبلغ — اكتب رقم في الجملة");
      if(r.hint) setTimeout(()=>toast(r.hint),500); return expModal(null,{title:r.title,amount:r.amount,category:r.category,paidBy:r.paidBy||myMember()||active()[0]?.id,split:{mode:"equal",members:r.members}}); }
    case "addGuest": case "editGuest": { const g=S.guests.find(x=>x.id===id)||{}; const hosts=isAdmin()?active():active().filter(x=>x.id===myMember()); if(!hosts.length) return toast("اختار اسمك الأول من «الأعضاء»");
      return simpleModal(g.id?"تعديل ضيف":"ضيف جديد",[{id:"hostId",label:"ضيف مين",type:"select",options:hosts.map(m=>[m.id,m.name]),value:g.hostId||myMember()},{id:"name",label:"اسم الضيف",value:g.name},{id:"from",label:"من يوم",type:"date",value:g.from||today()},{id:"to",label:"لحد يوم",type:"date",value:g.to||today()},{id:"factor",label:"حصته (1 = زي ساكن)",type:"number",value:g.factor||1,attrs:'min="0.1" step="0.1"'},{id:"note",label:"ملاحظة",value:g.note}],
        async v=>{ if(!v.name){ toast("اكتب اسم الضيف"); return false; } if(!v.from){ toast("اختار يوم البداية"); return false; } if(v.to&&v.to<v.from){ toast("يوم النهاية قبل البداية"); return false; }
          const d={hostId:v.hostId,name:v.name,from:v.from,to:v.to||v.from,factor:Math.max(.1,+v.factor||1),note:v.note}; if(g.id) await updateDoc(H("guests",g.id),d); else await addDoc(HC("guests"),{...d,createdBy:S.user.uid,createdAt:iso()}); toast("اتحفظ"); }); }
    case "delGuest": return confirmBox("حذف الضيف؟","احذف",()=>run(()=>deleteDoc(H("guests",id)),"اتحذف"),"المصاريف اللي في الفترة دي هترجع تتقسم من غيره.");
    case "saveGuestCats": { const c=[...document.querySelectorAll("[data-gcat]:checked")].map(i=>i.dataset.gcat); return upHouse({guestCats:c},"اتحفظ"); }
    case "addLoan": case "repayLoan": { const mine=myMember(), isRepay=a==="repayLoan", opts=S.roster.map(m=>[m.id,m.name]);
      return simpleModal(isRepay?"سداد سلفة":"سلفة جديدة",[{id:"type",label:"النوع",type:"select",options:[["loan","سلفة"],["repay","سداد"]],value:isRepay?"repay":"loan"},{id:"from",label:"الفلوس طلعت من",type:"select",options:opts,value:b.dataset?.from||mine},{id:"to",label:"راحت لـ",type:"select",options:opts,value:b.dataset?.to||""},{id:"amount",label:"المبلغ",type:"number",value:b.dataset?.amt||""},{id:"date",label:"التاريخ",type:"date",value:today()},{id:"note",label:"ملاحظة"}],
        async v=>{ if(v.from===v.to){ toast("الاتنين لازم يختلفوا"); return false; } if(!(+v.amount>0)){ toast("اكتب المبلغ"); return false; } if(!isAdmin()&&v.from!==mine&&v.to!==mine){ toast("لازم تكون طرف فيها"); return false; }
          const ok=isAdmin()||v.to===mine||!PM("payConfirm");
          await addDoc(HC("loans"),{type:v.type,from:v.from,to:v.to,amount:r2(v.amount),date:v.date||today(),note:v.note,status:ok?"confirmed":"pending",...(ok?{confirmedAt:iso(),confirmedBy:S.user.uid}:{}),createdBy:S.user.uid,createdAt:iso()});
          toast(ok?"اتسجّلت":`اتسجّلت — مستنية ${mName(v.to)} يأكد`); }); }
    case "confirmLoan": return run(()=>updateDoc(H("loans",id),{status:"confirmed",confirmedAt:iso(),confirmedBy:S.user.uid}),"اتأكدت");
    case "delLoan": return confirmBox("حذف السلفة؟","احذف",()=>run(()=>deleteDoc(H("loans",id)),"اتحذفت"));
    case "enableNotif": { if(!("Notification" in window)) return toast("المتصفح ده مش بيدعم الإشعارات"); return Notification.requestPermission().then(p=>{ if(p==="granted"){ store.set("sakan-notified-"+S.hid,iso()); toast("الإشعارات اتفعّلت"); } else toast("الإشعارات ما اتفعّلتش"); render(); }); }
    case "report": return printReport(b.dataset.m);
    case "closeMonth": { const m=b.dataset.m; return confirmBox(`تقفل حساب ${monthName(m)}؟`,"اقفل الشهر",()=>run(async()=>{ await setDoc(H("closings",m),{month:m,...monthSnapshot(m),closedAt:iso(),closedBy:S.user.uid}); const st=new Set(S.house.lockedMonths||[]); st.add(m); await updateDoc(doc(db,"houses",S.hid),{lockedMonths:[...st]}); },"الشهر اتقفل"),"الأعضاء مش هيقدروا يضيفوا أو يعدّلوا فيه. تقدر تفتحه تاني."); }
    case "reopenMonth": { const m=b.dataset.m; return confirmBox(`تفتح حساب ${monthName(m)} تاني؟`,"افتح",()=>run(async()=>{ await deleteDoc(H("closings",m)); const st=new Set(S.house.lockedMonths||[]); st.delete(m); await updateDoc(doc(db,"houses",S.hid),{lockedMonths:[...st]}); },"الشهر اتفتح"),"الأعضاء هيقدروا يعدّلوا فيه تاني."); }
    case "csv": return exportCsv();
    case "backup": return backup();
    case "leave": return confirmBox("تخرج من السكن ده؟","خروج",()=>run(async()=>{ await deleteDoc(H("users",S.user.uid)); await setDoc(doc(db,"memberships",S.user.uid),{houses:{[S.hid]:deleteField()}},{merge:true}); S.hid=null; },"خرجت من السكن"));
    case "deleteHouse": return confirmBox("حذف السكن نهائيًا؟","احذف السكن",()=>run(async()=>{ const hid=S.hid; await setDoc(doc(db,"memberships",S.user.uid),{houses:{[hid]:deleteField()}},{merge:true}); if(S.house.joinCode) await deleteDoc(doc(db,"codes",S.house.joinCode)).catch(()=>{}); await deleteDoc(doc(db,"houses",hid)); S.hid=null; },"اتحذف السكن"),"نزّل نسخة احتياطية الأول. السكان التانيين هيتشالوا من السكن.");
  }
}
function download(name,text,type){ const blob=new Blob([text],{type}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); }
function exportCsv(){ const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const rows=[["النوع","التاريخ","البند","الفئة","دفعه/من","إلى","التقسيم","المبلغ","الحالة","ملاحظة"]];
  filtered().forEach(e=>rows.push(["مصروف",e.date,e.title,e.category,mName(e.paidBy),"",Object.entries(C.shares(e,S.roster)).map(([k,v])=>`${mName(k)}:${r2(v)}`).join(" | "),e.amount,"",e.note||""]));
  S.payments.filter(p=>!S.f.month||monthOf(p.date)===S.f.month).forEach(p=>rows.push(["دفعة",p.date,p.method||"","",mName(p.from),mName(p.to),"",p.amount,C.confirmed(p)?"مؤكدة":"مستنية",p.note||""]));
  download(`sakan-${S.f.month||"all"}.csv`,"﻿"+rows.map(r=>r.map(q).join(",")).join("\r\n"),"text/csv;charset=utf-8"); }
function backup(){ const o={exportedAt:iso(),house:S.house}; ["users","roster","expenses","payments","fund","shopping","chores","notes","polls","meters","items","contacts"].forEach(k=>o[k]=S[k]);
  download(`sakan-backup-${today()}.json`,JSON.stringify(o,null,2),"application/json"); }

/* ---------------- PWA ---------------- */
if("serviceWorker" in navigator && location.protocol==="https:") navigator.serviceWorker.register("./sw.js").catch(()=>{});
window.addEventListener("hashchange",()=>{ const c=joinCodeFromHash(); if(c&&S.user){ history.replaceState(null,"",location.pathname); joinFlow(c); } });
