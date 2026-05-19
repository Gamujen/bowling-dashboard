import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export function useSubmissions() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "submissions"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSubmissions(data);
      }
    );

    return () => unsubscribe();
  }, []);

  return submissions;
}