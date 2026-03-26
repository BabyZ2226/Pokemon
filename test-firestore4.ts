import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const app = initializeApp({ projectId: "test" });
const db = getFirestore(app, "(default)");

console.log("db is:", db ? "defined" : "undefined");
