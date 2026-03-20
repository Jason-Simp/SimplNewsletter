import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SchoolAmplified Newsletter Builder",
  description:
    "A structured newsletter builder for districts and schools with web, email, PDF, HTML, and blog output modes."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
