import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export function useBowlers() {
  const [bowlers, setBowlers] = useState({});

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "bowlers"),
      (snapshot) => {
        const map = {};

        snapshot.docs.forEach((doc) => {
          map[doc.id] = {
            id: doc.id,
            ...doc.data(),
          };
        });

        setBowlers(map);
      }
    );

    return () => unsubscribe();
  }, []);

  return bowlers;
}