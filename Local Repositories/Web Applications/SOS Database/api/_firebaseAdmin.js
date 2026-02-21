import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const serviceAccountJSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJSON) {
      const serviceAccount = JSON.parse(serviceAccountJSON);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || "sos-data-log-73af3",
      });
    } else {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "sos-data-log-73af3",
      });
    }
  } catch (error) {
    console.error("Firebase Admin init error:", error);
  }
}

export const getAuth = () => admin.auth();
export const getDb = () => admin.firestore();
export default admin;
