import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";

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
const db = getFirestore(app);

async function check() {
  try {
    const q = query(collection(db, "games"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    console.log("Firebase Found games:", snap.docs.length);
    snap.docs.forEach(doc => {
       const data = doc.data();
       console.log("-----------------------------------------");
       console.log("Game ID:", doc.id);
       console.log("Name:", data.name);
       console.log("Type:", data.type);
       if (data.type === "JEOPARDY") {
          console.log("Categories:", data.categories?.map(c => c.name));
       }
    });
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}
check();
