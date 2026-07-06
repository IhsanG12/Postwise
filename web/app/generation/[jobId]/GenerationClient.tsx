'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGeneration } from '@/lib/hooks/useGeneration';
import { createGeneration, getStyles, ApiError } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';
import styles from './generation.module.css';

const PLATFORM_LABEL: Record<'instagram' | 'tiktok', string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

const PLATFORM_COLOR: Record<'instagram' | 'tiktok', string> = {
  instagram: '#C13584',
  tiktok: '#0B0B0C',
};

const SHIMMER_COUNT = 6;

interface Props {
  jobId: string;
  platform: 'instagram' | 'tiktok';
  format: 'slideshow' | 'video';
  withFace: boolean;
}

export default function GenerationClient({
  jobId,
  platform,
  format,
  withFace,
}: Props) {
  const router = useRouter();
  const gen = useGeneration(jobId);
  const [retrying, setRetrying] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // When the job completes, hand off to the rich results page
  useEffect(() => {
    if (gen.status === 'complete') {
      router.replace(
        `/results/${jobId}?platform=${platform}&format=${format}`,
      );
    }
  }, [gen.status, jobId, platform, format, router]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      // This retry has no style-picker UI of its own — pick a random style
      // so a slideshow retry still satisfies the backend's required styleId.
      let styleId: string | null = null;
      if (format === 'slideshow') {
        const { styles: styleList } = await getStyles();
        styleId = styleList.length > 0
          ? styleList[Math.floor(Math.random() * styleList.length)].id
          : null;
      }
      const res = await createGeneration({
        platform,
        format,
        withFace,
        selfieUploadId: null,
        count: 6,
        styleId,
      });
      router.push(
        `/generation/${res.jobId}?platform=${platform}&format=${format}&withFace=${withFace}`,
      );
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 402 || err.code === 'insufficient_credits')
      ) {
        setShowUpgrade(true);
      }
      setRetrying(false);
    }
  }, [platform, format, withFace, router]);

  // treat 'complete' as loading — we're mid-redirect, keep shimmer visible
  const isLoading = gen.status === 'polling' || gen.status === 'complete';
  const isFailed = gen.status === 'failed';

  const title =
    format === 'video' ? 'Making your clip…' : 'Making your larp…';

  const isVideo = format === 'video';
  const tileCount = isVideo ? 1 : SHIMMER_COUNT;

  return (
    <>
      {showUpgrade && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowUpgrade(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>
              You&rsquo;re out of credits
            </h3>
            <p className={styles.modalBody}>
              Upgrade to keep larping.
            </p>
            <div className={styles.modalActions}>
              <Link href="/pricing" className={styles.upgradeBtn}>
                Upgrade
              </Link>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowUpgrade(false)}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.wrap}>
        <Link href="/" className={styles.back}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            width={16}
            height={16}
          >
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          Start over
        </Link>

        <div className={styles.crumb}>
          <span
            className={styles.chipPlat}
            style={{ background: PLATFORM_COLOR[platform] }}
          >
            {PLATFORM_LABEL[platform]}
          </span>
          Generating&hellip;
        </div>

        <h2 className={styles.stepH}>{title}</h2>

        {!isFailed && (
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.round(gen.progress * 100)}%` }}
              />
            </div>
            <p className={styles.genMeter}>{Math.round(gen.progress * 100)}%</p>
          </div>
        )}

        {isFailed ? (
          <div className={styles.errorState}>
            <p className={styles.hiccup}>Generation hiccuped — try again</p>
            <button
              className={styles.retryBtn}
              onClick={handleRetry}
              disabled={retrying}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {retrying && <Spinner size={15} />}
              {retrying ? 'Retrying…' : 'Try again'}
            </button>
          </div>
        ) : (
          <div className={styles.resultsGrid}>
            {/* shimmer tiles */}
            <div>
              <div className={isVideo ? styles.videoShimmerWrap : styles.slidesShimmerGrid}>
                {Array.from({ length: tileCount }).map((_, i) => (
                  <div
                    key={i}
                    className={[
                      styles.shimmerTile,
                      isVideo ? styles.shimmerTileVideo : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className={styles.shimmer} />
                  </div>
                ))}
              </div>
            </div>

            {/* shimmer sidecards */}
            <div>
              <div className={styles.sidecardShimmer} />
              <div className={styles.sidecardShimmer} style={{ height: 160 }} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
