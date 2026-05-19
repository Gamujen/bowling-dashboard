import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "alerts"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setAlerts(data);
    });

    return () => unsubscribe();
  }, []);

  return alerts;
}