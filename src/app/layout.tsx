import type { Metadata } from "next";
import AppProviders from "@/components/AppProviders";
import ErrorBoundary from "@/components/ErrorBoundary";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Lucro da Carne | Calculadora de rendimento para açougues",
    template: "%s | Lucro da Carne",
  },
  description:
    "Calcule rendimento, quebra, custo real por kg, preço ideal e lucro por lote de carne. Ferramenta para açougues, casas de carne e mercados.",
  keywords: [
    "açougue",
    "rendimento de carne",
    "custo real por kg",
    "desossa",
    "lucro açougue",
    "calculadora de carne",
    "quebra de carne",
    "preço de corte",
    "margem açougue",
  ],
  authors: [{ name: "Lucro da Carne" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Lucro da Carne",
    title: "Lucro da Carne | Calculadora de rendimento para açougues",
    description:
      "Descubra o custo real da sua carne depois da desossa. Calcule rendimento, quebra, preço ideal e lucro por lote em poucos minutos.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lucro da Carne",
    description:
      "Calcule rendimento, quebra e lucro de cada lote de carne em poucos minutos.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥩</text></svg>" />
      </head>
      <body className="min-h-full flex flex-col">
        <ErrorBoundary>
          <AppProviders>
            <div className="flex min-h-screen flex-col">
              {children}
              <SiteFooter />
            </div>
          </AppProviders>
        </ErrorBoundary>
      </body>
    </html>
  );
}
