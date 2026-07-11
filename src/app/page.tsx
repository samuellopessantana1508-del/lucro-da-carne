import Link from "next/link";
import Header from "@/components/Header";
import {
  Beef,
  Calculator,
  Scale,
  DollarSign,
  Truck,
  BarChart3,
  ArrowRight,
  Store,
  ShoppingCart,
  Package,
  Target,
  Percent,
  Weight,
} from "lucide-react";

const AUDIENCE = [
  { icon: Store, label: "Açougues" },
  { icon: Beef, label: "Casas de carne" },
  { icon: ShoppingCart, label: "Mercadinhos" },
  { icon: Package, label: "Pequenos distribuidores" },
];

const FEATURES = [
  {
    icon: Scale,
    title: "Quanto a peça realmente rendeu",
    desc: "Saiba exatamente o peso vendável e a quebra de cada lote.",
  },
  {
    icon: Weight,
    title: "Quanto foi perdido em osso, sebo e quebra",
    desc: "Visualize a perda real e o impacto no custo de cada corte.",
  },
  {
    icon: DollarSign,
    title: "Qual é o custo real por kg vendável",
    desc: "Descubra o custo verdadeiro após descontar a quebra.",
  },
  {
    icon: Target,
    title: "Por quanto vender cada corte",
    desc: "Preço mínimo sugerido com a margem que você deseja.",
  },
  {
    icon: Percent,
    title: "Margem e lucro por lote",
    desc: "Saiba se o lote deu lucro ou prejuízo antes de vender.",
  },
  {
    icon: Truck,
    title: "Qual fornecedor entrega melhor rendimento",
    desc: "Compare fornecedores e negocie com dados na mão.",
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#4A0F14] to-[#7A1E24]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
            <div className="max-w-3xl">
              <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
                Pare de vender carne{" "}
                <span className="text-[#C89B3C]">sem saber sua margem real.</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-white/80 leading-relaxed max-w-2xl">
                Calcule rendimento, quebra, custo real por kg, preço ideal e lucro previsto de cada
                lote de carne em poucos minutos.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/calculadora"
                  className="inline-flex items-center justify-center gap-2 bg-[#C89B3C] hover:bg-[#B8892E] text-[#1F1F1F] font-bold px-8 py-4 rounded-xl text-lg transition-colors"
                >
                  <Calculator className="w-5 h-5" />
                  Começar cálculo
                </Link>
                <Link
                  href="/calculadora?exemplo=1"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors border border-white/20"
                >
                  Ver exemplo
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Para quem é */}
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#4A0F14] text-center mb-12">
              Para quem é
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {AUDIENCE.map((item) => (
                <div
                  key={item.label}
                  className="card p-6 text-center hover:shadow-md transition-shadow"
                >
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#F7F1E8] flex items-center justify-center">
                    <item.icon className="w-7 h-7 text-[#7A1E24]" />
                  </div>
                  <p className="font-semibold text-[#1F1F1F]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* O que você descobre */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#4A0F14] text-center mb-4">
              O que você descobre
            </h2>
            <p className="text-center text-[#8A8178] mb-12 max-w-2xl mx-auto">
              Tudo que você precisa para precificar seus cortes com segurança.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex gap-4 p-5 rounded-xl bg-[#F7F1E8]">
                  <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-[#7A1E24] flex items-center justify-center">
                    <f.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1F1F1F] mb-1">{f.title}</h3>
                    <p className="text-sm text-[#8A8178]">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <div className="p-8 sm:p-12 rounded-xl bg-gradient-to-br from-[#4A0F14] to-[#7A1E24] shadow-lg">
              <BarChart3 className="w-12 h-12 text-[#C89B3C] mx-auto mb-6" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Calcule seu primeiro lote agora
              </h2>
              <p className="text-white/70 mb-8 max-w-md mx-auto">
                Descubra o custo real da sua carne depois da desossa e venda cada corte com mais
                segurança.
              </p>
              <Link
                href="/calculadora"
                className="inline-flex items-center gap-2 bg-[#C89B3C] hover:bg-[#B8892E] text-[#1F1F1F] font-bold px-8 py-4 rounded-xl text-lg transition-colors"
              >
                <Calculator className="w-5 h-5" />
                Começar agora
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-[#E5DED3]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-sm text-[#8A8178]">
              Lucro da Carne · Calculadora de rendimento, quebra e lucro para açougues.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
