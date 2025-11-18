  // src/services/firebase.ts
  import { initializeApp } from "firebase/app";
  import { getFirestore } from "firebase/firestore";
  import { getStorage } from "firebase/storage";

  const firebaseConfig = {
    apiKey: "AIzaSyCfNNcIK2WR3ONNnlEDvolCw4Fn4-uheD0",
    authDomain: "viktoria-226cf.firebaseapp.com",
    databaseURL: "https://viktoria-226cf-default-rtdb.firebaseio.com",
    projectId: "viktoria-226cf",
    storageBucket: "viktoria-226cf.firebasestorage.app",
    messagingSenderId: "700359701423",
    appId: "1:700359701423:web:dd79ad17482d07e4a8355a",
    measurementId: "G-Q49EXYJWTD",
  };

  const app = initializeApp(firebaseConfig);

  // ✅ export initialized services
  export const db = getFirestore(app);
  export const storage = getStorage(app);
