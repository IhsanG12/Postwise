'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/layout/Nav';
import PageWrapper from '@/components/layout/PageWrapper';
import { getMe, createCheckout, ApiError } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';
import styles from './pricing.module.css';

type PlanId = 'free' | 'larper' | 'pro';

interface Plan {
  id: PlanId;
  apiId: 'larper' | 'pro' | null;
  name: string;
  price: string;
  priceNote: string;
  credits: string;
  badge?: string;
  highlight: boolean;
  features: string[];
  cta: string | null;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    apiId: null,
    name: 'Clipper',
    price: 'Free',
    priceNote: 'forever',
    credits: '3 generations / day',
    highlight: false,
    features: [
      'Slideshow format',
      'Basic scene library',
      '6 scenes per set',
      'Instagram + TikTok',
      'Larp AI watermark',
    ],
    cta: null,
  },
  {
    id: 'larper',
    apiId: 'larper',
    name: 'Larper',
    price: '$12',
    priceNote: '/ month',
    credits: '50 credits / month',
    badge: 'Most popular',
    highlight: true,
    features: [
      'Full scene library',
      'Slideshow + video formats',
      'No watermark',
      'Caption ideas + sound picks',
      '5 rerolls per month',
    ],
    cta: 'Go Larper',
  },
  {
    id: 'pro',
    apiId: 'pro',
    name: 'Pro Larper',
    price: '$29',
    priceNote: '/ month',
    credits: 'Unlimited credits',
    highlight: false,
    features: [
      'Everything in Larper',
      'Video format (TikTok 9:16)',
      'Priority generation',
      'Unlimited rerolls',
      'LinkedIn professional pack',
    ],
    cta: 'Go Pro',
  },
];

function CheckIcon() {
  return (
    <svg
      className={styles.checkIcon}
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 8.5l3.5 3.5 6.5-7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanId | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<'larper' | 'pro' | null>(null);

  useEffect(() => {
    getMe()
      .then((me) => setCurrentPlan(me.plan))
      .catch(() => {});
  }, []);

  async function handleUpgrade(plan: 'larper' | 'pro') {
    if (loadingPlan) return;
    setLoadingPlan(plan);
    try {
      const res = await createCheckout(plan);
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setLoadingPlan(null);
      if (err instanceof ApiError) {
        console.error('Checkout failed:', err.message);
      }
    }
  }

  return (
    <>
      <Nav />
      <main>
        <PageWrapper>
          <div className={styles.pricingWrap}>
            <div className={styles.heroSection}>
              <h1 className={styles.title}>Go full larper.</h1>
              <p className={styles.subtitle}>
                More credits, more scenes, more content.
                Pick the pace that fits you.
              </p>
            </div>

            <div className={styles.grid}>
              {PLANS.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                const isLoading = plan.apiId !== null && loadingPlan === plan.apiId;

                return (
                  <div
                    key={plan.id}
                    className={`${styles.card} ${plan.highlight ? styles.cardHighlight : ''}`}
                  >
                    {plan.badge && (
                      <span className={styles.badge}>{plan.badge}</span>
                    )}

                    <h2 className={styles.planName}>{plan.name}</h2>
                    <div className={styles.price}>{plan.price}</div>
                    <div className={styles.priceNote}>{plan.priceNote}</div>
                    <div className={styles.credits}>{plan.credits}</div>

                    <ul className={styles.features}>
                      {plan.features.map((f) => (
                        <li key={f} className={styles.feature}>
                          <CheckIcon />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className={styles.ctaSection}>
                      {isCurrent ? (
                        <div className={styles.currentBadge}>Current plan</div>
                      ) : plan.apiId === null ? (
                        <Link href="/signup" className={`${styles.ctaBtn} ${styles.ctaGhost}`}>
                          Get started
                        </Link>
                      ) : (
                        <button
                          className={`${styles.ctaBtn} ${plan.highlight ? styles.ctaDark : styles.ctaAccent}`}
                          onClick={() => handleUpgrade(plan.apiId!)}
                          disabled={!!loadingPlan}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                          {isLoading && <Spinner size={15} />}
                          {isLoading ? 'Redirecting…' : plan.cta}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className={styles.finePrint}>
              Cancel anytime. No contracts. No lock-in.
            </p>
          </div>
        </PageWrapper>
      </main>
    </>
  );
}
