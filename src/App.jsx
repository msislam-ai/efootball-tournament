// 🥭 MangoGrove - Full Stack Mango Store
// Firebase + bKash Payment + Admin Panel + Notifications + Chat
// ⚠️ SETUP: Replace firebaseConfig below with your own Firebase project config
// Firebase services needed: Authentication, Firestore, Realtime Database (free tier)

import { useState, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, onSnapshot, query, orderBy, where, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getDatabase, ref, push, onValue, off, set, serverTimestamp as rtdbTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
// Replace with your Firebase project config from https://console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyBykX8A_F8L0JuM4oPHG1gWUWxv-9uHGfo",
  authDomain: "mango-marketplace-bangladesh.firebaseapp.com",
  databaseURL: "https://mango-marketplace-bangladesh-default-rtdb.firebaseio.com/",
  projectId: "mango-marketplace-bangladesh",
  storageBucket: "mango-marketplace-bangladesh.firebasestorage.app",
  messagingSenderId: "406360686534",
  appId: "1:406360686534:web:94dbb88ad96bda7fb97cc7"
};

const ADMIN_EMAIL = "admin@mangogrove.com"; // Change to your admin email
const BKASH_NUMBER = "01XXXXXXXXX"; // Your bKash merchant number

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --mango: #FF8C00;
    --mango-light: #FFB347;
    --mango-dark: #E06000;
    --leaf: #2D6A4F;
    --leaf-light: #40916C;
    --cream: #FFF8F0;
    --dark: #1A0A00;
    --text: #3D1F00;
    --text-muted: #8B6347;
    --border: #FFD6A5;
    --white: #FFFFFF;
    --danger: #DC2626;
    --success: #16A34A;
    --shadow: 0 4px 24px rgba(255,140,0,0.15);
    --shadow-lg: 0 12px 48px rgba(255,140,0,0.25);
  }

  body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--text); }

  /* LAYOUT */
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

  /* HEADER */
  .header {
    background: linear-gradient(135deg, var(--leaf) 0%, var(--leaf-light) 100%);
    padding: 0 20px; position: sticky; top: 0; z-index: 100;
    box-shadow: 0 2px 20px rgba(0,0,0,0.2);
  }
  .header-inner {
    max-width: 1200px; margin: 0 auto; display: flex;
    align-items: center; justify-content: space-between; height: 64px; gap: 12px;
  }
  .logo {
    font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 900;
    color: var(--white); text-decoration: none; display: flex; align-items: center; gap: 8px;
  }
  .logo span { color: var(--mango-light); }
  .nav { display: flex; align-items: center; gap: 8px; }
  .nav-btn {
    background: rgba(255,255,255,0.15); color: var(--white); border: none;
    padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.85rem;
    font-family: 'DM Sans', sans-serif; transition: all 0.2s; display: flex; align-items: center; gap: 6px;
    font-weight: 500;
  }
  .nav-btn:hover { background: rgba(255,255,255,0.25); }
  .nav-btn.active { background: var(--mango); }
  .badge {
    background: var(--danger); color: white; border-radius: 10px;
    font-size: 0.7rem; padding: 1px 6px; font-weight: 700;
  }

  /* HERO */
  .hero {
    background: linear-gradient(135deg, #FF8C00 0%, #FFB347 40%, #2D6A4F 100%);
    padding: 80px 20px; text-align: center; position: relative; overflow: hidden;
  }
  .hero::before {
    content: '🥭'; position: absolute; font-size: 200px; opacity: 0.08;
    top: -20px; right: -20px; transform: rotate(20deg);
  }
  .hero h1 {
    font-family: 'Playfair Display', serif; font-size: clamp(2rem, 5vw, 3.5rem);
    color: var(--white); font-weight: 900; margin-bottom: 16px; line-height: 1.2;
  }
  .hero p { color: rgba(255,255,255,0.9); font-size: 1.1rem; margin-bottom: 32px; }
  .hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

  /* BUTTONS */
  .btn {
    padding: 12px 28px; border-radius: 50px; border: none; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 0.95rem;
    transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px;
  }
  .btn-primary { background: var(--white); color: var(--mango-dark); }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
  .btn-secondary { background: transparent; color: var(--white); border: 2px solid rgba(255,255,255,0.6); }
  .btn-secondary:hover { background: rgba(255,255,255,0.1); }
  .btn-mango { background: var(--mango); color: white; }
  .btn-mango:hover { background: var(--mango-dark); transform: translateY(-1px); }
  .btn-leaf { background: var(--leaf); color: white; }
  .btn-leaf:hover { background: #1e4d38; }
  .btn-danger { background: var(--danger); color: white; }
  .btn-sm { padding: 7px 16px; font-size: 0.82rem; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* CARDS */
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; padding: 32px 0; }
  .card {
    background: var(--white); border-radius: 20px; overflow: hidden;
    box-shadow: var(--shadow); transition: all 0.3s; border: 1px solid var(--border);
  }
  .card:hover { transform: translateY(-6px); box-shadow: var(--shadow-lg); }
  .card-img {
    width: 100%; height: 200px; object-fit: cover;
    background: linear-gradient(135deg, #FFD6A5, #FFB347);
    display: flex; align-items: center; justify-content: center;
    font-size: 80px;
  }
  .card-body { padding: 20px; }
  .card-title {
    font-family: 'Playfair Display', serif; font-size: 1.2rem;
    font-weight: 700; margin-bottom: 6px; color: var(--dark);
  }
  .card-desc { color: var(--text-muted); font-size: 0.88rem; margin-bottom: 14px; line-height: 1.5; }
  .card-price {
    font-size: 1.4rem; font-weight: 700; color: var(--mango-dark);
    margin-bottom: 14px;
  }
  .card-price span { font-size: 0.85rem; color: var(--text-muted); font-weight: 400; }

  /* SECTIONS */
  .section { padding: 40px 0; }
  .section-title {
    font-family: 'Playfair Display', serif; font-size: 1.8rem;
    font-weight: 900; margin-bottom: 8px; color: var(--dark);
  }
  .section-sub { color: var(--text-muted); margin-bottom: 8px; }

  /* MODAL */
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px); z-index: 200; display: flex;
    align-items: center; justify-content: center; padding: 20px;
  }
  .modal {
    background: var(--white); border-radius: 24px; padding: 32px;
    max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 24px 80px rgba(0,0,0,0.3);
  }
  .modal-title {
    font-family: 'Playfair Display', serif; font-size: 1.5rem;
    font-weight: 900; margin-bottom: 24px; color: var(--dark);
  }

  /* FORMS */
  .form-group { margin-bottom: 18px; }
  .form-label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.9rem; }
  .form-input {
    width: 100%; padding: 12px 16px; border: 2px solid var(--border);
    border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 0.95rem;
    background: var(--cream); color: var(--text); transition: border-color 0.2s;
  }
  .form-input:focus { outline: none; border-color: var(--mango); background: white; }
  textarea.form-input { resize: vertical; min-height: 100px; }
  select.form-input { cursor: pointer; }

  /* TABS */
  .tabs { display: flex; gap: 4px; background: var(--cream); border-radius: 12px; padding: 4px; margin-bottom: 24px; }
  .tab {
    flex: 1; padding: 10px; border: none; border-radius: 10px; cursor: pointer;
    font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 0.85rem;
    background: transparent; color: var(--text-muted); transition: all 0.2s;
  }
  .tab.active { background: var(--white); color: var(--mango-dark); box-shadow: var(--shadow); }

  /* ORDERS TABLE */
  .orders-list { display: flex; flex-direction: column; gap: 14px; }
  .order-card {
    background: var(--white); border-radius: 16px; padding: 20px;
    border: 2px solid var(--border); transition: border-color 0.2s;
  }
  .order-card:hover { border-color: var(--mango-light); }
  .order-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
  .order-id { font-weight: 700; color: var(--dark); font-size: 0.9rem; }
  .status-badge {
    padding: 4px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;
  }
  .status-pending { background: #FEF9C3; color: #854D0E; }
  .status-confirmed { background: #DCFCE7; color: #166534; }
  .status-delivered { background: #DBEAFE; color: #1E40AF; }
  .status-rejected { background: #FEE2E2; color: #991B1B; }

  /* NOTIFICATIONS */
  .notif-list { display: flex; flex-direction: column; gap: 10px; }
  .notif-item {
    background: var(--white); border-radius: 14px; padding: 16px 18px;
    border-left: 4px solid var(--mango); display: flex; align-items: flex-start;
    gap: 12px; cursor: pointer; transition: all 0.2s;
  }
  .notif-item.unread { background: #FFF8F0; border-left-color: var(--mango-dark); }
  .notif-item:hover { box-shadow: var(--shadow); }
  .notif-icon { font-size: 1.4rem; flex-shrink: 0; }
  .notif-body { flex: 1; }
  .notif-text { font-size: 0.9rem; font-weight: 500; }
  .notif-time { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }

  /* CHAT */
  .chat-container {
    background: var(--white); border-radius: 20px; overflow: hidden;
    border: 2px solid var(--border); display: flex; flex-direction: column; height: 500px;
  }
  .chat-header {
    background: linear-gradient(135deg, var(--leaf), var(--leaf-light));
    color: white; padding: 16px 20px; font-weight: 700;
  }
  .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
  .msg { display: flex; flex-direction: column; max-width: 75%; }
  .msg.mine { align-self: flex-end; align-items: flex-end; }
  .msg.theirs { align-self: flex-start; align-items: flex-start; }
  .msg-bubble {
    padding: 10px 16px; border-radius: 18px; font-size: 0.9rem; line-height: 1.4;
    word-break: break-word;
  }
  .msg.mine .msg-bubble { background: var(--mango); color: white; border-bottom-right-radius: 4px; }
  .msg.theirs .msg-bubble { background: var(--cream); color: var(--text); border-bottom-left-radius: 4px; border: 1px solid var(--border); }
  .msg-meta { font-size: 0.72rem; color: var(--text-muted); margin-top: 3px; padding: 0 4px; }
  .chat-input-row { display: flex; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--border); background: var(--cream); }
  .chat-input {
    flex: 1; padding: 10px 16px; border: 2px solid var(--border); border-radius: 24px;
    font-family: 'DM Sans', sans-serif; font-size: 0.9rem; background: white;
  }
  .chat-input:focus { outline: none; border-color: var(--mango); }

  /* ADMIN */
  .admin-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .stat-card {
    background: var(--white); border-radius: 16px; padding: 20px;
    text-align: center; border: 2px solid var(--border);
  }
  .stat-num { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 900; color: var(--mango-dark); }
  .stat-label { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; margin-top: 4px; }

  /* BKASH */
  .bkash-box {
    background: linear-gradient(135deg, #E2136E, #FF6699);
    border-radius: 16px; padding: 20px; color: white; margin: 16px 0;
  }
  .bkash-logo { font-size: 1.2rem; font-weight: 900; margin-bottom: 10px; }
  .bkash-step { font-size: 0.88rem; margin-bottom: 6px; opacity: 0.95; }

  /* MISC */
  .empty { text-align: center; padding: 60px 20px; color: var(--text-muted); }
  .empty-icon { font-size: 4rem; margin-bottom: 16px; }
  .divider { height: 1px; background: var(--border); margin: 24px 0; }
  .toast {
    position: fixed; bottom: 24px; right: 24px; background: var(--dark); color: white;
    padding: 14px 22px; border-radius: 14px; font-size: 0.9rem; z-index: 9999;
    box-shadow: var(--shadow-lg); animation: slideUp 0.3s ease;
    display: flex; align-items: center; gap: 10px; max-width: 360px;
  }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .spinner {
    width: 40px; height: 40px; border: 4px solid var(--border);
    border-top-color: var(--mango); border-radius: 50%; animation: spin 0.8s linear infinite;
    margin: 40px auto;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .flex { display: flex; }
  .gap-2 { gap: 8px; }
  .gap-3 { gap: 12px; }
  .mt-2 { margin-top: 8px; }
  .mt-3 { margin-top: 12px; }
  .wrap { flex-wrap: wrap; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .text-sm { font-size: 0.85rem; }
  .text-muted { color: var(--text-muted); }
  .font-bold { font-weight: 700; }
  .w-full { width: 100%; }
  .chat-room-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .room-item {
    background: var(--white); border: 2px solid var(--border); border-radius: 14px;
    padding: 14px 18px; cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; justify-content: space-between;
  }
  .room-item:hover, .room-item.active { border-color: var(--mango); background: #FFF8F0; }
  .product-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 600px) {
    .product-form-grid { grid-template-columns: 1fr; }
    .modal { padding: 20px; }
    .admin-stats { grid-template-columns: repeat(2, 1fr); }
  }
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const formatTime = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-BD", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
};

const MANGO_EMOJIS = ["🥭", "🌿", "🍋", "🟡", "🟠"];

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  if (!msg) return null;
  return <div className="toast">✅ {msg}</div>;
}

// ─── AUTH MODAL ───────────────────────────────────────────────────────────────
function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setLoading(true); setErr("");
    try {
      if (mode === "login") {
        const c = await signInWithEmailAndPassword(auth, email, pw);
        onAuth(c.user);
      } else {
        const c = await createUserWithEmailAndPassword(auth, email, pw);
        await addDoc(collection(db, "users"), { uid: c.user.uid, name, email, createdAt: serverTimestamp() });
        onAuth(c.user);
      }
      onClose();
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">🥭 {mode === "login" ? "Welcome Back" : "Join MangoGrove"}</h2>
        <div className="tabs">
          <button className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>Login</button>
          <button className={`tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>Register</button>
        </div>
        {mode === "register" && (
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" />
        </div>
        {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginBottom: 14 }}>{err}</p>}
        <button className="btn btn-mango w-full" onClick={submit} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
        </button>
        <p style={{ textAlign: "center", marginTop: 12, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Admin? Use: {ADMIN_EMAIL}
        </p>
      </div>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product, onOrder, user }) {
  return (
    <div className="card">
      <div className="card-img">{MANGO_EMOJIS[product.emoji || 0]}</div>
      <div className="card-body">
        <h3 className="card-title">{product.name}</h3>
        <p className="card-desc">{product.description}</p>
        <div className="card-price">৳{product.price} <span>/ {product.unit || "kg"}</span></div>
        <div className="flex gap-2">
          <span className={`status-badge ${product.stock > 0 ? "status-confirmed" : "status-rejected"}`}>
            {product.stock > 0 ? `${product.stock} ${product.unit || "kg"} left` : "Out of Stock"}
          </span>
        </div>
        <button
          className="btn btn-mango w-full"
          style={{ marginTop: 14 }}
          onClick={() => onOrder(product)}
          disabled={product.stock === 0}
        >
          {user ? "🛒 Order Now" : "🔐 Login to Order"}
        </button>
      </div>
    </div>
  );
}

// ─── ORDER MODAL ──────────────────────────────────────────────────────────────
function OrderModal({ product, user, onClose, onSuccess }) {
  const [qty, setQty] = useState(1);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [txnId, setTxnId] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const total = product.price * qty;

  const placeOrder = async () => {
    setLoading(true);
    try {
      const orderRef = await addDoc(collection(db, "orders"), {
        productId: product.id,
        productName: product.name,
        userId: user.uid,
        userEmail: user.email,
        qty, address, phone, txnId,
        total,
        status: "pending",
        createdAt: serverTimestamp()
      });
      // Notify admin
      await addDoc(collection(db, "notifications"), {
        userId: "admin",
        type: "new_order",
        title: "New Order Received!",
        body: `${user.email} ordered ${qty} ${product.unit || "kg"} of ${product.name}`,
        orderId: orderRef.id,
        read: false,
        createdAt: serverTimestamp()
      });
      // Notify user
      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        type: "order_placed",
        title: "Order Placed!",
        body: `Your order for ${product.name} is under review. We'll confirm after payment verification.`,
        orderId: orderRef.id,
        read: false,
        createdAt: serverTimestamp()
      });
      onSuccess("Order placed! Admin will confirm after payment verification.");
      onClose();
    } catch (e) { alert("Error: " + e.message); }
    setLoading(false);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">🥭 Order {product.name}</h2>
        {step === 1 && (
          <>
            <div className="form-group">
              <label className="form-label">Quantity ({product.unit || "kg"})</label>
              <input className="form-input" type="number" min="1" max={product.stock} value={qty}
                onChange={e => setQty(Math.max(1, Math.min(product.stock, +e.target.value)))} />
            </div>
            <div className="form-group">
              <label className="form-label">Delivery Address</label>
              <textarea className="form-input" value={address} onChange={e => setAddress(e.target.value)}
                placeholder="Full address with area, city..." />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div style={{ background: "var(--cream)", borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <div className="flex justify-between"><span>Price</span><span>৳{product.price} × {qty}</span></div>
              <div className="divider" style={{ margin: "10px 0" }} />
              <div className="flex justify-between font-bold"><span>Total</span><span style={{ color: "var(--mango-dark)", fontSize: "1.2rem" }}>৳{total}</span></div>
            </div>
            <button className="btn btn-mango w-full" onClick={() => setStep(2)} disabled={!address || !phone}>
              Proceed to Payment →
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <div className="bkash-box">
              <div className="bkash-logo">💳 bKash Payment</div>
              <div className="bkash-step">1. Open bKash app → Send Money</div>
              <div className="bkash-step">2. Number: <strong>{BKASH_NUMBER}</strong></div>
              <div className="bkash-step">3. Amount: <strong>৳{total}</strong></div>
              <div className="bkash-step">4. Reference: Your phone number</div>
              <div className="bkash-step">5. Copy the Transaction ID below</div>
            </div>
            <div className="form-group">
              <label className="form-label">bKash Transaction ID</label>
              <input className="form-input" value={txnId} onChange={e => setTxnId(e.target.value)}
                placeholder="e.g. 8N6XXXXXXX" />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary" style={{ color: "var(--text)", border: "2px solid var(--border)" }}
                onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-mango" style={{ flex: 1 }} onClick={placeOrder}
                disabled={!txnId || loading}>
                {loading ? "Placing..." : "✅ Confirm Order"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
function NotificationsPanel({ user, isAdmin }) {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", isAdmin ? "admin" : user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user, isAdmin]);

  const markRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), { read: true });
  };

  const icons = { new_order: "🛒", order_placed: "📦", order_confirmed: "✅", order_rejected: "❌", order_delivered: "🚚" };

  if (!user) return <div className="empty"><div className="empty-icon">🔔</div><p>Login to see notifications</p></div>;

  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
        <h2 className="section-title">🔔 Notifications</h2>
        <span className="text-muted text-sm">{notifs.filter(n => !n.read).length} unread</span>
      </div>
      {notifs.length === 0 ? (
        <div className="empty"><div className="empty-icon">🔔</div><p>No notifications yet</p></div>
      ) : (
        <div className="notif-list">
          {notifs.map(n => (
            <div key={n.id} className={`notif-item ${!n.read ? "unread" : ""}`} onClick={() => markRead(n.id)}>
              <span className="notif-icon">{icons[n.type] || "📢"}</span>
              <div className="notif-body">
                <div className="notif-text font-bold">{n.title}</div>
                <div className="notif-text">{n.body}</div>
                <div className="notif-time">{formatTime(n.createdAt)}</div>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--mango)", flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────
function ChatPanel({ user, isAdmin }) {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const msgsEndRef = useRef(null);

  // For customers: room = their uid. For admin: list all rooms
  useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      // Listen to all chat rooms
      const roomsRef = ref(rtdb, "chatRooms");
      onValue(roomsRef, snap => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([id, r]) => ({ id, ...r }));
        setRooms(list);
      });
      return () => off(ref(rtdb, "chatRooms"));
    } else {
      // Customer: ensure their room exists
      const roomRef = ref(rtdb, `chatRooms/${user.uid}`);
      set(roomRef, { userId: user.uid, userEmail: user.email, updatedAt: Date.now() });
      setActiveRoom(user.uid);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!activeRoom) return;
    const msgsRef = ref(rtdb, `chats/${activeRoom}`);
    onValue(msgsRef, snap => {
      const val = snap.val() || {};
      const list = Object.entries(val).map(([id, m]) => ({ id, ...m })).sort((a, b) => a.ts - b.ts);
      setMessages(list);
      setTimeout(() => msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => off(msgsRef);
  }, [activeRoom]);

  const send = async () => {
    if (!text.trim() || !activeRoom) return;
    await push(ref(rtdb, `chats/${activeRoom}`), {
      text: text.trim(),
      sender: user.email,
      senderId: user.uid,
      isAdmin,
      ts: Date.now()
    });
    // Update room metadata
    await set(ref(rtdb, `chatRooms/${activeRoom}/lastMsg`), text.trim());
    await set(ref(rtdb, `chatRooms/${activeRoom}/updatedAt`), Date.now());
    setText("");
    // Notify the other party
    const notifTarget = isAdmin ? activeRoom : "admin";
    await addDoc(collection(db, "notifications"), {
      userId: notifTarget,
      type: "new_message",
      title: isAdmin ? "Admin replied" : "You have a new message",
      body: text.trim().slice(0, 80),
      read: false,
      createdAt: serverTimestamp()
    });
  };

  if (!user) return <div className="empty"><div className="empty-icon">💬</div><p>Login to use chat</p></div>;

  return (
    <div>
      <h2 className="section-title" style={{ marginBottom: 20 }}>
        💬 {isAdmin ? "Customer Chats" : "Chat with Support"}
      </h2>
      {isAdmin && (
        <div className="chat-room-list">
          {rooms.length === 0 && <p className="text-muted text-sm">No customer chats yet.</p>}
          {rooms.map(r => (
            <div key={r.id} className={`room-item ${activeRoom === r.id ? "active" : ""}`}
              onClick={() => setActiveRoom(r.id)}>
              <div>
                <div className="font-bold text-sm">👤 {r.userEmail}</div>
                <div className="text-muted text-sm">{r.lastMsg?.slice(0, 50) || "No messages"}</div>
              </div>
              <span className="text-muted text-sm">→</span>
            </div>
          ))}
        </div>
      )}
      {activeRoom && (
        <div className="chat-container">
          <div className="chat-header">
            {isAdmin ? `Chat: ${rooms.find(r => r.id === activeRoom)?.userEmail || activeRoom}` : "🥭 MangoGrove Support"}
          </div>
          <div className="chat-messages">
            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                👋 Start the conversation!
              </div>
            )}
            {messages.map(m => {
              const mine = m.senderId === user.uid;
              return (
                <div key={m.id} className={`msg ${mine ? "mine" : "theirs"}`}>
                  <div className="msg-bubble">{m.text}</div>
                  <div className="msg-meta">
                    {m.isAdmin ? "🛡️ Admin" : "👤 " + m.sender.split("@")[0]} · {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
            <div ref={msgsEndRef} />
          </div>
          <div className="chat-input-row">
            <input className="chat-input" value={text} onChange={e => setText(e.target.value)}
              placeholder="Type a message..." onKeyDown={e => e.key === "Enter" && send()} />
            <button className="btn btn-mango btn-sm" onClick={send} disabled={!text.trim()}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MY ORDERS ────────────────────────────────────────────────────────────────
function MyOrders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  if (!user) return <div className="empty"><div className="empty-icon">📦</div><p>Login to see your orders</p></div>;
  if (loading) return <div className="spinner" />;

  return (
    <div>
      <h2 className="section-title" style={{ marginBottom: 20 }}>📦 My Orders</h2>
      {orders.length === 0 ? (
        <div className="empty"><div className="empty-icon">📦</div><p>No orders yet. Go buy some mangoes!</p></div>
      ) : (
        <div className="orders-list">
          {orders.map(o => (
            <div key={o.id} className="order-card">
              <div className="order-header">
                <div>
                  <div className="order-id">🥭 {o.productName}</div>
                  <div className="text-muted text-sm">Qty: {o.qty} · Total: ৳{o.total}</div>
                  <div className="text-muted text-sm">TxnID: {o.txnId}</div>
                  <div className="text-muted text-sm">{formatTime(o.createdAt)}</div>
                </div>
                <span className={`status-badge status-${o.status}`}>{o.status?.toUpperCase()}</span>
              </div>
              {o.note && <div className="text-sm" style={{ color: "var(--leaf)", marginTop: 8 }}>📝 Admin note: {o.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ user }) {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [pForm, setPForm] = useState({ name: "", description: "", price: "", stock: "", unit: "kg", emoji: 0 });
  const [note, setNote] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const q1 = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const q2 = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const u1 = onSnapshot(q1, s => { setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    const u2 = onSnapshot(q2, s => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); };
  }, []);

  const updateStatus = async (orderId, status, userId, productName) => {
    await updateDoc(doc(db, "orders", orderId), { status, note: note[orderId] || "" });
    await addDoc(collection(db, "notifications"), {
      userId,
      type: `order_${status}`,
      title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      body: `Your order for ${productName} has been ${status}.${note[orderId] ? " Note: " + note[orderId] : ""}`,
      orderId,
      read: false,
      createdAt: serverTimestamp()
    });
    setToast(`Order marked as ${status}`);
  };

  const saveProduct = async () => {
    const data = { ...pForm, price: +pForm.price, stock: +pForm.stock, emoji: +pForm.emoji };
    if (editProduct) {
      await updateDoc(doc(db, "products", editProduct.id), data);
      setToast("Product updated!");
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "products"), data);
      setToast("Product added!");
    }
    setShowProductForm(false); setEditProduct(null);
    setPForm({ name: "", description: "", price: "", stock: "", unit: "kg", emoji: 0 });
  };

  const deleteProduct = async (id) => {
    if (!confirm("Delete this product?")) return;
    await deleteDoc(doc(db, "products", id));
    setToast("Product deleted.");
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    confirmed: orders.filter(o => o.status === "confirmed").length,
    revenue: orders.filter(o => o.status !== "rejected").reduce((s, o) => s + (o.total || 0), 0)
  };

  return (
    <div>
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
      <h2 className="section-title" style={{ marginBottom: 20 }}>🛡️ Admin Dashboard</h2>
      <div className="admin-stats">
        <div className="stat-card"><div className="stat-num">{stats.total}</div><div className="stat-label">Total Orders</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: "#854D0E" }}>{stats.pending}</div><div className="stat-label">Pending</div></div>
        <div className="stat-card"><div className="stat-num" style={{ color: "var(--success)" }}>{stats.confirmed}</div><div className="stat-label">Confirmed</div></div>
        <div className="stat-card"><div className="stat-num">৳{stats.revenue}</div><div className="stat-label">Revenue</div></div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>Orders ({stats.pending} pending)</button>
        <button className={`tab ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}>Products</button>
      </div>

      {tab === "orders" && (
        loading ? <div className="spinner" /> :
        orders.length === 0 ? <div className="empty"><div className="empty-icon">📦</div><p>No orders yet</p></div> :
        <div className="orders-list">
          {orders.map(o => (
            <div key={o.id} className="order-card">
              <div className="order-header">
                <div>
                  <div className="order-id">🥭 {o.productName}</div>
                  <div className="text-sm text-muted">👤 {o.userEmail} · Qty: {o.qty} · ৳{o.total}</div>
                  <div className="text-sm text-muted">📱 {o.phone} · TxnID: <strong>{o.txnId}</strong></div>
                  <div className="text-sm text-muted">📍 {o.address}</div>
                  <div className="text-sm text-muted">{formatTime(o.createdAt)}</div>
                </div>
                <span className={`status-badge status-${o.status}`}>{o.status?.toUpperCase()}</span>
              </div>
              {o.status === "pending" && (
                <div style={{ marginTop: 14 }}>
                  <input className="form-input" style={{ marginBottom: 10 }} placeholder="Optional note to customer..."
                    value={note[o.id] || ""} onChange={e => setNote(n => ({ ...n, [o.id]: e.target.value }))} />
                  <div className="flex gap-2 wrap">
                    <button className="btn btn-leaf btn-sm" onClick={() => updateStatus(o.id, "confirmed", o.userId, o.productName)}>✅ Confirm</button>
                    <button className="btn btn-sm" style={{ background: "#DBEAFE", color: "#1E40AF" }}
                      onClick={() => updateStatus(o.id, "delivered", o.userId, o.productName)}>🚚 Delivered</button>
                    <button className="btn btn-danger btn-sm" onClick={() => updateStatus(o.id, "rejected", o.userId, o.productName)}>❌ Reject</button>
                  </div>
                </div>
              )}
              {o.status === "confirmed" && (
                <button className="btn btn-sm" style={{ background: "#DBEAFE", color: "#1E40AF", marginTop: 10 }}
                  onClick={() => updateStatus(o.id, "delivered", o.userId, o.productName)}>🚚 Mark Delivered</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "products" && (
        <div>
          <button className="btn btn-mango" style={{ marginBottom: 20 }} onClick={() => { setShowProductForm(true); setEditProduct(null); setPForm({ name: "", description: "", price: "", stock: "", unit: "kg", emoji: 0 }); }}>
            + Add Product
          </button>
          {showProductForm && (
            <div className="order-card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>{editProduct ? "Edit Product" : "New Product"}</h3>
              <div className="product-form-grid">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="form-input" value={pForm.name} onChange={e => setPForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Himsagar Mango" />
                </div>
                <div className="form-group">
                  <label className="form-label">Price (৳)</label>
                  <input className="form-input" type="number" value={pForm.price} onChange={e => setPForm(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock</label>
                  <input className="form-input" type="number" value={pForm.stock} onChange={e => setPForm(p => ({ ...p, stock: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select className="form-input" value={pForm.unit} onChange={e => setPForm(p => ({ ...p, unit: e.target.value }))}>
                    <option>kg</option><option>dozen</option><option>piece</option><option>box</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Icon</label>
                  <select className="form-input" value={pForm.emoji} onChange={e => setPForm(p => ({ ...p, emoji: +e.target.value }))}>
                    {MANGO_EMOJIS.map((e, i) => <option key={i} value={i}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" value={pForm.description} onChange={e => setPForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the mango variety..." />
              </div>
              <div className="flex gap-2">
                <button className="btn btn-mango" onClick={saveProduct} disabled={!pForm.name || !pForm.price}>
                  {editProduct ? "Update" : "Add Product"}
                </button>
                <button className="btn" style={{ background: "var(--cream)" }} onClick={() => setShowProductForm(false)}>Cancel</button>
              </div>
            </div>
          )}
          <div className="orders-list">
            {products.map(p => (
              <div key={p.id} className="order-card">
                <div className="order-header">
                  <div>
                    <div className="order-id">{MANGO_EMOJIS[p.emoji || 0]} {p.name}</div>
                    <div className="text-sm text-muted">৳{p.price}/{p.unit} · Stock: {p.stock}</div>
                    <div className="text-sm text-muted">{p.description?.slice(0, 80)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-sm" style={{ background: "#DBEAFE", color: "#1E40AF" }}
                      onClick={() => { setEditProduct(p); setPForm(p); setShowProductForm(true); }}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p.id)}>Del</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function MangoGrove() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState("shop");
  const [showAuth, setShowAuth] = useState(false);
  const [orderProduct, setOrderProduct] = useState(null);
  const [toast, setToast] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setIsAdmin(u?.email === ADMIN_EMAIL);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", isAdmin ? "admin" : user.uid),
      where("read", "==", false)
    );
    return onSnapshot(q, snap => setUnreadCount(snap.size));
  }, [user, isAdmin]);

  const handleOrder = (product) => {
    if (!user) { setShowAuth(true); return; }
    setOrderProduct(product);
  };

  const logout = () => { signOut(auth); setPage("shop"); };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}><div className="spinner" /></div>;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* HEADER */}
        <header className="header">
          <div className="header-inner">
            <a className="logo" href="#" onClick={() => setPage("shop")}>
              🥭 Mango<span>Grove</span>
            </a>
            <nav className="nav">
              <button className={`nav-btn ${page === "shop" ? "active" : ""}`} onClick={() => setPage("shop")}>🛒 Shop</button>
              {user && <button className={`nav-btn ${page === "orders" ? "active" : ""}`} onClick={() => setPage("orders")}>📦 Orders</button>}
              {user && (
                <button className={`nav-btn ${page === "notifications" ? "active" : ""}`} onClick={() => setPage("notifications")}>
                  🔔 {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                </button>
              )}
              {user && <button className={`nav-btn ${page === "chat" ? "active" : ""}`} onClick={() => setPage("chat")}>💬 Chat</button>}
              {isAdmin && <button className={`nav-btn ${page === "admin" ? "active" : ""}`} onClick={() => setPage("admin")}>🛡️ Admin</button>}
              {user ? (
                <button className="nav-btn" onClick={logout}>👤 Logout</button>
              ) : (
                <button className="nav-btn" onClick={() => setShowAuth(true)}>🔐 Login</button>
              )}
            </nav>
          </div>
        </header>

        {/* HERO */}
        {page === "shop" && (
          <div className="hero">
            <h1>Fresh Mangoes<br />Delivered to Your Door 🥭</h1>
            <p>Premium Bangladeshi mangoes — Himsagar, Langra, Amrapali & more</p>
            <div className="hero-btns">
              <button className="btn btn-primary" onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>
                Shop Now
              </button>
              {!user && <button className="btn btn-secondary" onClick={() => setShowAuth(true)}>Create Account</button>}
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <main className="container" style={{ flex: 1 }}>
          {page === "shop" && (
            <div className="section" id="products">
              <h2 className="section-title">🌿 Our Mangoes</h2>
              <p className="section-sub">Hand-picked, farm-fresh varieties from Rajshahi & Chapai</p>
              {products.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">🥭</div>
                  <p>Products coming soon! Admin is preparing the catalog.</p>
                </div>
              ) : (
                <div className="grid">
                  {products.map(p => <ProductCard key={p.id} product={p} onOrder={handleOrder} user={user} />)}
                </div>
              )}
            </div>
          )}
          {page === "orders" && <div className="section"><MyOrders user={user} /></div>}
          {page === "notifications" && <div className="section"><NotificationsPanel user={user} isAdmin={isAdmin} /></div>}
          {page === "chat" && <div className="section"><ChatPanel user={user} isAdmin={isAdmin} /></div>}
          {page === "admin" && isAdmin && <div className="section"><AdminPanel user={user} /></div>}
        </main>

        {/* FOOTER */}
        <footer style={{ background: "var(--dark)", color: "rgba(255,255,255,0.6)", textAlign: "center", padding: "20px", fontSize: "0.85rem" }}>
          🥭 MangoGrove © {new Date().getFullYear()} · bKash: {BKASH_NUMBER} · Made with ❤️ in Bangladesh
        </footer>
      </div>

      {/* MODALS */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={u => { setUser(u); setIsAdmin(u.email === ADMIN_EMAIL); }} />}
      {orderProduct && <OrderModal product={orderProduct} user={user} onClose={() => setOrderProduct(null)} onSuccess={msg => setToast(msg)} />}
      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
    </>
  );
}
