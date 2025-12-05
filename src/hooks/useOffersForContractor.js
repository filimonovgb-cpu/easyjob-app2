// src/hooks/useOffersForContractor.js
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseService';

const ACTIVE_STATUSES = new Set(['pending', 'accepted']);

export const useOffersForContractor = (contractorId) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!contractorId) {
      setOffers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const offersCol = collection(db, 'offers');
    const q = query(offersCol, where('contractorId', '==', contractorId));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const now = Date.now();
        const arr = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((o) => {
            if (!o.status || !ACTIVE_STATUSES.has(o.status)) return false;
            if (o.expiresAt && new Date(o.expiresAt).getTime() < now) return false;
            return true;
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOffers(arr);
        setLoading(false);
      },
      (err) => {
        console.error('useOffersForContractor onSnapshot error', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [contractorId]);

  return { offers, loading, error };
};

export default useOffersForContractor;
