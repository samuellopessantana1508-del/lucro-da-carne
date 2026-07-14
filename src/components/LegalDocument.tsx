import Link from "next/link";
import { ArrowLeft, CalendarDays, Mail } from "lucide-react";
import Header from "@/components/Header";
import { LEGAL_IDENTITY } from "@/lib/legal-identity";

type LegalSection = {
  id: string;
  label: string;
};

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  summary: string;
  updatedAt: string;
  sections: LegalSection[];
  children: React.ReactNode;
};

export default function LegalDocument({
  eyebrow,
  title,
  summary,
  updatedAt,
  sections,
  children,
}: LegalDocumentProps) {
  return (
    <>
      <Header />
      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#7A1E24] hover:text-[#4A0F14]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao inicio
          </Link>

          <header className="mt-8 max-w-3xl border-b border-[#E5DED3] pb-8">
            <p className="text-sm font-semibold uppercase text-[#C89B3C]">{eyebrow}</p>
            <h1 className="mt-2 text-3xl font-bold text-[#4A0F14] sm:text-4xl">{title}</h1>
            <p className="mt-4 text-base leading-7 text-[#625B55]">{summary}</p>
            <p className="mt-5 inline-flex items-center gap-2 text-sm text-[#8A8178]">
              <CalendarDays className="h-4 w-4" />
              Última atualização: {updatedAt}
            </p>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,760px)] lg:justify-between">
            <aside>
              <nav aria-label="Nesta pagina" className="lg:sticky lg:top-24">
                <p className="mb-3 text-xs font-bold uppercase text-[#8A8178]">Nesta pagina</p>
                <ul className="space-y-1 border-l border-[#E5DED3]">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="block border-l-2 border-transparent px-4 py-2 text-sm text-[#625B55] hover:border-[#C89B3C] hover:text-[#4A0F14]"
                      >
                        {section.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <article className="legal-copy min-w-0">{children}</article>
          </div>

          <section className="mt-12 border-t border-[#E5DED3] pt-8 lg:ml-auto lg:max-w-[760px]">
            <h2 className="text-xl font-bold text-[#4A0F14]">Fale com a gente</h2>
            <p className="mt-2 text-sm leading-6 text-[#625B55]">
              Dúvidas, solicitações de privacidade e assuntos relacionados a estes documentos podem ser
              enviados ao canal abaixo.
            </p>
            <address className="mt-4 text-sm not-italic leading-6 text-[#625B55]">
              <strong className="text-[#4A0F14]">{LEGAL_IDENTITY.businessName}</strong>
              <br />
              CNPJ {LEGAL_IDENTITY.cnpj}
              <br />
              {LEGAL_IDENTITY.formattedAddress}
            </address>
            <a
              href={`mailto:${LEGAL_IDENTITY.email}`}
              className="mt-4 inline-flex items-center gap-2 font-semibold text-[#7A1E24] hover:text-[#4A0F14]"
            >
              <Mail className="h-4 w-4" />
              {LEGAL_IDENTITY.email}
            </a>
          </section>
        </div>
      </main>
    </>
  );
}
