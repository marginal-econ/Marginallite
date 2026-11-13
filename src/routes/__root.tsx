import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  isRedirect,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import { ThemeToggle } from "../components/marketing/theme-toggle";
import { Toaster } from "../components/ui/sonner";
import appCss from "../styles.css?url";
import waitlistCss from "../waitlist.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

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

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error("Root ErrorComponent caught:", error);
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!isRedirect(error)) {
      reportLovableError(error, { boundary: "tanstack_root_error_component" });
    }
  }, [error]);

  // If a route threw a redirect (e.g. from beforeLoad), follow it immediately
  if (isRedirect(error)) {
    if (typeof window !== "undefined") {
      const redirectObj = error as { href?: string; to?: string };
      const target = redirectObj.href || redirectObj.to || "/auth";
      window.location.replace(target);
    }
    return null;
  }

  const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  const errorStack = error instanceof Error ? error.stack : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="max-w-lg text-center w-full">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {errorMessage || "Something went wrong on our end. You can try refreshing or head back home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
          {errorStack && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center justify-center rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {showDetails ? "Hide details" : "Show details"}
            </button>
          )}
        </div>
        {showDetails && errorStack && (
          <pre className="mt-4 max-h-48 overflow-auto rounded-lg border border-border/80 bg-muted/70 p-3 text-left font-mono text-[11px] text-destructive whitespace-pre-wrap">
            {errorStack}
          </pre>
        )}
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#ec4899" },
      {
        title: "Marginalite — Cambridge IGCSE Economics (0455) marking & practice",
      },
      {
        name: "description",
        content:
          "Examiner-standard marking for Cambridge IGCSE Economics (0455), grounded in official syllabus and mark schemes.",
      },
      { property: "og:title", content: "Marginalite — Cambridge IGCSE Economics (0455) marking & practice" },
      {
        property: "og:description",
        content: "Cambridge 0455 essays and MCQs marked with exact official syllabus tariffs and AO breakdown.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,300..500;1,6..72,300..400&family=JetBrains+Mono:wght@400;500&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "stylesheet", href: waitlistCss },
      { rel: "icon", href: "/favicon.svg?v=4", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=4" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("marginalite-theme");document.documentElement.classList.toggle("dark",s==="dark")}catch(e){document.documentElement.classList.remove("dark")}document.documentElement.classList.add("motion-ready")})()`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <ThemeToggle />
      <Toaster />
    </QueryClientProvider>
  );
}
