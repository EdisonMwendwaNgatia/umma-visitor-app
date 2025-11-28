import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCv_9O2ZhC9jW2C9L-2vNhOjoMbTQdGi5Y",
  authDomain: "student-fee-admission-system.firebaseapp.com",
  databaseURL: "https://student-fee-admission-system-default-rtdb.firebaseio.com",
  projectId: "student-fee-admission-system",
  storageBucket: "student-fee-admission-system.firebasestorage.app",
  messagingSenderId: "1009657295375",
  appId: "1:1009657295375:web:27973824ea9d7e1c52e97a",
  measurementId: "G-NW5PLFKFR1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);