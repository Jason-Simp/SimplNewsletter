import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Wire by SchoolAmplified",
  description:
    "A structured school newsletter platform with web, email, PDF, HTML, blog, and agent-assisted output modes."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
