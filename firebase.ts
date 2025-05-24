// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyApKdsczXqT7AiJuc1UOqpwbGWFkKxizDE",
  authDomain: "chatapp-c8943.firebaseapp.com",
  projectId: "chatapp-c8943",
  storageBucket: "chatapp-c8943.firebasestorage.app",
  messagingSenderId: "316172281166",
  appId: "1:316172281166:web:9c419f923eb99b30172a1f",
  measurementId: "G-9C30NR9ZYE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
const auth = getAuth(app);

export { app, analytics, auth };
