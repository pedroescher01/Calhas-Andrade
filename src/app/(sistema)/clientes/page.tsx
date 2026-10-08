import Link from "next/link";
import { listarClientes } from "@/servidor/consultas";
import { Cartao, Dinheiro, Vazio } from "@/componentes/basicos";
import { BotaoNovoCliente } from "@/componentes/cadastro-formularios";
import { formatarReais } from "@/dominio/dinheiro";

export const metadata = { title: "Clientes - Calhas Andrade" };
export const dynamic = "force-dynamic";

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { busca } = await searchParams;
  const clientes = await listarClientes({ busca });
  const devendo = clientes.filter((c) => c.saldoDevedor > 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-tinta md:text-3xl">Clientes</h1>
          <p className="text-[14px] text-cinza">
            {clientes.length} cadastrado(s)
            {devendo.length > 0
              ? ` - ${devendo.length} devendo ${formatarReais(
                  devendo.reduce((s, c) => s + c.saldoDevedor, 0),
                )}`
              : ""}
          </p>
        </div>
        <BotaoNovoCliente />
      </header>

      <form action="/clientes" className="flex gap-2">
        <input
          type="search"
          name="busca"
          defaultValue={busca ?? ""}
          placeholder="Nome ou telefone"
          className="min-w-0 flex-1 rounded-lg border border-linha-forte bg-cartao px-3 py-2.5 text-tinta placeholder:text-cinza-claro"
        />
        <button
          type="submit"
          className="rounded-lg border border-linha-forte bg-cartao px-4 font-semibold text-tinta hover:bg-superficie"
        >
          Buscar
        </button>
      </form>

      <Cartao>
        {clientes.length === 0 ? (
          <Vazio>Nenhum cliente encontrado.</Vazio>
        ) : (
          <ul className="divide-y divide-linha">
            {clientes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/orcamentos?busca=${encodeURIComponent(c.nome)}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-superficie"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-tinta">{c.nome}</p>
                    <p className="truncate text-[13px] text-cinza">
                      {c.telefone ?? "sem telefone"}
                      {c.cidade ? ` - ${c.cidade}` : ""}
                    </p>
                    <p className="text-[13px] text-cinza">
                      {c.qtdOrcamentos} orçamento(s) · {formatarReais(c.totalFaturado)}
                    </p>
                  </div>
                  {c.saldoDevedor > 0 ? (
                    <div className="shrink-0 text-right">
                      <p className="font-condensada text-[11px] font-bold uppercase tracking-wide text-cinza">
                        Deve
                      </p>
                      <Dinheiro centavos={c.saldoDevedor} className="font-semibold text-marca" />
                    </div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
