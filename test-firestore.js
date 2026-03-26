import { initializeApp } from "firebase/app";
import { getFirestore, doc } from "firebase/firestore";

const app = initializeApp({ projectId: "test" });
const db = getFirestore(app);

try {
  doc(db, 'saves', undefined);
} catch (e) {
  console.log("Error with undefined uid:", e.message);
}

try {
  doc(undefined, 'saves', "uid");
} catch (e) {
  console.log("Error with undefined db:", e.message);
}
