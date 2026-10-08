"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * A mesma navegacao servindo os dois usos que o dono descreveu:
 * no celular, barra embaixo com as cinco coisas que ele faz correndo;
 * no computador, menu lateral com tudo, para quando ele tem tempo de olhar.
 */

type Item = { href: string; rotulo: string; icone: React.ReactNode };

function Icone({ caminho }: { caminho: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6 shrink-0"
      aria-hidden="true"
    >
      <path d={caminho} />
    </svg>
  );
}

const itensCelular: Item[] = [
  { href: "/", rotulo: "Início", icone: <Icone caminho="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" /> },
  {
    href: "/orcamentos",
    rotulo: "Orçamentos",
    icone: <Icone caminho="M7 3h10a2 2 0 0 1 2 2v16l-7-3-7 3V5a2 2 0 0 1 2-2ZM9 8h6M9 12h6" />,
  },
  {
    href: "/financeiro",
    rotulo: "Financeiro",
    icone: <Icone caminho="M3 7h18v12H3zM3 11h18M7 15h4" />,
  },
  {
    href: "/calheiros",
    rotulo: "Calheiros",
    icone: <Icone caminho="M12 7a3 3 0 1 0 0-4 3 3 0 0 0 0 4ZM5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />,
  },
  { href: "/mais", rotulo: "Mais", icone: <Icone caminho="M5 12h.01M12 12h.01M19 12h.01" /> },
];

const itensComputador: Item[] = [
  itensCelular[0]!,
  itensCelular[1]!,
  {
    href: "/clientes",
    rotulo: "Clientes",
    icone: <Icone caminho="M9 7a3 3 0 1 0 0-4 3 3 0 0 0 0 4ZM2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M17 11h5M19.5 8.5v5" />,
  },
  itensCelular[2]!,
  {
    href: "/compras",
    rotulo: "Compras",
    icone: <Icone caminho="M4 5h2l2 11h10l2-8H7M9 20h.01M17 20h.01" />,
  },
  itensCelular[3]!,
  {
    href: "/precos",
    rotulo: "Tabela de preços",
    icone: <Icone caminho="M4 7h16M4 12h16M4 17h10" />,
  },
  {
    href: "/config",
    rotulo: "Configurações",
    icone: <Icone caminho="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3H9.8l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4.4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2Z" />,
  },
];

function estaAtivo(href: string, caminho: string): boolean {
  if (href === "/") return caminho === "/";
  return caminho === href || caminho.startsWith(`${href}/`);
}

/** Barra de baixo, so no celular. */
export function BarraCelular() {
  const caminho = usePathname();

  return (
    <nav
      aria-label="Navegacao principal"
      className="nao-imprime fixed inset-x-0 bottom-0 z-40 border-t border-linha bg-cartao/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {itensCelular.map((item) => {
          const ativo = estaAtivo(item.href, caminho);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                  ativo ? "text-marca" : "text-cinza"
                }`}
              >
                {item.icone}
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Menu lateral, so no computador. */
export function MenuComputador({ nomeEmpresa }: { nomeEmpresa: string }) {
  const caminho = usePathname();

  return (
    <aside className="nao-imprime hidden w-60 shrink-0 border-r border-linha bg-cartao md:block">
      <div className="sticky top-0 flex h-dvh flex-col">
        <div className="px-5 py-5">
          <p className="font-condensada text-[12px] font-bold uppercase tracking-[0.2em] text-marca">
            Gestao
          </p>
          <p className="mt-0.5 text-[17px] font-bold leading-tight text-tinta">
            {nomeEmpresa}
          </p>
        </div>

        <nav aria-label="Navegacao principal" className="flex-1 px-2">
          <ul className="space-y-0.5">
            {itensComputador.map((item) => {
              const ativo = estaAtivo(item.href, caminho);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-medium ${
                      ativo
                        ? "bg-marca-fundo text-marca-escura"
                        : "text-cinza hover:bg-superficie hover:text-tinta"
                    }`}
                  >
                    <span className="[&_svg]:size-5">{item.icone}</span>
                    {item.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-2">
          <Link
            href="/orcamentos/novo"
            className="flex items-center justify-center gap-2 rounded-lg bg-marca px-3 py-2.5 text-[15px] font-semibold text-white hover:bg-marca-escura"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Novo orçamento
          </Link>
        </div>
      </div>
    </aside>
  );
}

/** Botao redondo de novo orcamento, so no celular. */
export function BotaoNovoCelular() {
  const caminho = usePathname();
  if (caminho.startsWith("/orcamentos/novo")) return null;

  return (
    <Link
      href="/orcamentos/novo"
      className="nao-imprime fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-marca text-white shadow-lg md:hidden"
      aria-label="Novo orçamento"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-7" aria-hidden="true">
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
      </svg>
    </Link>
  );
}
