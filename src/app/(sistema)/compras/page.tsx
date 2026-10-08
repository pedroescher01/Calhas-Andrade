import {
  comprasPorFornecedor,
  listarCompras,
  listarFornecedores,
  listarListaCompras,
} from "@/servidor/consultas";
import { Cartao, Dinheiro, Etiqueta, TituloSecao, Vazio } from "@/componentes/basicos";
import {
  BotaoNovaCompra,
  BotaoReceberCompra,
} from "@/componentes/compra-formulario";
import {
  BotaoNovoFornecedor,
  ListaDeCompras,
} from "@/componentes/cadastro-formularios";
import { formatarReais } from "@/dominio/dinheiro";
import { formatarData } from "@/dominio/datas";

export const metadata = { title: "Compras - Calhas Andrade" };
export const dynamic = "force-dynamic";

const tomStatus = {
  rascunho: "neutro",
  pedido: "info",
  recebido: "pago",
  cancelado: "neutro",
} as const;

export default async function PaginaCompras() {
  const [lista, compras, fornecedores, porFornecedor] = await Promise.all([
    listarListaCompras(),
    listarCompras({ limite: 30 }),
    listarFornecedores(),
    comprasPorFornecedor(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-tinta md:text-3xl">Compras</h1>
          <p className="text-[14px] text-cinza">
            Matéria-prima, fornecedores e o que está faltando na fábrica
          </p>
        </div>
        <div className="flex gap-2">
          <BotaoNovoFornecedor />
          <BotaoNovaCompra
            fornecedores={fornecedores.map((f) => ({ id: f.id, nome: f.nome }))}
          />
        </div>
      </header>

      <section>
        <TituloSecao>Lista de compras</TituloSecao>
        <Cartao>
          <ListaDeCompras
            itens={lista.map((i) => ({
              id: i.id,
              descricao: i.descricao,
              quantidade: i.quantidade,
              fornecedorNome: i.fornecedorNome,
            }))}
          />
        </Cartao>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <TituloSecao>Compras recentes</TituloSecao>
          <Cartao>
            {compras.length === 0 ? (
              <Vazio>Nenhuma compra registrada.</Vazio>
            ) : (
              <ul className="divide-y divide-linha">
                {compras.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-tinta">
                        {c.fornecedorNome}
                      </p>
                      <p className="text-[13px] text-cinza">
                        {formatarData(c.data)} - {c.qtdItens} item(ns)
                        {c.freteCentavos > 0
                          ? ` - frete ${formatarReais(c.freteCentavos)}`
                          : ""}
                      </p>
                    </div>
                    <Etiqueta tom={tomStatus[c.status]}>{c.status}</Etiqueta>
                    <Dinheiro centavos={c.total} className="font-semibold" />
                    {c.status === "pedido" ? <BotaoReceberCompra compraId={c.id} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </section>

        <section>
          <TituloSecao>Quanto gastei com cada fornecedor</TituloSecao>
          <Cartao>
            {porFornecedor.length === 0 ? (
              <Vazio>Nenhuma compra para somar.</Vazio>
            ) : (
              <ul className="divide-y divide-linha">
                {porFornecedor.map((f) => (
                  <li
                    key={f.fornecedorId}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-tinta">{f.fornecedorNome}</p>
                      <p className="text-[13px] text-cinza">{f.qtd} compra(s)</p>
                    </div>
                    <Dinheiro centavos={f.total} className="font-semibold" />
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
        </section>
      </div>

      <section>
        <TituloSecao>Fornecedores</TituloSecao>
        <Cartao>
          {fornecedores.length === 0 ? (
            <Vazio>Nenhum fornecedor cadastrado.</Vazio>
          ) : (
            <ul className="divide-y divide-linha">
              {fornecedores.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-tinta">
                      {f.nomeFantasia ?? f.nome}
                    </p>
                    <p className="text-[13px] text-cinza">
                      {f.telefone ?? "sem telefone"}
                    </p>
                  </div>
                  <Etiqueta>{f.categoria}</Etiqueta>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </section>
    </div>
  );
}
