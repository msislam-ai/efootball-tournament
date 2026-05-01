import { useState, useEffect, useRef } from "react";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDvrtHjZ1zU2d1X6LBtmieu7hGIY3irS74",
  authDomain: "efootball-tournament-e58c9.firebaseapp.com",
  projectId: "efootball-tournament-e58c9",
  storageBucket: "efootball-tournament-e58c9.firebasestorage.app",
  messagingSenderId: "338285423758",
  appId: "1:338285423758:web:f6f9742b4df4bd484feddf",
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

const DEMO_MODE = false;
const TOURNAMENT_CLOSE_DATE = new Date("2026-05-05T18:00:00+06:00");

const DEMO_PLAYERS = [
  { id:"p1", name:"Ahmed Hassan", studentId:"U2021001", email:"ahmed@univ.edu", phone:"01712345678", bkash:"01712345678", transactionId:"TXN001", teamName:"FC Dhaka" },
  { id:"p2", name:"Rahim Uddin",  studentId:"U2021002", email:"rahim@univ.edu",  phone:"01812345679", bkash:"01812345679", transactionId:"",       teamName:"Tigers FC" },
];
const DEMO_MATCHES = [
  { id:"m1", player1:"Ahmed Hassan", player2:"Rahim Uddin",  score1:2, score2:1, status:"finished", round:"Quarter Final" },
  { id:"m2", player1:"Karim Islam",  player2:"Sabbir Khan",  score1:1, score2:1, status:"live",     round:"Quarter Final" },
  { id:"m3", player1:"TBD",          player2:"TBD",          score1:0, score2:0, status:"upcoming", round:"Semi Final" },
  { id:"m4", player1:"TBD",          player2:"TBD",          score1:0, score2:0, status:"upcoming", round:"Final" },
];

const pad = n => String(n).padStart(2,'0');

function useCountdown(target) {
  const [time, setTime] = useState(null);
  useEffect(() => {
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setTime({ d:0,h:0,m:0,s:0,done:true }); return; }
      setTime({ d:Math.floor(diff/86400000), h:Math.floor((diff%86400000)/3600000), m:Math.floor((diff%3600000)/60000), s:Math.floor((diff%60000)/1000), done:false });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return time;
}

function useMatchTimer(isLive) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!isLive) { setSecs(0); return; }
    const id = setInterval(() => setSecs(s => s+1), 1000);
    return () => clearInterval(id);
  }, [isLive]);
  return `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
}

const NAV_ITEMS = [
  { id:'home',       label:'Home',     icon:'🏠' },
  { id:'register',   label:'Register', icon:'📝' },
  { id:'tournament', label:'Live',     icon:'🔴' },
  { id:'admin',      label:'Admin',    icon:'⚡' },
];

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Exo+2:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --ng:#00ff87;--nb:#00cfff;--np:#b347ff;--lr:#ff2d55;
  --dbg:#060810;--dc:#0d1117;--dbo:#1a2332;--ds:#111827;
  --tp:#e8f4ff;--ts:#7a8fa6;--tm:#3d5166;
  --gg:0 0 20px rgba(0,255,135,.4),0 0 60px rgba(0,255,135,.15);
  --gb:0 0 20px rgba(0,207,255,.4),0 0 60px rgba(0,207,255,.15);
  --gp:0 0 20px rgba(179,71,255,.4),0 0 60px rgba(179,71,255,.15);
  --nav-h:56px;
}
html{scroll-behavior:smooth}
body{font-family:'Exo 2',sans-serif;background:var(--dbg);color:var(--tp);min-height:100vh;overflow-x:hidden}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:var(--dc)}
::-webkit-scrollbar-thumb{background:var(--nb);border-radius:3px}

/* ── BG ── */
.grid-bg{
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background:linear-gradient(rgba(0,207,255,.03) 1px,transparent 1px),
             linear-gradient(90deg,rgba(0,207,255,.03) 1px,transparent 1px);
  background-size:60px 60px;animation:gridMove 20s linear infinite;
}
@keyframes gridMove{0%{background-position:0 0}100%{background-position:60px 60px}}
.scanlines{position:fixed;inset:0;z-index:1;pointer-events:none;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.03) 2px,rgba(0,0,0,.03) 4px)}

/* ══════════════════════════════════════════
   TOP NAV BAR
══════════════════════════════════════════ */
.nav{
  position:sticky;top:0;z-index:300;
  height:var(--nav-h);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 1.5rem;gap:1rem;
  background:rgba(6,8,16,.93);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  border-bottom:1px solid var(--dbo);
}
.nav-logo{
  font-family:'Orbitron',monospace;font-weight:900;font-size:.9rem;letter-spacing:.18em;
  background:linear-gradient(90deg,var(--ng),var(--nb));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  white-space:nowrap;flex-shrink:0;user-select:none;
}

/* Desktop tab row */
.nav-tabs-desktop{display:flex;gap:5px;align-items:center}
.nav-tab{
  padding:.32rem .85rem;font-family:'Orbitron',monospace;font-size:.6rem;
  letter-spacing:.1em;font-weight:700;background:transparent;
  border:1px solid var(--dbo);color:var(--ts);
  cursor:pointer;border-radius:4px;transition:all .18s;white-space:nowrap;
}
.nav-tab:hover{border-color:var(--nb);color:var(--nb)}
.nav-tab.active{border-color:var(--ng);color:var(--ng);background:rgba(0,255,135,.06);box-shadow:var(--gg)}
.nav-tab.admin-tab{border-color:rgba(179,71,255,.45);color:var(--np)}
.nav-tab.admin-tab.active{background:rgba(179,71,255,.1);box-shadow:var(--gp)}
.live-dot{
  display:inline-block;width:7px;height:7px;border-radius:50%;
  background:var(--lr);margin-right:5px;vertical-align:middle;
  animation:pulseDot 1.2s ease-in-out infinite;
}
@keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.65)}}

/* ══════════════════════════════════════════
   HAMBURGER BUTTON — hidden on desktop
══════════════════════════════════════════ */
.ham-btn{
  display:none;
  width:44px;height:44px;border-radius:8px;
  flex-direction:column;justify-content:center;align-items:center;gap:5.5px;
  background:rgba(0,207,255,.06);border:1px solid rgba(0,207,255,.2);
  cursor:pointer;flex-shrink:0;padding:0;outline:none;
  transition:background .2s,border-color .2s;
  -webkit-tap-highlight-color:transparent;
  position:relative;
}
.ham-btn:hover,.ham-btn:focus-visible{background:rgba(0,207,255,.14);border-color:rgba(0,207,255,.45)}
.ham-btn.open{background:rgba(179,71,255,.1);border-color:rgba(179,71,255,.5)}

.ham-bar{
  display:block;width:20px;height:2px;border-radius:2px;
  background:var(--nb);transform-origin:center;
  transition:transform .3s cubic-bezier(.4,0,.2,1),
             opacity .25s ease,
             background .25s ease,
             width .25s ease;
}
/* Animate to X when open */
.ham-btn.open .ham-bar:nth-child(1){
  transform:translateY(7.5px) rotate(45deg);background:var(--np);
}
.ham-btn.open .ham-bar:nth-child(2){
  opacity:0;width:0;
}
.ham-btn.open .ham-bar:nth-child(3){
  transform:translateY(-7.5px) rotate(-45deg);background:var(--np);
}

/* Notification dot on ham button */
.ham-live-dot{
  position:absolute;top:8px;right:8px;
  width:8px;height:8px;border-radius:50%;
  background:var(--lr);border:2px solid var(--dbg);
  animation:pulseDot 1.2s ease-in-out infinite;
}

/* ══════════════════════════════════════════
   DRAWER OVERLAY (dimmed background)
══════════════════════════════════════════ */
.drawer-overlay{
  display:none;
  position:fixed;inset:0;z-index:290;
  background:rgba(0,0,0,.75);
  backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);
  opacity:0;transition:opacity .28s ease;
  cursor:pointer;
}
.drawer-overlay.open{opacity:1}

/* ══════════════════════════════════════════
   SIDE DRAWER
══════════════════════════════════════════ */
.drawer{
  position:fixed;top:0;right:0;bottom:0;z-index:295;
  width:min(300px,82vw);
  display:flex;flex-direction:column;
  background:linear-gradient(160deg,#0b0f1e 0%,#0d1117 55%,#0a0e1c 100%);
  border-left:1px solid rgba(0,207,255,.12);
  transform:translateX(110%);
  transition:transform .32s cubic-bezier(.4,0,.2,1);
  overflow:hidden;
}
.drawer.open{transform:translateX(0)}

/* Gradient border top */
.drawer::before{
  content:'';position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,var(--np),var(--nb),var(--ng));z-index:1;
}
/* Subtle glow on left edge */
.drawer::after{
  content:'';position:absolute;top:0;left:-1px;bottom:0;width:1px;
  background:linear-gradient(180deg,transparent,rgba(0,207,255,.3),transparent);
}

/* Drawer header */
.drawer-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:0 1.1rem;
  height:var(--nav-h);border-bottom:1px solid var(--dbo);flex-shrink:0;
}
.drawer-logo{
  font-family:'Orbitron',monospace;font-weight:900;font-size:.82rem;letter-spacing:.15em;
  background:linear-gradient(90deg,var(--ng),var(--nb));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
}
.drawer-close{
  width:36px;height:36px;border-radius:7px;
  display:flex;align-items:center;justify-content:center;
  background:rgba(255,255,255,.04);border:1px solid var(--dbo);
  color:var(--ts);font-size:1rem;cursor:pointer;
  transition:all .18s;outline:none;
  -webkit-tap-highlight-color:transparent;
}
.drawer-close:hover,.drawer-close:focus-visible{border-color:var(--lr);color:var(--lr);background:rgba(255,45,85,.08)}

/* Drawer nav list */
.drawer-nav{
  flex:1;overflow-y:auto;padding:.75rem .65rem;
  display:flex;flex-direction:column;gap:.3rem;
}
.drawer-nav::-webkit-scrollbar{width:3px}
.drawer-nav::-webkit-scrollbar-thumb{background:var(--dbo);border-radius:2px}

.drawer-item{
  display:flex;align-items:center;gap:.9rem;
  padding:.9rem 1rem;border-radius:8px;
  border:1px solid transparent;background:transparent;
  width:100%;text-align:left;cursor:pointer;outline:none;
  -webkit-tap-highlight-color:transparent;
  transition:background .18s,border-color .18s,transform .12s;
}
.drawer-item:hover,.drawer-item:focus-visible{
  background:rgba(0,207,255,.06);border-color:rgba(0,207,255,.18);
}
.drawer-item:active{transform:scale(.98)}
.drawer-item.d-active{
  background:rgba(0,255,135,.07);border-color:rgba(0,255,135,.25);
}
.drawer-item.d-active-admin{
  background:rgba(179,71,255,.08);border-color:rgba(179,71,255,.25);
}

.drawer-item-icon{font-size:1.15rem;flex-shrink:0;line-height:1;width:26px;text-align:center}
.drawer-item-label{
  font-family:'Orbitron',monospace;font-size:.72rem;font-weight:700;
  letter-spacing:.1em;text-transform:uppercase;color:var(--ts);
  transition:color .18s;
}
.drawer-item.d-active .drawer-item-label{color:var(--ng)}
.drawer-item.d-active-admin .drawer-item-label{color:var(--np)}

/* Active indicator bar */
.drawer-item.d-active::before,.drawer-item.d-active-admin::before{
  content:'';display:block;width:3px;height:24px;border-radius:2px;flex-shrink:0;margin-right:-.4rem;
}
.drawer-item.d-active::before{background:var(--ng)}
.drawer-item.d-active-admin::before{background:var(--np)}

.drawer-live-chip{
  margin-left:auto;display:flex;align-items:center;gap:.3rem;
  font-family:'Orbitron',monospace;font-size:.52rem;font-weight:700;letter-spacing:.08em;
  color:var(--lr);background:rgba(255,45,85,.12);
  border:1px solid rgba(255,45,85,.3);padding:.15rem .5rem;border-radius:3px;
  white-space:nowrap;
}

/* Drawer footer */
.drawer-foot{
  padding:.75rem 1.25rem;border-top:1px solid var(--dbo);flex-shrink:0;
  font-size:.62rem;color:var(--tm);text-align:center;
  font-family:'Orbitron',monospace;letter-spacing:.08em;
}

/* ══════════════════════════════════════════
   BOTTOM NAV BAR — mobile only
══════════════════════════════════════════ */
.btm-nav{
  display:none;
  position:fixed;bottom:0;left:0;right:0;z-index:280;
  height:62px;
  background:rgba(6,8,16,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  border-top:1px solid var(--dbo);
  padding-bottom:env(safe-area-inset-bottom,0px);
}
.btm-nav-inner{
  display:grid;grid-template-columns:repeat(4,1fr);height:100%;
}
.btm-btn{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:3px;padding:.35rem .2rem;
  background:transparent;border:none;cursor:pointer;
  -webkit-tap-highlight-color:transparent;outline:none;
  position:relative;transition:background .15s;
  border-top:2px solid transparent;
}
.btm-btn:active{background:rgba(255,255,255,.04)}
.btm-btn.b-active{border-top-color:var(--ng)}
.btm-btn.b-active-admin{border-top-color:var(--np)}

.btm-icon{font-size:1.1rem;line-height:1;transition:transform .15s}
.btm-btn:active .btm-icon{transform:scale(.88)}
.btm-label{
  font-family:'Orbitron',monospace;font-size:.45rem;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;color:var(--tm);
  transition:color .15s;
}
.btm-btn.b-active .btm-label{color:var(--ng)}
.btm-btn.b-active-admin .btm-label{color:var(--np)}
.btm-live-dot{
  position:absolute;top:5px;right:calc(50% - 16px);
  width:7px;height:7px;border-radius:50%;
  background:var(--lr);border:2px solid var(--dbg);
  animation:pulseDot 1.2s ease-in-out infinite;
}

/* ══════════════════════════════════════════
   MAIN CONTENT
══════════════════════════════════════════ */
.main{position:relative;z-index:2}

/* ── LANDING ── */
.landing{
  min-height:calc(100vh - var(--nav-h));
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:2rem 1rem;text-align:center;gap:1.75rem;
}
.badge{
  display:inline-flex;align-items:center;gap:.45rem;padding:.3rem .95rem;border-radius:999px;
  font-family:'Orbitron',monospace;font-size:.62rem;letter-spacing:.15em;font-weight:700;border:1px solid;
}
.badge.green{border-color:var(--ng);color:var(--ng);background:rgba(0,255,135,.08)}
.badge.red{border-color:var(--lr);color:var(--lr);background:rgba(255,45,85,.1);animation:pb 1.5s ease-in-out infinite}
@keyframes pb{0%,100%{opacity:1}50%{opacity:.6}}
.main-title{
  font-family:'Orbitron',monospace;font-weight:900;font-size:clamp(1.8rem,5.5vw,4.5rem);
  line-height:1.08;letter-spacing:.05em;text-transform:uppercase;
  background:linear-gradient(135deg,#fff 0%,var(--nb) 50%,var(--ng) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  filter:drop-shadow(0 0 25px rgba(0,207,255,.3));
}
.subtitle{font-family:'Orbitron',monospace;font-size:clamp(.65rem,1.8vw,.95rem);letter-spacing:.3em;color:var(--np);text-transform:uppercase;font-weight:600}
.urgency{display:inline-flex;align-items:center;gap:.5rem;padding:.45rem 1.1rem;border-radius:6px;background:rgba(255,45,85,.1);border:1px solid rgba(255,45,85,.3);color:#ff6b7a;font-size:.78rem;font-weight:500}
.urgency-dot{width:6px;height:6px;border-radius:50%;background:var(--lr);animation:pb 1s infinite;flex-shrink:0}

/* Countdown */
.countdown{display:flex;gap:1rem;align-items:center;flex-wrap:wrap;justify-content:center}
.count-box{
  background:var(--dc);border:1px solid var(--dbo);border-radius:8px;
  padding:.85rem 1.25rem;min-width:82px;text-align:center;position:relative;overflow:hidden;
}
.count-box::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--nb),transparent);animation:sl 2s linear infinite}
@keyframes sl{0%,100%{opacity:.3}50%{opacity:1}}
.count-number{font-family:'Orbitron',monospace;font-weight:900;font-size:clamp(1.8rem,5vw,4rem);line-height:1;color:#fff;text-shadow:0 0 25px var(--nb),0 0 50px rgba(0,207,255,.25)}
.count-label{font-family:'Orbitron',monospace;font-size:.55rem;letter-spacing:.2em;color:var(--ts);text-transform:uppercase;margin-top:4px}
.count-sep{font-family:'Orbitron',monospace;font-size:2.5rem;color:var(--nb);opacity:.4;animation:blink 1s step-end infinite;line-height:1;margin-top:-4px}
@keyframes blink{0%,100%{opacity:.4}50%{opacity:.05}}

.btn-register{padding:.9rem 2.75rem;font-family:'Orbitron',monospace;font-weight:700;font-size:.85rem;letter-spacing:.15em;text-transform:uppercase;border-radius:6px;cursor:pointer;border:none;outline:none;transition:all .3s}
.btn-register.active{background:linear-gradient(135deg,var(--ng),var(--nb));color:#000;box-shadow:var(--gg);animation:pulseBtn 2s ease-in-out infinite}
.btn-register.active:hover,.btn-register.active:active{transform:scale(1.05)}
@keyframes pulseBtn{0%,100%{box-shadow:var(--gg)}50%{box-shadow:0 0 40px rgba(0,255,135,.7),0 0 80px rgba(0,255,135,.3)}}
.btn-register.closed{background:var(--ds);color:var(--tm);border:1px solid var(--dbo);cursor:not-allowed}
.reg-open-hint{color:var(--ts);font-size:.72rem;text-align:center;max-width:380px;line-height:1.6}
.reg-closed-notice{display:inline-flex;align-items:center;gap:.6rem;padding:.55rem 1.25rem;border-radius:6px;background:rgba(255,45,85,.08);border:1px solid rgba(255,45,85,.25);color:#ff8096;font-size:.8rem;font-family:'Orbitron',monospace;font-weight:600;letter-spacing:.08em}

/* ── FORM ── */
.form-container{max-width:560px;margin:0 auto;padding:1.5rem 1rem 3rem}
.form-card{background:var(--dc);border:1px solid var(--dbo);border-radius:12px;padding:2.25rem;position:relative;overflow:hidden}
.form-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--np),var(--nb),var(--ng))}
.corner-deco{position:absolute;width:18px;height:18px;border-color:var(--nb);border-style:solid;opacity:.6}
.corner-deco.tl{top:0;left:0;border-width:2px 0 0 2px}
.corner-deco.tr{top:0;right:0;border-width:2px 2px 0 0}
.corner-deco.bl{bottom:0;left:0;border-width:0 0 2px 2px}
.corner-deco.br{bottom:0;right:0;border-width:0 2px 2px 0}
.form-title{font-family:'Orbitron',monospace;font-weight:900;font-size:1.3rem;color:#fff;margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.05em}
.form-subtitle{color:var(--ts);font-size:.82rem;margin-bottom:1.75rem;line-height:1.5}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.field{display:flex;flex-direction:column;gap:.35rem;margin-bottom:1.1rem}
.field label{font-family:'Orbitron',monospace;font-size:.6rem;letter-spacing:.15em;color:var(--nb);text-transform:uppercase;font-weight:600}
.field input,.field select{background:rgba(255,255,255,.03);border:1px solid var(--dbo);border-radius:6px;padding:.7rem .95rem;color:var(--tp);font-family:'Exo 2',sans-serif;font-size:.88rem;transition:border-color .2s,box-shadow .2s;outline:none;width:100%}
.field input::placeholder{color:var(--tm)}
.field input:focus,.field select:focus{border-color:var(--nb);box-shadow:0 0 0 3px rgba(0,207,255,.1)}
.field input.error{border-color:var(--lr);box-shadow:0 0 0 3px rgba(255,45,85,.1)}
.field-error{color:var(--lr);font-size:.72rem}
.optional-tag{font-size:.58rem;color:var(--tm);margin-left:.35rem;font-family:'Exo 2',sans-serif;letter-spacing:normal;text-transform:none;font-weight:400}
.bkash-section{background:rgba(255,45,85,.04);border:1px solid rgba(255,45,85,.15);border-radius:8px;padding:1rem;margin-bottom:1.1rem}
.bkash-label-row{display:flex;align-items:center;gap:.5rem;margin-bottom:.75rem}
.bkash-icon{font-size:1.1rem}
.bkash-title{font-family:'Orbitron',monospace;font-size:.65rem;letter-spacing:.12em;color:#ff8096;font-weight:700;text-transform:uppercase}
.divider{height:1px;background:linear-gradient(90deg,transparent,var(--dbo),transparent);margin:1.25rem 0}
.btn-submit{width:100%;padding:.875rem;font-family:'Orbitron',monospace;font-weight:700;font-size:.82rem;letter-spacing:.15em;text-transform:uppercase;background:linear-gradient(135deg,var(--ng),var(--nb));color:#000;border:none;border-radius:6px;cursor:pointer;transition:all .3s;box-shadow:var(--gg);margin-top:.5rem}
.btn-submit:hover{transform:translateY(-2px);box-shadow:0 0 40px rgba(0,255,135,.5)}
.btn-submit:disabled{opacity:.5;cursor:not-allowed;transform:none}
.success-banner{text-align:center;padding:2.75rem 1.5rem;background:rgba(0,255,135,.05);border:1px solid rgba(0,255,135,.2);border-radius:12px}
.success-icon{width:60px;height:60px;border-radius:50%;background:rgba(0,255,135,.1);border:2px solid var(--ng);display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 1.25rem;box-shadow:var(--gg)}
.success-title{font-family:'Orbitron',monospace;font-size:1.1rem;font-weight:900;color:var(--ng);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.6rem}
.success-text{color:var(--ts);font-size:.88rem;line-height:1.65}
.reg-id-badge{display:inline-block;margin-top:.5rem;padding:.35rem .9rem;border-radius:5px;font-family:'Orbitron',monospace;color:var(--nb);font-size:.9rem;letter-spacing:.12em;background:rgba(0,207,255,.08);border:1px solid rgba(0,207,255,.25)}
.registered-count{text-align:center;padding:.65rem;color:var(--ts);font-size:.78rem;margin-top:.85rem}
.registered-count span{color:var(--ng);font-family:'Orbitron',monospace;font-weight:700}
.slot-bar-wrap{height:4px;background:var(--dbo);border-radius:2px;margin-top:.4rem;overflow:hidden}
.slot-bar{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--ng),var(--nb));transition:width .4s}

/* ── DASHBOARD ── */
.dashboard{padding:1.5rem 1rem;max-width:1100px;margin:0 auto}
.section-title{font-family:'Orbitron',monospace;font-weight:700;font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--ts);margin-bottom:.9rem;display:flex;align-items:center;gap:.65rem}
.section-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--dbo),transparent)}
.live-match-card{background:var(--dc);border:1px solid rgba(255,45,85,.3);border-radius:12px;padding:1.75rem;margin-bottom:1.75rem;position:relative;overflow:hidden;box-shadow:0 0 30px rgba(255,45,85,.08)}
.live-match-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--lr),var(--np),var(--lr));animation:shimmer 2s linear infinite;background-size:200%}
@keyframes shimmer{0%{background-position:100%}100%{background-position:-100%}}
.match-players{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:1.25rem;margin:1.25rem 0}
.player-side{display:flex;flex-direction:column;gap:.35rem}
.player-side.right{text-align:right;align-items:flex-end}
.player-avatar{width:44px;height:44px;border-radius:8px;background:linear-gradient(135deg,var(--nb),var(--np));display:flex;align-items:center;justify-content:center;font-family:'Orbitron',monospace;font-weight:900;font-size:1.1rem;color:#000}
.player-name{font-family:'Orbitron',monospace;font-weight:700;font-size:.9rem;color:#fff;text-transform:uppercase;letter-spacing:.05em}
.score-display{display:flex;align-items:center;gap:.6rem;justify-content:center}
.score-num{font-family:'Orbitron',monospace;font-weight:900;font-size:clamp(2rem,6vw,3.5rem);line-height:1;color:#fff;text-shadow:0 0 25px rgba(255,255,255,.25)}
.score-sep{font-family:'Orbitron',monospace;font-size:1.75rem;color:var(--tm)}
.match-timer-badge{display:inline-flex;align-items:center;gap:.4rem;background:rgba(0,207,255,.1);border:1px solid rgba(0,207,255,.3);border-radius:4px;padding:.28rem .7rem;font-family:'Orbitron',monospace;font-size:.67rem;color:var(--nb)}
.matches-grid{display:flex;flex-direction:column;gap:.6rem;margin-bottom:1.75rem}
.match-row{display:grid;grid-template-columns:1fr auto 1fr auto;align-items:center;gap:.75rem;background:var(--dc);border:1px solid var(--dbo);border-radius:8px;padding:.8rem 1.1rem;transition:border-color .2s}
.match-row:hover{border-color:rgba(0,207,255,.25)}
.match-row.live{border-color:rgba(255,45,85,.4);background:rgba(255,45,85,.03)}
.match-row.finished{opacity:.65}
.match-player-name{font-family:'Orbitron',monospace;font-size:.7rem;font-weight:600;color:var(--tp);text-transform:uppercase;letter-spacing:.04em}
.match-score-inline{font-family:'Orbitron',monospace;font-size:.95rem;font-weight:900;color:#fff;white-space:nowrap;text-align:center}
.status-pill{padding:.22rem .55rem;border-radius:4px;font-size:.58rem;font-family:'Orbitron',monospace;font-weight:700;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.status-pill.upcoming{background:rgba(122,143,166,.12);color:var(--ts);border:1px solid var(--dbo)}
.status-pill.live{background:rgba(255,45,85,.15);color:var(--lr);border:1px solid rgba(255,45,85,.3);animation:pb 1.5s infinite}
.status-pill.finished{background:rgba(0,255,135,.1);color:var(--ng);border:1px solid rgba(0,255,135,.2)}
.leaderboard-card{background:var(--dc);border:1px solid var(--dbo);border-radius:12px;overflow:hidden;position:relative;margin-bottom:1.75rem}
.leaderboard-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--ng),var(--nb))}
.leaderboard-table{width:100%;border-collapse:collapse}
.leaderboard-table th{font-family:'Orbitron',monospace;font-size:.58rem;letter-spacing:.15em;color:var(--ts);text-transform:uppercase;text-align:left;padding:.55rem .95rem;background:var(--ds);border-bottom:1px solid var(--dbo)}
.leaderboard-table th:not(:first-child){text-align:center}
.leaderboard-table td{padding:.7rem .95rem;border-bottom:1px solid rgba(26,35,50,.7);vertical-align:middle}
.leaderboard-table tr:hover td{background:rgba(255,255,255,.018)}
.rank-num{font-family:'Orbitron',monospace;font-weight:900;font-size:.88rem}
.rank-1{color:#ffd700}.rank-2{color:#c0c0c0}.rank-3{color:#cd7f32}
.lb-name{font-family:'Orbitron',monospace;font-size:.72rem;font-weight:600;color:var(--tp)}
.lb-num{font-family:'Orbitron',monospace;font-size:.82rem;font-weight:700;text-align:center;color:var(--tp)}
.lb-points{color:var(--ng);font-size:.95rem}

/* ── ADMIN ── */
.admin-panel{padding:1.5rem 1rem;max-width:900px;margin:0 auto}
.admin-header{display:flex;align-items:center;gap:.9rem;margin-bottom:1.75rem;padding:1.1rem 1.35rem;background:rgba(179,71,255,.05);border:1px solid rgba(179,71,255,.2);border-radius:12px;flex-wrap:wrap}
.admin-icon{font-size:1.8rem;flex-shrink:0}
.admin-title{font-family:'Orbitron',monospace;font-weight:900;font-size:1.1rem;color:var(--np);text-transform:uppercase}
.admin-subtitle{color:var(--ts);font-size:.78rem;margin-top:.2rem}
.admin-match-card{background:var(--dc);border:1px solid var(--dbo);border-radius:10px;padding:1.35rem;margin-bottom:.9rem}
.admin-match-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1rem;gap:.5rem;flex-wrap:wrap}
.admin-match-name{font-family:'Orbitron',monospace;font-size:.72rem;font-weight:700;color:var(--tp);text-transform:uppercase}
.admin-controls{display:flex;align-items:center;gap:.65rem;flex-wrap:wrap}
.admin-score-control{display:flex;align-items:center;gap:.4rem}
.score-label{font-size:.72rem;color:var(--ts);min-width:65px}
.btn-icon{width:32px;height:32px;border-radius:5px;border:1px solid var(--dbo);background:transparent;color:var(--tp);cursor:pointer;font-size:.95rem;display:flex;align-items:center;justify-content:center;transition:all .2s;-webkit-tap-highlight-color:transparent}
.btn-icon:hover,.btn-icon:active{border-color:var(--nb);color:var(--nb);background:rgba(0,207,255,.08)}
.admin-score-val{font-family:'Orbitron',monospace;font-weight:900;font-size:1.4rem;min-width:2ch;text-align:center;color:#fff}
.btn-action{padding:.42rem .9rem;border-radius:5px;font-family:'Orbitron',monospace;font-size:.62rem;letter-spacing:.08em;font-weight:700;text-transform:uppercase;cursor:pointer;border:1px solid;transition:all .2s;-webkit-tap-highlight-color:transparent}
.btn-action.start{border-color:var(--lr);color:var(--lr);background:rgba(255,45,85,.08)}
.btn-action.start:hover{background:rgba(255,45,85,.2)}
.btn-action.finish{border-color:var(--ng);color:var(--ng);background:rgba(0,255,135,.08)}
.btn-action.finish:hover{background:rgba(0,255,135,.2)}
.btn-action.reset{border-color:var(--tm);color:var(--ts);background:transparent}
.btn-action:disabled{opacity:.35;cursor:not-allowed}
.admin-add-match{padding:1.35rem;background:rgba(0,207,255,.04);border:1px dashed rgba(0,207,255,.2);border-radius:10px;margin-bottom:1.35rem}
.add-match-grid{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-bottom:.85rem}
.add-match-input{background:rgba(255,255,255,.03);border:1px solid var(--dbo);border-radius:5px;padding:.6rem .85rem;color:var(--tp);font-family:'Exo 2',sans-serif;font-size:.83rem;outline:none;width:100%;transition:border-color .2s}
.add-match-input:focus{border-color:var(--nb)}
.add-match-input::placeholder{color:var(--tm)}
.btn-add{padding:.65rem 1.35rem;background:rgba(0,207,255,.1);border:1px solid rgba(0,207,255,.3);color:var(--nb);border-radius:5px;font-family:'Orbitron',monospace;font-size:.67rem;letter-spacing:.08em;font-weight:700;cursor:pointer;transition:all .2s;text-transform:uppercase}
.btn-add:hover{background:rgba(0,207,255,.2)}
.admin-login{max-width:380px;margin:3.5rem auto;padding:2rem;background:var(--dc);border:1px solid rgba(179,71,255,.3);border-radius:12px;text-align:center}
.admin-pw-input{width:100%;background:rgba(255,255,255,.03);border:1px solid var(--dbo);border-radius:6px;padding:.7rem 1rem;color:var(--tp);font-family:'Exo 2',sans-serif;font-size:.9rem;outline:none;margin:.85rem 0;transition:border-color .2s;text-align:center;letter-spacing:.3em}
.admin-pw-input:focus{border-color:var(--np)}
.players-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:.65rem;margin-bottom:1.75rem}
.player-card{background:var(--ds);border:1px solid var(--dbo);border-radius:8px;padding:.85rem}
.player-card-name{font-family:'Orbitron',monospace;font-size:.67rem;font-weight:700;color:var(--tp);margin-bottom:.22rem;text-transform:uppercase}
.player-card-info{font-size:.67rem;color:var(--ts)}
.empty-state{text-align:center;padding:2.5rem 1rem;color:var(--tm);font-family:'Orbitron',monospace;font-size:.72rem;letter-spacing:.1em}

/* ══════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════ */

/* ≤ 700px: switch to hamburger */
@media(max-width:700px){
  .nav-tabs-desktop{display:none}
  .ham-btn{display:flex}
  .drawer-overlay{display:block}
}

/* ≤ 520px: also show bottom nav bar */
@media(max-width:520px){
  .btm-nav{display:block}
  .main{padding-bottom:62px}
  .landing{padding-bottom:76px}
}

/* ≤ 480px: content tightening */
@media(max-width:480px){
  :root{--nav-h:52px}
  .nav{padding:0 .85rem}
  .nav-logo{font-size:.78rem;letter-spacing:.1em}
  .ham-btn{width:40px;height:40px}
  .count-box{min-width:58px;padding:.6rem .7rem}
  .count-number{font-size:1.6rem}
  .count-sep{font-size:1.8rem}
  .countdown{gap:.6rem}
  .main-title{font-size:clamp(1.5rem,8vw,2.5rem)}
  .subtitle{letter-spacing:.12em;font-size:.65rem}
  .urgency{font-size:.68rem;padding:.35rem .85rem}
  .btn-register{padding:.8rem 2rem;font-size:.78rem}
  .form-card{padding:1.5rem 1rem}
  .form-title{font-size:1.1rem}
  .form-row{grid-template-columns:1fr}
  .match-players{grid-template-columns:1fr;gap:.85rem;text-align:center}
  .player-side.right{align-items:center}
  .match-row{grid-template-columns:1fr auto 1fr auto;gap:.35rem;padding:.65rem .7rem}
  .match-player-name{font-size:.58rem}
  .add-match-grid{grid-template-columns:1fr}
  .admin-controls{gap:.4rem}
  .score-label{min-width:46px;font-size:.6rem}
  .admin-match-header{flex-direction:column;align-items:flex-start}
  .leaderboard-table th,.leaderboard-table td{padding:.5rem .55rem}
  .leaderboard-table th{font-size:.5rem}
  .dashboard{padding:1rem .75rem}
  .admin-panel{padding:1rem .75rem}
}

/* ≤ 360px */
@media(max-width:360px){
  .count-box{min-width:50px;padding:.5rem .55rem}
  .count-number{font-size:1.35rem}
  .count-sep{font-size:1.5rem}
  .countdown{gap:.4rem}
  .nav-logo{font-size:.7rem;letter-spacing:.08em}
}
`;

// ─────────────────────────────────────────────────────────────
// NAV COMPONENT
// ─────────────────────────────────────────────────────────────
function Nav({ tab, setTab, liveCount }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ESC key closes drawer
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const go = (id) => { setTab(id); setDrawerOpen(false); };

  return (
    <>
      {/* ── Top bar ── */}
      <nav className="nav">
        <div className="nav-logo">EFT · 2026</div>

        {/* Desktop tabs */}
        <div className="nav-tabs-desktop">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              className={`nav-tab ${tab===id?'active':''} ${id==='admin'?'admin-tab':''}`}
              onClick={() => setTab(id)}
            >
              {id==='tournament' && liveCount>0 && <span className="live-dot" />}
              {label}
            </button>
          ))}
        </div>

        {/* Hamburger */}
        <button
          className={`ham-btn ${drawerOpen?'open':''}`}
          onClick={() => setDrawerOpen(o => !o)}
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
          aria-haspopup="dialog"
        >
          <span className="ham-bar" />
          <span className="ham-bar" />
          <span className="ham-bar" />
          {liveCount > 0 && !drawerOpen && <span className="ham-live-dot" />}
        </button>
      </nav>

      {/* ── Overlay ── */}
      <div
        className={`drawer-overlay ${drawerOpen?'open':''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ── Drawer ── */}
      <div
        className={`drawer ${drawerOpen?'open':''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        <div className="drawer-head">
          <div className="drawer-logo">EFT · 2026</div>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close menu">✕</button>
        </div>

        <nav className="drawer-nav" aria-label="Main menu">
          {NAV_ITEMS.map(({ id, label, icon }) => {
            const active = tab === id;
            const isAdmin = id === 'admin';
            return (
              <button
                key={id}
                className={`drawer-item ${active && !isAdmin ? 'd-active' : ''} ${active && isAdmin ? 'd-active-admin' : ''}`}
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
              >
                <span className="drawer-item-icon">{icon}</span>
                <span className="drawer-item-label">{label}</span>
                {id==='tournament' && liveCount>0 && (
                  <span className="drawer-live-chip">
                    <span style={{width:5,height:5,borderRadius:'50%',background:'var(--lr)',display:'inline-block',animation:'pulseDot 1.2s infinite'}} />
                    LIVE
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="drawer-foot">Route-7 eFootball Tournament 2026</div>
      </div>

      {/* ── Bottom nav (≤520px) ── */}
      <div className="btm-nav" role="navigation" aria-label="Bottom navigation">
        <div className="btm-nav-inner">
          {NAV_ITEMS.map(({ id, label, icon }) => {
            const active = tab === id;
            const isAdmin = id === 'admin';
            return (
              <button
                key={id}
                className={`btm-btn ${active && !isAdmin ? 'b-active' : ''} ${active && isAdmin ? 'b-active-admin' : ''}`}
                onClick={() => setTab(id)}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
              >
                {id==='tournament' && liveCount>0 && <span className="btm-live-dot" />}
                <span className="btm-icon">{icon}</span>
                <span className="btm-label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// COUNTDOWN SECTION
// ─────────────────────────────────────────────────────────────
function CountdownSection({ onGoRegister }) {
  const time = useCountdown(TOURNAMENT_CLOSE_DATE);
  if (!time) return null;
  const open = !time.done;
  return (
    <div className="landing">
      <div className="badge green">
        <span style={{width:6,height:6,borderRadius:'50%',background:'var(--ng)',display:'inline-block',animation:'pb 1s infinite'}} />
        SEASON 2026
      </div>
      <div>
        <div className="main-title">eFootball</div>
        <div className="main-title" style={{fontSize:'clamp(1rem,2.8vw,2.2rem)',letterSpacing:'.22em',marginTop:'.2rem'}}>ROUTE-7 TOURNAMENT</div>
      </div>
      <div className="subtitle">Battle · Compete · Become Champion</div>

      {open ? (
        <>
          <div style={{color:'var(--ts)',fontSize:'.72rem',fontFamily:"'Orbitron',monospace",letterSpacing:'.15em',textAlign:'center'}}>REGISTRATION CLOSES IN</div>
          <div className="countdown">
            {[{v:time.d,l:'Days'},{v:time.h,l:'Hours'},{v:time.m,l:'Minutes'},{v:time.s,l:'Seconds'}].map(({v,l},i,arr)=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:'1rem'}}>
                <div className="count-box" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0}}>
                  <div className="count-number">{pad(v)}</div>
                  <div className="count-label">{l}</div>
                </div>
                {i < arr.length-1 && <div className="count-sep">:</div>}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="reg-closed-notice">⛔ Registration has closed</div>
      )}

      <div className="urgency"><div className="urgency-dot" />Limited slots available — 32 players only</div>

      {open ? (
        <>
          <button className="btn-register active" onClick={onGoRegister}>⚡ Register Now</button>
          <div className="reg-open-hint">Registration is <strong style={{color:'var(--ng)'}}>OPEN</strong>. Tap above or the Register tab.</div>
        </>
      ) : (
        <button className="btn-register closed" disabled>🔒 Registration Closed</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REGISTRATION SECTION
// ─────────────────────────────────────────────────────────────
function RegistrationSection({ players, onRegister }) {
  const time = useCountdown(TOURNAMENT_CLOSE_DATE);
  const regOpen = !time?.done;
  const [form, setForm] = useState({ name:'', studentId:'', email:'', phone:'', bkash:'', transactionId:'', teamName:'' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [regId, setRegId] = useState('');
  const set = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:''})); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())      e.name      = 'Full name is required';
    if (!form.studentId.trim()) e.studentId = 'Student ID is required';
    else if (players.some(p=>p.studentId===form.studentId.trim())) e.studentId = 'Already registered!';
    if (!form.email.trim())     e.email     = 'Email is required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone.trim())     e.phone     = 'Phone required';
    else if (!/^[0-9+\-\s]{8,15}$/.test(form.phone)) e.phone = 'Invalid phone number';
    if (!form.bkash.trim())     e.bkash     = 'bKash number required';
    else if (!/^[0-9+\-\s]{8,15}$/.test(form.bkash)) e.bkash = 'Invalid bKash number';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate(); setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      const id = 'REG-'+Date.now().toString(36).toUpperCase();
      await onRegister({...form,name:form.name.trim(),studentId:form.studentId.trim(),id,registeredAt:new Date().toISOString()});
      setRegId(id); setSuccess(true);
    } catch { setErrors({submit:'Registration failed. Try again.'}); }
    setSubmitting(false);
  };

  const slotPct = Math.min((players.length/32)*100,100);

  if (!regOpen) return (
    <div className="form-container" style={{paddingTop:'3rem'}}>
      <div style={{textAlign:'center',padding:'4rem 1.5rem',color:'var(--ts)'}}>
        <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🔒</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:'.9rem',letterSpacing:'.1em',color:'var(--tm)',textTransform:'uppercase'}}>Registration Closed</div>
        <div style={{fontSize:'.8rem',marginTop:'.65rem'}}>The deadline has passed. Stay tuned for the next season!</div>
      </div>
    </div>
  );

  if (players.length >= 32) return (
    <div className="form-container" style={{paddingTop:'3rem'}}>
      <div style={{textAlign:'center',padding:'4rem 1.5rem',color:'var(--ts)'}}>
        <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🚫</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:'.9rem',letterSpacing:'.1em',color:'var(--lr)',textTransform:'uppercase'}}>Tournament Full</div>
        <div style={{fontSize:'.8rem',marginTop:'.65rem'}}>All 32 slots taken. Follow us for future tournaments.</div>
      </div>
    </div>
  );

  if (success) return (
    <div className="form-container" style={{paddingTop:'2rem'}}>
      <div className="success-banner">
        <div className="success-icon">✓</div>
        <div className="success-title">Registration Confirmed!</div>
        <div className="success-text">Welcome, <strong style={{color:'var(--ng)'}}>{form.name}</strong>!<br />Your ID: <span className="reg-id-badge">{regId}</span></div>
        <button className="btn-submit" style={{width:'auto',padding:'.65rem 2rem',marginTop:'1.5rem'}}
          onClick={()=>{ setSuccess(false); setForm({name:'',studentId:'',email:'',phone:'',bkash:'',transactionId:'',teamName:''}); }}>
          Register Another
        </button>
      </div>
      <div className="registered-count"><span>{players.length}</span> / 32 slots filled<div className="slot-bar-wrap"><div className="slot-bar" style={{width:`${slotPct}%`}} /></div></div>
    </div>
  );

  return (
    <div id="register-section" className="form-container" style={{paddingTop:'1.75rem'}}>
      <div className="form-card">
        <div className="corner-deco tl"/><div className="corner-deco tr"/>
        <div className="corner-deco bl"/><div className="corner-deco br"/>
        <div className="form-title">Player Registration</div>
        <div className="form-subtitle">Fill in your details to secure your spot. Registration closes at deadline or when all 32 slots fill.</div>

        <div className="form-row">
          <div className="field">
            <label>Full Name</label>
            <input className={errors.name?'error':''} placeholder="Your full name" value={form.name} onChange={e=>set('name',e.target.value)} />
            {errors.name && <span className="field-error">⚠ {errors.name}</span>}
          </div>
          <div className="field">
            <label>Student ID</label>
            <input className={errors.studentId?'error':''} placeholder="e.g. U2021001" value={form.studentId} onChange={e=>set('studentId',e.target.value)} />
            {errors.studentId && <span className="field-error">⚠ {errors.studentId}</span>}
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Email</label>
            <input className={errors.email?'error':''} type="email" placeholder="you@university.edu" value={form.email} onChange={e=>set('email',e.target.value)} />
            {errors.email && <span className="field-error">⚠ {errors.email}</span>}
          </div>
          <div className="field">
            <label>Phone Number</label>
            <input className={errors.phone?'error':''} placeholder="e.g. 01712345678" value={form.phone} onChange={e=>set('phone',e.target.value)} />
            {errors.phone && <span className="field-error">⚠ {errors.phone}</span>}
          </div>
        </div>
        <div className="field">
          <label>Team Name <span className="optional-tag">(optional)</span></label>
          <input placeholder="e.g. FC Dhaka" value={form.teamName} onChange={e=>set('teamName',e.target.value)} />
        </div>

        <div className="divider" />

        <div className="bkash-section">
          <div className="bkash-label-row">
            <span className="bkash-icon">💳</span>
            <span className="bkash-title">bKash Payment Info</span>
          </div>
          <div style={{background:'rgba(255,45,85,.06)',border:'1px solid rgba(255,45,85,.15)',borderRadius:'6px',padding:'.75rem 1rem',marginBottom:'.9rem',fontSize:'.78rem',color:'#ff8096',lineHeight:'1.6'}}>
            Send registration fee to: <strong style={{color:'#fff',fontFamily:"'Orbitron',monospace",letterSpacing:'.08em'}}>01XXXXXXXXX</strong><br />
            <span style={{fontSize:'.72rem',color:'var(--ts)'}}>Use your Student ID as reference.</span>
          </div>
          <div className="form-row">
            <div className="field" style={{marginBottom:0}}>
              <label>Your bKash Number</label>
              <input className={errors.bkash?'error':''} placeholder="e.g. 01712345678" value={form.bkash} onChange={e=>set('bkash',e.target.value)} />
              {errors.bkash && <span className="field-error">⚠ {errors.bkash}</span>}
            </div>
            <div className="field" style={{marginBottom:0}}>
              <label>Transaction ID <span className="optional-tag">(optional)</span></label>
              <input placeholder="e.g. 8N7A6B5C4D" value={form.transactionId} onChange={e=>set('transactionId',e.target.value)} />
              <span style={{fontSize:'.68rem',color:'var(--tm)',marginTop:'3px'}}>From your bKash SMS</span>
            </div>
          </div>
        </div>

        {errors.submit && <div style={{color:'var(--lr)',fontSize:'.75rem',marginBottom:'.5rem',textAlign:'center'}}>⚠ {errors.submit}</div>}
        <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>
          {submitting?'⏳ Registering...':'⚡ Confirm Registration'}
        </button>
      </div>
      <div className="registered-count"><span>{players.length}</span> / 32 slots filled<div className="slot-bar-wrap"><div className="slot-bar" style={{width:`${slotPct}%`}} /></div></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LIVE MATCH CARD
// ─────────────────────────────────────────────────────────────
function LiveMatchCard({ match }) {
  const timer = useMatchTimer(match?.status === 'live');
  if (!match) return null;
  const initials = name => name.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
  return (
    <div className="live-match-card">
      <div style={{display:'flex',alignItems:'center',gap:'.65rem',flexWrap:'wrap',marginBottom:'.5rem'}}>
        <div className="badge red">🔴 LIVE</div>
        <div style={{color:'var(--ts)',fontSize:'.72rem',fontFamily:"'Orbitron',monospace",letterSpacing:'.08em'}}>{match.round}</div>
        <div className="match-timer-badge">⏱ {timer}</div>
      </div>
      <div className="match-players">
        <div className="player-side"><div className="player-avatar">{initials(match.player1)}</div><div className="player-name">{match.player1}</div></div>
        <div className="score-display">
          <div className="score-num" style={{color:'var(--ng)'}}>{match.score1}</div>
          <div className="score-sep">—</div>
          <div className="score-num" style={{color:'var(--nb)'}}>{match.score2}</div>
        </div>
        <div className="player-side right"><div className="player-avatar" style={{background:'linear-gradient(135deg,var(--ng),var(--np))'}}>{initials(match.player2)}</div><div className="player-name">{match.player2}</div></div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TOURNAMENT SECTION
// ─────────────────────────────────────────────────────────────
function TournamentSection({ matches }) {
  const liveMatch = matches.find(m=>m.status==='live');
  const lb = {};
  matches.filter(m=>m.status==='finished').forEach(m=>{
    [m.player1,m.player2].forEach((p,i)=>{
      if(!lb[p]) lb[p]={name:p,played:0,wins:0,goals:0,points:0};
      lb[p].played++; lb[p].goals+=i===0?m.score1:m.score2;
      const my=i===0?m.score1:m.score2,op=i===0?m.score2:m.score1;
      if(my>op){lb[p].wins++;lb[p].points+=3;}else if(my===op){lb[p].points+=1;}
    });
  });
  const leaderboard = Object.values(lb).sort((a,b)=>b.points-a.points||b.goals-a.goals);
  return (
    <div className="dashboard">
      {liveMatch && (<><div className="section-title">Currently Live</div><LiveMatchCard match={liveMatch} /></>)}
      <div className="section-title">All Matches</div>
      <div className="matches-grid">
        {matches.length===0 && <div className="empty-state">No matches scheduled yet</div>}
        {matches.map(m=>(
          <div key={m.id} className={`match-row ${m.status}`}>
            <div><div className="match-player-name">{m.player1}</div><div style={{fontSize:'.62rem',color:'var(--tm)',marginTop:'2px'}}>{m.round}</div></div>
            <div className="match-score-inline">{m.status==='upcoming'?<span style={{color:'var(--tm)',fontSize:'.78rem'}}>vs</span>:`${m.score1} - ${m.score2}`}</div>
            <div className="match-player-name" style={{textAlign:'right'}}>{m.player2}</div>
            <div className={`status-pill ${m.status}`}>{m.status==='live'?'🔴 LIVE':m.status==='finished'?'✓ Done':'Upcoming'}</div>
          </div>
        ))}
      </div>
      <div className="section-title">Leaderboard</div>
      <div className="leaderboard-card">
        {leaderboard.length===0
          ? <div className="empty-state" style={{padding:'2rem'}}>No completed matches yet</div>
          : <table className="leaderboard-table">
              <thead><tr><th>#</th><th>Player</th><th>MP</th><th>W</th><th>GF</th><th>Pts</th></tr></thead>
              <tbody>{leaderboard.map((p,i)=>(
                <tr key={p.name}>
                  <td><span className={`rank-num ${i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':''}`}>{i+1}</span></td>
                  <td><span className="lb-name">{p.name}</span></td>
                  <td><span className="lb-num">{p.played}</span></td>
                  <td><span className="lb-num">{p.wins}</span></td>
                  <td><span className="lb-num">{p.goals}</span></td>
                  <td><span className="lb-num lb-points">{p.points}</span></td>
                </tr>
              ))}</tbody>
            </table>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ADMIN SECTION
// ─────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = "adminadmin2026";
function AdminSection({ matches, players, onUpdateMatch, onAddMatch, onDeleteMatch }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [newMatch, setNewMatch] = useState({player1:'',player2:'',round:'Group Stage'});
  const login = () => { if(pw===ADMIN_PASSWORD){setAuthed(true);setPwErr('');}else setPwErr('Wrong password. '); };

  if (!authed) return (
    <div className="admin-login">
      <div style={{fontSize:'2.25rem',marginBottom:'.6rem'}}>🛡</div>
      <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:'.95rem',color:'var(--np)',textTransform:'uppercase',letterSpacing:'.1em'}}>Admin Access</div>
      <div style={{color:'var(--ts)',fontSize:'.78rem',marginTop:'.3rem'}}>Enter admin password</div>
      <input className="admin-pw-input" type="password" placeholder="••••••••••" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} />
      {pwErr && <div style={{color:'var(--lr)',fontSize:'.72rem',marginBottom:'.5rem'}}>{pwErr}</div>}
      <button className="btn-submit" style={{margin:0}} onClick={login}>Unlock Panel</button>
      <div style={{color:'var(--tm)',fontSize:'.68rem',marginTop:'.6rem'}}>only for organizers</div>
    </div>
  );

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-icon">⚡</div>
        <div style={{flex:1}}><div className="admin-title">Tournament Control</div><div className="admin-subtitle">Real-time match & score management</div></div>
        <button className="btn-action reset" onClick={()=>setAuthed(false)}>Logout</button>
      </div>
      <div className="section-title">Registered Players ({players.length} / 32)</div>
      {players.length===0
        ? <div className="empty-state" style={{padding:'1.25rem',marginBottom:'1.5rem'}}>No players yet</div>
        : <div className="players-grid">{players.map(p=>(
            <div className="player-card" key={p.id||p.studentId}>
              <div className="player-card-name">{p.name}</div>
              <div className="player-card-info">{p.studentId} · {p.teamName||'Solo'}</div>
              {p.bkash && <div className="player-card-info" style={{color:'#ff8096',marginTop:'2px'}}>💳 {p.bkash}{p.transactionId?` · ${p.transactionId}`:''}</div>}
            </div>
          ))}</div>
      }
      <div className="section-title">Add Match</div>
      <div className="admin-add-match">
        <div className="add-match-grid">
          <input className="add-match-input" placeholder="Player 1 Name" value={newMatch.player1} onChange={e=>setNewMatch(n=>({...n,player1:e.target.value}))} />
          <input className="add-match-input" placeholder="Player 2 Name" value={newMatch.player2} onChange={e=>setNewMatch(n=>({...n,player2:e.target.value}))} />
        </div>
        <div className="add-match-grid">
          <select className="add-match-input" value={newMatch.round} onChange={e=>setNewMatch(n=>({...n,round:e.target.value}))}>
            {['Group Stage','Quarter Final','Semi Final','Final'].map(r=><option key={r}>{r}</option>)}
          </select>
          <button className="btn-add" onClick={()=>{ if(!newMatch.player1.trim()||!newMatch.player2.trim()) return; onAddMatch({...newMatch,score1:0,score2:0,status:'upcoming'}); setNewMatch({player1:'',player2:'',round:'Group Stage'}); }}>+ Add Match</button>
        </div>
      </div>
      <div className="section-title">Manage Matches</div>
      {matches.length===0 && <div className="empty-state" style={{marginBottom:'1.5rem'}}>No matches yet.</div>}
      {matches.map(m=>(
        <div className="admin-match-card" key={m.id}>
          <div className="admin-match-header">
            <div><div className="admin-match-name">{m.player1} vs {m.player2}</div><div style={{color:'var(--tm)',fontSize:'.67rem',marginTop:'2px'}}>{m.round}</div></div>
            <div className={`status-pill ${m.status}`}>{m.status==='live'?'🔴 LIVE':m.status==='finished'?'✓ DONE':'UPCOMING'}</div>
          </div>
          <div className="admin-controls">
            <div className="admin-score-control">
              <span className="score-label">{m.player1.split(' ')[0]}</span>
              <button className="btn-icon" onClick={()=>onUpdateMatch(m.id,{score1:Math.max(0,m.score1-1)})}>−</button>
              <div className="admin-score-val">{m.score1}</div>
              <button className="btn-icon" onClick={()=>onUpdateMatch(m.id,{score1:m.score1+1})}>+</button>
            </div>
            <span style={{color:'var(--tm)',fontFamily:"'Orbitron',monospace",fontSize:'.9rem'}}>:</span>
            <div className="admin-score-control">
              <button className="btn-icon" onClick={()=>onUpdateMatch(m.id,{score2:Math.max(0,m.score2-1)})}>−</button>
              <div className="admin-score-val">{m.score2}</div>
              <button className="btn-icon" onClick={()=>onUpdateMatch(m.id,{score2:m.score2+1})}>+</button>
              <span className="score-label" style={{textAlign:'right'}}>{m.player2.split(' ')[0]}</span>
            </div>
            <div style={{marginLeft:'auto',display:'flex',gap:'.45rem',flexWrap:'wrap'}}>
              {m.status==='upcoming' && <button className="btn-action start" onClick={()=>onUpdateMatch(m.id,{status:'live'})}>▶ Start</button>}
              {m.status==='live'     && <button className="btn-action finish" onClick={()=>onUpdateMatch(m.id,{status:'finished'})}>✓ End</button>}
              {m.status==='finished' && <button className="btn-action reset"  onClick={()=>onUpdateMatch(m.id,{status:'upcoming',score1:0,score2:0})}>↺ Reset</button>}
              <button className="btn-action reset" style={{color:'var(--lr)',borderColor:'rgba(255,45,85,.3)'}} onClick={()=>onDeleteMatch(m.id)}>✕</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('home');
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    if (DEMO_MODE) { setPlayers(DEMO_PLAYERS); setMatches(DEMO_MATCHES); return; }
    const u1 = onSnapshot(collection(db,'players'), s=>setPlayers(s.docs.map(d=>({id:d.id,...d.data()}))), console.error);
    const u2 = onSnapshot(collection(db,'matches'), s=>setMatches(s.docs.map(d=>({id:d.id,...d.data()}))), console.error);
    return () => { u1(); u2(); };
  }, []);

  const registerPlayer = async (data) => { if(DEMO_MODE){setPlayers(p=>[...p,data]);return;} await addDoc(collection(db,'players'),data); };
  const updateMatch    = async (id,patch) => { if(DEMO_MODE){setMatches(ms=>ms.map(m=>m.id===id?{...m,...patch}:m));return;} await updateDoc(doc(db,'matches',id),patch); };
  const addMatch       = async (data) => { if(DEMO_MODE){setMatches(ms=>[...ms,{...data,id:'m'+Date.now()}]);return;} await addDoc(collection(db,'matches'),data); };
  const deleteMatch    = async (id) => { if(DEMO_MODE){setMatches(ms=>ms.filter(m=>m.id!==id));return;} await deleteDoc(doc(db,'matches',id)); };

  const liveCount = matches.filter(m=>m.status==='live').length;

  return (
    <>
      <style>{styles}</style>
      <div className="grid-bg" />
      <div className="scanlines" />
      <Nav tab={tab} setTab={setTab} liveCount={liveCount} />
      <main className="main">
        {tab==='home'       && <CountdownSection onGoRegister={()=>setTab('register')} />}
        {tab==='register'   && <RegistrationSection players={players} onRegister={registerPlayer} />}
        {tab==='tournament' && <TournamentSection matches={matches} />}
        {tab==='admin'      && <AdminSection matches={matches} players={players} onUpdateMatch={updateMatch} onAddMatch={addMatch} onDeleteMatch={deleteMatch} />}
      </main>
    </>
  );
}
