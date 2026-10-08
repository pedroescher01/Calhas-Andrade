import Link from "next/link";
import { listarCalheirosComSaldo, listarClientes, listarTiposCalha } from "@/servidor/consultas";
import { EditorOrcamento } from "@/componentes/editor-orcamento";

export const metadata = { title: "Novo orçamento - Calhas Andrade" };
export const dynamic = "force-dynamic";

export default async function PaginaNovoOrcamento() {
  const [tipos, clientes, calheiros] = await Promise.all([
    listarTiposCalha(),
    listarClientes(),
    listarCalheirosComSaldo(),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link
          href="/orcamentos"
          aria-label="Voltar"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-linha-forte text-cinza hover:bg-superficie"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-tinta">Novo orçamento</h1>
          <p className="text-[14px] text-cinza">
            {tipos.length === 0
              ? "A tabela de preços está vazia: dá para escrever os valores à mão."
              : "Escolha o tipo e o preço vem da tabela."}
          </p>
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
      />
    </div>
  );
}
