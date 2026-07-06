'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGeneration } from '@/lib/hooks/useGeneration';
import { createGeneration, getMe, getStyles, ApiError, type Asset } from '@/lib/api';
import { toast } from '@/lib/toast';
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

async function downloadAsset(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }
}

interface Props {
  jobId: string;
  platform: 'instagram' | 'tiktok';
  format: 'slideshow' | 'video';
}

export default function ResultsClient({ jobId, platform, format }: Props) {
  const router = useRouter();
  const gen = useGeneration(jobId);

  const [rerollsRemaining, setRerollsRemaining] = useState<number | null>(null);
  const [unlimited, setUnlimited] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

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
        await downloadAsset(gen.assets[i].url, `larp-${i + 1}.jpg`);
        if (i < gen.assets.length - 1) {
          await new Promise<void>((r) => setTimeout(r, 300));
        }
      }
      toast('All downloaded');
    } finally {
      setDownloadingAll(false);
    }
  }, [gen.assets, downloadingAll]);

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
        withFace: false,
        selfieUploadId: null,
        count: 6,
        styleId,
      });
      router.push(
        `/generation/${res.jobId}?platform=${platform}&format=${format}&withFace=false`,
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
  }, [platform, format, router]);

  const isLoading = gen.status === 'polling';
  const isFailed = gen.status === 'failed';
  const isComplete = gen.status === 'complete';

  const title = isComplete
    ? format === 'video'
      ? 'Your clip’s ready.'
      : 'Your larp’s ready.'
    : format === 'video'
      ? 'Making your clip…'
      : 'Making your larp…';

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
          {isComplete
            ? `Step 3 of 3 · ${format === 'video' ? 'Short video' : 'Slideshow'}`
            : 'Generating…'}
        </div>

        <h2 className={styles.stepH}>{title}</h2>
        {isComplete && (
          <p className={styles.stepSub}>
            Save the ones you love. Reroll any you don&rsquo;t. Then grab a
            caption and a sound.
          </p>
        )}

        {isComplete && gen.assets.length === 0 ? (
          <div className={styles.errorState}>
            <p className={styles.hiccup}>No images came back — try generating again</p>
            <button
              className={styles.retryBtn}
              onClick={handleRetry}
              disabled={retrying}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              {retrying && <Spinner size={15} />}
              {retrying ? 'Retrying…' : 'Generate new'}
            </button>
          </div>
        ) : isFailed ? (
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
            {/* Left column: image grid + action bar */}
            <div>
              <ResultsGrid
                assets={gen.assets}
                isLoading={isLoading}
                format={format}
                jobId={jobId}
                onRerollSuccess={(remaining) => setRerollsRemaining(remaining)}
                onUpgradeNeeded={() => setShowUpgrade(true)}
              />

              {isComplete && (
                <>
                  <div className={styles.actionBar}>
                    <button
                      className={styles.downloadAllBtn}
                      onClick={handleDownloadAll}
                      disabled={downloadingAll}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                    >
                      {downloadingAll && <Spinner size={15} />}
                      {downloadingAll ? 'Downloading…' : 'Download all'}
                    </button>
                    <Link href="/" className={styles.generateNewBtn}>
                      Generate new
                    </Link>
                  </div>
                  <p className={styles.genMeter}>
                    {unlimited ? (
                      <>Rerolls: <b>unlimited</b></>
                    ) : (
                      <>
                        Rerolls left this month:{' '}
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
                  <CaptionCard captions={gen.captions} platform={platform} />
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
