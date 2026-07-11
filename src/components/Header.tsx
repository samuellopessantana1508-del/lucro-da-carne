"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Menu,
  X,
  Beef,
  Calculator,
  History,
  BarChart3,
  User,
  LogOut,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: Beef },
  { href: "/calculadora", label: "Calculadora", icon: Calculator },
  { href: "/historico", label: "Historico", icon: History },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/planos", label: "Planos", icon: CreditCard },
  { href: "/conta", label: "Conta", icon: User },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { configured, user, profile, subscription, signOut } = useAuth();
  const navItems =
    profile?.role === "admin"
      ? [...NAV_ITEMS, { href: "/admin", label: "Admin", icon: ShieldCheck }]
      : NAV_ITEMS;

  async function handleSignOut() {
    await signOut();
    setAccountOpen(false);
  }

  return (
    <>
      <header className="bg-[#4A0F14] text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Beef className="w-7 h-7 text-[#C89B3C]" />
              <span className="font-bold text-lg tracking-tight">Lucro da Carne</span>
            </Link>

            <div className="hidden md:flex items-center gap-2">
              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-white/15 text-white"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setAccountOpen(!accountOpen)}
                    className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
                  >
                    <User className="w-4 h-4 text-[#C89B3C]" />
                    <span className="max-w-28 truncate">{profile?.name || user.email}</span>
                  </button>
                  {accountOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-lg border border-[#E5DED3] bg-white p-2 text-[#1F1F1F] shadow-lg">
                      <div className="px-3 py-2">
                        <p className="truncate text-sm font-bold text-[#4A0F14]">
                          {profile?.business_name || profile?.name || user.email}
                        </p>
                        <p className="truncate text-xs text-[#8A8178]">{user.email}</p>
                        <p className="mt-1 text-xs font-semibold uppercase text-[#C89B3C]">
                          Plano {subscription?.plan ?? "gratis"}
                        </p>
                      </div>
                      <Link
                        href="/conta"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#F7F1E8]"
                      >
                        <User className="w-4 h-4" />
                        Conta
                      </Link>
                      {profile?.role === "admin" && (
                        <Link
                          href="/admin"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#F7F1E8]"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Administracao
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#B23A3A] hover:bg-[#FFEBEE]"
                      >
                        <LogOut className="w-4 h-4" />
                        Sair
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-[#C89B3C] px-4 py-2 text-sm font-bold text-[#1F1F1F] hover:bg-[#B8892E]"
                >
                  <User className="w-4 h-4" />
                  {configured ? "Entrar" : "Modo local"}
                </button>
              )}
            </div>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10"
              aria-label="Abrir menu"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-white/10 px-4 pb-4">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            {user ? (
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="w-5 h-5" />
                Sair
              </button>
            ) : (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setAuthOpen(true);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
              >
                <User className="w-5 h-5" />
                {configured ? "Entrar" : "Modo local"}
              </button>
            )}
          </nav>
        )}
      </header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
