import Link from "next/link";
import { notFound } from "next/navigation";
import { extratoCalheiro } from "@/servidor/consultas";
import { Cartao, Dinheiro, Etiqueta, TituloSecao, Vazio } from "@/componentes/basicos";
import {
  BotaoCancelarMovimento,
  BotaoMovimentoCalheiro,
} from "@/componentes/calheiro-formularios";
import { formatarReais } from "@/dominio/dinheiro";
import { formatarData } from "@/dominio/datas";

export const dynamic = "force-dynamic";

const rotuloTipo = {
  mao_de_obra: "Mão de obra",
  vale: "Vale",
  acerto: "Acerto",
  ajuste: "Ajuste",
} as const;

export default async function PaginaExtratoCalheiro({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero)) notFound();

  const { calheiro, saldo, linhas } = await extratoCalheiro(numero);
  if (!calheiro) notFound();

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <Link
          href="/calheiros"
          aria-label="Voltar"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-linha-forte text-cinza hover:bg-superficie"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-tinta">{calheiro.nome}</h1>
          <p className="text-[14px] text-cinza">
            {calheiro.telefone ?? "sem telefone"}
            {calheiro.tipo === "funcionario" ? " - funcionario" : " - terceiro"}
          </p>
        </div>
      </header>

      <Cartao className="p-4">
        <p className="font-condensada text-[13px] font-bold uppercase tracking-wide text-cinza">
          {saldo.saldo >= 0 ? "A acertar com ele" : "Ele está adiantado"}
        </p>
        <p
          className={`tabular text-3xl font-bold ${
            saldo.saldo > 0 ? "text-marca" : "text-tinta"
          }`}
        >
          {formatarReais(Math.abs(saldo.saldo))}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-linha pt-3 text-[13px] sm:grid-cols-4">
          <div>
            <dt className="text-cinza">Mão de obra liberada</dt>
            <dd className="tabular font-semibold">{formatarReais(saldo.liberado)}</dd>
          </div>
          <div>
            <dt className="text-cinza">Vales</dt>
            <dd className="tabular font-semibold">{formatarReais(saldo.vales)}</dd>
          </div>
          <div>
            <dt className="text-cinza">Acertos</dt>
            <dd className="tabular font-semibold">{formatarReais(saldo.acertos)}</dd>
          </div>
          <div>
            <dt className="text-cinza">Preso em obra não paga</dt>
            <dd className="tabular font-semibold">{formatarReais(saldo.aLiberar)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex gap-2">
          <BotaoMovimentoCalheiro
            calheiro={{ id: calheiro.id, nome: calheiro.nome, saldo: saldo.saldo }}
            tipo="vale"
          />
          <BotaoMovimentoCalheiro
            calheiro={{ id: calheiro.id, nome: calheiro.nome, saldo: saldo.saldo }}
            tipo="acerto"
            variante={saldo.saldo > 0 ? "marca" : "secundario"}
          />
        </div>
      </Cartao>

      <section>
        <TituloSecao>Extrato</TituloSecao>
        <Cartao>
          {linhas.length === 0 ? (
            <Vazio>Nenhum movimento ainda.</Vazio>
          ) : (
            <ul className="divide-y divide-linha">
              {linhas.map((linha, indice) => (
                <li
                  key={`${linha.movimentoId ?? "obra"}-${linha.orcamentoId ?? indice}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-semibold ${
                        linha.cancelado ? "text-cinza line-through" : "text-tinta"
                      }`}
                    >
                      {linha.descricao}
                    </p>
                    <p className="text-[13px] text-cinza">
                      {formatarData(linha.data)} - {rotuloTipo[linha.tipo]}
                      {linha.orcamentoId ? (
                        <>
                          {" - "}
                          <Link
                            href={`/orcamentos/${linha.orcamentoId}`}
                            className="font-semibold text-marca"
                          >
                            orçamento nº {linha.orcamentoId}
                          </Link>
                        </>
                      ) : null}
                      {linha.cancelado ? " - cancelado" : ""}
                    </p>
                  </div>
                  <span
                    className={`tabular shrink-0 font-semibold ${
                      linha.cancelado
                        ? "text-cinza line-through"
                        : linha.valorCentavos > 0
                          ? "text-pago"
                          : "text-tinta"
                    }`}
                  >
                    {linha.valorCentavos > 0 ? "+" : "-"}
                    {formatarReais(Math.abs(linha.valorCentavos))}
                  </span>
                  {linha.movimentoId && !linha.cancelado ? (
                    <BotaoCancelarMovimento movimentoId={linha.movimentoId} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Cartao>
        <p className="mt-2 px-1 text-[13px] text-cinza">
          Verde é o que ele passou a ter direito. Escuro é o que já saiu do
          caixa para ele.
        </p>
      </section>
    </div>
  );
}
