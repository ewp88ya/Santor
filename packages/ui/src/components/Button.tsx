import type { ButtonHTMLAttributes } from "react";


export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}


export function Button({
  variant = "primary",
  children,
  ...props
}: ButtonProps) {

  return (
    <button
      {...props}
      className={`ui-button ui-button-${variant}`}
    >
      {children}
    </button>
  );
}
