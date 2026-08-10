import type { Metadata, Viewport } from "next";
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
  const title = "Lilianna’s First Birthday | Under the Sea";
  const description = "Swim through Lilianna’s magical underwater first birthday invitation and discover the party details.";

  return {
    title,
    description,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "Lilianna’s Birthday",
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      title: "Lilianna’s First Birthday",
      description: "A magical under-the-sea birthday invitation.",
      type: "website",
      url: origin,
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Lilianna’s magical underwater first birthday invitation" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Lilianna’s First Birthday",
      description: "A magical under-the-sea birthday invitation.",
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#075d75",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
