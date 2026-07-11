"use client";

import { FormEvent, useState } from "react";
import { X, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { configured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
        onClose();
        return;
      }

      if (password.length < 6) {
        setMessage("Use uma senha com pelo menos 6 caracteres.");
        return;
      }

      const result = await signUp({
        email: email.trim(),
        password,
        name: name.trim(),
        businessName: businessName.trim(),
      });

      if (result.needsEmailConfirmation) {
        setMessage("Cadastro criado. Confira seu e-mail para confirmar o acesso.");
        return;
      }

      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel concluir o acesso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white border border-[#E5DED3] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E5DED3] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#4A0F14]">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </h2>
            <p className="text-xs text-[#8A8178]">Lucro da Carne</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#8A8178] hover:bg-[#F7F1E8] hover:text-[#1F1F1F]"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!configured && (
            <div className="rounded-lg border border-[#C89B3C]/30 bg-[#FFF8E1] p-3 text-sm text-[#8B6914]">
              Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para habilitar contas.
            </div>
          )}

          {mode === "signup" && (
            <>
              <div>
                <label className="label">Nome</label>
                <input
                  className="input-field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div>
                <label className="label">Nome do negocio</label>
                <input
                  className="input-field"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Acougue, casa de carnes..."
                />
              </div>
            </>
          )}

          <div>
            <label className="label">E-mail</label>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
              required
            />
          </div>

          <div>
            <label className="label">Senha</label>
            <input
              className="input-field"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha"
              required
            />
          </div>

          {message && (
            <div className="rounded-lg border border-[#E5DED3] bg-[#F7F1E8] p-3 text-sm text-[#4A0F14]">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={!configured || busy}
            className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {busy ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage(null);
            }}
            className="w-full text-sm font-semibold text-[#7A1E24] hover:underline"
          >
            {mode === "login" ? "Criar uma conta" : "Ja tenho conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
