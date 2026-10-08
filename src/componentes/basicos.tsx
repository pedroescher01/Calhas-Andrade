import type { ReactNode } from "react";
import { formatarReais } from "@/dominio/dinheiro";

/** Pecas visuais repetidas, para as telas nao divergirem de estilo. */

export function Cartao({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-linha bg-cartao ${className}`}
    >
      {children}
    </div>
  );
}

export function TituloSecao({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1 pb-2">
      <h2 className="font-condensada text-[15px] font-bold uppercase tracking-wide text-cinza">
        {children}
      </h2>
      {acao}
    </div>
  );
}

/** Numero grande de painel: rotulo pequeno em cima, valor forte embaixo. */
export function Indicador({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  tom?: "neutro" | "marca" | "pago" | "aviso";
}) {
  const cor = {
    neutro: "text-tinta",
    marca: "text-marca",
    pago: "text-pago",
    aviso: "text-aviso",
  }[tom];

  return (
    <Cartao className="p-4">
      <p className="font-condensada text-[13px] font-semibold uppercase tracking-wide text-cinza">
        {rotulo}
      </p>
      <p className={`tabular mt-1 text-2xl font-bold ${cor}`}>{valor}</p>
      {detalhe ? <p className="mt-1 text-[13px] text-cinza">{detalhe}</p> : null}
    </Cartao>
  );
}

const tonsEtiqueta = {
  neutro: "bg-superficie text-cinza",
  marca: "bg-marca-fundo text-marca-escura",
  pago: "bg-pago-fundo text-pago-escura",
  aviso: "bg-aviso-fundo text-aviso",
  info: "bg-info-fundo text-info",
} as const;

export function Etiqueta({
  children,
  tom = "neutro",
}: {
  children: ReactNode;
  tom?: keyof typeof tonsEtiqueta;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold ${tonsEtiqueta[tom]}`}
    >
      {children}
    </span>
  );
}

export function EtiquetaFinanceira({
  status,
}: {
  status: "aberto" | "parcial" | "pago";
}) {
  if (status === "pago") return <Etiqueta tom="pago">Pago</Etiqueta>;
  if (status === "parcial") return <Etiqueta tom="aviso">Parcial</Etiqueta>;
  return <Etiqueta tom="marca">A receber</Etiqueta>;
}

export function EtiquetaObra({
  situacao,
}: {
  situacao: "a_fazer" | "agendada" | "feita";
}) {
  if (situacao === "feita") return <Etiqueta tom="pago">Feita</Etiqueta>;
  if (situacao === "agendada") return <Etiqueta tom="info">Agendada</Etiqueta>;
  return <Etiqueta tom="neutro">A fazer</Etiqueta>;
}

export function Dinheiro({
  centavos,
  className = "",
}: {
  centavos: number | null | undefined;
  className?: string;
}) {
  return <span className={`tabular ${className}`}>{formatarReais(centavos)}</span>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-8 text-center text-[15px] text-cinza">{children}</p>
  );
}
