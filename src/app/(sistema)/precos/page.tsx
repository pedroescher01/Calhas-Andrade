import { listarTiposCalha } from "@/servidor/consultas";
import { Cartao, Vazio } from "@/componentes/basicos";
import { BotaoNovoTipo, LinhaPreco } from "@/componentes/cadastro-formularios";
import { formatarReais } from "@/dominio/dinheiro";

export const metadata = { title: "Tabela de preços - Calhas Andrade" };
export const dynamic = "force-dynamic";

export default async function PaginaPrecos() {
  const tipos = await listarTiposCalha(true);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-tinta md:text-3xl">Tabela de preços</h1>
          <p className="text-[14px] text-cinza">
            {tipos.length} tipo(s). O preco do orcamento vem daqui.
          </p>
        </div>
        <BotaoNovoTipo />
      </header>

      <Cartao className="bg-superficie p-4">
        <p className="text-[14px] text-cinza">
          Material e mão de obra ficam separados de propósito: o cliente ve a
          soma dos dois, e a mão de obra e o que entra na conta do calheiro
          quando o cliente paga. Mudar um preço aqui{" "}
          <strong className="text-tinta">não altera orçamentos antigos</strong> --
          cada orçamento guarda o preço do dia em que foi feito.
        </p>
      </Cartao>

      <Cartao>
        {tipos.length === 0 ? (
          <Vazio>
            Nenhum tipo cadastrado. Comece pelos que você mais vende: calha
            americana, moldura, platibanda, rufo, condutor.
          </Vazio>
        ) : (
          <div className="divide-y divide-linha">
            {tipos.map((t) => (
              <LinhaPreco
                key={t.id}
                tipo={{
                  id: t.id,
                  nome: t.nome,
                  unidade: t.unidade,
                  precoMaterialCentavos: t.precoMaterialCentavos,
                  precoMaoObraCentavos: t.precoMaoObraCentavos,
                }}
              />
            ))}
          </div>
        )}
      </Cartao>

      {tipos.length > 0 ? (
        <p className="px-1 text-[13px] text-cinza">
          Exemplo de leitura: calha americana a{" "}
          {formatarReais(tipos[0]!.precoMaterialCentavos)} de material +{" "}
          {formatarReais(tipos[0]!.precoMaoObraCentavos)} de mão de obra por metro
          sai para o cliente a{" "}
          {formatarReais(
            tipos[0]!.precoMaterialCentavos + tipos[0]!.precoMaoObraCentavos,
          )}{" "}
          o metro.
        </p>
      ) : null}
    </div>
  );
}
