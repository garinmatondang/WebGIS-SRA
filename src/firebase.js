// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDhM49lq0ADeiBAk-1DXE4L_OPi60mw3GU",
  authDomain: "webgissra.firebaseapp.com",
  projectId: "webgissra",
  storageBucket: "webgissra.firebasestorage.app",
  messagingSenderId: "9595670640",
  appId: "1:9595670640:web:90f4c9a03af88c7e6ae4b5",
  measurementId: "G-1J98MQQKE1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
