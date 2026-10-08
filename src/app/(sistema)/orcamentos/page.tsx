import Link from "next/link";
import { listarOrcamentos, type FiltrosOrcamento } from "@/servidor/consultas";
import {
  Cartao,
  Dinheiro,
  EtiquetaFinanceira,
  EtiquetaObra,
  Vazio,
} from "@/componentes/basicos";
import { formatarReais } from "@/dominio/dinheiro";
import { formatarData } from "@/dominio/datas";

export const metadata = { title: "Orçamentos - Calhas Andrade" };
export const dynamic = "force-dynamic";

type Busca = {
  status?: string;
  obra?: string;
  busca?: string;
  arquivados?: string;
};

const filtrosFinanceiros = [
  { chave: undefined, rotulo: "Todos" },
  { chave: "aberto", rotulo: "A receber" },
  { chave: "parcial", rotulo: "Parcial" },
  { chave: "pago", rotulo: "Pago" },
] as const;

const filtrosObra = [
  { chave: undefined, rotulo: "Qualquer obra" },
  { chave: "a_fazer", rotulo: "A fazer" },
  { chave: "agendada", rotulo: "Agendada" },
  { chave: "feita", rotulo: "Feita" },
] as const;

function montarLink(atual: Busca, mudanca: Partial<Busca>): string {
  const parametros = new URLSearchParams();
  const combinado = { ...atual, ...mudanca };
  for (const [chave, valor] of Object.entries(combinado)) {
    if (valor) parametros.set(chave, valor);
  }
  const texto = parametros.toString();
  return texto ? `/orcamentos?${texto}` : "/orcamentos";
}

export default async function PaginaOrcamentos({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  const busca = await searchParams;

  const filtros: FiltrosOrcamento = {
    statusFinanceiro:
      busca.status === "aberto" || busca.status === "parcial" || busca.status === "pago"
        ? busca.status
        : undefined,
    situacaoObra:
      busca.obra === "a_fazer" || busca.obra === "agendada" || busca.obra === "feita"
        ? busca.obra
        : undefined,
    busca: busca.busca,
    incluirArquivados: busca.arquivados === "1",
  };

  const orcamentos = await listarOrcamentos(filtros);
  const totalAberto = orcamentos.reduce((s, o) => s + o.totais.saldo, 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-tinta md:text-3xl">Orçamentos</h1>
          <p className="text-[14px] text-cinza">
            {orcamentos.length} {orcamentos.length === 1 ? "orçamento" : "orçamentos"}
            {totalAberto > 0 ? ` - ${formatarReais(totalAberto)} a receber` : ""}
          </p>
        </div>
        <Link
          href="/orcamentos/novo"
          className="nao-imprime hidden min-h-11 items-center rounded-lg bg-marca px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-marca-escura md:inline-flex"
        >
          Novo orçamento
        </Link>
      </header>

      <form action="/orcamentos" className="nao-imprime flex gap-2">
        <input
          type="search"
          name="busca"
          defaultValue={busca.busca ?? ""}
          placeholder="Cliente, endereço ou número"
          className="min-w-0 flex-1 rounded-lg border border-linha-forte bg-cartao px-3 py-2.5 text-tinta placeholder:text-cinza-claro"
        />
        {busca.status ? <input type="hidden" name="status" value={busca.status} /> : null}
        {busca.obra ? <input type="hidden" name="obra" value={busca.obra} /> : null}
        <button
          type="submit"
          className="rounded-lg border border-linha-forte bg-cartao px-4 font-semibold text-tinta hover:bg-superficie"
        >
          Buscar
        </button>
      </form>

      <div className="nao-imprime -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        <div className="flex shrink-0 gap-1">
          {filtrosFinanceiros.map((f) => {
            const ativo = (busca.status ?? undefined) === f.chave;
            return (
              <Link
                key={f.rotulo}
                href={montarLink(busca, { status: f.chave })}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[14px] font-semibold ${
                  ativo ? "bg-tinta text-white" : "bg-superficie text-cinza hover:text-tinta"
                }`}
              >
                {f.rotulo}
              </Link>
            );
          })}
        </div>
        <div className="flex shrink-0 gap-1">
          {filtrosObra.map((f) => {
            const ativo = (busca.obra ?? undefined) === f.chave;
            return (
              <Link
                key={f.rotulo}
                href={montarLink(busca, { obra: f.chave })}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[14px] font-semibold ${
                  ativo ? "bg-tinta text-white" : "bg-superficie text-cinza hover:text-tinta"
                }`}
              >
                {f.rotulo}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Celular: lista. Computador: tabela, que cabe mais informacao. */}
      <Cartao className="md:hidden">
        {orcamentos.length === 0 ? (
          <Vazio>Nenhum orçamento encontrado.</Vazio>
        ) : (
          <ul className="divide-y divide-linha">
            {orcamentos.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orcamentos/${o.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-superficie"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-tinta">{o.clienteNome}</p>
                    <p className="tabular text-[13px] text-cinza">
                      Nº {o.id} · {formatarData(o.dataEmissao)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <EtiquetaFinanceira status={o.totais.statusFinanceiro} />
                      <EtiquetaObra situacao={o.situacaoObra} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Dinheiro centavos={o.totais.total} className="font-semibold" />
                    {o.totais.saldo > 0 ? (
                      <p className="tabular text-[13px] text-marca">
                        falta {formatarReais(o.totais.saldo)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao className="hidden overflow-hidden md:block">
        {orcamentos.length === 0 ? (
          <Vazio>Nenhum orçamento encontrado.</Vazio>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-linha bg-superficie text-left">
                <th scope="col" className="px-4 py-2 font-condensada font-bold uppercase tracking-wide text-cinza">No</th>
                <th scope="col" className="px-4 py-2 font-condensada font-bold uppercase tracking-wide text-cinza">Cliente</th>
                <th scope="col" className="px-4 py-2 font-condensada font-bold uppercase tracking-wide text-cinza">Obra</th>
                <th scope="col" className="px-4 py-2 font-condensada font-bold uppercase tracking-wide text-cinza">Emissão</th>
                <th scope="col" className="px-4 py-2 text-right font-condensada font-bold uppercase tracking-wide text-cinza">Total</th>
                <th scope="col" className="px-4 py-2 text-right font-condensada font-bold uppercase tracking-wide text-cinza">Falta</th>
                <th scope="col" className="px-4 py-2 font-condensada font-bold uppercase tracking-wide text-cinza">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {orcamentos.map((o) => (
                <tr key={o.id} className="hover:bg-superficie">
                  <td className="tabular px-4 py-2.5 text-cinza">{o.id}</td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/orcamentos/${o.id}`}
                      className="font-semibold text-tinta hover:text-marca"
                    >
                      {o.clienteNome}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-cinza">
                    <span className="block max-w-56 truncate">
                      {o.enderecoObra ?? "-"}
                    </span>
                    {o.calheiroNome ? (
                      <span className="text-[12px]">{o.calheiroNome}</span>
                    ) : null}
                  </td>
                  <td className="tabular px-4 py-2.5 text-cinza">
                    {formatarData(o.dataEmissao)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Dinheiro centavos={o.totais.total} className="font-semibold" />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {o.totais.saldo > 0 ? (
                      <Dinheiro centavos={o.totais.saldo} className="font-semibold text-marca" />
                    ) : (
                      <span className="text-cinza-claro">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <EtiquetaFinanceira status={o.totais.statusFinanceiro} />
                      <EtiquetaObra situacao={o.situacaoObra} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>

      <p className="nao-imprime text-center text-[13px] text-cinza">
        {busca.arquivados === "1" ? (
          <Link href={montarLink(busca, { arquivados: undefined })} className="font-semibold">
            Esconder arquivados
          </Link>
        ) : (
          <Link href={montarLink(busca, { arquivados: "1" })} className="font-semibold">
            Mostrar também os arquivados
          </Link>
        )}
      </p>
    </div>
  );
}
