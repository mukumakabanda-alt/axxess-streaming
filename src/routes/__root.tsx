import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { initOneSignal } from "@/lib/onesignal";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Axxess Entertainment — The entertainment you deserve" },
      { name: "description", content: "Zambia's premium streaming platform. Netflix K70/mo, Prime Video K60/mo, All Access K140/mo. No card. Activated via WhatsApp in 15 minutes." },
      { name: "author", content: "Axxess Entertainment" },
      { name: "keywords", content: "Netflix Zambia, Prime Video Zambia, streaming Zambia, cheap Netflix Zambia, affordable streaming Africa, Axxess Entertainment" },
      { property: "og:title", content: "Axxess Entertainment — The entertainment you deserve" },
      { property: "og:description", content: "Zambia's premium streaming platform. Netflix K70/mo, Prime Video K60/mo, All Access K140/mo. No card. Activated via WhatsApp in 15 minutes." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_ZM" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#080808" },
      { name: "twitter:title", content: "Axxess Entertainment — The entertainment you deserve" },
      { name: "twitter:description", content: "Zambia's premium streaming platform. Netflix K70/mo, Prime Video K60/mo, All Access K140/mo. No card. Activated via WhatsApp in 15 minutes." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/e4WfRWxkaUWNJKmI7ycjBVHpJn92/social-images/social-1777484825822-file_000000001a5471f5a722b7ad191b3fda.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/e4WfRWxkaUWNJKmI7ycjBVHpJn92/social-images/social-1777484825822-file_000000001a5471f5a722b7ad191b3fda.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Previously a plain `<link rel="stylesheet">`, which blocks first
      // paint on two network round-trips (the CSS file, then the font
      // files it references) even with the preconnects above. Loading it
      // as a `preload` and flipping it to a stylesheet once it arrives
      // (the standard "loadCSS" pattern) removes that blocking hop —
      // text renders immediately in a fallback font, then swaps in
      // (already `display=swap`, so no flash-of-invisible-text either).
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
        onLoad: "this.onload=null;this.rel='stylesheet'",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initOneSignal();
  }, []);

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster />
        <Scripts />
        <script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          defer
        />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
        }
