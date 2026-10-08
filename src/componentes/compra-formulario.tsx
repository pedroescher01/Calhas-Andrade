"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarCompra, receberCompra } from "@/servidor/acoes";
import { Aviso, Botao, CampoDinheiro, CampoQuantidade, CampoTexto, Folha, Seletor } from "@/componentes/campos";
import { formatarReais, parsearQuantidade, parsearReais } from "@/dominio/dinheiro";
import { hoje, somarDias } from "@/dominio/datas";

type ItemCompra = {
  chave: string;
  descricao: string;
  quantidade: string;
  valorUnitario: string;
};

let contador = 0;
function itemVazio(): ItemCompra {
  contador += 1;
  return { chave: `c${contador}`, descricao: "", quantidade: "1", valorUnitario: "" };
}

export function BotaoNovaCompra({
  fornecedores,
}: {
  fornecedores: { id: number; nome: string }[];
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [fornecedorId, setFornecedorId] = useState("");
  const [data, setData] = useState(hoje());
  const [frete, setFrete] = useState("");
  const [vencimento, setVencimento] = useState(somarDias(hoje(), 30));
  const [itens, setItens] = useState<ItemCompra[]>([itemVazio()]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const total = useMemo(
    () =>
      itens.reduce(
        (soma, i) =>
          soma +
          Math.round((parsearReais(i.valorUnitario) * parsearQuantidade(i.quantidade)) / 1000),
        0,
      ) + parsearReais(frete),
    [itens, frete],
  );

  function mudar(chave: string, mudanca: Partial<ItemCompra>) {
    setItens((atual) => atual.map((i) => (i.chave === chave ? { ...i, ...mudanca } : i)));
  }

  function salvar(jaRecebi: boolean) {
    setErro(null);

    if (!fornecedorId) {
      setErro("Escolha o fornecedor.");
      return;
    }
    const validos = itens.filter((i) => i.descricao.trim() !== "");
    if (validos.length === 0) {
      setErro("Coloque pelo menos um item.");
      return;
    }

    iniciar(async () => {
      const resposta = await salvarCompra({
        fornecedorId: Number(fornecedorId),
        data,
        status: jaRecebi ? "pedido" : "pedido",
        frete: frete || "0",
        itens: validos.map((i) => ({
          descricao: i.descricao,
          unidade: "un",
          quantidade: i.quantidade || "1",
          valorUnitario: i.valorUnitario || "0",
        })),
      });
      if (!resposta.ok) {
        setErro(resposta.erro);
        return;
      }

      if (jaRecebi) {
        const recebimento = await receberCompra({
          compraId: resposta.dados.id,
          vencimento,
        });
        if (!recebimento.ok) {
          setErro(recebimento.erro);
          return;
        }
      }

      setAberta(false);
      setItens([itemVazio()]);
      setFrete("");
      router.refresh();
    });
  }

  return (
    <>
      <Botao variante="principal" onClick={() => setAberta(true)}>
        Nova compra
      </Botao>

      <Folha titulo="Nova compra" aberta={aberta} onFechar={() => setAberta(false)}>
        <div className="space-y-3">
          <Seletor
            rotulo="Fornecedor"
            valor={fornecedorId}
            onChange={setFornecedorId}
            opcoes={[
              { valor: "", rotulo: "— escolher —" },
              ...fornecedores.map((f) => ({ valor: String(f.id), rotulo: f.nome })),
            ]}
          />
          <CampoTexto rotulo="Data" valor={data} onChange={setData} tipo="date" />

          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-tinta">Itens</p>
            {itens.map((item) => (
              <div key={item.chave} className="rounded-lg border border-linha p-3">
                <CampoTexto
                  rotulo="Descrição"
                  valor={item.descricao}
                  onChange={(v) => mudar(item.chave, { descricao: v })}
                  placeholder="Ex: bobina galvanizada 0,50mm"
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <CampoQuantidade
                    rotulo="Qtd"
                    valor={item.quantidade}
                    onChange={(v) => mudar(item.chave, { quantidade: v })}
                  />
                  <CampoDinheiro
                    rotulo="Valor unitario"
                    valor={item.valorUnitario}
                    onChange={(v) => mudar(item.chave, { valorUnitario: v })}
                  />
                </div>
                {itens.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setItens((atual) => atual.filter((i) => i.chave !== item.chave))
                    }
                    className="mt-2 text-[13px] font-semibold text-marca"
                  >
                    Remover item
                  </button>
                ) : null}
              </div>
            ))}
            <Botao
              variante="secundario"
              onClick={() => setItens((atual) => [...atual, itemVazio()])}
              className="w-full"
            >
              Adicionar item
            </Botao>
          </div>

          <CampoDinheiro rotulo="Frete" valor={frete} onChange={setFrete} />

          <p className="tabular border-t border-linha pt-3 text-right text-[18px] font-bold">
            Total {formatarReais(total)}
          </p>

          <CampoTexto
            rotulo="Vencimento (se já recebeu)"
            valor={vencimento}
            onChange={setVencimento}
            tipo="date"
            dica="Receber a compra abre a conta a pagar."
          />

          {erro ? <Aviso>{erro}</Aviso> : null}

          <div className="flex flex-col gap-2">
            <Botao
              variante="marca"
              desabilitado={salvando}
              onClick={() => salvar(true)}
              className="w-full"
            >
              {salvando ? "Salvando..." : "Salvar e já recebi"}
            </Botao>
            <Botao
              variante="secundario"
              desabilitado={salvando}
              onClick={() => salvar(false)}
              className="w-full"
            >
              Só registrar o pedido
            </Botao>
          </div>
        </div>
      </Folha>
    </>
  );
}

export function BotaoReceberCompra({ compraId }: { compraId: number }) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [vencimento, setVencimento] = useState(somarDias(hoje(), 30));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="shrink-0 rounded-lg border border-linha-forte px-3 py-1.5 text-[13px] font-semibold text-tinta hover:bg-superficie"
      >
        Recebi
      </button>

      <Folha titulo="Receber compra" aberta={aberta} onFechar={() => setAberta(false)}>
        <div className="space-y-3">
          <p className="text-[14px] text-cinza">
            Marcar como recebida abre a conta a pagar no financeiro.
          </p>
          <CampoTexto
            rotulo="Vencimento"
            valor={vencimento}
            onChange={setVencimento}
            tipo="date"
          />
          {erro ? <Aviso>{erro}</Aviso> : null}
          <Botao
            variante="principal"
            className="w-full"
            desabilitado={salvando}
            onClick={() =>
              iniciar(async () => {
                const resposta = await receberCompra({ compraId, vencimento });
                if (!resposta.ok) {
                  setErro(resposta.erro);
                  return;
                }
                setAberta(false);
                router.refresh();
              })
            }
          >
            {salvando ? "Registrando..." : "Confirmar recebimento"}
          </Botao>
        </div>
      </Folha>
    </>
  );
}
