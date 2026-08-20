import { useState, useEffect } from "react";
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc } from 'firebase/firestore';

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

// ── Change this date to your real tournament registration close date ──
const TOURNAMENT_CLOSE_DATE = new Date("2026-08-18T18:10:00+06:00");

// ── Tournament stage order. These strings match the existing `round`
// field values already stored on your finished matches, so nothing in
// Firebase needs to be renamed. "Round of 12" is the one new stage. ──
const ROUND_ORDER = ["Group Stage", "Round of 12", "Quarter Final", "Semi Final", "Final"];
const KNOCKOUT_ROUNDS = ROUND_ORDER.slice(1); // everything after Group Stage

function nextRoundOf(round) {
  const i = ROUND_ORDER.indexOf(round);
  return i >= 0 && i < ROUND_ORDER.length - 1 ? ROUND_ORDER[i + 1] : null;
}
function stageIndex(stage) {
  if (stage === "Completed") return ROUND_ORDER.length;
  const i = ROUND_ORDER.indexOf(stage);
  return i < 0 ? 0 : i;
}

const DEMO_PLAYERS = [
  { id:"p1", name:"Ahmed Hassan", studentId:"U2021001", email:"ahmed@univ.edu", phone:"01712345678", bkash:"01712345678", transactionId:"TXN001", teamName:"FC Dhaka" },
  { id:"p2", name:"Rahim Uddin",  studentId:"U2021002", email:"rahim@univ.edu",  phone:"01812345679", bkash:"01812345679", transactionId:"",       teamName:"Tigers FC" },
];
const DEMO_MATCHES = [
  { id:"m1", player1:"Ahmed Hassan", player2:"Rahim Uddin",  score1:2, score2:1, status:"finished", round:"Group Stage" },
  { id:"m2", player1:"Karim Islam",  player2:"Sabbir Khan",  score1:1, score2:1, status:"live",     round:"Round of 12" },
  { id:"m3", player1:"TBD",          player2:"TBD",          score1:0, score2:0, status:"upcoming", round:"Quarter Final" },
  { id:"m4", player1:"TBD",          player2:"TBD",          score1:0, score2:0, status:"upcoming", round:"Final" },
];
const DEMO_META = { currentStage: "Round of 12" };

// ── Helpers ───────────────────────────────────────────────────────────────
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

function initials(name) {
  return (name||'?').split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Exo+2:wght@300;400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root {
  --ng:#00ff87; --nb:#00cfff; --np:#b347ff; --lr:#ff2d55; --gold:#ffd700;
  --dbg:#060810; --dc:#0d1117; --dbo:#1a2332; --ds:#111827;
  --tp:#e8f4ff; --ts:#7a8fa6; --tm:#3d5166;
  --gg:0 0 20px rgba(0,255,135,.4),0 0 60px rgba(0,255,135,.15);
  --gb:0 0 20px rgba(0,207,255,.4),0 0 60px rgba(0,207,255,.15);
  --gp:0 0 20px rgba(179,71,255,.4),0 0 60px rgba(179,71,255,.15);
  --ggold:0 0 20px rgba(255,215,0,.4),0 0 60px rgba(255,215,0,.15);
}

body { font-family:'Exo 2',sans-serif; background:var(--dbg); color:var(--tp); min-height:100vh; overflow-x:hidden; }

::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:var(--dc)}
::-webkit-scrollbar-thumb{background:var(--nb);border-radius:3px}

/* ── BG ── */
.grid-bg {
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background:linear-gradient(rgba(0,207,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,207,255,.03) 1px,transparent 1px);
  background-size:60px 60px;animation:gridMove 20s linear infinite;
}
@keyframes gridMove{0%{background-position:0 0}100%{background-position:60px 60px}}
.scanlines{position:fixed;inset:0;z-index:1;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.03) 2px,rgba(0,0,0,.03) 4px)}

/* ── NAV ── */
.nav{
  position:sticky;top:0;z-index:100;
  display:flex;align-items:center;justify-content:space-between;
  padding:.6rem 1.5rem;
  background:rgba(6,8,16,.9);backdrop-filter:blur(14px);
  border-bottom:1px solid var(--dbo);
  gap:.75rem;
}
.nav-logo{
  font-family:'Orbitron',monospace;font-weight:900;font-size:.9rem;letter-spacing:.15em;white-space:nowrap;
  background:linear-gradient(90deg,var(--ng),var(--nb));-webkit-background-clip:text;-webkit-text-fill-color:transparent;
  flex-shrink:0;
}
.nav-tabs{display:flex;gap:4px;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.nav-tabs::-webkit-scrollbar{display:none}
.nav-tab{
  padding:.32rem .75rem;font-family:'Orbitron',monospace;font-size:.6rem;letter-spacing:.08em;font-weight:700;
  background:transparent;border:1px solid var(--dbo);color:var(--ts);cursor:pointer;border-radius:4px;
  transition:all .2s;white-space:nowrap;flex-shrink:0;
}
.nav-tab:hover{border-color:var(--nb);color:var(--nb)}
.nav-tab.active{border-color:var(--ng);color:var(--ng);background:rgba(0,255,135,.05);box-shadow:var(--gg)}
.nav-tab.admin-tab{border-color:rgba(179,71,255,.5);color:var(--np)}
.nav-tab.admin-tab.active{background:rgba(179,71,255,.1);box-shadow:var(--gp)}


/* see all Button */

.see-all-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--tm);
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.see-all-btn:hover {
  background: var(--tm);
  color: #000;
  border-color: var(--tm);
  transform: translateY(-1px);
}

/* ── MAIN ── */
.main{position:relative;z-index:2}

/* ── HERO / LANDING ── */
.landing{
  min-height:calc(100vh - 54px);display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:2.5rem 1rem 2rem;text-align:center;gap:1.5rem;
}
.badge{
  display:inline-flex;align-items:center;gap:.45rem;padding:.3rem .95rem;border-radius:999px;
  font-family:'Orbitron',monospace;font-size:.62rem;letter-spacing:.15em;font-weight:700;border:1px solid;
}
.badge.green{border-color:var(--ng);color:var(--ng);background:rgba(0,255,135,.08)}
.badge.red{border-color:var(--lr);color:var(--lr);background:rgba(255,45,85,.1);animation:pb 1.5s ease-in-out infinite}
.badge.gold{border-color:var(--gold);color:var(--gold);background:rgba(255,215,0,.08)}
@keyframes pb{0%,100%{opacity:1}50%{opacity:.6}}

.main-title{
  font-family:'Orbitron',monospace;font-weight:900;font-size:clamp(1.8rem,5.5vw,4.5rem);
  line-height:1.08;letter-spacing:.05em;text-transform:uppercase;
  background:linear-gradient(135deg,#fff 0%,var(--nb) 50%,var(--ng) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  filter:drop-shadow(0 0 25px rgba(0,207,255,.3));
}
.subtitle{
  font-family:'Orbitron',monospace;font-size:clamp(.65rem,1.8vw,.95rem);
  letter-spacing:.3em;color:var(--np);text-transform:uppercase;font-weight:600;
}

.stage-callout{
  font-family:'Orbitron',monospace;letter-spacing:.1em;text-transform:uppercase;
  color:#fff;font-size:clamp(.85rem,2.2vw,1.15rem);font-weight:700;
  padding:.5rem 1.35rem;border-radius:8px;background:rgba(0,207,255,.08);border:1px solid rgba(0,207,255,.3);
}

/* Progress steps */
.progress-track{display:flex;align-items:center;justify-content:center;gap:0;flex-wrap:wrap;max-width:720px;margin:0 auto}
.progress-step{display:flex;flex-direction:column;align-items:center;gap:.4rem;min-width:88px}
.progress-dot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-family:'Orbitron',monospace;border:2px solid var(--dbo);color:var(--tm);background:var(--dc);flex-shrink:0}
.progress-step.done .progress-dot{border-color:var(--ng);color:var(--ng);background:rgba(0,255,135,.08)}
.progress-step.live .progress-dot{border-color:var(--lr);color:var(--lr);background:rgba(255,45,85,.12);animation:pb 1.4s infinite}
.progress-step.upcoming .progress-dot{border-color:var(--dbo);color:var(--tm)}
.progress-label{font-family:'Orbitron',monospace;font-size:.55rem;letter-spacing:.08em;color:var(--ts);text-transform:uppercase;white-space:nowrap}
.progress-step.done .progress-label{color:var(--ng)}
.progress-step.live .progress-label{color:var(--lr)}
.progress-connector{width:28px;height:2px;background:var(--dbo);margin:0 2px;align-self:flex-start;margin-top:10px}
.progress-connector.done{background:var(--ng)}

/* Hero live/next preview */
.hero-preview{
  width:100%;max-width:480px;background:var(--dc);border:1px solid var(--dbo);border-radius:12px;
  padding:1.1rem 1.25rem;text-align:left;
}
.hero-preview-label{font-family:'Orbitron',monospace;font-size:.6rem;letter-spacing:.15em;color:var(--ts);text-transform:uppercase;margin-bottom:.6rem;display:flex;align-items:center;gap:.4rem}
.hero-preview-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem}
.hero-preview-name{font-family:'Orbitron',monospace;font-size:.78rem;font-weight:700;color:#fff;text-transform:uppercase}
.hero-preview-score{font-family:'Orbitron',monospace;font-weight:900;font-size:1.4rem;color:#fff}
.hero-preview-empty{color:var(--tm);font-size:.8rem;text-align:center;padding:.5rem}

.hero-cta-row{display:flex;gap:.75rem;flex-wrap:wrap;justify-content:center}
.btn-cta{
  padding:.7rem 1.5rem;font-family:'Orbitron',monospace;font-weight:700;font-size:.7rem;
  letter-spacing:.1em;text-transform:uppercase;border-radius:6px;cursor:pointer;transition:all .25s;
  border:1px solid var(--dbo);background:transparent;color:var(--tp);
}
.btn-cta.primary{background:linear-gradient(135deg,var(--ng),var(--nb));color:#000;border:none;box-shadow:var(--gg)}
.btn-cta.primary:hover{transform:scale(1.04)}
.btn-cta:not(.primary):hover{border-color:var(--nb);color:var(--nb)}

.champion-banner{
  padding:1.5rem 2rem;border-radius:14px;background:rgba(255,215,0,.06);border:1px solid rgba(255,215,0,.35);
  box-shadow:var(--ggold);text-align:center;
}
.champion-trophy{font-size:2.5rem;margin-bottom:.5rem}
.champion-name{font-family:'Orbitron',monospace;font-weight:900;font-size:1.4rem;color:var(--gold);text-transform:uppercase;letter-spacing:.08em}

.urgency{
  display:inline-flex;align-items:center;gap:.5rem;padding:.45rem 1.1rem;border-radius:6px;
  background:rgba(255,45,85,.1);border:1px solid rgba(255,45,85,.3);color:#ff6b7a;font-size:.78rem;font-weight:500;
}
.urgency-dot{width:6px;height:6px;border-radius:50%;background:var(--lr);animation:pb 1s infinite;flex-shrink:0}

/* Countdown (used on register tab now) */
.countdown{display:flex;gap:1rem;align-items:center;flex-wrap:wrap;justify-content:center}
.count-box{
  background:var(--dc);border:1px solid var(--dbo);border-radius:8px;
  padding:.85rem 1.25rem;min-width:82px;text-align:center;position:relative;overflow:hidden;
}
.count-box::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--nb),transparent);animation:sl 2s linear infinite;
}
@keyframes sl{0%,100%{opacity:.3}50%{opacity:1}}
.count-number{
  font-family:'Orbitron',monospace;font-weight:900;font-size:clamp(1.8rem,5vw,4rem);
  line-height:1;color:#fff;text-shadow:0 0 25px var(--nb),0 0 50px rgba(0,207,255,.25);
}
.count-label{font-family:'Orbitron',monospace;font-size:.55rem;letter-spacing:.2em;color:var(--ts);text-transform:uppercase;margin-top:4px}
.count-sep{font-family:'Orbitron',monospace;font-size:2.5rem;color:var(--nb);opacity:.4;animation:blink 1s step-end infinite;line-height:1;margin-top:-4px}
@keyframes blink{0%,100%{opacity:.4}50%{opacity:.05}}

/* Register button */
.btn-register{
  padding:.9rem 2.75rem;font-family:'Orbitron',monospace;font-weight:700;font-size:.85rem;
  letter-spacing:.15em;text-transform:uppercase;border-radius:6px;cursor:pointer;border:none;outline:none;
  transition:all .3s;
}
.btn-register.active{
  background:linear-gradient(135deg,var(--ng),var(--nb));color:#000;
  box-shadow:var(--gg);animation:pulseBtn 2s ease-in-out infinite;
}
.btn-register.active:hover{transform:scale(1.05)}
@keyframes pulseBtn{0%,100%{box-shadow:var(--gg)}50%{box-shadow:0 0 40px rgba(0,255,135,.7),0 0 80px rgba(0,255,135,.3)}}
.btn-register.closed{background:var(--ds);color:var(--tm);border:1px solid var(--dbo);cursor:not-allowed}

.reg-open-hint{color:var(--ts);font-size:.72rem;text-align:center;max-width:380px;line-height:1.6}

/* Countdown closed notice */
.reg-closed-notice{
  display:inline-flex;align-items:center;gap:.6rem;padding:.55rem 1.25rem;border-radius:6px;
  background:rgba(255,45,85,.08);border:1px solid rgba(255,45,85,.25);color:#ff8096;font-size:.8rem;
  font-family:'Orbitron',monospace;font-weight:600;letter-spacing:.08em;
}

/* ── FORM ── */
.form-container{max-width:560px;margin:0 auto;padding:1.5rem 1rem 3rem}
.form-card{
  background:var(--dc);border:1px solid var(--dbo);border-radius:12px;
  padding:2.25rem;position:relative;overflow:hidden;
}
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
.field input,.field select{
  background:rgba(255,255,255,.03);border:1px solid var(--dbo);border-radius:6px;
  padding:.7rem .95rem;color:var(--tp);font-family:'Exo 2',sans-serif;font-size:.88rem;
  transition:border-color .2s,box-shadow .2s;outline:none;width:100%;
}
.field input::placeholder{color:var(--tm)}
.field input:focus,.field select:focus{border-color:var(--nb);box-shadow:0 0 0 3px rgba(0,207,255,.1)}
.field input.error{border-color:var(--lr);box-shadow:0 0 0 3px rgba(255,45,85,.1)}
.field-error{color:var(--lr);font-size:.72rem}
.optional-tag{font-size:.58rem;color:var(--tm);margin-left:.35rem;font-family:'Exo 2',sans-serif;letter-spacing:normal;text-transform:none;font-weight:400}

/* Bkash highlight */
.bkash-section{
  background:rgba(255,45,85,.04);border:1px solid rgba(255,45,85,.15);
  border-radius:8px;padding:1rem;margin-bottom:1.1rem;
}
.bkash-label-row{display:flex;align-items:center;gap:.5rem;margin-bottom:.75rem}
.bkash-icon{font-size:1.1rem}
.bkash-title{font-family:'Orbitron',monospace;font-size:.65rem;letter-spacing:.12em;color:#ff8096;font-weight:700;text-transform:uppercase}

.divider{height:1px;background:linear-gradient(90deg,transparent,var(--dbo),transparent);margin:1.25rem 0}

.btn-submit{
  width:100%;padding:.875rem;font-family:'Orbitron',monospace;font-weight:700;font-size:.82rem;
  letter-spacing:.15em;text-transform:uppercase;
  background:linear-gradient(135deg,var(--ng),var(--nb));color:#000;border:none;
  border-radius:6px;cursor:pointer;transition:all .3s;box-shadow:var(--gg);margin-top:.5rem;
}
.btn-submit:hover{transform:translateY(-2px);box-shadow:0 0 40px rgba(0,255,135,.5)}
.btn-submit:disabled{opacity:.5;cursor:not-allowed;transform:none}

.success-banner{text-align:center;padding:2.75rem 1.5rem;background:rgba(0,255,135,.05);border:1px solid rgba(0,255,135,.2);border-radius:12px}
.success-icon{width:60px;height:60px;border-radius:50%;background:rgba(0,255,135,.1);border:2px solid var(--ng);display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 1.25rem;box-shadow:var(--gg)}
.success-title{font-family:'Orbitron',monospace;font-size:1.1rem;font-weight:900;color:var(--ng);text-transform:uppercase;letter-spacing:.1em;margin-bottom:.6rem}
.success-text{color:var(--ts);font-size:.88rem;line-height:1.65}
.reg-id-badge{
  display:inline-block;margin-top:.5rem;padding:.35rem .9rem;border-radius:5px;
  font-family:'Orbitron',monospace;color:var(--nb);font-size:.9rem;letter-spacing:.12em;
  background:rgba(0,207,255,.08);border:1px solid rgba(0,207,255,.25);
}

.registered-count{text-align:center;padding:.65rem;color:var(--ts);font-size:.78rem;margin-top:.85rem}
.registered-count span{color:var(--ng);font-family:'Orbitron',monospace;font-weight:700}

/* Slot bar */
.slot-bar-wrap{height:4px;background:var(--dbo);border-radius:2px;margin-top:.4rem;overflow:hidden}
.slot-bar{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--ng),var(--nb));transition:width .4s}

/* ── DASHBOARD ── */
.dashboard{padding:1.5rem 1rem;max-width:1100px;margin:0 auto}
.section-title{
  font-family:'Orbitron',monospace;font-weight:700;font-size:.72rem;letter-spacing:.2em;
  text-transform:uppercase;color:var(--ts);margin-bottom:.9rem;
  display:flex;align-items:center;gap:.65rem;
}
.section-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--dbo),transparent)}

/* Live match card */
.live-match-card{
  background:var(--dc);border:1px solid rgba(255,45,85,.3);border-radius:12px;
  padding:1.75rem;margin-bottom:1.75rem;position:relative;overflow:hidden;
  box-shadow:0 0 30px rgba(255,45,85,.08);
}
.live-match-card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,var(--lr),var(--np),var(--lr));
  animation:shimmer 2s linear infinite;background-size:200%;
}
@keyframes shimmer{0%{background-position:100%}100%{background-position:-100%}}

.match-players{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:1.25rem;margin:1.25rem 0}
.player-side{display:flex;flex-direction:column;gap:.35rem}
.player-side.right{text-align:right;align-items:flex-end}
.player-avatar{
  width:44px;height:44px;border-radius:8px;
  background:linear-gradient(135deg,var(--nb),var(--np));
  display:flex;align-items:center;justify-content:center;
  font-family:'Orbitron',monospace;font-weight:900;font-size:1.1rem;color:#000;
}
.player-name{font-family:'Orbitron',monospace;font-weight:700;font-size:.9rem;color:#fff;text-transform:uppercase;letter-spacing:.05em}
.player-team{color:var(--ts);font-size:.72rem;letter-spacing:.05em}
.score-display{display:flex;align-items:center;gap:.6rem;justify-content:center}
.score-num{font-family:'Orbitron',monospace;font-weight:900;font-size:clamp(2rem,6vw,3.5rem);line-height:1;color:#fff;text-shadow:0 0 25px rgba(255,255,255,.25)}
.score-sep{font-family:'Orbitron',monospace;font-size:1.75rem;color:var(--tm)}
.match-timer-badge{
  display:inline-flex;align-items:center;gap:.4rem;background:rgba(0,207,255,.1);
  border:1px solid rgba(0,207,255,.3);border-radius:4px;padding:.28rem .7rem;
  font-family:'Orbitron',monospace;font-size:.67rem;color:var(--nb);
}
.winner-tag{
  display:inline-flex;align-items:center;gap:.3rem;font-family:'Orbitron',monospace;font-size:.6rem;
  letter-spacing:.1em;color:var(--gold);text-transform:uppercase;margin-top:.3rem;
}

/* Match list */
.matches-grid{display:flex;flex-direction:column;gap:.6rem;margin-bottom:1.75rem}
.match-row{
  display:grid;grid-template-columns:1fr auto 1fr auto;align-items:center;gap:.75rem;
  background:var(--dc);border:1px solid var(--dbo);border-radius:8px;
  padding:.8rem 1.1rem;transition:border-color .2s;
}
.match-row:hover{border-color:rgba(0,207,255,.25)}
.match-row.live{border-color:rgba(255,45,85,.4);background:rgba(255,45,85,.03)}
.match-row.finished{opacity:.65}
.match-player-name{font-family:'Orbitron',monospace;font-size:.7rem;font-weight:600;color:var(--tp);text-transform:uppercase;letter-spacing:.04em}
.match-score-inline{font-family:'Orbitron',monospace;font-size:.95rem;font-weight:900;color:#fff;white-space:nowrap;text-align:center}
.status-pill{padding:.22rem .55rem;border-radius:4px;font-size:.58rem;font-family:'Orbitron',monospace;font-weight:700;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.status-pill.upcoming{background:rgba(122,143,166,.12);color:var(--ts);border:1px solid var(--dbo)}
.status-pill.live{background:rgba(255,45,85,.15);color:var(--lr);border:1px solid rgba(255,45,85,.3);animation:pb 1.5s infinite}
.status-pill.finished{background:rgba(0,255,135,.1);color:var(--ng);border:1px solid rgba(0,255,135,.2)}
.status-pill.postponed{background:rgba(255,165,0,.1);color:#ffa500;border:1px solid rgba(255,165,0,.25)}
.status-pill.disputed{background:rgba(255,45,85,.12);color:var(--lr);border:1px solid rgba(255,45,85,.3)}

/* Leaderboard */
.leaderboard-card{background:var(--dc);border:1px solid var(--dbo);border-radius:12px;overflow:hidden;position:relative;margin-bottom:1.75rem}
.leaderboard-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--ng),var(--nb))}
.leaderboard-table{width:100%;border-collapse:collapse;font-size:.8rem}
.leaderboard-table th{font-family:'Orbitron',monospace;font-size:.55rem;letter-spacing:.12em;color:var(--ts);text-transform:uppercase;text-align:left;padding:.55rem .7rem;background:var(--ds);border-bottom:1px solid var(--dbo)}
.leaderboard-table th:not(:first-child){text-align:center}
.leaderboard-table td{padding:.65rem .7rem;border-bottom:1px solid rgba(26,35,50,.7);vertical-align:middle}
.leaderboard-table tr:hover td{background:rgba(255,255,255,.018)}
.rank-num{font-family:'Orbitron',monospace;font-weight:900;font-size:.88rem}
.rank-1{color:#ffd700}.rank-2{color:#c0c0c0}.rank-3{color:#cd7f32}
.lb-name{font-family:'Orbitron',monospace;font-size:.7rem;font-weight:600;color:var(--tp)}
.lb-num{font-family:'Orbitron',monospace;font-size:.78rem;font-weight:700;text-align:center;color:var(--tp)}
.lb-points{color:var(--ng);font-size:.9rem}
.table-scroll{overflow-x:auto}

/* ── BRACKET ── */
.bracket-scroll{display:flex;gap:1.25rem;overflow-x:auto;padding:.5rem .25rem 1.5rem;scroll-snap-type:x proximity}
.bracket-col{min-width:230px;flex-shrink:0;scroll-snap-align:start;display:flex;flex-direction:column;gap:.9rem}
.bracket-col-title{font-family:'Orbitron',monospace;font-size:.62rem;letter-spacing:.14em;color:var(--nb);text-transform:uppercase;text-align:center;padding-bottom:.4rem;border-bottom:1px solid var(--dbo)}
.bracket-match{background:var(--dc);border:1px solid var(--dbo);border-radius:8px;padding:.75rem .85rem;position:relative}
.bracket-match.live{border-color:rgba(255,45,85,.45);box-shadow:0 0 18px rgba(255,45,85,.1)}
.bracket-match.finished{border-color:rgba(0,255,135,.25)}
.bracket-match-num{font-size:.55rem;color:var(--tm);font-family:'Orbitron',monospace;letter-spacing:.08em;margin-bottom:.4rem}
.bracket-player-row{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.25rem 0}
.bracket-player-row.winner .bracket-player-name{color:var(--gold)}
.bracket-player-name{font-family:'Orbitron',monospace;font-size:.68rem;font-weight:600;color:var(--tp);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px}
.bracket-player-score{font-family:'Orbitron',monospace;font-size:.78rem;font-weight:900;color:#fff}
.bracket-empty-col{color:var(--tm);font-size:.68rem;text-align:center;font-family:'Orbitron',monospace;padding:1rem 0}

/* ── ADMIN ── */
.admin-panel{padding:1.5rem 1rem;max-width:900px;margin:0 auto}
.admin-header{display:flex;align-items:center;gap:.9rem;margin-bottom:1.75rem;padding:1.1rem 1.35rem;background:rgba(179,71,255,.05);border:1px solid rgba(179,71,255,.2);border-radius:12px}
.admin-icon{font-size:1.8rem;flex-shrink:0}
.admin-title{font-family:'Orbitron',monospace;font-weight:900;font-size:1.1rem;color:var(--np);text-transform:uppercase}
.admin-subtitle{color:var(--ts);font-size:.78rem;margin-top:.2rem}
.admin-match-card{background:var(--dc);border:1px solid var(--dbo);border-radius:10px;padding:1.35rem;margin-bottom:.9rem}
.admin-match-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1rem;gap:.5rem;flex-wrap:wrap}
.admin-match-name{font-family:'Orbitron',monospace;font-size:.72rem;font-weight:700;color:var(--tp);text-transform:uppercase}
.admin-controls{display:flex;align-items:center;gap:.65rem;flex-wrap:wrap}
.admin-score-control{display:flex;align-items:center;gap:.4rem}
.score-label{font-size:.72rem;color:var(--ts);min-width:65px}
.btn-icon{width:30px;height:30px;border-radius:5px;border:1px solid var(--dbo);background:transparent;color:var(--tp);cursor:pointer;font-size:.95rem;display:flex;align-items:center;justify-content:center;transition:all .2s}
.btn-icon:hover{border-color:var(--nb);color:var(--nb);background:rgba(0,207,255,.08)}
.admin-score-val{font-family:'Orbitron',monospace;font-weight:900;font-size:1.4rem;min-width:2ch;text-align:center;color:#fff}
.btn-action{padding:.42rem .9rem;border-radius:5px;font-family:'Orbitron',monospace;font-size:.62rem;letter-spacing:.08em;font-weight:700;text-transform:uppercase;cursor:pointer;border:1px solid;transition:all .2s}
.btn-action.start{border-color:var(--lr);color:var(--lr);background:rgba(255,45,85,.08)}
.btn-action.start:hover{background:rgba(255,45,85,.2)}
.btn-action.finish{border-color:var(--ng);color:var(--ng);background:rgba(0,255,135,.08)}
.btn-action.finish:hover{background:rgba(0,255,135,.2)}
.btn-action.reset{border-color:var(--tm);color:var(--ts);background:transparent}
.btn-action.postpone{border-color:#ffa500;color:#ffa500;background:rgba(255,165,0,.08)}
.btn-action.dispute{border-color:var(--lr);color:var(--lr);background:rgba(255,45,85,.06)}
.btn-action.gold{border-color:var(--gold);color:var(--gold);background:rgba(255,215,0,.08)}
.btn-action:disabled{opacity:.35;cursor:not-allowed}
.admin-add-match{padding:1.35rem;background:rgba(0,207,255,.04);border:1px dashed rgba(0,207,255,.2);border-radius:10px;margin-bottom:1.35rem}
.add-match-grid{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-bottom:.85rem}
.add-match-input{background:rgba(255,255,255,.03);border:1px solid var(--dbo);border-radius:5px;padding:.6rem .85rem;color:var(--tp);font-family:'Exo 2',sans-serif;font-size:.83rem;outline:none;width:100%;transition:border-color .2s}
.add-match-input:focus{border-color:var(--nb)}
.add-match-input::placeholder{color:var(--tm)}
.btn-add{padding:.65rem 1.35rem;background:rgba(0,207,255,.1);border:1px solid rgba(0,207,255,.3);color:var(--nb);border-radius:5px;font-family:'Orbitron',monospace;font-size:.67rem;letter-spacing:.08em;font-weight:700;cursor:pointer;transition:all .2s;text-transform:uppercase}
.btn-add:hover{background:rgba(0,207,255,.2);box-shadow:var(--gb)}
.admin-login{max-width:380px;margin:3.5rem auto;padding:2rem;background:var(--dc);border:1px solid rgba(179,71,255,.3);border-radius:12px;text-align:center}
.admin-pw-input{width:100%;background:rgba(255,255,255,.03);border:1px solid var(--dbo);border-radius:6px;padding:.7rem 1rem;color:var(--tp);font-family:'Exo 2',sans-serif;font-size:.9rem;outline:none;margin:.85rem 0;transition:border-color .2s;text-align:center;letter-spacing:.3em}
.admin-pw-input:focus{border-color:var(--np)}
.players-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:.65rem;margin-bottom:1.75rem}
.player-card{background:var(--ds);border:1px solid var(--dbo);border-radius:8px;padding:.85rem}
.player-card-name{font-family:'Orbitron',monospace;font-size:.67rem;font-weight:700;color:var(--tp);margin-bottom:.22rem;text-transform:uppercase}
.player-card-info{font-size:.67rem;color:var(--ts)}
.empty-state{text-align:center;padding:2.5rem 1rem;color:var(--tm);font-family:'Orbitron',monospace;font-size:.72rem;letter-spacing:.1em}
.admin-stage-bar{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;background:var(--dc);border:1px solid var(--dbo);border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.5rem}
.admin-stage-bar label{font-family:'Orbitron',monospace;font-size:.6rem;letter-spacing:.12em;color:var(--nb);text-transform:uppercase}
.advance-row{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-top:.8rem;padding-top:.8rem;border-top:1px dashed var(--dbo)}
.advance-row label{font-size:.62rem;color:var(--ts);font-family:'Orbitron',monospace;letter-spacing:.06em;text-transform:uppercase}
.confirm-winner-row{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-top:.8rem;padding-top:.8rem;border-top:1px dashed rgba(255,215,0,.25)}
.penalty-inputs{display:flex;align-items:center;gap:.4rem}
.penalty-inputs input{width:42px;background:rgba(255,255,255,.03);border:1px solid var(--dbo);border-radius:4px;padding:.3rem;color:#fff;text-align:center;font-family:'Orbitron',monospace;font-size:.75rem}
.winner-confirmed{font-family:'Orbitron',monospace;font-size:.65rem;color:var(--gold);letter-spacing:.08em;text-transform:uppercase;margin-top:.6rem}

/* ── RESPONSIVE ── */
@media(max-width:768px){
  .nav{padding:.55rem .85rem}
  .nav-logo{font-size:.75rem}
  .nav-tab{padding:.28rem .6rem;font-size:.55rem}
  .landing{gap:1.35rem;padding:1.5rem .85rem}
  .countdown{gap:.65rem}
  .count-box{min-width:68px;padding:.7rem .9rem}
  .btn-register{padding:.8rem 2rem;font-size:.78rem}
  .form-row{grid-template-columns:1fr}
  .match-players{grid-template-columns:1fr;gap:.85rem;text-align:center}
  .player-side.right{align-items:center}
  .match-row{grid-template-columns:1fr auto 1fr auto;gap:.4rem;padding:.65rem .75rem}
  .match-player-name{font-size:.6rem}
  .add-match-grid{grid-template-columns:1fr}
  .admin-controls{gap:.45rem}
  .score-label{min-width:50px;font-size:.65rem}
  .admin-match-header{flex-direction:column;align-items:flex-start}
  .dashboard{padding:1rem .85rem}
  .progress-step{min-width:64px}
  .progress-connector{width:16px}
  .progress-label{font-size:.48rem}
}

@media(max-width:480px){
  .nav-logo{font-size:.65rem;letter-spacing:.08em}
  .count-box{min-width:58px;padding:.6rem .7rem}
  .count-number{font-size:1.6rem}
  .count-sep{font-size:1.8rem}
  .main-title{font-size:clamp(1.5rem,8vw,2.5rem)}
  .subtitle{letter-spacing:.15em}
  .urgency{font-size:.7rem;padding:.38rem .85rem}
  .form-card{padding:1.5rem 1.1rem}
  .form-title{font-size:1.1rem}
  .leaderboard-table th,.leaderboard-table td{padding:.5rem .5rem}
  .leaderboard-table th{font-size:.5rem}
  .admin-panel{padding:1rem .75rem}
  .bracket-col{min-width:200px}
}
`;

// ═══════════════════════════════════════════════════════════════
// TOURNAMENT PROGRESS STEPS
// ═══════════════════════════════════════════════════════════════
function TournamentProgress({ currentStage }) {
  const idx = stageIndex(currentStage);
  const steps = [...ROUND_ORDER, "Champion"];
  return (
    <div className="progress-track">
      {steps.map((label, i) => {
        const state = i < idx ? "done" : i === idx ? "live" : "upcoming";
        return (
          <div key={label} style={{ display: "flex", alignItems: "flex-start" }}>
            <div className={`progress-step ${state}`}>
              <div className="progress-dot">{state === "done" ? "✓" : state === "live" ? "●" : "○"}</div>
              <div className="progress-label">{label}</div>
            </div>
            {i < steps.length - 1 && <div className={`progress-connector ${i < idx ? "done" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HERO SECTION (replaces the old "Registration Closed" landing)
// ═══════════════════════════════════════════════════════════════
function HeroSection({ matches, tournamentMeta, onNavigate }) {
  const currentStage = tournamentMeta?.currentStage || "Group Stage";
  const isCompleted = currentStage === "Completed";
  const liveMatch = matches.find(m => m.status === "live");
  const upcoming = matches.filter(m => m.status === "upcoming")[0];

  const finalMatch = matches.find(m => m.round === "Final" && m.status === "finished" && m.winnerName);
  const champion = isCompleted && finalMatch ? finalMatch.winnerName : null;

  return (
    <div className="landing">
      <div className={`badge ${isCompleted ? "gold" : "green"}`}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: isCompleted ? "var(--gold)" : "var(--ng)", display: "inline-block", animation: "pb 1s infinite" }} />
        {isCompleted ? "TOURNAMENT COMPLETE" : "LIVE TOURNAMENT"}
      </div>

      <div>
        <div className="main-title">eFootball</div>
        <div className="main-title" style={{ fontSize: "clamp(1rem,2.8vw,2.2rem)", letterSpacing: ".22em", marginTop: ".2rem" }}>
          ROUTE-7 TOURNAMENT
        </div>
      </div>

      <div className="subtitle">Battle · Compete · Become Champion</div>

      {champion ? (
        <div className="champion-banner">
          <div className="champion-trophy">🏆</div>
          <div className="champion-name">{champion}</div>
          <div style={{ color: "var(--ts)", fontSize: ".78rem", marginTop: ".4rem" }}>2026 Champion</div>
        </div>
      ) : (
        <div className="stage-callout">Current Stage: {currentStage}</div>
      )}

      <TournamentProgress currentStage={currentStage} />

      {!champion && (
        <div className="hero-preview">
          {liveMatch ? (
            <>
              <div className="hero-preview-label"><span style={{ color: "var(--lr)" }}>🔴</span> Live Now · {liveMatch.round}</div>
              <div className="hero-preview-row">
                <div className="hero-preview-name">{liveMatch.player1}</div>
                <div className="hero-preview-score">{liveMatch.score1} — {liveMatch.score2}</div>
                <div className="hero-preview-name">{liveMatch.player2}</div>
              </div>
            </>
          ) : upcoming ? (
            <>
              <div className="hero-preview-label">Next Match · {upcoming.round}</div>
              <div className="hero-preview-row">
                <div className="hero-preview-name">{upcoming.player1}</div>
                <div style={{ color: "var(--tm)", fontFamily: "'Orbitron',monospace", fontSize: ".75rem" }}>VS</div>
                <div className="hero-preview-name">{upcoming.player2}</div>
              </div>
            </>
          ) : (
            <div className="hero-preview-empty">No live matches right now.</div>
          )}
        </div>
      )}

      <div className="hero-cta-row">
        <button className="btn-cta primary" onClick={() => onNavigate("tournament")}>View Tournament</button>
        <button className="btn-cta" onClick={() => onNavigate("bracket")}>Bracket</button>
        <button className="btn-cta" onClick={() => onNavigate("tournament")}>Leaderboard</button>
        <button className="btn-cta" onClick={() => onNavigate("register")}>Register</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REGISTRATION SECTION (unchanged logic, still gated by the date)
// ═══════════════════════════════════════════════════════════════
function RegistrationSection({ players, onRegister }) {
  const time = useCountdown(TOURNAMENT_CLOSE_DATE);
  const regOpen = !time?.done;

  const [form, setForm] = useState({ name:'', studentId:'', email:'', phone:'', bkash:'', transactionId:'', teamName:'' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [regId, setRegId] = useState('');

  const set = (k, v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:''})); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())       e.name      = 'Full name is required';
    if (!form.studentId.trim())  e.studentId = 'Student ID is required';
    else if (players.some(p => p.studentId === form.studentId.trim())) e.studentId = 'This Student ID is already registered!';
    if (!form.email.trim())      e.email     = 'Email is required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.phone.trim())      e.phone     = 'Phone number is required';
    else if (!/^[0-9+\-\s]{8,15}$/.test(form.phone)) e.phone = 'Invalid phone number';
    if (!form.bkash.trim())      e.bkash     = 'bKash number is required';
    else if (!/^[0-9+\-\s]{8,15}$/.test(form.bkash)) e.bkash = 'Invalid bKash number';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      const id = 'REG-' + Date.now().toString(36).toUpperCase();
      const newPlayer = { ...form, name: form.name.trim(), studentId: form.studentId.trim(), id, registeredAt: new Date().toISOString() };
      await onRegister(newPlayer);
      setRegId(id);
      setSuccess(true);
    } catch(err) {
      setErrors({ submit: 'Registration failed. Please try again.' });
    }
    setSubmitting(false);
  };

  const slotPct = Math.min((players.length/32)*100, 100);

  if (!regOpen) {
    return (
      <div className="form-container" style={{paddingTop:'3rem'}}>
        <div style={{textAlign:'center',padding:'4rem 2rem',color:'var(--ts)'}}>
          <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🔒</div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:'.9rem',letterSpacing:'.1em',color:'var(--tm)',textTransform:'uppercase'}}>Registration Closed</div>
          <div style={{fontSize:'.8rem',marginTop:'.65rem'}}>The registration deadline has passed. The tournament bracket is already underway — check the Tournament and Bracket tabs for live progress.</div>
        </div>
      </div>
    );
  }

  if (players.length >= 32) {
    return (
      <div className="form-container" style={{paddingTop:'3rem'}}>
        <div style={{textAlign:'center',padding:'4rem 2rem',color:'var(--ts)'}}>
          <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🚫</div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:'.9rem',letterSpacing:'.1em',color:'var(--lr)',textTransform:'uppercase'}}>Tournament Full</div>
          <div style={{fontSize:'.8rem',marginTop:'.65rem'}}>All 32 slots are taken. Follow us for future tournaments.</div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="form-container" style={{paddingTop:'2rem'}}>
        <div className="success-banner">
          <div className="success-icon">✓</div>
          <div className="success-title">Registration Confirmed!</div>
          <div className="success-text">
            Welcome, <strong style={{color:'var(--ng)'}}>{form.name}</strong>!<br />
            Your registration ID:<br />
            <span className="reg-id-badge">{regId}</span>
          </div>
          <button
            className="btn-submit"
            style={{width:'auto',padding:'.65rem 2rem',marginTop:'1.5rem'}}
            onClick={() => { setSuccess(false); setForm({name:'',studentId:'',email:'',phone:'',bkash:'',transactionId:'',teamName:''}); }}
          >
            Register Another Player
          </button>
        </div>
        <div className="registered-count">
          <span>{players.length}</span> / 32 slots filled
          <div className="slot-bar-wrap"><div className="slot-bar" style={{width:`${slotPct}%`}} /></div>
        </div>
      </div>
    );
  }

  return (
    <div id="register-section" className="form-container" style={{paddingTop:'1.75rem'}}>
      <div style={{textAlign:'center',marginBottom:'1.25rem'}}>
        <div style={{color:'var(--ts)',fontSize:'.72rem',fontFamily:"'Orbitron',monospace",letterSpacing:'.1em',textTransform:'uppercase'}}>Registration closes in</div>
        <div className="countdown" style={{marginTop:'.75rem'}}>
          {time && [{v:time.d,l:'Days'},{v:time.h,l:'Hours'},{v:time.m,l:'Minutes'},{v:time.s,l:'Seconds'}].map(({v,l},i,arr)=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:'.6rem'}}>
              <div className="count-box" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0,minWidth:56,padding:'.5rem .7rem'}}>
                <div className="count-number" style={{fontSize:'1.3rem'}}>{pad(v)}</div>
                <div className="count-label" style={{fontSize:'.48rem'}}>{l}</div>
              </div>
              {i < arr.length-1 && <div className="count-sep" style={{fontSize:'1.3rem'}}>:</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="form-card">
        <div className="corner-deco tl"/><div className="corner-deco tr"/>
        <div className="corner-deco bl"/><div className="corner-deco br"/>

        <div className="form-title">Player Registration</div>
        <div className="form-subtitle">
          Fill in your details below to secure your spot.<br />
          Registration closes when the countdown ends or all 32 slots are filled.
        </div>

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

          <div style={{
            background:'rgba(255,45,85,.06)',border:'1px solid rgba(255,45,85,.15)',
            borderRadius:'6px',padding:'.75rem 1rem',marginBottom:'.9rem',
            fontSize:'.78rem',color:'#ff8096',lineHeight:'1.6'
          }}>
            Send your registration fee to bKash: <strong style={{color:'#fff',fontFamily:"'Orbitron',monospace",letterSpacing:'.08em'}}>01XXXXXXXXX</strong><br />
            <span style={{fontSize:'.72rem',color:'var(--ts)'}}>Send Money → enter your Student ID as reference.</span>
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
              <span style={{fontSize:'.68rem',color:'var(--tm)',marginTop:'3px'}}>From your bKash SMS confirmation</span>
            </div>
          </div>
        </div>

        {errors.submit && (
          <div style={{color:'var(--lr)',fontSize:'.75rem',marginBottom:'.5rem',textAlign:'center'}}>⚠ {errors.submit}</div>
        )}

        <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '⏳ Registering...' : '⚡ Confirm Registration'}
        </button>
      </div>

      <div className="registered-count">
        <span>{players.length}</span> / 32 slots filled
        <div className="slot-bar-wrap"><div className="slot-bar" style={{width:`${slotPct}%`}} /></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LIVE MATCH CARD
// ═══════════════════════════════════════════════════════════════
function LiveMatchCard({ match }) {
  const timer = useMatchTimer(match?.status === 'live');
  if (!match) return null;
  return (
    <div className="live-match-card">
      <div style={{display:'flex',alignItems:'center',gap:'.65rem',flexWrap:'wrap',marginBottom:'.5rem'}}>
        <div className="badge red">🔴 LIVE</div>
        <div style={{color:'var(--ts)',fontSize:'.72rem',fontFamily:"'Orbitron',monospace",letterSpacing:'.08em'}}>{match.round}{match.matchNumber ? ` · Match #${match.matchNumber}` : ''}</div>
        <div className="match-timer-badge">⏱ {timer}</div>
      </div>
      <div className="match-players">
        <div className="player-side">
          <div className="player-avatar">{initials(match.player1)}</div>
          <div className="player-name">{match.player1}</div>
        </div>
        <div className="score-display">
          <div className="score-num" style={{color:'var(--ng)'}}>{match.score1}</div>
          <div className="score-sep">—</div>
          <div className="score-num" style={{color:'var(--nb)'}}>{match.score2}</div>
        </div>
        <div className="player-side right">
          <div className="player-avatar" style={{background:'linear-gradient(135deg,var(--ng),var(--np))'}}>{initials(match.player2)}</div>
          <div className="player-name">{match.player2}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MATCH CENTER: Live Now / Upcoming / Recent Results
// ═══════════════════════════════════════════════════════════════
function MatchCenter({ matches }) {
  const [showAll, setShowAll] = useState(false);

  const live = matches.filter(m => m.status === 'live');
  const upcoming = matches.filter(m => m.status === 'upcoming');
  const finished = matches.filter(m => m.status === 'finished');

  const recent = finished.slice(-6).reverse();

  const displayedUpcoming = showAll ? upcoming : upcoming.slice(0, 6);
  const displayedRecent = showAll ? finished.slice().reverse() : recent;

  return (
    <>
      <div className="section-title">Live Now</div>

      {live.length === 0 ? (
        <div className="empty-state" style={{ marginBottom: '1.75rem' }}>
          No live matches right now.
        </div>
      ) : (
        live.map(m => <LiveMatchCard key={m.id} match={m} />)
      )}

      <div className="section-title">Upcoming</div>

      <div className="matches-grid">
        {displayedUpcoming.length === 0 && (
          <div className="empty-state">
            Upcoming matches will appear here.
          </div>
        )}

        {displayedUpcoming.map(m => (
          <div key={m.id} className="match-row upcoming">
            <div className="match-player-name">{m.player1}</div>

            <div className="match-score-inline">
              <span style={{ color: 'var(--tm)', fontSize: '.78rem' }}>
                vs
              </span>
            </div>

            <div
              className="match-player-name"
              style={{ textAlign: 'right' }}
            >
              {m.player2}
            </div>

            <div className="status-pill upcoming">{m.round}</div>
          </div>
        ))}
      </div>

      <div className="section-title">Recent Results</div>

      <div className="matches-grid" style={{ marginBottom: '1rem' }}>
        {displayedRecent.length === 0 && (
          <div className="empty-state">
            No completed matches yet.
          </div>
        )}

        {displayedRecent.map(m => (
          <div key={m.id} className="match-row finished">
            <div
              className="match-player-name"
              style={{
                color: m.winnerName === m.player1 ? '#fff' : undefined
              }}
            >
              {m.player1}
            </div>

            <div className="match-score-inline">
              {m.score1} - {m.score2}
              {m.penalties1 != null
                ? ` (${m.penalties1}-${m.penalties2} pens)`
                : ''}
            </div>

            <div
              className="match-player-name"
              style={{
                textAlign: 'right',
                color: m.winnerName === m.player2 ? '#fff' : undefined
              }}
            >
              {m.player2}
            </div>

            <div className="status-pill finished">{m.round}</div>
          </div>
        ))}
      </div>

      {(upcoming.length > 6 || finished.length > 6) && (
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <button
            onClick={() => setShowAll(!showAll)}
            className="see-all-btn"
          >
            {showAll ? 'Show Less ↑' : 'See All Matches →'}
          </button>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// GROUP STANDINGS (fixed: draws, losses, GA, GD — group stage only)
// ═══════════════════════════════════════════════════════════════
function GroupStandings({ matches }) {
  const lb = {};
  matches.filter(m => m.status === 'finished' && m.round === 'Group Stage').forEach(m => {
    [m.player1, m.player2].forEach((p, i) => {
      if (!lb[p]) lb[p] = { name:p, played:0, wins:0, draws:0, losses:0, gf:0, ga:0, points:0 };
      const my = i===0 ? m.score1 : m.score2;
      const op = i===0 ? m.score2 : m.score1;
      lb[p].played++;
      lb[p].gf += my;
      lb[p].ga += op;
      if (my > op) { lb[p].wins++; lb[p].points += 3; }
      else if (my === op) { lb[p].draws++; lb[p].points += 1; }
      else { lb[p].losses++; }
    });
  });
  const table = Object.values(lb).sort((a,b) => b.points - a.points || (b.gf-b.ga) - (a.gf-a.ga) || b.gf - a.gf);

  return (
    <div className="leaderboard-card">
      {table.length === 0
        ? <div className="empty-state" style={{padding:'2rem'}}>No completed group-stage matches yet</div>
        : (
          <div className="table-scroll">
            <table className="leaderboard-table">
              <thead><tr><th>#</th><th>Player</th><th>MP</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GD</th><th>Pts</th></tr></thead>
              <tbody>
                {table.map((p,i) => (
                  <tr key={p.name}>
                    <td><span className={`rank-num ${i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':''}`}>{i+1}</span></td>
                    <td><span className="lb-name">{p.name}</span></td>
                    <td><span className="lb-num">{p.played}</span></td>
                    <td><span className="lb-num">{p.wins}</span></td>
                    <td><span className="lb-num">{p.draws}</span></td>
                    <td><span className="lb-num">{p.losses}</span></td>
                    <td><span className="lb-num">{p.gf}</span></td>
                    <td><span className="lb-num">{p.gf-p.ga>0?'+':''}{p.gf-p.ga}</span></td>
                    <td><span className="lb-num lb-points">{p.points}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOURNAMENT SECTION (Match Center + Group Standings)
// ═══════════════════════════════════════════════════════════════
function TournamentSection({ matches }) {
  return (
    <div className="dashboard">
      <MatchCenter matches={matches} />
      <div className="section-title">Group Stage Standings</div>
      <GroupStandings matches={matches} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BRACKET VIEW (Round of 12 → Final), mobile-scrollable columns
// ═══════════════════════════════════════════════════════════════
function BracketView({ matches }) {
  const hasAnyKnockout = KNOCKOUT_ROUNDS.some(r => matches.some(m => m.round === r));

  return (
    <div className="dashboard">
      <div className="section-title">Knockout Bracket</div>
      {!hasAnyKnockout ? (
        <div className="empty-state">Knockout matches will appear here once the bracket is set up in Admin.</div>
      ) : (
        <div className="bracket-scroll">
          {KNOCKOUT_ROUNDS.map(round => {
            const roundMatches = matches
              .filter(m => m.round === round)
              .sort((a,b) => (a.matchNumber||0) - (b.matchNumber||0));
            return (
              <div className="bracket-col" key={round}>
                <div className="bracket-col-title">{round}</div>
                {roundMatches.length === 0
                  ? <div className="bracket-empty-col">TBD</div>
                  : roundMatches.map(m => (
                    <div key={m.id} className={`bracket-match ${m.status}`}>
                      {m.matchNumber && <div className="bracket-match-num">Match #{m.matchNumber}</div>}
                      <div className={`bracket-player-row ${m.winnerName===m.player1?'winner':''}`}>
                        <span className="bracket-player-name">{m.player1 || 'TBD'}</span>
                        {m.status!=='upcoming' && <span className="bracket-player-score">{m.score1}</span>}
                      </div>
                      <div className={`bracket-player-row ${m.winnerName===m.player2?'winner':''}`}>
                        <span className="bracket-player-name">{m.player2 || 'TBD'}</span>
                        {m.status!=='upcoming' && <span className="bracket-player-score">{m.score2}</span>}
                      </div>
                      {m.status==='live' && <div className="status-pill live" style={{marginTop:'.5rem'}}>🔴 LIVE</div>}
                    </div>
                  ))
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN SECTION
// ═══════════════════════════════════════════════════════════════
const ADMIN_PASSWORD = "adminadmin123";

function AdvanceControl({ match, matches, onUpdateMatch }) {
  const nextRound = nextRoundOf(match.round);
  const candidates = nextRound ? matches.filter(m => m.round === nextRound) : [];
  if (!nextRound) return null; // Final has no "next"

  return (
    <div className="advance-row">
      <label>Advances to</label>
      <select className="add-match-input" style={{width:'auto',padding:'.4rem .6rem',fontSize:'.72rem'}}
        value={match.nextMatchId || ''}
        onChange={e => onUpdateMatch(match.id, { nextMatchId: e.target.value || null })}>
        <option value="">— none yet —</option>
        {candidates.map(c => <option key={c.id} value={c.id}>{nextRound} · {c.player1||'TBD'} vs {c.player2||'TBD'} {c.matchNumber?`(#${c.matchNumber})`:''}</option>)}
      </select>
      <select className="add-match-input" style={{width:'auto',padding:'.4rem .6rem',fontSize:'.72rem'}}
        value={match.nextMatchSlot || ''}
        onChange={e => onUpdateMatch(match.id, { nextMatchSlot: e.target.value || null })}
        disabled={!match.nextMatchId}>
        <option value="">Slot</option>
        <option value="player1">Player 1 slot</option>
        <option value="player2">Player 2 slot</option>
      </select>
    </div>
  );
}

function ConfirmWinnerControl({ match, onConfirmWinner }) {
  const [pen1, setPen1] = useState('');
  const [pen2, setPen2] = useState('');
  const isTied = match.score1 === match.score2;

  if (match.winnerName) {
    return <div className="winner-confirmed">🏆 Winner confirmed: {match.winnerName}{match.penalties1!=null ? ` (pens ${match.penalties1}-${match.penalties2})` : ''}</div>;
  }
  if (match.status !== 'finished') return null;

  const canConfirm = !isTied || (pen1 !== '' && pen2 !== '' && Number(pen1) !== Number(pen2));

  return (
    <div className="confirm-winner-row">
      <label style={{fontFamily:"'Orbitron',monospace",fontSize:'.62rem',color:'var(--gold)',letterSpacing:'.06em',textTransform:'uppercase'}}>Confirm Winner</label>
      {isTied && (
        <div className="penalty-inputs">
          <input type="number" min="0" placeholder="P1" value={pen1} onChange={e=>setPen1(e.target.value)} />
          <span style={{color:'var(--tm)'}}>-</span>
          <input type="number" min="0" placeholder="P2" value={pen2} onChange={e=>setPen2(e.target.value)} />
          <span style={{fontSize:'.62rem',color:'var(--ts)'}}>penalties</span>
        </div>
      )}
      <button className="btn-action gold" disabled={!canConfirm}
        onClick={() => onConfirmWinner(match, match.player1, isTied ? { penalties1:Number(pen1), penalties2:Number(pen2) } : {})}>
        {match.player1.split(' ')[0]} Won
      </button>
      <button className="btn-action gold" disabled={!canConfirm}
        onClick={() => onConfirmWinner(match, match.player2, isTied ? { penalties1:Number(pen1), penalties2:Number(pen2) } : {})}>
        {match.player2.split(' ')[0]} Won
      </button>
    </div>
  );
}

function AdminSection({ matches, players, tournamentMeta, onUpdateMatch, onAddMatch, onDeleteMatch, onConfirmWinner, onSetStage }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [newMatch, setNewMatch] = useState({ player1:'', player2:'', round:'Group Stage', matchNumber:'' });

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwErr(''); }
    else setPwErr('Incorrect password. ');
  };

  if (!authed) return (
    <div className="admin-login">
      <div style={{fontSize:'2.25rem',marginBottom:'.6rem'}}>🛡</div>
      <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:'.95rem',color:'var(--np)',textTransform:'uppercase',letterSpacing:'.1em'}}>Admin Access</div>
      <div style={{color:'var(--ts)',fontSize:'.78rem',marginTop:'.3rem'}}>Enter admin password</div>
      <input className="admin-pw-input" type="password" placeholder="••••••••••" value={pw}
        onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} />
      {pwErr && <div style={{color:'var(--lr)',fontSize:'.72rem',marginBottom:'.5rem'}}>{pwErr}</div>}
      <button className="btn-submit" style={{margin:0}} onClick={login}>Unlock Panel</button>
    </div>
  );

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-icon">⚡</div>
        <div>
          <div className="admin-title">Tournament Control</div>
          <div className="admin-subtitle">Real-time match & score management</div>
        </div>
        <button className="btn-action reset" style={{marginLeft:'auto'}} onClick={()=>setAuthed(false)}>Logout</button>
      </div>

      {/* Tournament stage control */}
      <div className="admin-stage-bar">
        <label>Current Tournament Stage</label>
        <select className="add-match-input" style={{width:'auto'}} value={tournamentMeta?.currentStage || 'Group Stage'}
          onChange={e => onSetStage(e.target.value)}>
          {[...ROUND_ORDER, 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{fontSize:'.68rem',color:'var(--ts)'}}>Drives the "Current Stage" shown on the landing page and progress bar.</span>
      </div>

      {/* Players */}
      <div className="section-title">Registered Players ({players.length} / 32)</div>
      {players.length === 0
        ? <div className="empty-state" style={{padding:'1.25rem',marginBottom:'1.5rem'}}>No players registered yet</div>
        : (
          <div className="players-grid">
            {players.map(p => (
              <div className="player-card" key={p.id||p.studentId}>
                <div className="player-card-name">{p.name}</div>
                <div className="player-card-info">{p.studentId} · {p.teamName||'Solo'}</div>
                {p.bkash && <div className="player-card-info" style={{color:'#ff8096',marginTop:'2px'}}>💳 {p.bkash}{p.transactionId?` · ${p.transactionId}`:''}</div>}
              </div>
            ))}
          </div>
        )
      }

      {/* Add match */}
      <div className="section-title">Add Match</div>
      <div className="admin-add-match">
        <div className="add-match-grid">
          <input className="add-match-input" placeholder="Player 1 Name (or leave blank for TBD)" value={newMatch.player1} onChange={e=>setNewMatch(n=>({...n,player1:e.target.value}))} />
          <input className="add-match-input" placeholder="Player 2 Name (or leave blank for TBD)" value={newMatch.player2} onChange={e=>setNewMatch(n=>({...n,player2:e.target.value}))} />
        </div>
        <div className="add-match-grid">
          <select className="add-match-input" value={newMatch.round} onChange={e=>setNewMatch(n=>({...n,round:e.target.value}))}>
            {ROUND_ORDER.map(r=><option key={r}>{r}</option>)}
          </select>
          <input className="add-match-input" type="number" min="1" placeholder="Match # (optional)" value={newMatch.matchNumber} onChange={e=>setNewMatch(n=>({...n,matchNumber:e.target.value}))} />
        </div>
        <button className="btn-add" onClick={()=>{
          onAddMatch({
            player1: newMatch.player1.trim() || 'TBD',
            player2: newMatch.player2.trim() || 'TBD',
            round: newMatch.round,
            matchNumber: newMatch.matchNumber ? Number(newMatch.matchNumber) : null,
            score1:0, score2:0, status:'upcoming',
            winnerName:null, nextMatchId:null, nextMatchSlot:null,
            penalties1:null, penalties2:null,
          });
          setNewMatch({player1:'',player2:'',round:newMatch.round,matchNumber:''});
        }}>+ Add Match</button>
      </div>

      {/* Manage matches */}
      <div className="section-title">Manage Matches</div>
      {matches.length===0 && <div className="empty-state" style={{marginBottom:'1.5rem'}}>No matches yet. Add one above.</div>}
      {matches.map(m => (
        <div className="admin-match-card" key={m.id}>
          <div className="admin-match-header">
            <div>
              <div className="admin-match-name">{m.player1} vs {m.player2}</div>
              <div style={{color:'var(--tm)',fontSize:'.67rem',marginTop:'2px'}}>{m.round}{m.matchNumber?` · #${m.matchNumber}`:''}</div>
            </div>
            <div className={`status-pill ${m.status}`}>
              {m.status==='live'?'🔴 LIVE':m.status==='finished'?'✓ DONE':m.status==='postponed'?'⏸ POSTPONED':m.status==='disputed'?'⚠ DISPUTED':'UPCOMING'}
            </div>
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
              {(m.status==='upcoming'||m.status==='live') && <button className="btn-action postpone" onClick={()=>onUpdateMatch(m.id,{status:'postponed'})}>⏸ Postpone</button>}
              {m.status==='finished' && !m.winnerName && <button className="btn-action dispute" onClick={()=>onUpdateMatch(m.id,{status:'disputed'})}>⚠ Dispute</button>}
              {(m.status==='finished'||m.status==='postponed'||m.status==='disputed') && <button className="btn-action reset" onClick={()=>onUpdateMatch(m.id,{status:'upcoming',score1:0,score2:0,winnerName:null,penalties1:null,penalties2:null})}>↺ Reset</button>}
              <button className="btn-action reset" style={{color:'var(--lr)',borderColor:'rgba(255,45,85,.3)'}} onClick={()=>onDeleteMatch(m.id)}>✕</button>
            </div>
          </div>

          {m.round !== 'Group Stage' && <ConfirmWinnerControl match={m} onConfirmWinner={onConfirmWinner} />}
          {KNOCKOUT_ROUNDS.includes(m.round) && <AdvanceControl match={m} matches={matches} onUpdateMatch={onUpdateMatch} />}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState('home');
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tournamentMeta, setTournamentMeta] = useState({ currentStage: 'Group Stage' });

  // Firebase real-time listeners
  useEffect(() => {
    if (DEMO_MODE) {
      setPlayers(DEMO_PLAYERS);
      setMatches(DEMO_MATCHES);
      setTournamentMeta(DEMO_META);
      return;
    }
    const unsubPlayers = onSnapshot(collection(db,'players'), snap => {
      setPlayers(snap.docs.map(d=>({id:d.id,...d.data()})));
    }, err=>console.error('Players error:',err));

    const unsubMatches = onSnapshot(collection(db,'matches'), snap => {
      setMatches(snap.docs.map(d=>({id:d.id,...d.data()})));
    }, err=>console.error('Matches error:',err));

    // Single settings doc drives the landing page's "current stage".
    // If it doesn't exist yet, we keep the default above — nothing breaks.
    const unsubMeta = onSnapshot(doc(db,'settings','tournament'), snap => {
      if (snap.exists()) setTournamentMeta(snap.data());
    }, err=>console.error('Tournament meta error:',err));

    return () => { unsubPlayers(); unsubMatches(); unsubMeta(); };
  }, []);

  const registerPlayer = async (data) => {
    if (DEMO_MODE) { setPlayers(p=>[...p,data]); return; }
    await addDoc(collection(db,'players'), data);
  };

  const updateMatch = async (id, patch) => {
    if (DEMO_MODE) { setMatches(ms=>ms.map(m=>m.id===id?{...m,...patch}:m)); return; }
    await updateDoc(doc(db,'matches',id), patch);
  };

  const addMatch = async (data) => {
    if (DEMO_MODE) { setMatches(ms=>[...ms,{...data,id:'m'+Date.now()}]); return; }
    await addDoc(collection(db,'matches'), data);
  };

  const deleteMatch = async (id) => {
    if (DEMO_MODE) { setMatches(ms=>ms.filter(m=>m.id!==id)); return; }
    await deleteDoc(doc(db,'matches',id));
  };

  // Confirms a winner on a finished match and, if this match feeds into a
  // next-round match (nextMatchId/nextMatchSlot set by the admin), fills
  // that slot automatically — this is the "auto-advance" engine.
  const confirmMatchWinner = async (match, winnerName, extra = {}) => {
    const patch = { winnerName, ...extra };
    if (DEMO_MODE) {
      setMatches(ms => ms.map(m => m.id===match.id ? {...m,...patch} : m));
      if (match.nextMatchId && match.nextMatchSlot) {
        setMatches(ms => ms.map(m => m.id===match.nextMatchId ? {...m,[match.nextMatchSlot]:winnerName} : m));
      }
      return;
    }
    await updateDoc(doc(db,'matches',match.id), patch);
    if (match.nextMatchId && match.nextMatchSlot) {
      await updateDoc(doc(db,'matches',match.nextMatchId), { [match.nextMatchSlot]: winnerName });
    }
  };

  const setStage = async (stage) => {
    if (DEMO_MODE) { setTournamentMeta({ currentStage: stage }); return; }
    await setDoc(doc(db,'settings','tournament'), { currentStage: stage }, { merge: true });
  };

  const liveCount = matches.filter(m=>m.status==='live').length;
  const goTo = (t) => setTab(t);

  return (
    <>
      <style>{styles}</style>
      <div className="grid-bg" />
      <div className="scanlines" />

      <nav className="nav">
        <div className="nav-logo">EFT · 2026</div>
        <div className="nav-tabs">
          {[
            ['home','Home'],
            ['tournament','Tournament'],
            ['bracket','Bracket'],
            ['register','Register'],
            ['admin','Admin'],
          ].map(([id,label]) => (
            <button
              key={id}
              className={`nav-tab ${tab===id?'active':''} ${id==='admin'?'admin-tab':''}`}
              onClick={()=>setTab(id)}
            >
              {id==='tournament' && liveCount>0 && <span style={{color:'var(--lr)',marginRight:'3px'}}>●</span>}
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="main">
        {tab==='home'       && <HeroSection matches={matches} tournamentMeta={tournamentMeta} onNavigate={goTo} />}
        {tab==='register'   && <RegistrationSection players={players} onRegister={registerPlayer} />}
        {tab==='tournament' && <TournamentSection matches={matches} />}
        {tab==='bracket'    && <BracketView matches={matches} />}
        {tab==='admin'      && (
          <AdminSection
            matches={matches}
            players={players}
            tournamentMeta={tournamentMeta}
            onUpdateMatch={updateMatch}
            onAddMatch={addMatch}
            onDeleteMatch={deleteMatch}
            onConfirmWinner={confirmMatchWinner}
            onSetStage={setStage}
          />
        )}
      </main>
    </>
  );
}
