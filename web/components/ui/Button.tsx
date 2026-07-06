import styles from "./Button.module.css";

type Variant = "dark" | "soft" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "default" | "lg";
  full?: boolean;
}

export default function Button({
  variant = "dark",
  size = "default",
  full = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    styles.btn,
    styles[variant],
    size === "lg" ? styles.lg : "",
    full ? styles.full : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
