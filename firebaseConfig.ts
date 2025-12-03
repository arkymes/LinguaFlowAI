import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore/lite";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAhOCj3mFfTKgzcpY9xZqctYOdhZDcfUBk",
  authDomain: "linguaflow-38815.firebaseapp.com",
  projectId: "linguaflow-38815",
  storageBucket: "linguaflow-38815.firebasestorage.app",
  messagingSenderId: "485853821142",
  appId: "1:485853821142:web:b8c5a28a158ac8e1c53177"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
