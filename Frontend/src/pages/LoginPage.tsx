import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import type { AuthResponse } from "../lib/types";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstAccess, setFirstAccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [checkingFirstAccess, setCheckingFirstAccess] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function persistAuth(response: AuthResponse) {
    if (rememberMe) {
      localStorage.setItem("pdc_token", response.token);
      localStorage.setItem("pdc_user", JSON.stringify(response.user));
      sessionStorage.removeItem("pdc_token");
      sessionStorage.removeItem("pdc_user");
      return;
    }

    sessionStorage.setItem("pdc_token", response.token);
    sessionStorage.setItem("pdc_user", JSON.stringify(response.user));
    localStorage.removeItem("pdc_token");
    localStorage.removeItem("pdc_user");
  }

  useEffect(() => {
    api
      .get<{ hasUsers: boolean }>("/auth/first-access/status")
      .then((response) => setFirstAccess(!response.hasUsers))
      .catch(() => setFirstAccess(false))
      .finally(() => setCheckingFirstAccess(false));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (firstAccess) {
        if (password !== confirmPassword) {
          throw new Error("As senhas não conferem.");
        }

        const created = await api.post<AuthResponse>("/auth/first-access", {
          fullName,
          email,
          password
        });

        persistAuth(created);
        window.location.href = "/";
        return;
      }

      await login(email, password, rememberMe);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-brand-700">ProjectDevController</h1>
        <p className="text-sm text-slate-500">
          {checkingFirstAccess
            ? "Verificando configuração inicial..."
            : firstAccess
              ? "Primeiro acesso: crie o administrador do sistema."
              : "Faça login para acessar projetos e tarefas."}
        </p>

        {firstAccess && (
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Nome completo"
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        )}

        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Senha"
          className="w-full rounded border border-slate-300 px-3 py-2"
        />

        {firstAccess && (
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirmar senha"
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
          Manter conectado
        </label>

        <button disabled={loading || checkingFirstAccess} className="w-full rounded bg-brand-700 px-3 py-2 font-semibold text-white">
          {loading ? "Processando..." : firstAccess ? "Criar administrador" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
