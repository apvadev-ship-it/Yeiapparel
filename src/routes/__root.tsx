import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { CartProvider } from "@/lib/cart";
import { Header } from "@/components/yei/Header";
import { Footer } from "@/components/yei/Footer";
import { CustomCursor } from "@/components/yei/CustomCursor";
import { CartDrawer } from "@/components/yei/CartDrawer";
import { PageTransition } from "@/components/yei/PageTransition";
import { WhatsAppButton } from "@/components/yei/WhatsAppButton";
import { CookieConsent } from "@/components/yei/CookieConsent";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl">404</h1>
        <h2 className="mt-4 font-display text-2xl">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="btn-yei border-chocolate hover:bg-chocolate hover:text-marfil"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl">Esta página no cargó</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo salió mal. Puedes intentar de nuevo o volver al inicio.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-yei border-chocolate bg-chocolate text-marfil"
          >
            Intentar de nuevo
          </button>
          <a href="/" className="btn-yei border-chocolate">
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "YEI APPAREL — Moda femenina de elegancia contemporánea" },
      {
        name: "description",
        content:
          "Más que moda, una forma de vivir tu esencia. YEI APPAREL: sastrería y vestidos de mujer con estética editorial, colección 2026.",
      },
      { property: "og:site_name", content: "YEI APPAREL" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Jost:wght@300;400;500;600&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "YEI",
          description: "Más que moda, una forma de vivir tu esencia.",
          slogan: "Más que moda, una forma de vivir tu esencia",
        }),
      },
      // Google Analytics. Se activa solo si VITE_GA_MEASUREMENT_ID está
      // puesto (ej. "G-XXXXXXXXXX", del panel de GA4). Sin esa variable
      // no se carga ningún script de terceros ni se manda tráfico a
      // Google, así que el sitio funciona igual sin ella.
      ...(import.meta.env["VITE_GA_MEASUREMENT_ID"]
        ? [
            {
              src: `https://www.googletagmanager.com/gtag/js?id=${import.meta.env["VITE_GA_MEASUREMENT_ID"]}`,
              async: true,
            },
            {
              type: "text/javascript",
              children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${import.meta.env["VITE_GA_MEASUREMENT_ID"]}');`,
            },
          ]
        : []),
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
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
      <CartProvider>
        <PageTransition />
        <CustomCursor />
        <Header />
        <main>
          {/* Required: nested routes render here. */}
          <Outlet />
        </main>
        <Footer />
        <CartDrawer />
        <WhatsAppButton />
        <CookieConsent />
      </CartProvider>
    </QueryClientProvider>
  );
}
