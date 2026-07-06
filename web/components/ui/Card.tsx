import styles from "./Card.module.css";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={[styles.card, className].filter(Boolean).join(" ")}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
