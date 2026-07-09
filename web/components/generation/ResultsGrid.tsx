'use client';

import { useEffect, useState } from 'react';
import { rerollAsset, pollGeneration, ApiError, type Asset } from '@/lib/api';
import { toast } from '@/lib/toast';
import styles from './ResultsGrid.module.css';

const SHIMMER_COUNT = 6;

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
    // fallback: open in new tab
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  }
}

interface Props {
  assets: Asset[];
  isLoading: boolean;
  format: 'slideshow' | 'video';
  jobId: string;
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
  onDownload,
  onReroll,
}: {
  asset: Asset;
  index: number;
  isVideo: boolean;
  isRerolling: boolean;
  onDownload: (url: string, index: number) => void;
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
              alt={asset.sceneTag || `Scene ${index + 1}`}
              className={styles.img}
            />
          )}
          <div className={styles.actions}>
            <button
              className={styles.iconBtn}
              title="Download"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(asset.url, index);
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
                title="Reroll this one"
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
  onRerollSuccess,
  onUpgradeNeeded,
}: Props) {
  const [localAssets, setLocalAssets] = useState<Asset[]>(assets);
  const [rerollingIds, setRerollingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalAssets(assets);
  }, [assets]);

  async function handleDownload(url: string, index: number) {
    await downloadAsset(url, `larp-${index + 1}.jpg`);
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
          setLocalAssets(updated.assets);
          const newAsset = updated.assets.find((a) => a.id === assetId);
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
          onDownload={handleDownload}
          onReroll={handleReroll}
        />
      ))}
    </div>
  );
}
