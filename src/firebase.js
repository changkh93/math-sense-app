import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAn1TdeM6XArdnf82bOk1BTQMIfkh7kXvQ",
  authDomain: "math-sense-1f6a8.firebaseapp.com",
  projectId: "math-sense-1f6a8",
  storageBucket: "math-sense-1f6a8.firebasestorage.app",
  messagingSenderId: "1075562222654",
  appId: "1:1075562222654:web:b53956e3355764993ced6f",
  measurementId: "G-SGWRBZ7X2E"
};

export const FUNCTIONS_REGION = "asia-northeast3";

const app = initializeApp(firebaseConfig);
const shouldUseFunctionsEmulator =
  typeof window !== 'undefined' &&
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

const functions = getFunctions(app, FUNCTIONS_REGION);

if (shouldUseFunctionsEmulator && !globalThis.__METASENSE_FUNCTIONS_EMULATOR_CONNECTED__) {
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  globalThis.__METASENSE_FUNCTIONS_EMULATOR_CONNECTED__ = true;
}

export function getFunctionUrl(functionName) {
  if (shouldUseFunctionsEmulator) {
    return `http://127.0.0.1:5001/${firebaseConfig.projectId}/${FUNCTIONS_REGION}/${functionName}`;
  }
  return `https://${FUNCTIONS_REGION}-${firebaseConfig.projectId}.cloudfunctions.net/${functionName}`;
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export { functions };
export default app;
