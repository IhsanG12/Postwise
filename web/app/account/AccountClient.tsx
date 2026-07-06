'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMe, type MeResponse } from '@/lib/api';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import Spinner from '@/components/ui/Spinner';
import styles from './account.module.css';

const PLAN_LABEL: Record<MeResponse['plan'], string> = {
  free: 'Clipper',
  larper: 'Larper',
  pro: 'Pro Larper',
};

export default function AccountClient() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => {});

    getSupabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await getSupabaseBrowser().auth.signOut();
    router.push('/login');
  }

  if (!me) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <Spinner size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Account</h1>

      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>Email</span>
          <span className={styles.value}>{email ?? '—'}</span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Plan</span>
          <span className={styles.value}>
            {PLAN_LABEL[me.plan]}
            <Link href="/billing" className={styles.manageLink}>
              Manage
            </Link>
          </span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Credits</span>
          <span className={styles.value}>{me.unlimited ? 'Unlimited' : me.credits}</span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Rerolls remaining</span>
          <span className={styles.value}>{me.unlimited ? 'Unlimited' : me.rerollsRemaining}</span>
        </div>
      </div>

      <button className={styles.signOutBtn} onClick={handleSignOut} disabled={signingOut}>
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
