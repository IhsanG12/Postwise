'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/layout/Nav';
import PageWrapper from '@/components/layout/PageWrapper';
import { getMe } from '@/lib/api';
import styles from './success.module.css';

export default function PricingSuccessPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [unlimited, setUnlimited] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getMe()
      .then((me) => {
        setCredits(me.credits);
        setUnlimited(me.unlimited);
        setPlan(me.plan);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const planLabel =
    plan === 'pro' ? 'Pro Larper' : plan === 'larper' ? 'Larper' : null;

  const creditLine = unlimited
    ? 'Unlimited credits. Go wild.'
    : credits !== null
      ? `${credits} credits ready to use.`
      : null;

  return (
    <>
      <Nav />
      <main>
        <PageWrapper>
          <div className={styles.wrap}>
            <div className={styles.successCard}>
              <div className={styles.emoji} aria-hidden="true">🤍</div>

              <h1 className={styles.title}>
                You&rsquo;re a larper now.
              </h1>

              {planLabel && (
                <span className={styles.planBadge}>{planLabel}</span>
              )}

              {loaded && creditLine && (
                <p className={styles.sub}>{creditLine} Start making something worth posting.</p>
              )}

              {loaded && !creditLine && (
                <p className={styles.sub}>Your credits are loading — refresh in a moment if they don&rsquo;t appear.</p>
              )}

              <Link href="/" className={styles.startBtn}>
                Start larping
              </Link>

              <Link href="/pricing" className={styles.backLink}>
                Back to plans
              </Link>
            </div>
          </div>
        </PageWrapper>
      </main>
    </>
  );
}
