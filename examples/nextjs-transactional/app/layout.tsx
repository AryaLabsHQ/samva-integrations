// oxlint-disable-next-line import/no-unassigned-import -- Next.js global CSS imports are side effects.
import "./styles.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Samva Next.js Transactional Email",
  description: "Send transactional email from a Next.js App Router app with Samva.",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
