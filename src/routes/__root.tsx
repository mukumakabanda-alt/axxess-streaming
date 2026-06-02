import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

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
      { title: "Axxess Entertainment - the entertainment you deserve" },
      { name: "description", content: "Affordable Netflix & Spotify access in Zambia. Spotify K35/mo, Netflix K70/mo, Prime Video K60/mo, and All Access K140/mo. Faster, easier. Reliable." },
      { name: "author", content: "Axxess Streaming" },
      { name: "keywords", content: "Netflix Zambia, Spotify Zambia, streaming Lusaka, cheap Netflix, affordable streaming Africa" },
      { property: "og:title", content: "Axxess Entertainment - the entertainment you deserve" },
      { property: "og:description", content: "Affordable Netflix & Spotify access in Zambia. Spotify K35/mo, Netflix K70/mo, Prime Video K60/mo, and All Access K140/mo. Faster, easier. Reliable." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_ZM" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#000000" },
      { name: "twitter:title", content: "Axxess Entertainment - the entertainment you deserve" },
      { name: "twitter:description", content: "Affordable Netflix & Spotify access in Zambia. Spotify K35/mo, Netflix K70/mo, Prime Video K60/mo, and All Access K140/mo. Faster, easier. Reliable." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/e4WfRWxkaUWNJKmI7ycjBVHpJn92/social-images/social-1777484825822-file_000000001a5471f5a722b7ad191b3fda.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/e4WfRWxkaUWNJKmI7ycjBVHpJn92/social-images/social-1777484825822-file_000000001a5471f5a722b7ad191b3fda.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
