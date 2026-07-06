'use client';

import { useEffect, useState } from 'react';
import styles from './Toaster.module.css';

interface ToastItem {
  id: number;
  message: string;
}

let _id = 0;

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handle(e: Event) {
      const { message } = (e as CustomEvent<{ message: string }>).detail;
      const id = _id++;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        2800
      );
    }
    window.addEventListener('larp:toast', handle);
    return () => window.removeEventListener('larp:toast', handle);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className={styles.stack} aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
