import type React from "react";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "danger" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
