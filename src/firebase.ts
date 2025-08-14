import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCH5dh_DVR7uDzLlo5ARFn0_dfffTkuNLo",
  authDomain: "kazadi-pay.firebaseapp.com",
  projectId: "kazadi-pay",
  storageBucket: "kazadi-pay.firebasestorage.app",
  messagingSenderId: "679847392290",
  appId: "1:679847392290:web:8dd8a0688aa4865ecc467b",
  measurementId: "G-SGYLJX5C71"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);
export default app;
