'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listGenerations, deleteGeneration, type HistoryJob } from '@/lib/api';
import Spinner from '@/components/ui/Spinner';
import styles from './history.module.css';

const PAGE_SIZE = 20;

const PLATFORM_LABEL: Record<'instagram' | 'tiktok', string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

const PLATFORM_COLOR: Record<'instagram' | 'tiktok', string> = {
  instagram: '#C13584',
  tiktok: '#0B0B0C',
};

const STATUS_LABEL: Record<HistoryJob['status'], string> = {
  processing: 'Generating…',
  complete: '',
  failed: 'Failed',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function HistoryClient() {
  const [jobs, setJobs] = useState<HistoryJob[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let ignore = false;
    listGenerations(PAGE_SIZE, 0)
      .then((res) => {
        if (ignore) return;
        setJobs(res.jobs);
        setHasMore(res.hasMore);
      })
      .catch(() => {
        if (!ignore) setError(true);
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleLoadMore() {
    if (!jobs) return;
    setLoadingMore(true);
    try {
      const res = await listGenerations(PAGE_SIZE, jobs.length);
      setJobs((prev) => (prev ? [...prev, ...res.jobs] : res.jobs));
      setHasMore(res.hasMore);
    } catch {
      setError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleDelete(jobId: string) {
    setDeletingIds((prev) => new Set(prev).add(jobId));
    try {
      await deleteGeneration(jobId);
      setJobs((prev) => (prev ? prev.filter((j) => j.jobId !== jobId) : prev));
    } catch {
      // leave the row in place; just stop showing the spinner
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
      setConfirmingId(null);
    }
  }

  if (error) {
    return (
      <div className={styles.wrap}>
        <p className={styles.emptyState}>Couldn&rsquo;t load your history — try refreshing.</p>
      </div>
    );
  }

  if (!jobs) {
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
      <h1 className={styles.title}>History</h1>

      {jobs.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You haven&rsquo;t made a larp yet.</p>
          <Link href="/" className={styles.emptyCta}>
            Make your first one
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {jobs.map((job) => {
              const isDeleting = deletingIds.has(job.jobId);
              const isConfirming = confirmingId === job.jobId;

              return (
                <div key={job.jobId} className={styles.card}>
                  <Link
                    href={`/results/${job.jobId}?platform=${job.platform}&format=${job.format}`}
                    className={styles.thumbLink}
                  >
                    <div className={styles.thumbWrap}>
                      {job.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={job.thumbUrl} alt="" className={styles.thumb} />
                      ) : (
                        <div className={styles.thumbPlaceholder} />
                      )}
                      {job.status !== 'complete' && (
                        <span
                          className={[
                            styles.statusBadge,
                            job.status === 'failed' ? styles.statusFailed : '',
                          ].join(' ')}
                        >
                          {STATUS_LABEL[job.status]}
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className={styles.cardMeta}>
                    <span
                      className={styles.platformChip}
                      style={{ background: PLATFORM_COLOR[job.platform] }}
                    >
                      {PLATFORM_LABEL[job.platform]}
                    </span>
                    <span className={styles.date}>{formatDate(job.createdAt)}</span>
                  </div>

                  <div className={styles.cardActions}>
                    <Link
                      href={`/?platform=${job.platform}&format=${job.format}&withFace=${job.withFace}`}
                      className={styles.regenerateLink}
                    >
                      Regenerate
                    </Link>

                    {isConfirming ? (
                      <span className={styles.confirmRow}>
                        <button
                          className={styles.confirmDeleteBtn}
                          onClick={() => handleDelete(job.jobId)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? <Spinner size={12} /> : 'Delete?'}
                        </button>
                        <button
                          className={styles.cancelDeleteBtn}
                          onClick={() => setConfirmingId(null)}
                          disabled={isDeleting}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        className={styles.deleteLink}
                        onClick={() => setConfirmingId(job.jobId)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              className={styles.loadMoreBtn}
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? <Spinner size={15} /> : 'Load more'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
