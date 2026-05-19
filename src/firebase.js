import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBpVXpleq2T_8dN4IejId6qcZJNkK-QLQ4",
  authDomain: "bowling-league-system.firebaseapp.com",
  projectId: "bowling-league-system",
  storageBucket: "bowling-league-system.firebasestorage.app",
  messagingSenderId: "19271382626",
  appId: "1:19271382626:web:ce40265f7a0ea3c002433b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);