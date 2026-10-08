import { obterConfiguracoes, obterNomeDono } from "@/servidor/consultas";
import { Cartao, TituloSecao } from "@/componentes/basicos";
import {
  BotaoSair,
  FormularioConfiguracoes,
  FormularioTrocarSenha,
} from "@/componentes/cadastro-formularios";
import { usandoPostgresDeVerdade } from "@/db";

export const metadata = { title: "Configurações - Calhas Andrade" };
export const dynamic = "force-dynamic";

export default async function PaginaConfiguracoes() {
  const [config] = await Promise.all([obterConfiguracoes(), obterNomeDono()]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-tinta md:text-3xl">Configurações</h1>
        <p className="text-[14px] text-cinza">
          O que aparece no orçamento do cliente e como o sistema se comporta
        </p>
      </header>

      <section>
        <TituloSecao>Dados da empresa</TituloSecao>
        <Cartao className="p-4">
          <FormularioConfiguracoes
            iniciais={{
              nomeEmpresa: config.nomeEmpresa,
              telefone: config.telefone ?? "",
              documento: config.documento ?? "",
              endereco: config.endereco ?? "",
              pixChave: config.pixChave ?? "",
              pixFavorecido: config.pixFavorecido ?? "",
              // Pontos-base viram percentual na tela: 1200 -> "12,00"
              percentualNota: (config.percentualNotaBp / 100).toFixed(2).replace(".", ","),
              validadePadraoDias: config.validadePadraoDias,
            }}
          />
        </Cartao>
      </section>

      <section>
        <TituloSecao>Senha</TituloSecao>
        <Cartao className="p-4">
          <FormularioTrocarSenha />
        </Cartao>
      </section>

      <section>
        <TituloSecao>Sobre o sistema</TituloSecao>
        <Cartao className="space-y-2 p-4 text-[14px] text-cinza">
          <p>
            Banco de dados:{" "}
            <strong className="text-tinta">
              {usandoPostgresDeVerdade()
                ? "Postgres hospedado (DATABASE_URL)"
                : "Postgres local, na pasta do projeto"}
            </strong>
          </p>
          <p>
            Toda alteracao fica registrada no histórico, com data e hora, inclusive
            estorno de pagamento e cancelamento de vale. Nada e apagado de verdade.
          </p>
          <p>
            A nota fiscal e apenas um acrescimo de preço: o sistema{" "}
            <strong className="text-tinta">não emite</strong> nota fiscal.
          </p>
        </Cartao>
      </section>

      <section>
        <TituloSecao>Sair</TituloSecao>
        <Cartao className="p-4">
          <BotaoSair />
        </Cartao>
      </section>
    </div>
  );
}
