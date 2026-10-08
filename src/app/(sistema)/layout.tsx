import { redirect } from "next/navigation";
import { lerSessao } from "@/servidor/sessao";
import { obterConfiguracoes } from "@/servidor/consultas";
import {
  BarraCelular,
  BotaoNovoCelular,
  MenuComputador,
} from "@/componentes/navegacao";

/**
 * Porta de entrada do sistema: sem sessao, nao passa.
 *
 * A conferencia fica aqui, em componente de servidor, e nao em middleware,
 * porque assim ela usa o mesmo codigo de sessao do resto do sistema, com
 * acesso ao banco, em vez de uma versao paralela rodando na borda.
 */
export default async function LayoutSistema({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await lerSessao())) redirect("/login");

  const config = await obterConfiguracoes();

  return (
    <div className="flex min-h-dvh">
      <MenuComputador nomeEmpresa={config.nomeEmpresa} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">
          {children}
        </main>
      </div>
      <BarraCelular />
      <BotaoNovoCelular />
    </div>
  );
}
