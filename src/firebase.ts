import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCBFYg3L6je6d4-8IoMR9AFAZw93e_rni8",
  authDomain: "pokemon-manager-app-e6ecb.firebaseapp.com",
  projectId: "pokemon-manager-app-e6ecb",
  storageBucket: "pokemon-manager-app-e6ecb.firebasestorage.app",
  messagingSenderId: "792961814845",
  appId: "1:792961814845:web:6bff8e8ebbb34e8366f554",
  measurementId: "G-47CRG1K1DN"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
