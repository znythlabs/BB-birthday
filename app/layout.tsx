import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000")
    .split(",")[0]
    .trim();
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";

  let origin = "http://localhost:3000";
  try {
    origin = new URL(`${protocol}://${host}`).origin;
  } catch {
    // Keep metadata valid if an intermediary supplies a malformed host header.
  }

  const socialImage = new URL("/og.png", origin).toString();
  const title = "Liliana’s First Birthday | Under the Sea";
  const description = "Swim through Liliana’s magical underwater first birthday invitation and discover the party details.";

  return {
    title,
    description,
    openGraph: {
      title: "Liliana’s First Birthday",
      description: "A magical under-the-sea birthday invitation.",
      type: "website",
      url: origin,
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Liliana’s magical underwater first birthday invitation" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Liliana’s First Birthday",
      description: "A magical under-the-sea birthday invitation.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
