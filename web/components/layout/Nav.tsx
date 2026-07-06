"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMe, type MeResponse } from "@/lib/api";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import styles from "./Nav.module.css";

export default function Nav() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => {});
  }, []);

  const creditsLabel = me?.unlimited ? "∞" : me?.credits ?? null;

  async function handleSignOut() {
    await getSupabaseBrowser().auth.signOut();
    router.push("/login");
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <span className={styles.dot} />
          Larp AI
        </Link>
        <div className={styles.right}>
          {creditsLabel !== null && (
            <span className={styles.credits}>
              Credits <b>{creditsLabel}</b>
            </span>
          )}
          {me && (
            <Link href="/history" className={styles.signOut}>
              History
            </Link>
          )}
          {me && (
            <Link href="/account" className={styles.signOut}>
              Account
            </Link>
          )}
          {me && (
            <button className={styles.signOut} onClick={handleSignOut}>
              Sign out
            </button>
          )}
          <Link href="/pricing" className={styles.upgrade}>Upgrade</Link>
        </div>
      </div>
    </header>
  );
}
