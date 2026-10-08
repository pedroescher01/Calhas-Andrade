import { notFound, redirect } from "next/navigation";
import { obterConfiguracoes, obterOrcamento } from "@/servidor/consultas";
import { lerSessao } from "@/servidor/sessao";
import { calcularItem } from "@/dominio/orcamento";
import { formatarQuantidade, formatarReais } from "@/dominio/dinheiro";
import { formatarData, somarDias } from "@/dominio/datas";
import { BotaoImprimir } from "./botao";

export const dynamic = "force-dynamic";

/**
 * Folha do orcamento para o cliente.
 *
 * Nao e PDF gerado por biblioteca: e uma pagina com folha de impressão.
 * O proprio navegador transforma em PDF ("Salvar como PDF"), tanto no
 * computador quanto no celular. Menos dependencia para manter, e o
 * resultado sai com a fonte e o espacamento certos.
 *
 * Importante: esta folha mostra so o que o cliente precisa ver. A divisao
 * entre material e mao de obra fica de fora -- e conta interna da fabrica.
 */
export default async function FolhaOrcamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await lerSessao())) redirect("/login");

  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero)) notFound();

  const [orcamento, config] = await Promise.all([
    obterOrcamento(numero),
    obterConfiguracoes(),
  ]);
  if (!orcamento) notFound();

  const t = orcamento.totais;
  const validade = somarDias(orcamento.dataEmissao, orcamento.validadeDias);

  return (
    <main className="mx-auto max-w-[800px] bg-white px-6 py-8 text-tinta print:px-0 print:py-0">
      <BotaoImprimir />

      <header className="flex items-start justify-between gap-6 border-b-2 border-tinta pb-4">
        <div>
          <h1 className="font-condensada text-[28px] font-bold uppercase leading-none tracking-wide">
            {config.nomeEmpresa}
          </h1>
          <div className="mt-1 text-[13px] leading-snug text-cinza">
            {config.telefone ? <p>{config.telefone}</p> : null}
            {config.endereco ? <p>{config.endereco}</p> : null}
            {config.documento ? <p>{config.documento}</p> : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-condensada text-[13px] font-bold uppercase tracking-wide text-cinza">
            Orçamento
          </p>
          <p className="tabular text-[26px] font-bold leading-none">nº {orcamento.id}</p>
          <p className="tabular mt-1 text-[13px] text-cinza">
            {formatarData(orcamento.dataEmissao)}
          </p>
        </div>
      </header>

      <section className="grid gap-4 border-b border-linha py-4 sm:grid-cols-2">
        <div>
          <p className="font-condensada text-[12px] font-bold uppercase tracking-wide text-cinza">
            Cliente
          </p>
          <p className="text-[16px] font-semibold">{orcamento.clienteNome}</p>
          {orcamento.cliente?.telefone ? (
            <p className="text-[13px] text-cinza">{orcamento.cliente.telefone}</p>
          ) : null}
          {orcamento.cliente?.documento ? (
            <p className="text-[13px] text-cinza">{orcamento.cliente.documento}</p>
          ) : null}
        </div>
        <div>
          <p className="font-condensada text-[12px] font-bold uppercase tracking-wide text-cinza">
            Obra
          </p>
          <p className="text-[15px]">{orcamento.enderecoObra ?? "-"}</p>
          {orcamento.cliente?.cidade ? (
            <p className="text-[13px] text-cinza">
              {orcamento.cliente.bairro ? `${orcamento.cliente.bairro}, ` : ""}
              {orcamento.cliente.cidade}
            </p>
          ) : null}
        </div>
      </section>

      <table className="mt-4 w-full border-collapse text-[14px]">
        <thead>
          <tr className="border-b border-tinta text-left">
            <th scope="col" className="py-2 font-condensada font-bold uppercase tracking-wide">
              Item
            </th>
            <th scope="col" className="py-2 text-right font-condensada font-bold uppercase tracking-wide">
              Qtd
            </th>
            <th scope="col" className="py-2 text-right font-condensada font-bold uppercase tracking-wide">
              Preço
            </th>
            <th scope="col" className="py-2 text-right font-condensada font-bold uppercase tracking-wide">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {orcamento.itens.map((item) => {
            const calculado = calcularItem(item);
            // O cliente ve um preco unico por unidade: material e mao de
            // obra somados. A divisao e assunto interno.
            const precoUnitario =
              item.precoMaterialCentavos + item.precoMaoObraCentavos;
            return (
              <tr key={item.id} className="border-b border-linha">
                <td className="py-2.5 pr-3">{item.descricao}</td>
                <td className="tabular py-2.5 text-right whitespace-nowrap">
                  {formatarQuantidade(item.quantidadeMilesimos)} {item.unidade}
                </td>
                <td className="tabular py-2.5 text-right whitespace-nowrap">
                  {formatarReais(precoUnitario)}
                </td>
                <td className="tabular py-2.5 text-right font-semibold whitespace-nowrap">
                  {formatarReais(calculado.total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <dl className="w-full max-w-xs space-y-1 text-[14px]">
          {t.acrescimoNota > 0 ? (
            <div className="flex justify-between">
              <dt className="text-cinza">Nota fiscal</dt>
              <dd className="tabular">{formatarReais(t.acrescimoNota)}</dd>
            </div>
          ) : null}
          {t.desconto > 0 ? (
            <>
              <div className="flex justify-between">
                <dt className="text-cinza">Subtotal</dt>
                <dd className="tabular">{formatarReais(t.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cinza">Desconto</dt>
                <dd className="tabular">- {formatarReais(t.desconto)}</dd>
              </div>
            </>
          ) : null}
          <div className="flex justify-between border-t-2 border-tinta pt-2 text-[20px] font-bold">
            <dt>Total</dt>
            <dd className="tabular">{formatarReais(t.total)}</dd>
          </div>
          {t.pago > 0 ? (
            <>
              <div className="flex justify-between">
                <dt className="text-cinza">Já pago</dt>
                <dd className="tabular">{formatarReais(t.pago)}</dd>
              </div>
              <div className="flex justify-between text-[16px] font-bold">
                <dt>Falta</dt>
                <dd className="tabular">{formatarReais(t.saldo)}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </div>

      {orcamento.observacoes ? (
        <section className="mt-6 border-t border-linha pt-4">
          <p className="font-condensada text-[12px] font-bold uppercase tracking-wide text-cinza">
            Observações
          </p>
          <p className="whitespace-pre-wrap text-[14px]">{orcamento.observacoes}</p>
        </section>
      ) : null}

      <footer className="mt-8 border-t border-linha pt-4 text-[13px] text-cinza">
        <p>
          Orçamento válido até {formatarData(validade)} ({orcamento.validadeDias} dias).
        </p>
        {config.pixChave ? (
          <p className="mt-1">
            Pix: <strong className="text-tinta">{config.pixChave}</strong>
            {config.pixFavorecido ? ` - ${config.pixFavorecido}` : ""}
          </p>
        ) : null}
      </footer>
    </main>
  );
}
