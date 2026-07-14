import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/planos", "/termos-de-uso", "/politica-de-privacidade", "/cancelamento-e-reembolso"],
      disallow: ["/admin", "/conta", "/dashboard", "/historico", "/lote", "/calculadora"],
    },
    sitemap: "https://lucrodacarne.com.br/sitemap.xml",
  };
}
