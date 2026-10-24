'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGeneration } from '@/lib/hooks/useGeneration';
import { editPostHref } from '@/lib/links';
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
  // When the job completes, hand off to the rich results page
  useEffect(() => {
    if (gen.status === 'complete') {
      router.replace(
        `/results/${jobId}?platform=${platform}&format=${format}`,
      );
    }
  }, [gen.status, jobId, platform, format, router]);

  // The selfie is deleted after use, so "try again" goes back to the picker
  // with the brief filled in rather than silently re-running without a face.
  const editHref = editPostHref({ platform, format, withFace, brief: gen.brief });

  const isFailed = gen.status === 'failed';

  const title =
    format === 'video' ? 'Making your clip…' : 'Making your post…';

  const isVideo = format === 'video';
  const tileCount = isVideo ? 1 : SHIMMER_COUNT;

  return (
    <>
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
            <p className={styles.hiccup}>
              {gen.error === 'brief_rejected'
                ? gen.message || 'Postwise can’t make this post.'
                : 'Generation hiccuped. Your credit was refunded.'}
            </p>
            <Link href={editHref} className={styles.retryBtn}>
              {gen.error === 'brief_rejected' ? 'Edit the brief' : 'Try again'}
            </Link>
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
