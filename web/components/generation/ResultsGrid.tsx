'use client';

import { useState } from 'react';
import { rerollAsset, pollGeneration, ApiError, type Asset } from '@/lib/api';
import { toast } from '@/lib/toast';
import { downloadSlide, slideFilename } from '@/lib/download';
import styles from './ResultsGrid.module.css';

const SHIMMER_COUNT = 6;

interface Props {
  assets: Asset[];
  isLoading: boolean;
  format: 'slideshow' | 'video';
  jobId: string;
  withText: boolean; // show slide text on the tiles and draw it onto downloads
  onRerollSuccess?: (rerollsRemaining: number) => void;
  onUpgradeNeeded?: () => void;
}

function ShimmerTile({ isVideo }: { isVideo: boolean }) {
  return (
    <div
      className={[styles.tile, isVideo ? styles.videoTile : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.shimmer} />
    </div>
  );
}

function AssetTile({
  asset,
  index,
  isVideo,
  isRerolling,
  withText,
  onDownload,
  onReroll,
}: {
  asset: Asset;
  index: number;
  isVideo: boolean;
  isRerolling: boolean;
  withText: boolean;
  onDownload: (asset: Asset, index: number) => void;
  onReroll: (id: string) => void;
}) {
  return (
    <div
      className={[styles.tile, isVideo ? styles.videoTile : '']
        .filter(Boolean)
        .join(' ')}
    >
      {isRerolling ? (
        <div className={styles.shimmer} />
      ) : (
        <>
          <span className={styles.num}>{isVideo ? 'Clip' : index + 1}</span>
          {isVideo ? (
            <video
              src={asset.url}
              poster={asset.thumbUrl || undefined}
              className={styles.img}
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.thumbUrl || asset.url}
              alt={asset.slideText || `Slide ${index + 1}`}
              className={styles.img}
            />
          )}
          {withText && asset.slideText && !isVideo && (
            // Same placement and style as the text drawn onto downloads (lib/download.ts).
            <p className={[styles.overlay, index === 0 ? styles.hook : ''].filter(Boolean).join(' ')}>
              <span>{asset.slideText}</span>
            </p>
          )}
          <div className={styles.actions}>
            <button
              className={styles.iconBtn}
              title="Download"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(asset, index);
              }}
            >
              {/* download arrow */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width={17}
                height={17}
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            {asset.rerollable && (
              <button
                className={styles.iconBtn}
                title="Redraw this slide"
                onClick={(e) => {
                  e.stopPropagation();
                  onReroll(asset.id);
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width={17}
                  height={17}
                >
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15" />
                </svg>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ResultsGrid({
  assets,
  isLoading,
  format,
  jobId,
  withText,
  onRerollSuccess,
  onUpgradeNeeded,
}: Props) {
  // Fresh copies of assets that were redrawn after the job loaded, by id.
  // Layered over the `assets` prop instead of copying the prop into state.
  const [redrawn, setRedrawn] = useState<Record<string, Asset>>({});
  const [rerollingIds, setRerollingIds] = useState<Set<string>>(new Set());
  const localAssets = assets.map((a) => redrawn[a.id] ?? a);

  async function handleDownload(asset: Asset, index: number) {
    await downloadSlide(asset, slideFilename(asset.type, index), withText);
    toast('Downloaded');
  }

  async function handleReroll(assetId: string) {
    const oldUrl = localAssets.find((a) => a.id === assetId)?.url ?? '';
    setRerollingIds((prev) => new Set([...prev, assetId]));
    toast('Rerolling…');

    try {
      const res = await rerollAsset(jobId, assetId);
      onRerollSuccess?.(res.rerollsRemaining);

      // Poll until the asset's URL changes, max 10 × 2s = 20s
      for (let i = 0; i < 10; i++) {
        await new Promise<void>((r) => setTimeout(r, 2000));
        const updated = await pollGeneration(jobId);
        if (updated.assets) {
          const newAsset = updated.assets.find((a) => a.id === assetId);
          if (newAsset) setRedrawn((prev) => ({ ...prev, [assetId]: newAsset }));
          // stop if URL changed or asset is gone (regenerated with new id)
          if (!newAsset || newAsset.url !== oldUrl) break;
        }
      }
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 402 || err.code === 'no_rerolls_remaining')
      ) {
        onUpgradeNeeded?.();
      }
    } finally {
      setRerollingIds((prev) => {
        const next = new Set(prev);
        next.delete(assetId);
        return next;
      });
    }
  }

  const isVideo = format === 'video';
  const tileCount = isVideo ? 1 : SHIMMER_COUNT;
  const gridClass = isVideo ? styles.videoGrid : styles.slidesGrid;

  if (isLoading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: tileCount }).map((_, i) => (
          <ShimmerTile key={i} isVideo={isVideo} />
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {localAssets.map((asset, i) => (
        <AssetTile
          key={asset.id}
          asset={asset}
          index={i}
          isVideo={isVideo}
          isRerolling={rerollingIds.has(asset.id)}
          withText={withText}
          onDownload={handleDownload}
          onReroll={handleReroll}
        />
      ))}
    </div>
  );
}
