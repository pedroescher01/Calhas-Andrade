import Link from "next/link";
import {
  contasAPagar,
  listarFornecedores,
  listarLancamentos,
  obterConfiguracoes,
  resumoFinanceiro,
} from "@/servidor/consultas";
import {
  Cartao,
  Dinheiro,
  Etiqueta,
  Indicador,
  TituloSecao,
  Vazio,
} from "@/componentes/basicos";
import {
  BotaoNovoLancamento,
  BotaoPagarConta,
  FormularioSaldoInicial,
} from "@/componentes/financeiro-formularios";
import { formatarReais, formatarValor } from "@/dominio/dinheiro";
import {
  descreverPrazo,
  formatarData,
  formatarDataCurta,
  hoje,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
} from "@/dominio/datas";

export const metadata = { title: "Financeiro - Calhas Andrade" };
export const dynamic = "force-dynamic";

export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}) {
  const { inicio, fim } = await searchParams;
  const periodo = {
    inicio: inicio ?? primeiroDiaDoMes(hoje()),
    fim: fim ?? ultimoDiaDoMes(hoje()),
  };

  const [resumo, contas, movimentos, fornecedores, config] = await Promise.all([
    resumoFinanceiro(periodo),
    contasAPagar(),
    listarLancamentos({
      inicio: periodo.inicio,
      fim: periodo.fim,
      porData: "pagamento",
      status: "pago",
      limite: 60,
    }),
    listarFornecedores(),
    obterConfiguracoes(),
  ]);

  const vencidasEHoje = [...contas.vencidas, ...contas.vencemHoje];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-tinta md:text-3xl">Financeiro</h1>
          <p className="text-[14px] text-cinza">
            {formatarDataCurta(periodo.inicio)} a {formatarDataCurta(periodo.fim)}
          </p>
        </div>
        <BotaoNovoLancamento
          fornecedores={fornecedores.map((f) => ({ id: f.id, nome: f.nome }))}
        />
      </header>

      <section aria-label="Resumo do período" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo="Recebido"
          valor={formatarReais(resumo.recebido + resumo.entradasAvulsas)}
          tom="pago"
        />
        <Indicador rotulo="Saiu" valor={formatarReais(resumo.saidasPagas)} tom="marca" />
        <Indicador
          rotulo="Resultado"
          valor={formatarReais(resumo.resultado)}
          detalhe="entrou menos saiu"
          tom={resumo.resultado >= 0 ? "pago" : "marca"}
        />
        <Indicador
          rotulo="Caixa hoje"
          valor={resumo.caixa == null ? "a configurar" : formatarReais(resumo.caixa)}
          detalhe={resumo.caixa == null ? "informe o saldo inicial" : undefined}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <TituloSecao
            acao={
              <span className="text-[13px] text-cinza">
                {formatarReais(resumo.aPagar)} em aberto
              </span>
            }
          >
            Contas a pagar
          </TituloSecao>
          <Cartao>
            {vencidasEHoje.length === 0 && contas.aVencer.length === 0 ? (
              <Vazio>Nenhuma conta em aberto.</Vazio>
            ) : (
              <ul className="divide-y divide-linha">
                {[...vencidasEHoje, ...contas.aVencer].map((c) => {
                  const vencida = c.vencimento < hoje();
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-tinta">{c.descricao}</p>
                        <p className="text-[13px] text-cinza">
                          {c.categoria}
                          {c.fornecedorNome ? ` - ${c.fornecedorNome}` : ""}
                        </p>
                        <p className="text-[13px]">
                          <span className="text-cinza">{formatarData(c.vencimento)}</span>{" "}
                          <span className={vencida ? "font-semibold text-aviso" : "text-cinza"}>
                            ({descreverPrazo(c.vencimento)})
                          </span>
                        </p>
                      </div>
                      <Dinheiro centavos={c.valorCentavos} className="font-semibold" />
                      <BotaoPagarConta
                        conta={{
                          id: c.id,
                          descricao: c.descricao,
                          valorCentavos: c.valorCentavos,
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Cartao>
        </section>

        <section>
          <TituloSecao>Para onde foi o dinheiro</TituloSecao>
          <Cartao>
            {resumo.saidasPorCategoria.length === 0 ? (
              <Vazio>Nenhuma saída paga no período.</Vazio>
            ) : (
              <ul className="divide-y divide-linha">
                {resumo.saidasPorCategoria.map((linha) => {
                  const fracao =
                    resumo.saidasPagas > 0
                      ? Math.round((linha.total / resumo.saidasPagas) * 100)
                      : 0;
                  return (
                    <li key={linha.categoria} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium text-tinta">{linha.categoria}</span>
                        <span className="shrink-0">
                          <Dinheiro centavos={linha.total} className="font-semibold" />
                          <span className="tabular ml-2 text-[13px] text-cinza">{fracao}%</span>
                        </span>
                      </div>
                      <div
                        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-superficie"
                        role="presentation"
                      >
                        <div
                          className="h-full rounded-full bg-cinza"
                          style={{ width: `${Math.max(fracao, 2)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Cartao>
        </section>
      </div>

      <section>
        <TituloSecao
          acao={
            <Link href="/orcamentos?status=aberto" className="text-[14px] font-semibold text-marca">
              Ver quem deve
            </Link>
          }
        >
          A receber de clientes
        </TituloSecao>
        <Cartao className="p-4">
          <p className="tabular text-2xl font-bold text-marca">
            {formatarReais(resumo.aReceber)}
          </p>
          <p className="text-[14px] text-cinza">
            Soma do que falta receber de todos os orçamentos aprovados ou enviados.
          </p>
        </Cartao>
      </section>

      <section>
        <TituloSecao>Movimento pago no período</TituloSecao>
        <Cartao>
          {movimentos.length === 0 ? (
            <Vazio>Nenhum lancamento pago neste período.</Vazio>
          ) : (
            <ul className="divide-y divide-linha">
              {movimentos.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-tinta">{m.descricao}</p>
                    <p className="text-[13px] text-cinza">
                      {formatarData(m.dataPagamento ?? m.vencimento)} - {m.categoria}
                      {m.calheiroNome ? ` - ${m.calheiroNome}` : ""}
                    </p>
                  </div>
                  <Etiqueta tom={m.tipo === "entrada" ? "pago" : "neutro"}>
                    {m.tipo === "entrada" ? "entrada" : "saida"}
                  </Etiqueta>
                  <Dinheiro
                    centavos={m.valorCentavos}
                    className={`font-semibold ${
                      m.tipo === "entrada" ? "text-pago" : "text-tinta"
                    }`}
                  />
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </section>

      <section>
        <TituloSecao>Saldo do caixa</TituloSecao>
        <Cartao className="p-4">
          <FormularioSaldoInicial
            valorAtual={
              config.saldoInicialCentavos != null
                ? formatarValor(config.saldoInicialCentavos)
                : ""
            }
            dataAtual={config.saldoInicialData ?? ""}
          />
        </Cartao>
      </section>
    </div>
  );
}
