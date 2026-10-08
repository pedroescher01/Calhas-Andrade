import Link from "next/link";
import { Cartao } from "@/componentes/basicos";
import { BotaoSair } from "@/componentes/cadastro-formularios";
import { obterConfiguracoes } from "@/servidor/consultas";

export const metadata = { title: "Mais - Calhas Andrade" };
export const dynamic = "force-dynamic";

/** Menu do celular com o que nao cabe na barra de baixo. */
const atalhos = [
  {
    href: "/clientes",
    titulo: "Clientes",
    descricao: "Cadastro, telefone e quem está devendo",
  },
  {
    href: "/compras",
    titulo: "Compras",
    descricao: "Lista do que falta, pedidos e fornecedores",
  },
  {
    href: "/precos",
    titulo: "Tabela de preços",
    descricao: "Material e mão de obra de cada tipo de calha",
  },
  {
    href: "/config",
    titulo: "Configurações",
    descricao: "Dados da empresa, Pix e senha",
  },
];

export default async function PaginaMais() {
  const config = await obterConfiguracoes();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-tinta">Mais</h1>
        <p className="text-[14px] text-cinza">{config.nomeEmpresa}</p>
      </header>

      <Cartao>
        <ul className="divide-y divide-linha">
          {atalhos.map((atalho) => (
            <li key={atalho.href}>
              <Link
                href={atalho.href}
                className="flex items-center gap-3 px-4 py-4 active:bg-superficie"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-tinta">{atalho.titulo}</p>
                  <p className="text-[13px] text-cinza">{atalho.descricao}</p>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="size-5 shrink-0 text-cinza-claro"
                  aria-hidden="true"
                >
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </Cartao>

      <BotaoSair />
    </div>
  );
}
