'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useGeneration } from '@/lib/hooks/useGeneration';
import { getMe } from '@/lib/api';
import { toast } from '@/lib/toast';
import { downloadSlide, slideFilename } from '@/lib/download';
import { editPostHref } from '@/lib/links';
import Spinner from '@/components/ui/Spinner';
import ResultsGrid from '@/components/generation/ResultsGrid';
import CaptionCard from '@/components/generation/CaptionCard';
import SoundCard from '@/components/generation/SoundCard';
import styles from './results.module.css';

const PLATFORM_LABEL: Record<'instagram' | 'tiktok', string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

const PLATFORM_COLOR: Record<'instagram' | 'tiktok', string> = {
  instagram: '#C13584',
  tiktok: '#0B0B0C',
};

interface Props {
  jobId: string;
  platform: 'instagram' | 'tiktok';
  format: 'slideshow' | 'video';
}

export default function ResultsClient({ jobId, platform, format }: Props) {
  const gen = useGeneration(jobId);

  const [rerollsRemaining, setRerollsRemaining] = useState<number | null>(null);
  const [unlimited, setUnlimited] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [withText, setWithText] = useState(true);

  useEffect(() => {
    getMe()
      .then((me) => {
        setRerollsRemaining(me.rerollsRemaining);
        setUnlimited(me.unlimited);
      })
      .catch(() => {});
  }, []);

  const handleDownloadAll = useCallback(async () => {
    if (!gen.assets.length || downloadingAll) return;
    setDownloadingAll(true);
    try {
      for (let i = 0; i < gen.assets.length; i++) {
        await downloadSlide(gen.assets[i], slideFilename(gen.assets[i].type, i), withText);
        if (i < gen.assets.length - 1) {
          await new Promise<void>((r) => setTimeout(r, 300));
        }
      }
      toast('All downloaded');
    } finally {
      setDownloadingAll(false);
    }
  }, [gen.assets, downloadingAll, withText]);

  // Selfies are deleted after use, so a retry goes back to the picker with
  // the brief filled in instead of re-running a with-face post without a face.
  const editHref = editPostHref({ platform, format, brief: gen.brief });

  const isLoading = gen.status === 'polling';
  const isFailed = gen.status === 'failed';
  const isComplete = gen.status === 'complete';

  const title = isComplete
    ? gen.post?.title || (format === 'video' ? 'Your clip’s ready.' : 'Your post’s ready.')
    : format === 'video'
      ? 'Making your clip…'
      : 'Making your post…';

  const isVideo = format === 'video';

  return (
    <>
      {/* Upgrade modal */}
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
              Upgrade to keep posting.
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
          {isComplete
            ? `Step 3 of 3 · ${format === 'video' ? 'Short video' : 'Slideshow'}`
            : 'Generating…'}
        </div>

        <h2 className={styles.stepH}>{title}</h2>
        {isComplete && (
          <p className={styles.stepSub}>
            {gen.post?.brief && <>&ldquo;{gen.post.brief}&rdquo; · </>}
            Redraw any slide you don&rsquo;t like, then grab a caption,
            hashtags and a sound.
          </p>
        )}

        {isComplete && gen.assets.length === 0 ? (
          <div className={styles.errorState}>
            <p className={styles.hiccup}>No images came back. Try generating again.</p>
            <Link href={editHref} className={styles.retryBtn}>
              Try again
            </Link>
          </div>
        ) : isFailed ? (
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
            {/* Left column: image grid + action bar */}
            <div>
              <ResultsGrid
                assets={gen.assets}
                isLoading={isLoading}
                format={format}
                jobId={jobId}
                withText={withText}
                onRerollSuccess={(remaining) => setRerollsRemaining(remaining)}
                onUpgradeNeeded={() => setShowUpgrade(true)}
              />

              {isComplete && (
                <>
                  <div className={styles.actionBar}>
                    {!isVideo && gen.assets.some((a) => a.slideText) && (
                      <label className={styles.textToggle}>
                        <input
                          type="checkbox"
                          checked={withText}
                          onChange={(e) => setWithText(e.target.checked)}
                        />
                        Text on slides
                      </label>
                    )}
                    <button
                      className={styles.downloadAllBtn}
                      onClick={handleDownloadAll}
                      disabled={downloadingAll}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      {downloadingAll && <Spinner size={15} />}
                      {downloadingAll ? 'Downloading…' : 'Download all'}
                    </button>
                    <Link href={editHref} className={styles.generateNewBtn}>
                      Make another version
                    </Link>
                  </div>
                  <p className={styles.genMeter}>
                    {unlimited ? (
                      <>Redraws: <b>unlimited</b></>
                    ) : (
                      <>
                        Redraws left this month:{' '}
                        <b>{rerollsRemaining ?? '—'}</b>
                        {' · '}
                        <span className={styles.upgradeLink}>
                          Upgrade for unlimited
                        </span>
                      </>
                    )}
                  </p>
                </>
              )}
            </div>

            {/* Right column: captions + sounds */}
            <div className={styles.sideCol}>
              {isComplete ? (
                <>
                  <CaptionCard
                    captions={gen.captions}
                    hashtags={gen.post?.hashtags ?? []}
                    platform={platform}
                  />
                  <SoundCard sounds={gen.sounds} platform={platform} />
                </>
              ) : (
                <>
                  <div className={styles.sidecardShimmer} />
                  <div
                    className={styles.sidecardShimmer}
                    style={{ height: 160 }}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
