'use client';

import { useEffect } from 'react';
import styles from './error.module.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={styles.wrap}>
      <p className={styles.emoji} aria-hidden="true">⚡</p>
      <h2 className={styles.title}>Something went sideways.</h2>
      <p className={styles.body}>
        An unexpected error occurred. Refresh or try again.
      </p>
      <button className={styles.btn} onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
