"use client";

import { useId, type ReactNode } from "react";
import { formatarValor, parsearReais, formatarQuantidade, parsearQuantidade } from "@/dominio/dinheiro";

/**
 * Campos de formulario.
 *
 * Dois cuidados que vem do uso no celular, em pe, na obra:
 * o teclado numerico abre direto nos campos de valor (inputMode decimal),
 * e o valor digitado e arrumado quando o dedo sai do campo -- entao tanto
 * "1500" quanto "1.500" quanto "1500,00" acabam iguais.
 */

export function Campo({
  rotulo,
  children,
  dica,
  className = "",
}: {
  rotulo: string;
  children: ReactNode;
  dica?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[13px] font-semibold text-tinta">{rotulo}</span>
      {children}
      {dica ? <span className="mt-1 block text-[12px] text-cinza">{dica}</span> : null}
    </label>
  );
}

const estiloEntrada =
  "mt-1 w-full rounded-lg border border-linha-forte bg-cartao px-3 py-2.5 text-tinta placeholder:text-cinza-claro";

export function CampoTexto({
  rotulo,
  valor,
  onChange,
  dica,
  placeholder,
  tipo = "text",
  className = "",
  obrigatorio = false,
  autoFoco = false,
}: {
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  dica?: string;
  placeholder?: string;
  tipo?: "text" | "tel" | "email" | "date";
  className?: string;
  obrigatorio?: boolean;
  autoFoco?: boolean;
}) {
  return (
    <Campo rotulo={rotulo} dica={dica} className={className}>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={obrigatorio}
        autoFocus={autoFoco}
        inputMode={tipo === "tel" ? "tel" : undefined}
        className={estiloEntrada}
      />
    </Campo>
  );
}

export function CampoAreaTexto({
  rotulo,
  valor,
  onChange,
  linhas = 3,
  placeholder,
}: {
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  linhas?: number;
  placeholder?: string;
}) {
  return (
    <Campo rotulo={rotulo}>
      <textarea
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        rows={linhas}
        placeholder={placeholder}
        className={estiloEntrada}
      />
    </Campo>
  );
}

/** Campo de dinheiro: teclado numerico e arredondamento ao sair. */
export function CampoDinheiro({
  rotulo,
  valor,
  onChange,
  dica,
  className = "",
  autoFoco = false,
}: {
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  dica?: string;
  className?: string;
  autoFoco?: boolean;
}) {
  return (
    <Campo rotulo={rotulo} dica={dica} className={className}>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-cinza">
          R$
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={valor}
          autoFocus={autoFoco}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (valor.trim() === "") return;
            onChange(formatarValor(parsearReais(valor)));
          }}
          onFocus={(e) => e.currentTarget.select()}
          className="tabular w-full rounded-lg border border-linha-forte bg-cartao py-2.5 pl-10 pr-3 text-right text-tinta"
        />
      </div>
    </Campo>
  );
}

/** Campo de quantidade (metros ou pecas). */
export function CampoQuantidade({
  rotulo,
  valor,
  onChange,
  unidade,
  className = "",
}: {
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  unidade?: string;
  className?: string;
}) {
  return (
    <Campo rotulo={rotulo} className={className}>
      <div className="relative mt-1">
        <input
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (valor.trim() === "") return;
            onChange(formatarQuantidade(parsearQuantidade(valor)));
          }}
          onFocus={(e) => e.currentTarget.select()}
          className="tabular w-full rounded-lg border border-linha-forte bg-cartao py-2.5 pl-3 pr-10 text-right text-tinta"
        />
        {unidade ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-cinza">
            {unidade}
          </span>
        ) : null}
      </div>
    </Campo>
  );
}

export function Seletor<T extends string | number>({
  rotulo,
  valor,
  onChange,
  opcoes,
  dica,
  className = "",
}: {
  rotulo: string;
  valor: T;
  onChange: (valor: string) => void;
  opcoes: { valor: T; rotulo: string }[];
  dica?: string;
  className?: string;
}) {
  return (
    <Campo rotulo={rotulo} dica={dica} className={className}>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={`${estiloEntrada} appearance-none bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-9`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235a606d' stroke-width='1.8' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
        }}
      >
        {opcoes.map((o) => (
          <option key={String(o.valor)} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </Campo>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg bg-marca-fundo px-3 py-2 text-[14px] font-medium text-marca-escura"
    >
      {children}
    </p>
  );
}

export function Botao({
  children,
  onClick,
  tipo = "button",
  variante = "principal",
  desabilitado = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  tipo?: "button" | "submit";
  variante?: "principal" | "marca" | "secundario" | "perigo";
  desabilitado?: boolean;
  className?: string;
}) {
  const estilos = {
    principal: "bg-tinta text-white hover:bg-tinta-media",
    marca: "bg-marca text-white hover:bg-marca-escura",
    secundario: "border border-linha-forte bg-cartao text-tinta hover:bg-superficie",
    perigo: "border border-marca bg-cartao text-marca hover:bg-marca-fundo",
  }[variante];

  return (
    <button
      type={tipo}
      onClick={onClick}
      disabled={desabilitado}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[15px] font-semibold disabled:opacity-50 ${estilos} ${className}`}
    >
      {children}
    </button>
  );
}

/** Folha que sobe de baixo no celular e vira caixa centrada no computador. */
export function Folha({
  titulo,
  aberta,
  onFechar,
  children,
}: {
  titulo: string;
  aberta: boolean;
  onFechar: () => void;
  children: ReactNode;
}) {
  const idTitulo = useId();
  if (!aberta) return null;

  return (
    <div className="nao-imprime fixed inset-0 z-50 flex items-end justify-center md:items-center">
      {/*
        O fundo escuro fecha a folha no toque, mas fica fora da arvore de
        acessibilidade: quem usa leitor de tela ja tem o botao X, e dois
        comandos chamados "Fechar" so confundem.
      */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onFechar}
        className="absolute inset-0 bg-tinta/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-cartao p-4 pb-8 md:max-w-md md:rounded-2xl md:pb-4"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={idTitulo} className="text-[18px] font-bold text-tinta">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="-mr-1 flex size-9 items-center justify-center rounded-lg text-cinza hover:bg-superficie"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
