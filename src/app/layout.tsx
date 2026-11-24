import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppleAppShell } from "@/components/layout/AppleAppShell";
import { PwaSupport } from "@/components/pwa/PwaSupport";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "MisApuntesU | App Universitaria",
  description:
    "El espacio de estudio inteligente para estudiantes universitarios: Apuntes Adaptativos (Cornell, Feynman, Active Recall), Libros, Horario y Calculadora de Promedio.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MisApuntesU",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#007AFF",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  var origError = console.error;
                  var origWarn = console.warn;
                  var filter = function(args) {
                    var text = Array.prototype.slice.call(args).map(function(a) {
                      return typeof a === 'string' ? a : (a && a.message ? a.message : '');
                    }).join(' ');
                    return (
                      text.indexOf('hydrated') !== -1 ||
                      text.indexOf('hydration') !== -1 ||
                      text.indexOf('__next_metadata_boundary__') !== -1 ||
                      text.indexOf("didn't match the client") !== -1 ||
                      text.indexOf('hidden=[true]') !== -1 ||
                      text.indexOf('extra attributes from the server') !== -1
                    );
                  };
                  console.error = function() {
                    if (filter(arguments)) return;
                    return origError.apply(console, arguments);
                  };
                  console.warn = function() {
                    if (filter(arguments)) return;
                    return origWarn.apply(console, arguments);
                  };
                }
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full bg-[#F2F2F7] text-[#1C1C1E] selection:bg-[#007AFF]/20 selection:text-[#007AFF]"
      >
        <AppleAppShell user={user}>{children}</AppleAppShell>
        <PwaSupport />
      </body>
    </html>
  );
}
