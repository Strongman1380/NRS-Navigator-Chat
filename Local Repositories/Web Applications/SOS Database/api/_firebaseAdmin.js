import admin from "firebase-admin";

if (!admin.apps.length) {
  const projectId = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? "sos-data-log-73af3" : (process.env.FIREBASE_PROJECT_ID || "sos-data-log-73af3")).trim();
  let initialized = false;
  const serviceAccountJSON = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  if (serviceAccountJSON) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJSON);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId });
      initialized = true;
    } catch (error) {
      console.error("Firebase Admin: service account JSON is invalid, falling back to no-credential init:", error.message);
    }
  }
  if (!initialized) {
    try {
      admin.initializeApp({ projectId });
    } catch (error) {
      console.error("Firebase Admin init error:", error);
    }
  }
}

export const getAuth = () => admin.auth();
export const getDb = () => admin.firestore();
export default admin;
