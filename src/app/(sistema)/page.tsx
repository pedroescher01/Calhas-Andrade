import Link from "next/link";
import {
  contasAPagar,
  listarCalheirosComSaldo,
  listarOrcamentos,
  obterNomeDono,
  resumoFinanceiro,
} from "@/servidor/consultas";
import {
  Cartao,
  Dinheiro,
  EtiquetaFinanceira,
  EtiquetaObra,
  Indicador,
  TituloSecao,
  Vazio,
} from "@/componentes/basicos";
import { formatarReais } from "@/dominio/dinheiro";
import {
  descreverDataLonga,
  descreverPrazo,
  formatarData,
  formatarDataCurta,
  hoje,
  saudacao,
  semanaDe,
} from "@/dominio/datas";

export const metadata = { title: "Início - Calhas Andrade" };
export const dynamic = "force-dynamic";

export default async function PaginaInicio() {
  const semana = semanaDe();
  const [nome, resumo, orcamentos, contas, calheiros] = await Promise.all([
    obterNomeDono(),
    resumoFinanceiro(),
    listarOrcamentos({ limite: 40 }),
    contasAPagar(),
    listarCalheirosComSaldo(),
  ]);

  const vivos = orcamentos.filter(
    (o) => o.status !== "cancelado" && o.status !== "recusado",
  );

  // Obras da semana: o que esta agendado para estes dias, mais o que ja
  // passou da data e continua sem ser feito.
  const obrasDaSemana = vivos
    .filter(
      (o) =>
        o.situacaoObra !== "feita" &&
        o.dataAgendada != null &&
        o.dataAgendada <= semana.fim,
    )
    .sort((a, b) => (a.dataAgendada! < b.dataAgendada! ? -1 : 1));

  const aFazerSemData = vivos.filter(
    (o) => o.situacaoObra === "a_fazer" && o.dataAgendada == null && o.status === "aprovado",
  );

  const recentes = vivos.slice(0, 6);
  const contasProximas = [...contas.vencidas, ...contas.vencemHoje, ...contas.aVencer].slice(0, 6);
  const calheirosComSaldo = calheiros.filter((c) => c.saldo.saldo !== 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[14px] text-cinza">{descreverDataLonga()}</p>
        <h1 className="text-2xl font-bold text-tinta md:text-3xl">
          {saudacao()}
          {nome ? `, ${nome}` : ""}
        </h1>
      </header>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo="A receber"
          valor={formatarReais(resumo.aReceber)}
          detalhe={`${vivos.filter((o) => o.totais.saldo > 0).length} orçamento(s)`}
          tom="marca"
        />
        <Indicador
          rotulo="Recebido no mês"
          valor={formatarReais(resumo.recebido)}
          detalhe={`${formatarDataCurta(resumo.inicio)} a ${formatarDataCurta(resumo.fim)}`}
          tom="pago"
        />
        <Indicador
          rotulo="Contas a pagar"
          valor={formatarReais(resumo.aPagar)}
          detalhe={
            resumo.vencidas > 0 ? `${formatarReais(resumo.vencidas)} vencido` : "nada vencido"
          }
          tom={resumo.vencidas > 0 ? "aviso" : "neutro"}
        />
        <Indicador
          rotulo="Devido a calheiros"
          valor={formatarReais(resumo.devidoCalheiros)}
          detalhe={
            resumo.caixa == null
              ? "caixa não configurado"
              : `caixa ${formatarReais(resumo.caixa)}`
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <TituloSecao
            acao={
              <Link href="/orcamentos?obra=agendada" className="text-[14px] font-semibold text-marca">
                Ver todas
              </Link>
            }
          >
            Obras da semana
          </TituloSecao>
          <Cartao>
            {obrasDaSemana.length === 0 && aFazerSemData.length === 0 ? (
              <Vazio>Nenhuma obra agendada para esta semana.</Vazio>
            ) : (
              <ul className="divide-y divide-linha">
                {obrasDaSemana.map((o) => {
                  const atrasada = o.dataAgendada! < hoje();
                  return (
                    <li key={o.id}>
                      <Link
                        href={`/orcamentos/${o.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-superficie"
                      >
                        <div
                          className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-lg ${
                            atrasada ? "bg-aviso-fundo text-aviso" : "bg-superficie text-tinta"
                          }`}
                        >
                          <span className="font-condensada text-[10px] font-bold uppercase leading-none">
                            {new Intl.DateTimeFormat("pt-BR", {
                              timeZone: "UTC",
                              month: "short",
                            })
                              .format(new Date(`${o.dataAgendada}T12:00:00Z`))
                              .replace(".", "")}
                          </span>
                          <span className="tabular text-[17px] font-bold leading-none">
                            {o.dataAgendada!.slice(8, 10)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-tinta">{o.clienteNome}</p>
                          <p className="truncate text-[13px] text-cinza">
                            {o.enderecoObra ?? "sem endereço"}
                            {o.calheiroNome ? ` - ${o.calheiroNome}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <EtiquetaObra situacao={o.situacaoObra} />
                          <p className="mt-1 text-[12px] text-cinza">
                            {descreverPrazo(o.dataAgendada!)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}

                {aFazerSemData.map((o) => (
                  <li key={`sem-data-${o.id}`}>
                    <Link
                      href={`/orcamentos/${o.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-superficie"
                    >
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-superficie text-[11px] font-semibold text-cinza">
                        s/data
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-tinta">{o.clienteNome}</p>
                        <p className="truncate text-[13px] text-cinza">
                          Aprovado, falta agendar
                        </p>
                      </div>
                      <EtiquetaObra situacao={o.situacaoObra} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </section>

        <section>
          <TituloSecao
            acao={
              <Link href="/financeiro" className="text-[14px] font-semibold text-marca">
                Ver financeiro
              </Link>
            }
          >
            Próximas contas a pagar
          </TituloSecao>
          <Cartao>
            {contasProximas.length === 0 ? (
              <Vazio>Nenhuma conta em aberto.</Vazio>
            ) : (
              <ul className="divide-y divide-linha">
                {contasProximas.map((c) => {
                  const vencida = c.vencimento < hoje();
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-tinta">{c.descricao}</p>
                        <p className="text-[13px] text-cinza">
                          {formatarData(c.vencimento)}
                          <span className={vencida ? "font-semibold text-aviso" : ""}>
                            {" - "}
                            {descreverPrazo(c.vencimento)}
                          </span>
                        </p>
                      </div>
                      <Dinheiro centavos={c.valorCentavos} className="font-semibold" />
                    </li>
                  );
                })}
              </ul>
            )}
          </Cartao>
        </section>
      </div>

      {calheirosComSaldo.length > 0 ? (
        <section>
          <TituloSecao
            acao={
              <Link href="/calheiros" className="text-[14px] font-semibold text-marca">
                Ver calheiros
              </Link>
            }
          >
            Conta dos calheiros
          </TituloSecao>
          <Cartao>
            <ul className="divide-y divide-linha">
              {calheirosComSaldo.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/calheiros/${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-superficie"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-tinta">{c.nome}</p>
                      <p className="text-[13px] text-cinza">
                        {c.saldo.saldo > 0
                          ? "a acertar com ele"
                          : "ele está adiantado em vale"}
                        {c.saldo.aLiberar > 0
                          ? ` - ${formatarReais(c.saldo.aLiberar)} preso em obra não paga`
                          : ""}
                      </p>
                    </div>
                    <Dinheiro
                      centavos={Math.abs(c.saldo.saldo)}
                      className={`font-semibold ${
                        c.saldo.saldo > 0 ? "text-marca" : "text-cinza"
                      }`}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>
        </section>
      ) : null}

      <section>
        <TituloSecao
          acao={
            <Link href="/orcamentos" className="text-[14px] font-semibold text-marca">
              Ver todos
            </Link>
          }
        >
          Orçamentos recentes
        </TituloSecao>
        <Cartao>
          {recentes.length === 0 ? (
            <Vazio>
              Nenhum orçamento ainda.{" "}
              <Link href="/orcamentos/novo" className="font-semibold text-marca">
                Criar o primeiro
              </Link>
            </Vazio>
          ) : (
            <ul className="divide-y divide-linha">
              {recentes.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orcamentos/${o.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-superficie"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-tinta">{o.clienteNome}</p>
                      <p className="tabular text-[13px] text-cinza">
                        Nº {o.id} · {formatarData(o.dataEmissao)}
                        {o.totais.saldo > 0 ? ` - falta ${formatarReais(o.totais.saldo)}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Dinheiro centavos={o.totais.total} className="font-semibold" />
                      <div className="mt-1">
                        <EtiquetaFinanceira status={o.totais.statusFinanceiro} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </section>
    </div>
  );
}
