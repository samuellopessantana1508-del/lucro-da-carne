import type { MetadataRoute } from "next";

const baseUrl = "https://lucrodacarne.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/planos",
    "/calculadora",
    "/conta",
    "/termos-de-uso",
    "/politica-de-privacidade",
    "/cancelamento-e-reembolso",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" || route === "/planos" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/planos" ? 0.9 : 0.6,
  }));
}
