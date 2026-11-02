import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { IntroSequenceProvider } from "@/components/ui/intro-sequence";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LA COSECHA | Salsas caseras",
    template: "%s | LA COSECHA",
  },
  description:
    "De nuestra tierra a tu mesa. Salsas caseras en Los Mochis, Sinaloa.",
  icons: {
    icon: "/logo/la-cosecha.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-MX">
      <body>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:block focus:bg-white focus:p-4"
        >
          Ir al contenido
        </a>
        <Providers>
          <IntroSequenceProvider>
            <Header />
            <main id="contenido">{children}</main>
            <Footer />
          </IntroSequenceProvider>
        </Providers>
      </body>
    </html>
  );
}

