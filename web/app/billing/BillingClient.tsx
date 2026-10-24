'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMe, createBillingPortalSession, ApiError, type MeResponse } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';
import styles from './billing.module.css';

const PLAN_LABEL: Record<MeResponse['plan'], string> = {
  free: 'Free',
  creator: 'Creator',
  pro: 'Pro',
};

export default function BillingClient() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [opening, setOpening] = useState(false);
  const [noBillingAccount, setNoBillingAccount] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => setError(true));
  }, []);

  async function handleManageBilling() {
    setOpening(true);
    setNoBillingAccount(false);
    try {
      const res = await createBillingPortalSession();
      window.location.href = res.portalUrl;
    } catch (err) {
      setOpening(false);
      if (err instanceof ApiError && err.code === 'no_billing_account') {
        setNoBillingAccount(true);
      } else {
        setError(true);
      }
    }
  }

  if (error) {
    return (
      <div className={styles.wrap}>
        <p className={styles.emptyState}>Couldn&rsquo;t load your billing info — try refreshing.</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className={styles.wrap}>
        <div className={styles.loading}>
          <Spinner size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Billing</h1>

      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>Current plan</span>
          <span className={styles.value}>{PLAN_LABEL[me.plan]}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Credits</span>
          <span className={styles.value}>{me.unlimited ? 'Unlimited' : me.credits}</span>
        </div>
      </div>

      <button
        className={styles.manageBtn}
        onClick={handleManageBilling}
        disabled={opening}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        {opening && <Spinner size={15} />}
        {opening ? 'Opening…' : 'Manage billing'}
      </button>

      {noBillingAccount && (
        <p className={styles.hint}>
          You don&rsquo;t have an active subscription yet.{' '}
          <Link href="/pricing" className={styles.hintLink}>View plans</Link>
        </p>
      )}

      <Link href="/pricing" className={styles.plansLink}>
        View plans &amp; upgrade
      </Link>
    </div>
  );
}
