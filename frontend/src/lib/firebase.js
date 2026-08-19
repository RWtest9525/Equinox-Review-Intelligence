import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAMeZtyWsrPOrZkj4ctoAfx_LDwbU8e0Bc",
  authDomain: "equinox-reviews-intelligence.firebaseapp.com",
  projectId: "equinox-reviews-intelligence",
  storageBucket: "equinox-reviews-intelligence.firebasestorage.app",
  messagingSenderId: "754597029224",
  appId: "1:754597029224:web:315daf3a9fbff806d662dd",
  measurementId: "G-TTD415ES18"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { analytics };
export default app;
