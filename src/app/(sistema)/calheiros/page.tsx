import Link from "next/link";
import { listarCalheirosComSaldo } from "@/servidor/consultas";
import { Cartao, Dinheiro, Etiqueta, TituloSecao, Vazio } from "@/componentes/basicos";
import {
  BotaoMovimentoCalheiro,
  BotaoNovoCalheiro,
} from "@/componentes/calheiro-formularios";
import { formatarReais } from "@/dominio/dinheiro";

export const metadata = { title: "Calheiros - Calhas Andrade" };
export const dynamic = "force-dynamic";

export default async function PaginaCalheiros() {
  const calheiros = await listarCalheirosComSaldo();
  const totalDevido = calheiros.reduce((s, c) => s + Math.max(0, c.saldo.saldo), 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-tinta md:text-3xl">Calheiros</h1>
          <p className="text-[14px] text-cinza">
            {totalDevido > 0
              ? `${formatarReais(totalDevido)} a acertar no total`
              : "Nenhuma conta aberta com os calheiros"}
          </p>
        </div>
        <BotaoNovoCalheiro />
      </header>

      <Cartao className="bg-superficie p-4">
        <p className="text-[14px] text-cinza">
          A conta de cada calheiro é calculada sozinha: a mão de obra das obras
          dele entra conforme o cliente paga. O que você adianta em vale sai
          daqui e do caixa na hora.
        </p>
      </Cartao>

      {calheiros.length === 0 ? (
        <Cartao>
          <Vazio>Nenhum calheiro cadastrado.</Vazio>
        </Cartao>
      ) : (
        <ul className="space-y-3">
          {calheiros.map((c) => (
            <li key={c.id}>
              <Cartao className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/calheiros/${c.id}`}
                      className="text-[17px] font-bold text-tinta hover:text-marca"
                    >
                      {c.nome}
                    </Link>
                    <p className="text-[13px] text-cinza">
                      {c.telefone ?? "sem telefone"}
                      {c.tipo === "funcionario" ? " - funcionario" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-condensada text-[12px] font-bold uppercase tracking-wide text-cinza">
                      {c.saldo.saldo >= 0 ? "A acertar" : "Adiantado"}
                    </p>
                    <p
                      className={`tabular text-2xl font-bold ${
                        c.saldo.saldo > 0 ? "text-marca" : "text-tinta"
                      }`}
                    >
                      {formatarReais(Math.abs(c.saldo.saldo))}
                    </p>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-linha pt-3 text-[13px]">
                  <div>
                    <dt className="text-cinza">Liberado</dt>
                    <dd className="tabular font-semibold">
                      {formatarReais(c.saldo.liberado)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-cinza">Já pago a ele</dt>
                    <dd className="tabular font-semibold">{formatarReais(c.saldo.pago)}</dd>
                  </div>
                  <div>
                    <dt className="text-cinza">Preso em obra</dt>
                    <dd className="tabular font-semibold">
                      {formatarReais(c.saldo.aLiberar)}
                    </dd>
                  </div>
                </dl>

                {c.saldo.aLiberar > 0 ? (
                  <p className="mt-2 text-[13px] text-cinza">
                    {formatarReais(c.saldo.aLiberar)} entram na conta dele quando os
                    clientes pagarem.
                  </p>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <BotaoMovimentoCalheiro
                    calheiro={{ id: c.id, nome: c.nome, saldo: c.saldo.saldo }}
                    tipo="vale"
                  />
                  <BotaoMovimentoCalheiro
                    calheiro={{ id: c.id, nome: c.nome, saldo: c.saldo.saldo }}
                    tipo="acerto"
                    variante={c.saldo.saldo > 0 ? "marca" : "secundario"}
                  />
                  <Link
                    href={`/calheiros/${c.id}`}
                    className="ml-auto inline-flex min-h-11 items-center px-2 text-[14px] font-semibold text-cinza hover:text-tinta"
                  >
                    Ver extrato
                  </Link>
                </div>
              </Cartao>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
