import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export function useMatches() {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "matches"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMatches(data);
      }
    );

    return () => unsubscribe();
  }, []);

  return matches;
}