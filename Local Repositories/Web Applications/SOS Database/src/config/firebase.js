import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVeGPicpLS6t2M0rmdXsHAXMVlXELgD5I",
  authDomain: "sos-data-log-73af3.firebaseapp.com",
  projectId: "sos-data-log-73af3",
  storageBucket: "sos-data-log-73af3.firebasestorage.app",
  messagingSenderId: "1056139389189",
  appId: "1:1056139389189:web:3ce32c5bb9f3aedaa5ef6c",
  measurementId: "G-ZSVD9TP0C8",
};

const isFirebaseConfigured = (cfg) => {
  if (!cfg || typeof cfg !== "object") return false;
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  if (!required.every((k) => Boolean(cfg[k]))) return false;
  const looksPlaceholder =
    String(cfg.apiKey).includes("YOUR_") ||
    String(cfg.projectId).includes("YOUR_") ||
    String(cfg.authDomain).includes("YOUR_") ||
    String(cfg.appId).includes("YOUR_");
  return !looksPlaceholder;
};

let _app = null;
let _auth = null;
let _db = null;
let _initError = null;

try {
  if (isFirebaseConfigured(firebaseConfig)) {
    _app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    _auth = firebase.auth();
    _db = firebase.firestore();
  } else {
    _initError = "Firebase configuration is invalid";
    console.error(_initError);
  }
} catch (error) {
  _initError = error.message || "Firebase initialization failed";
  console.error("Firebase Initialization Error:", error);
}

const getApp = () => {
  if (!_app) throw new Error(_initError || "Firebase not configured.");
  return _app;
};

const getAuth = () => {
  if (!_auth) throw new Error(_initError || "Firebase not configured.");
  return _auth;
};

const getDb = () => {
  if (!_db) throw new Error(_initError || "Firebase not configured.");
  return _db;
};

const app = _app;
const auth = _auth;
const db = _db;

export { firebase, firebaseConfig, isFirebaseConfigured, app, auth, db, getApp, getAuth, getDb };
