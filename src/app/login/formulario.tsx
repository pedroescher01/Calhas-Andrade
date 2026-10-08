"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { entrar, definirSenhaInicial } from "@/servidor/acoes";

export function FormularioLogin({ primeiroAcesso }: { primeiroAcesso: boolean }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciarEnvio] = useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);

    if (primeiroAcesso && senha !== confirmacao) {
      setErro("As duas senhas estao diferentes.");
      return;
    }

    iniciarEnvio(async () => {
      const resposta = primeiroAcesso
        ? await definirSenhaInicial(senha)
        : await entrar(senha);

      if (resposta.ok) {
        router.replace("/");
        router.refresh();
      } else {
        setErro(resposta.erro);
      }
    });
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div>
        <label htmlFor="senha" className="block text-[14px] font-semibold text-tinta">
          {primeiroAcesso ? "Crie uma senha" : "Senha"}
        </label>
        <input
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete={primeiroAcesso ? "new-password" : "current-password"}
          autoFocus
          required
          className="mt-1 w-full rounded-lg border border-linha-forte bg-cartao px-3 py-3 text-tinta"
        />
      </div>

      {primeiroAcesso ? (
        <div>
          <label
            htmlFor="confirmacao"
            className="block text-[14px] font-semibold text-tinta"
          >
            Repita a senha
          </label>
          <input
            id="confirmacao"
            type="password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoComplete="new-password"
            required
            className="mt-1 w-full rounded-lg border border-linha-forte bg-cartao px-3 py-3 text-tinta"
          />
        </div>
      ) : null}

      {erro ? (
        <p
          role="alert"
          className="rounded-lg bg-marca-fundo px-3 py-2 text-[14px] font-medium text-marca-escura"
        >
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando || senha.length === 0}
        className="w-full rounded-lg bg-tinta px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {enviando ? "Entrando..." : primeiroAcesso ? "Criar senha e entrar" : "Entrar"}
      </button>
    </form>
  );
}
