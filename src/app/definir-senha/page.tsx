"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { KeyRound, Save } from "lucide-react";
import AlertBox from "@/components/AlertBox";
import Header from "@/components/Header";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function DefinirSenhaPage() {
  const supabase = getSupabaseBrowserClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError("Configure o Supabase para definir senha.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (password.length < 8) {
      setError("Use uma senha com pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("As senhas nao conferem.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Senha definida com sucesso. Voce ja pode acessar sua conta.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel definir sua senha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="card p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-[#F7F1E8] p-2 text-[#7A1E24]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#4A0F14]">Definir senha</h1>
              <p className="mt-1 text-sm text-[#8A8178]">Use o link recebido por e-mail para criar ou redefinir seu acesso.</p>
            </div>
          </div>

          {error && <AlertBox type="error" message={error} />}
          {message && <AlertBox type="success" message={message} />}

          <form onSubmit={updatePassword} className="space-y-4">
            <div>
              <label className="label">Nova senha</label>
              <input name="password" type="password" className="input-field" minLength={8} required />
            </div>
            <div>
              <label className="label">Confirmar senha</label>
              <input name="confirmation" type="password" className="input-field" minLength={8} required />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full justify-center disabled:opacity-50">
              <Save className="h-4 w-4" />
              {busy ? "Salvando..." : "Salvar senha"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link href="/conta" className="font-semibold text-[#7A1E24] hover:underline">
              Voltar para conta
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
