"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Nav from "@/components/layout/Nav";
import PageWrapper from "@/components/layout/PageWrapper";
import SelfieUpload from "@/components/generation/SelfieUpload";
import Link from "next/link";
import { createGeneration, ApiError } from "@/lib/api";
import { BRIEF_EXAMPLES, BRIEF_MAX_LENGTH, BRIEF_MIN_LENGTH, cleanBrief } from "@/lib/brief";
import Spinner from "@/components/ui/Spinner";
import styles from "./page.module.css";

type Platform = "instagram" | "tiktok";
type Format = "slideshow" | "video";

const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
};

const PLATFORM_COLOR: Record<Platform, string> = {
  instagram: "#C13584",
  tiktok: "#0B0B0C",
};

const PLATFORM_GRADIENT: Record<Platform, string> = {
  instagram:
    "linear-gradient(150deg,#feda75 0%,#fa7e1e 22%,#d62976 52%,#962fbf 78%,#4f5bd5 100%)",
  tiktok:
    "radial-gradient(120% 120% at 80% 10%,#25F4EE 0%,#101014 42%,#0a0a0d 100%)",
};

const PLATFORM_DESC: Record<Platform, string> = {
  instagram:
    "4:5 carousels people save: clean slides, useful text, polished captions.",
  tiktok:
    "9:16 slideshows and clips with a hook that stops the scroll.",
};

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      width={26}
      height={26}
    >
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="#fff" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="#fff" width={26} height={26}>
      <path d="M16.6 5.8a4.3 4.3 0 0 1-2.6-3.8h-3v12.9a2.6 2.6 0 1 1-2-2.5V9.3a5.6 5.6 0 1 0 5 5.5V8.6a7.3 7.3 0 0 0 4.2 1.3V6.8a4.3 4.3 0 0 1-1.6-1z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      width={18}
      height={18}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="#fff"
      width={22}
      height={22}
      style={{ opacity: 0.9 }}
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PlatformCard({
  platform,
  selected,
  onClick,
}: {
  platform: Platform;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={[styles.pcard, selected ? styles.pcardSelected : ""]
        .filter(Boolean)
        .join(" ")}
      style={{ background: PLATFORM_GRADIENT[platform] }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className={styles.pcardPin}>
        {platform === "instagram" ? <InstagramIcon /> : <TikTokIcon />}
      </div>
      <div className={styles.pcardGo}>
        <ArrowIcon />
      </div>
      <span className={styles.pcardLab}>{PLATFORM_LABEL[platform]}</span>
      <h2 className={styles.pcardTitle}>
        Post to {PLATFORM_LABEL[platform]}
      </h2>
      <p className={styles.pcardDesc}>{PLATFORM_DESC[platform]}</p>
      <span className={styles.pcardTag}>Slideshow · Video</span>
    </div>
  );
}

function FormatCard({
  format,
  selected,
  onClick,
}: {
  format: Format;
  selected: boolean;
  onClick: () => void;
}) {
  const isSlide = format === "slideshow";
  return (
    <div
      className={[styles.fcard, selected ? styles.fcardSelected : ""]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div
        className={[styles.ficon, isSlide ? styles.ficonSlide : styles.ficonVideo].join(" ")}
      >
        {isSlide ? (
          <>
            <div
              className={styles.miniCard}
              style={{
                width: 46,
                height: 58,
                background: "linear-gradient(140deg,#caa46a,#8a6a3a)",
                transform: "rotate(-8deg) translateX(-12px)",
              }}
            />
            <div
              className={styles.miniCard}
              style={{
                width: 46,
                height: 58,
                background: "linear-gradient(140deg,#6a86a0,#27384a)",
                transform: "rotate(4deg) translateX(0)",
              }}
            />
            <div
              className={styles.miniCard}
              style={{
                width: 46,
                height: 58,
                background: "linear-gradient(140deg,#5b3a66,#241127)",
                transform: "rotate(12deg) translateX(12px)",
              }}
            />
          </>
        ) : (
          <div
            style={{
              width: 54,
              height: 78,
              background:
                "radial-gradient(120% 90% at 60% 20%,#3a3550,#14121d)",
              display: "grid",
              placeItems: "center",
              borderRadius: 6,
            }}
          >
            <PlayIcon />
          </div>
        )}
      </div>
      <h3 className={styles.fcardTitle}>
        {isSlide ? "Slideshow" : "Short video"}
      </h3>
      <p className={styles.fcardDesc}>
        {isSlide
          ? "6 slides that tell one story, with text on each. Redraw any slide you don’t love."
          : "One 9:16 clip that sets the scene for your post. Premium generation."}
      </p>
      <span
        className={[
          styles.fcardPill,
          !isSlide ? styles.fcardPillVideo : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {isSlide ? "Fast · low credits" : "Premium · more credits"}
      </span>
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill from a "Regenerate" link in History (?platform=&format=&withFace=).
  // The original selfieUploadId is never carried over — selfies are deleted
  // after use, so a withFace=true row just lands the user on the upload step
  // to add a new one before generating.
  const [platform, setPlatform] = useState<Platform | null>(() => {
    const p = searchParams.get("platform");
    return p === "instagram" || p === "tiktok" ? p : null;
  });
  const [format, setFormat] = useState<Format | null>(() => {
    const f = searchParams.get("format");
    return f === "slideshow" || f === "video" ? f : null;
  });
  const [withFace, setWithFace] = useState(() => searchParams.get("withFace") === "true");
  const [brief, setBrief] = useState(() => (searchParams.get("brief") ?? "").slice(0, BRIEF_MAX_LENGTH));
  const briefReady = cleanBrief(brief).length >= BRIEF_MIN_LENGTH;
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const canGenerate =
    briefReady &&
    !!platform &&
    !!format &&
    (!withFace || !!uploadId) &&
    !generating;

  function handlePlatformSelect(p: Platform) {
    setPlatform(p);
    setFormat(null);
  }

  function handleFormatSelect(f: Format) {
    setFormat(f);
  }

  function handleFaceModeChange(face: boolean) {
    setWithFace(face);
    if (!face) setUploadId(null);
  }

  async function handleGenerate() {
    if (!canGenerate || !platform || !format) return;
    setGenerating(true);
    setErrorMsg(null);
    try {
      const res = await createGeneration({
        platform,
        format,
        withFace,
        selfieUploadId: uploadId,
        count: 6,
        brief: cleanBrief(brief),
      });
      router.push(
        `/generation/${res.jobId}?platform=${platform}&format=${format}&withFace=${withFace}`,
      );
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 402 || err.code === "insufficient_credits")
      ) {
        setShowUpgradeModal(true);
      } else if (err instanceof ApiError && err.status === 401) {
        router.push("/login");
        return;
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
      setGenerating(false);
    }
  }

  return (
    <>
      {showUpgradeModal && (
        <div className={styles.modalOverlay} onClick={() => setShowUpgradeModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>You&rsquo;re out of credits</h3>
            <p className={styles.modalBody}>
              Upgrade to keep posting.
            </p>
            <div className={styles.modalActions}>
              <Link href="/pricing" className={styles.upgradeBtn}>
                Upgrade
              </Link>
              <button className={styles.cancelBtn} onClick={() => setShowUpgradeModal(false)}>
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
      <Nav />
      <main>
        <PageWrapper>
          {/* Hero */}
          <section className={styles.hero}>
            <span className={styles.eyebrow}>
              <span className={styles.pulse} />
              From idea to ready-to-post
            </span>
            <h1 className={styles.h1}>
              Say what it&rsquo;s about. Get the whole <em className={styles.serif}>post</em>.
            </h1>
            <p className={styles.sub}>
              Describe your post in a sentence. Postwise plans the slides,
              writes the text on each one, and hands you captions, hashtags and
              a sound to use.
            </p>
          </section>

          {/* Brief: what the post is about. Everything else is planned from this. */}
          <section className={styles.briefSection}>
            <label htmlFor="brief" className={styles.briefLabel}>
              What&rsquo;s your post about?
            </label>
            <textarea
              id="brief"
              className={styles.briefInput}
              value={brief}
              onChange={(e) => setBrief(e.target.value.slice(0, BRIEF_MAX_LENGTH))}
              placeholder={BRIEF_EXAMPLES[0]}
              rows={2}
            />
            <div className={styles.briefMeta}>
              <div className={styles.examples}>
                {BRIEF_EXAMPLES.slice(1, 4).map((ex) => (
                  <button key={ex} type="button" className={styles.example} onClick={() => setBrief(ex)}>
                    {ex}
                  </button>
                ))}
              </div>
              <span className={styles.briefCount}>
                {brief.length}/{BRIEF_MAX_LENGTH}
              </span>
            </div>
          </section>

          {/* Platform picker */}
          <div className={styles.platforms}>
            <PlatformCard
              platform="instagram"
              selected={platform === "instagram"}
              onClick={() => handlePlatformSelect("instagram")}
            />
            <PlatformCard
              platform="tiktok"
              selected={platform === "tiktok"}
              onClick={() => handlePlatformSelect("tiktok")}
            />
          </div>

          {/* Format picker — appears after platform selected */}
          {platform && (
            <section
              className={styles.stepSection}
              key={`format-${platform}`}
            >
              <div className={styles.crumb}>
                <span
                  className={styles.chipPlat}
                  style={{ background: PLATFORM_COLOR[platform] }}
                >
                  {PLATFORM_LABEL[platform]}
                </span>
                Step 1 of 2
              </div>
              <h2 className={styles.stepH}>What are we making?</h2>
              <p className={styles.stepSub}>
                Both come back ready to post — with caption ideas and a sound
                to use.
              </p>
              <div className={styles.formats}>
                <FormatCard
                  format="slideshow"
                  selected={format === "slideshow"}
                  onClick={() => handleFormatSelect("slideshow")}
                />
                <FormatCard
                  format="video"
                  selected={format === "video"}
                  onClick={() => handleFormatSelect("video")}
                />
              </div>
            </section>
          )}

          {/* Face mode + generate — appears after format selected */}
          {platform && format && (
            <section className={styles.stepSection} key={`face-${format}`}>
              <div className={styles.crumb}>
                <span
                  className={styles.chipPlat}
                  style={{ background: PLATFORM_COLOR[platform] }}
                >
                  {PLATFORM_LABEL[platform]}
                </span>
                Step 2 of 2
              </div>
              <h2 className={styles.stepH}>Make it you?</h2>
              <p className={styles.stepSub}>
                {format === "video"
                  ? "Upload a selfie to be in the clip, or skip it and the clip shows your world: hands, objects, places."
                  : "Upload a selfie and you’ll be in the photos, or skip it and the slides show your world: hands, objects, places."}
              </p>

              <div className={styles.faceToggle} role="group" aria-label="Face mode">
                <button
                  className={[
                    styles.toggleBtn,
                    withFace ? styles.toggleActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleFaceModeChange(true)}
                  aria-pressed={withFace}
                >
                  Add my face
                </button>
                <button
                  className={[
                    styles.toggleBtn,
                    !withFace ? styles.toggleActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleFaceModeChange(false)}
                  aria-pressed={!withFace}
                >
                  Go faceless
                </button>
              </div>

              {withFace && (
                <SelfieUpload
                  onUpload={(id) => setUploadId(id)}
                  onReset={() => setUploadId(null)}
                />
              )}

              {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

              <div className={styles.generateBar}>
                <button
                  className={[
                    styles.generateBtn,
                    !canGenerate ? styles.generateDisabled : "",
                    generating ? styles.generateBusy : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={!canGenerate}
                  onClick={handleGenerate}
                >
                  {generating && <Spinner size={15} />}
                  {generating ? "Generating…" : "Generate"}
                </button>
                <span className={styles.creditCost}>
                  {briefReady ? "Uses 1 credit" : "Describe your post above first"}
                </span>
              </div>
            </section>
          )}
        </PageWrapper>
      </main>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
