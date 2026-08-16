import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAn1TdeM6XArdnf82bOk1BTQMIfkh7kXvQ",
  authDomain: "math-sense-1f6a8.firebaseapp.com",
  databaseURL: "https://math-sense-1f6a8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "math-sense-1f6a8",
  storageBucket: "math-sense-1f6a8.firebasestorage.app",
  messagingSenderId: "1075562222654",
  appId: "1:1075562222654:web:b53956e3355764993ced6f",
  measurementId: "G-SGWRBZ7X2E"
};

export const FUNCTIONS_REGION = "asia-northeast3";
export const ACCOUNT_DELETION_CALL_TIMEOUT_MS = 10 * 60 * 1000;

const app = initializeApp(firebaseConfig);
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY ||
  "6LdfZ1ctAAAAAJEE3gJAHBZP5NQ_C3yE1P4u9NC4";

// App Check 토큰을 먼저 발급하되, 콘솔 강제 적용은 정상 트래픽 지표를 확인한 뒤 켠다.
// 공개 사이트 키는 비밀 값이 아니며 허용 도메인은 reCAPTCHA Enterprise에서 제한한다.
export const appCheck = typeof window !== 'undefined'
  ? (globalThis.__METASENSE_APP_CHECK__ ||= initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    }))
  : null;
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
// Persist query targets and documents across reloads/tabs. This lets Firestore
// resume recent listeners instead of downloading the full result set again on
// every visit, while the server still supplies live updates.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const realtimeDb = getDatabase(app);
export const storage = getStorage(app);
export { functions };
export default app;
