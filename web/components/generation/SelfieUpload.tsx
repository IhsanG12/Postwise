"use client";

import { useState, useRef, useCallback } from "react";
import { uploadSelfie } from "@/lib/api";
import styles from "./SelfieUpload.module.css";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface Props {
  onUpload: (uploadId: string) => void;
  onReset?: () => void;
}

type UploadStatus = "idle" | "uploading" | "done" | "error";

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={24}
      height={24}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={14}
      height={14}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={14}
      height={14}
      className={styles.tipIcon}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function validate(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type))
    return "Only JPG, PNG, or WebP photos are accepted.";
  if (file.size > MAX_BYTES) return "Photo must be under 10 MB.";
  return null;
}

export default function SelfieUpload({ onUpload, onReset }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      const err = validate(file);
      if (err) {
        setErrorMsg(err);
        setStatus("error");
        setPreviewUrl(null);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setErrorMsg(null);
      setStatus("uploading");

      try {
        const res = await uploadSelfie(file);
        setStatus("done");
        onUpload(res.uploadId);
      } catch {
        setStatus("error");
        setErrorMsg("Upload failed — please try again.");
        setPreviewUrl(null);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [onUpload],
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function openPicker() {
    if (status === "done" || status === "uploading") {
      onReset?.();
      setStatus("idle");
      setPreviewUrl(null);
      setErrorMsg(null);
    }
    fileInputRef.current?.click();
  }

  const showPreview =
    !!previewUrl && (status === "uploading" || status === "done");

  return (
    <div className={styles.wrap}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {showPreview ? (
        <div
          className={styles.preview}
          onClick={openPicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && openPicker()}
          aria-label={
            status === "uploading" ? "Uploading photo…" : "Photo ready. Tap to change."
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Your selfie preview" className={styles.previewImg} />

          {status === "uploading" && (
            <div className={styles.overlay}>
              <span className={styles.spinner} role="status" aria-label="Uploading" />
            </div>
          )}

          {status === "done" && (
            <div className={styles.checkmark} aria-hidden="true">
              <CheckIcon />
            </div>
          )}

          <span className={styles.changeTip} aria-hidden="true">
            Tap to change
          </span>
        </div>
      ) : (
        <div
          className={[
            styles.drop,
            dragOver ? styles.dropOver : "",
            status === "error" ? styles.dropError : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={openPicker}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDragEnd={() => setDragOver(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && openPicker()}
          aria-label="Upload a selfie"
        >
          <div className={styles.dropIcon}>
            <UploadIcon />
          </div>
          <div className={styles.dropBig}>Upload a selfie</div>
          <div className={styles.dropSmall}>
            Drag &amp; drop or tap to browse · JPG, PNG, WebP · Max 10 MB
          </div>
        </div>
      )}

      {errorMsg && <p className={styles.error}>{errorMsg}</p>}

      <div className={styles.tip}>
        <LockIcon />
        <span>
          <b>Your photo stays yours.</b> Used only to generate this content,
          then deleted immediately after. Upload a photo of yourself.
        </span>
      </div>
    </div>
  );
}
