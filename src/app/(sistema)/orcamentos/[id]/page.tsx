import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listarCalheirosComSaldo,
  obterConfiguracoes,
  obterOrcamento,
} from "@/servidor/consultas";
import { AcoesOrcamento, BotaoEstorno } from "@/componentes/acoes-orcamento";
import {
  Cartao,
  Dinheiro,
  EtiquetaFinanceira,
  EtiquetaObra,
  TituloSecao,
  Vazio,
} from "@/componentes/basicos";
import { calcularItem } from "@/dominio/orcamento";
import { formatarQuantidade, formatarReais } from "@/dominio/dinheiro";
import { formatarData } from "@/dominio/datas";

export const dynamic = "force-dynamic";

const rotuloForma = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  cartao: "Cartão",
  boleto: "Boleto",
  cheque: "Cheque",
  outro: "Outro",
} as const;

export default async function PaginaOrcamento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enviar?: string }>;
}) {
  const { id } = await params;
  const { enviar } = await searchParams;
  const numero = Number(id);
  if (!Number.isInteger(numero)) notFound();

  const [orcamento, calheiros, config] = await Promise.all([
    obterOrcamento(numero),
    listarCalheirosComSaldo(),
    obterConfiguracoes(),
  ]);

  if (!orcamento) notFound();

  const t = orcamento.totais;
  const itensParaMensagem = orcamento.itens.map((i) => ({
    descricao: i.descricao,
    unidade: i.unidade,
    quantidadeMilesimos: i.quantidadeMilesimos,
    totalCentavos: calcularItem(i).total,
  }));

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <Link
          href="/orcamentos"
          aria-label="Voltar"
          className="nao-imprime flex size-10 shrink-0 items-center justify-center rounded-lg border border-linha-forte text-cinza hover:bg-superficie"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="tabular text-[13px] font-semibold uppercase tracking-wide text-cinza">
            Orçamento nº {orcamento.id} · {formatarData(orcamento.dataEmissao)}
          </p>
          <h1 className="text-2xl font-bold leading-tight text-tinta">
            {orcamento.clienteNome}
          </h1>
          {orcamento.enderecoObra ? (
            <p className="text-[14px] text-cinza">{orcamento.enderecoObra}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <EtiquetaFinanceira status={t.statusFinanceiro} />
            <EtiquetaObra situacao={orcamento.situacaoObra} />
            {orcamento.calheiroNome ? (
              <span className="text-[13px] text-cinza">
                Calheiro: {orcamento.calheiroNome}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <Cartao className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-condensada text-[13px] font-bold uppercase tracking-wide text-cinza">
              Total
            </p>
            <p className="tabular text-3xl font-bold text-tinta">
              {formatarReais(t.total)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[14px] text-cinza">
              Pago <Dinheiro centavos={t.pago} className="font-semibold text-pago" />
            </p>
            <p className="text-[18px] font-bold text-marca">
              Falta <Dinheiro centavos={t.saldo} />
            </p>
            {t.sobra > 0 ? (
              <p className="text-[13px] text-aviso">
                Pagou {formatarReais(t.sobra)} a mais
              </p>
            ) : null}
          </div>
        </div>

        {/* Abertura interna: o cliente nao ve isso, so o dono. */}
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-linha pt-3 text-[13px]">
          <div>
            <dt className="text-cinza">Material</dt>
            <dd className="tabular font-semibold">{formatarReais(t.totalMaterial)}</dd>
          </div>
          <div>
            <dt className="text-cinza">Mão de obra</dt>
            <dd className="tabular font-semibold">{formatarReais(t.totalMaoObra)}</dd>
          </div>
          <div>
            <dt className="text-cinza">Liberada ao calheiro</dt>
            <dd className="tabular font-semibold">
              {formatarReais(t.maoObraLiberada)}
            </dd>
          </div>
        </dl>
        {t.totalMaoObra > t.maoObraLiberada ? (
          <p className="mt-2 text-[13px] text-cinza">
            Faltam {formatarReais(t.totalMaoObra - t.maoObraLiberada)} de mão de obra
            para liberar, que entram conforme o cliente for pagando.
          </p>
        ) : null}
      </Cartao>

      <AcoesOrcamento
        orcamento={{
          id: orcamento.id,
          clienteNome: orcamento.clienteNome,
          clienteTelefone: orcamento.clienteTelefone,
          dataEmissao: orcamento.dataEmissao,
          validadeDias: orcamento.validadeDias,
          enderecoObra: orcamento.enderecoObra,
          observacoes: orcamento.observacoes,
          situacaoObra: orcamento.situacaoObra,
          dataAgendada: orcamento.dataAgendada,
          calheiroId: orcamento.calheiroId,
          total: t.total,
          pago: t.pago,
          saldo: t.saldo,
          desconto: t.desconto,
          itens: itensParaMensagem,
        }}
        calheiros={calheiros.map((c) => ({ id: c.id, nome: c.nome }))}
        nomeEmpresa={config.nomeEmpresa}
        pixChave={config.pixChave}
        abrirEnviar={enviar === "1"}
      />

      <section>
        <TituloSecao>Itens</TituloSecao>
        <Cartao>
          {orcamento.itens.length === 0 ? (
            <Vazio>
              Nenhum item.{" "}
              <Link
                href={`/orcamentos/${orcamento.id}/editar`}
                className="font-semibold text-marca"
              >
                Adicionar
              </Link>
            </Vazio>
          ) : (
            <ul className="divide-y divide-linha">
              {orcamento.itens.map((item) => {
                const calculado = calcularItem(item);
                return (
                  <li key={item.id} className="flex items-baseline gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-tinta">{item.descricao}</p>
                      <p className="tabular text-[13px] text-cinza">
                        {formatarQuantidade(item.quantidadeMilesimos)} {item.unidade} -{" "}
                        {formatarReais(item.precoMaterialCentavos)} material
                        {item.precoMaoObraCentavos > 0
                          ? ` + ${formatarReais(item.precoMaoObraCentavos)} mão de obra`
                          : ""}
                        {item.unidade === "m" ? " por metro" : " cada"}
                      </p>
                    </div>
                    <Dinheiro centavos={calculado.total} className="font-semibold" />
                  </li>
                );
              })}
            </ul>
          )}

          {t.desconto > 0 || t.acrescimoNota > 0 ? (
            <div className="border-t border-linha px-4 py-3 text-[14px]">
              {t.acrescimoNota > 0 ? (
                <p className="flex justify-between">
                  <span className="text-cinza">Acrescimo de nota</span>
                  <Dinheiro centavos={t.acrescimoNota} />
                </p>
              ) : null}
              {t.desconto > 0 ? (
                <p className="flex justify-between text-marca">
                  <span>Desconto</span>
                  <span className="tabular">- {formatarReais(t.desconto)}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </Cartao>
      </section>

      <section>
        <TituloSecao>Pagamentos</TituloSecao>
        <Cartao>
          {orcamento.pagamentos.length === 0 ? (
            <Vazio>Nenhum pagamento ainda.</Vazio>
          ) : (
            <ul className="divide-y divide-linha">
              {orcamento.pagamentos.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-semibold ${
                        p.estornadoEm ? "text-cinza line-through" : "text-tinta"
                      }`}
                    >
                      {formatarReais(p.valorCentavos)}
                    </p>
                    <p className="text-[13px] text-cinza">
                      {formatarData(p.data)} - {rotuloForma[p.forma]}
                      {p.observacao ? ` - ${p.observacao}` : ""}
                      {p.estornadoEm ? " - estornado" : ""}
                    </p>
                  </div>
                  {!p.estornadoEm ? <BotaoEstorno pagamentoId={p.id} /> : null}
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </section>

      {orcamento.observacoes ? (
        <section>
          <TituloSecao>Observações</TituloSecao>
          <Cartao className="p-4">
            <p className="whitespace-pre-wrap text-[15px] text-tinta">
              {orcamento.observacoes}
            </p>
          </Cartao>
        </section>
      ) : null}
    </div>
  );
}
