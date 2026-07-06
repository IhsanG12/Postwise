import styles from "./PageWrapper.module.css";

export default function PageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.wrap}>{children}</div>;
}
