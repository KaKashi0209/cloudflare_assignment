import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "FlareFix | Cloudflare Workers troubleshooting", description: "Evidence-based Cloudflare Workers incident investigation." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
