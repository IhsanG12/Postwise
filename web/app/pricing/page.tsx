'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/layout/Nav';
import PageWrapper from '@/components/layout/PageWrapper';
import { getMe, createCheckout, ApiError } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';
import styles from './pricing.module.css';

type PlanId = 'free' | 'creator' | 'pro';

interface Plan {
  id: PlanId;
  apiId: 'creator' | 'pro' | null;
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
    name: 'Free',
    price: 'Free',
    priceNote: 'forever',
    credits: '3 generations / day',
    highlight: false,
    features: [
      'Slideshow format',
      'A full post plan from your brief',
      '6 slides per post',
      'Instagram + TikTok',
    ],
    cta: null,
  },
  {
    id: 'creator',
    apiId: 'creator',
    name: 'Creator',
    price: '$12',
    priceNote: '/ month',
    credits: '50 credits / month',
    badge: 'Most popular',
    highlight: true,
    features: [
      'Slideshow + video formats',
      'Slide text, captions + hashtags',
      'Sound picks for every post',
      '5 slide redraws per month',
    ],
    cta: 'Go Creator',
  },
  {
    id: 'pro',
    apiId: 'pro',
    name: 'Pro',
    price: '$29',
    priceNote: '/ month',
    credits: 'Unlimited credits',
    highlight: false,
    features: [
      'Everything in Creator',
      'Video format (TikTok 9:16)',
      'Priority generation',
      'Unlimited redraws',
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
  const [loadingPlan, setLoadingPlan] = useState<'creator' | 'pro' | null>(null);

  useEffect(() => {
    getMe()
      .then((me) => setCurrentPlan(me.plan))
      .catch(() => {});
  }, []);

  async function handleUpgrade(plan: 'creator' | 'pro') {
    if (loadingPlan) return;
    setLoadingPlan(plan);
    try {
      const res = await createCheckout(plan);
      window.location.assign(res.checkoutUrl);
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
              <h1 className={styles.title}>Post more, think less.</h1>
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
