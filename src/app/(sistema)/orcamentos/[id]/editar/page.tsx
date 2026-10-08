import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listarCalheirosComSaldo,
  listarClientes,
  listarTiposCalha,
  obterOrcamento,
} from "@/servidor/consultas";
import { EditorOrcamento } from "@/componentes/editor-orcamento";
import { formatarValor } from "@/dominio/dinheiro";

export const dynamic = "force-dynamic";

export default async function PaginaEditarOrcamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numero = Number(id);
  if (!Number.isInteger(numero)) notFound();

  const [orcamento, tipos, clientes, calheiros] = await Promise.all([
    obterOrcamento(numero),
    listarTiposCalha(),
    listarClientes(),
    listarCalheirosComSaldo(),
  ]);

  if (!orcamento) notFound();

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link
          href={`/orcamentos/${orcamento.id}`}
          aria-label="Voltar"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-linha-forte text-cinza hover:bg-superficie"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-tinta">Editar orçamento nº {orcamento.id}</h1>
          <p className="text-[14px] text-cinza">{orcamento.clienteNome}</p>
        </div>
      </header>

      <EditorOrcamento
        tipos={tipos.map((t) => ({
          id: t.id,
          nome: t.nome,
          unidade: t.unidade,
          precoMaterialCentavos: t.precoMaterialCentavos,
          precoMaoObraCentavos: t.precoMaoObraCentavos,
        }))}
        clientes={clientes.map((c) => ({ id: c.id, nome: c.nome, telefone: c.telefone }))}
        calheiros={calheiros.map((c) => ({ id: c.id, nome: c.nome }))}
        iniciais={{
          id: orcamento.id,
          clienteId: orcamento.clienteId,
          clienteNome: orcamento.clienteNome,
          dataEmissao: orcamento.dataEmissao,
          enderecoObra: orcamento.enderecoObra ?? "",
          observacoes: orcamento.observacoes ?? "",
          calheiroId: orcamento.calheiroId,
          desconto:
            orcamento.descontoCentavos > 0 ? formatarValor(orcamento.descontoCentavos) : "",
          itens: orcamento.itens.map((i) => ({
            tipoCalhaId: i.tipoCalhaId,
            descricao: i.descricao,
            unidade: i.unidade,
            quantidadeMilesimos: i.quantidadeMilesimos,
            precoMaterialCentavos: i.precoMaterialCentavos,
            precoMaoObraCentavos: i.precoMaoObraCentavos,
          })),
        }}
      />
    </div>
  );
}
