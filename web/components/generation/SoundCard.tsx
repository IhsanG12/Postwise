import type { Sound } from '@/lib/api';
import styles from './SoundCard.module.css';

interface Props {
  sounds: Sound[];
  platform: 'instagram' | 'tiktok';
}

export default function SoundCard({ sounds, platform }: Props) {
  const platformLabel = platform === 'instagram' ? 'Instagram' : 'TikTok';

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
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        Sounds to use
      </h4>
      <p className={styles.hint}>
        Songs that fit this post&rsquo;s mood. Add one inside {platformLabel}.
      </p>
      {sounds.map((s) => (
        <a
          key={s.id}
          href={s.openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.sound}
        >
          <div className={styles.pl}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width={15}
              height={15}
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div className={styles.info}>
            <div className={styles.name}>{s.title}</div>
            {s.meta && <div className={styles.meta}>{s.meta}</div>}
          </div>
          <span className={styles.open}>Open ↗</span>
        </a>
      ))}
    </div>
  );
}
