import type { Metadata } from "next";
import AppProviders from "@/components/AppProviders";
import ErrorBoundary from "@/components/ErrorBoundary";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lucrodacarne.com.br"),
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

        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-WQ74TKVK');`,
          }}
        />

        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq) return; n=f.fbq=function(){ n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments) }; if(!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s); }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '1680836316346863'); fbq('track', 'PageView');`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Google Tag Manager (noscript) */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WQ74TKVK" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
          }}
        />

        {/* Meta Pixel NoScript */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1680836316346863&ev=PageView&noscript=1" />`,
          }}
        />

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
