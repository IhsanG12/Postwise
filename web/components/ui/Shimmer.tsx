import styles from "./Shimmer.module.css";

interface ShimmerProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export default function Shimmer({
  width = "100%",
  height = "100%",
  borderRadius,
  className,
}: ShimmerProps) {
  return (
    <div
      className={[styles.shimmer, className].filter(Boolean).join(" ")}
      style={{ width, height, borderRadius }}
    />
  );
}
