'use client';

import { useEffect, useRef, useState } from 'react';
import { pollGeneration, type Asset, type Caption, type Sound, type PostSummary } from '../api';

type PollStatus = 'polling' | 'complete' | 'failed';

export interface UseGenerationResult {
  status: PollStatus;
  progress: number;
  assets: Asset[];
  captions: Caption[];
  sounds: Sound[];
  post: PostSummary | null;
  error: string | null;
  message: string | null; // the planner's reason when error is "brief_rejected"
  brief: string | null;   // known even when the job failed, for "edit and try again"
  retryable: boolean;
}

export function useGeneration(jobId: string): UseGenerationResult {
  const [result, setResult] = useState<UseGenerationResult>({
    status: 'polling',
    progress: 0,
    assets: [],
    captions: [],
    sounds: [],
    post: null,
    error: null,
    message: null,
    brief: null,
    retryable: false,
  });

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelledRef.current) return;
      try {
        const data = await pollGeneration(jobId);
        if (cancelledRef.current) return;

        if (data.status === 'complete') {
          setResult({
            status: 'complete',
            progress: 1,
            assets: data.assets ?? [],
            captions: data.captions ?? [],
            sounds: data.sounds ?? [],
            post: data.post ?? null,
            error: null,
            message: null,
            brief: data.post?.brief ?? null,
            retryable: false,
          });
        } else if (data.status === 'failed') {
          setResult((prev) => ({
            ...prev,
            status: 'failed',
            error: data.error ?? 'generation_failed',
            message: data.message ?? null,
            brief: data.brief ?? null,
            retryable: data.retryable ?? false,
          }));
        } else {
          // still processing — update progress and schedule next poll in 2s
          setResult((prev) => ({
            ...prev,
            progress: data.progress ?? prev.progress,
          }));
          timer = setTimeout(poll, 2000);
        }
      } catch {
        if (!cancelledRef.current) {
          setResult((prev) => ({
            ...prev,
            status: 'failed',
            error: 'network_error',
            retryable: true,
          }));
        }
      }
    }

    poll();

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  return result;
}
