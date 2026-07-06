'use client';

import { useState } from 'react';
import type { Caption } from '@/lib/api';
import { toast } from '@/lib/toast';
import styles from './CaptionCard.module.css';

interface Props {
  captions: Caption[];
  platform: 'instagram' | 'tiktok';
}

export default function CaptionCard({ captions, platform }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    toast('Caption copied');
    setCopied(id);
    setTimeout(() => setCopied((prev) => (prev === id ? null : prev)), 2000);
  }

  return (
    <div className={styles.card}>
      <h4 className={styles.title}>
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width={18}
          height={18}
        >
          <path d="M4 7h16M4 12h10M4 17h7" />
        </svg>
        Caption ideas
      </h4>
      <p className={styles.hint}>
        Tap to copy. Tuned for{' '}
        {platform === 'instagram' ? 'Instagram' : 'TikTok'}.
      </p>
      {captions.map((cap) => (
        <div
          key={cap.id}
          className={styles.cap}
          role="button"
          tabIndex={0}
          onClick={() => handleCopy(cap.text, cap.id)}
          onKeyDown={(e) => e.key === 'Enter' && handleCopy(cap.text, cap.id)}
        >
          <div className={styles.capBody}>
            <span className={styles.text}>{cap.text}</span>
            {cap.tone && <span className={styles.tone}>{cap.tone}</span>}
          </div>
          <span className={[styles.copy, copied === cap.id ? styles.copyDone : ''].filter(Boolean).join(' ')}>
            {copied === cap.id ? 'Copied!' : 'Copy'}
          </span>
        </div>
      ))}
    </div>
  );
}
