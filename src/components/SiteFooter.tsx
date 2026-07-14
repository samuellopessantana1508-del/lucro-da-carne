import Link from "next/link";
import { Beef, Mail } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#E5DED3] bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-[#4A0F14]">
            <Beef className="h-5 w-5 text-[#C89B3C]" />
            Lucro da Carne
          </Link>
          <p className="mt-1 text-sm text-[#8A8178]">
            Calculadora de rendimento, quebra e lucro para negócios de carne.
          </p>
        </div>

        <nav aria-label="Links legais" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <Link href="/termos-de-uso" className="font-medium text-[#4A0F14] hover:text-[#7A1E24]">
            Termos de Uso
          </Link>
          <Link
            href="/politica-de-privacidade"
            className="font-medium text-[#4A0F14] hover:text-[#7A1E24]"
          >
            Privacidade
          </Link>
          <Link
            href="/cancelamento-e-reembolso"
            className="font-medium text-[#4A0F14] hover:text-[#7A1E24]"
          >
            Cancelamento
          </Link>
          <a
            href="mailto:suporte@lucrodacarne.com.br"
            className="inline-flex items-center gap-1.5 font-medium text-[#4A0F14] hover:text-[#7A1E24]"
          >
            <Mail className="h-4 w-4" />
            Suporte
          </a>
        </nav>
      </div>
    </footer>
  );
}
