"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  criarOrcamento,
  atualizarOrcamento,
  salvarItens,
  salvarCliente,
  type ItemEntrada,
} from "@/servidor/acoes";
import {
  Aviso,
  Botao,
  CampoAreaTexto,
  CampoDinheiro,
  CampoQuantidade,
  CampoTexto,
  Seletor,
} from "@/componentes/campos";
import { Cartao, TituloSecao } from "@/componentes/basicos";
import { calcularTotais } from "@/dominio/orcamento";
import { formatarReais, formatarValor, parsearQuantidade, parsearReais } from "@/dominio/dinheiro";
import { hoje } from "@/dominio/datas";

type TipoCalha = {
  id: number;
  nome: string;
  unidade: "m" | "un" | "vb";
  precoMaterialCentavos: number;
  precoMaoObraCentavos: number;
};

type ItemFormulario = {
  chave: string;
  tipoCalhaId: number | null;
  descricao: string;
  unidade: "m" | "un" | "vb";
  quantidade: string;
  precoMaterial: string;
  precoMaoObra: string;
};

export type ValoresIniciais = {
  id?: number;
  clienteId?: number | null;
  clienteNome?: string;
  dataEmissao?: string;
  enderecoObra?: string;
  observacoes?: string;
  calheiroId?: number | null;
  desconto?: string;
  itens?: {
    tipoCalhaId: number | null;
    descricao: string;
    unidade: "m" | "un" | "vb";
    quantidadeMilesimos: number;
    precoMaterialCentavos: number;
    precoMaoObraCentavos: number;
  }[];
};

let contador = 0;
function novaChave(): string {
  contador += 1;
  return `item-${contador}`;
}

function itemVazio(): ItemFormulario {
  return {
    chave: novaChave(),
    tipoCalhaId: null,
    descricao: "",
    unidade: "m",
    quantidade: "",
    precoMaterial: "",
    precoMaoObra: "",
  };
}

const rotuloUnidade = { m: "m", un: "un", vb: "vb" } as const;

export function EditorOrcamento({
  tipos,
  clientes,
  calheiros,
  iniciais,
}: {
  tipos: TipoCalha[];
  clientes: { id: number; nome: string; telefone: string | null }[];
  calheiros: { id: number; nome: string }[];
  iniciais?: ValoresIniciais;
}) {
  const router = useRouter();
  const editando = iniciais?.id != null;

  const [modoCliente, setModoCliente] = useState<"cadastrado" | "novo">(
    iniciais?.clienteId ? "cadastrado" : clientes.length > 0 && !editando ? "cadastrado" : "novo",
  );
  const [clienteId, setClienteId] = useState<string>(
    iniciais?.clienteId ? String(iniciais.clienteId) : "",
  );
  const [nomeNovo, setNomeNovo] = useState(editando ? "" : "");
  const [telefoneNovo, setTelefoneNovo] = useState("");
  const [cidadeNova, setCidadeNova] = useState("");

  const [dataEmissao, setDataEmissao] = useState(iniciais?.dataEmissao ?? hoje());
  const [enderecoObra, setEnderecoObra] = useState(iniciais?.enderecoObra ?? "");
  const [observacoes, setObservacoes] = useState(iniciais?.observacoes ?? "");
  const [calheiroId, setCalheiroId] = useState<string>(
    iniciais?.calheiroId ? String(iniciais.calheiroId) : "",
  );
  const [desconto, setDesconto] = useState(iniciais?.desconto ?? "");

  const [itens, setItens] = useState<ItemFormulario[]>(() => {
    if (iniciais?.itens && iniciais.itens.length > 0) {
      return iniciais.itens.map((i) => ({
        chave: novaChave(),
        tipoCalhaId: i.tipoCalhaId,
        descricao: i.descricao,
        unidade: i.unidade,
        quantidade: String(i.quantidadeMilesimos / 1000).replace(".", ","),
        precoMaterial: formatarValor(i.precoMaterialCentavos),
        precoMaoObra: formatarValor(i.precoMaoObraCentavos),
      }));
    }
    return [itemVazio()];
  });

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciarSalvamento] = useTransition();

  const totais = useMemo(
    () =>
      calcularTotais({
        itens: itens.map((i) => ({
          quantidadeMilesimos: parsearQuantidade(i.quantidade),
          precoMaterialCentavos: parsearReais(i.precoMaterial),
          precoMaoObraCentavos: parsearReais(i.precoMaoObra),
        })),
        descontoCentavos: parsearReais(desconto),
      }),
    [itens, desconto],
  );

  function mudarItem(chave: string, mudanca: Partial<ItemFormulario>) {
    setItens((atual) =>
      atual.map((i) => (i.chave === chave ? { ...i, ...mudanca } : i)),
    );
  }

  /** Escolher o tipo preenche descricao, unidade e os dois precos. */
  function escolherTipo(chave: string, idTexto: string) {
    if (idTexto === "") {
      mudarItem(chave, { tipoCalhaId: null });
      return;
    }
    const tipo = tipos.find((t) => t.id === Number(idTexto));
    if (!tipo) return;
    mudarItem(chave, {
      tipoCalhaId: tipo.id,
      descricao: tipo.nome,
      unidade: tipo.unidade,
      precoMaterial: formatarValor(tipo.precoMaterialCentavos),
      precoMaoObra: formatarValor(tipo.precoMaoObraCentavos),
    });
  }

  function montarItens(): ItemEntrada[] {
    return itens
      .filter((i) => i.descricao.trim() !== "" && parsearQuantidade(i.quantidade) > 0)
      .map((i) => ({
        tipoCalhaId: i.tipoCalhaId,
        descricao: i.descricao.trim(),
        unidade: i.unidade,
        quantidade: i.quantidade,
        precoMaterial: i.precoMaterial || "0",
        precoMaoObra: i.precoMaoObra || "0",
      }));
  }

  function salvar(depois: "ver" | "enviar") {
    setErro(null);

    const itensValidos = montarItens();
    if (itensValidos.length === 0) {
      setErro("Coloque pelo menos um item com quantidade.");
      return;
    }

    iniciarSalvamento(async () => {
      let idCliente: number | null = clienteId ? Number(clienteId) : null;

      // Nome novo digitado: cadastra o cliente junto, para nao obrigar o
      // dono a sair do orcamento so para criar o cadastro.
      if (modoCliente === "novo" && nomeNovo.trim() !== "") {
        const resposta = await salvarCliente({
          nome: nomeNovo.trim(),
          telefone: telefoneNovo.trim() || undefined,
          cidade: cidadeNova.trim() || undefined,
        });
        if (!resposta.ok) {
          setErro(resposta.erro);
          return;
        }
        idCliente = resposta.dados.id;
      }

      if (!idCliente) {
        setErro("Escolha um cliente ou escreva o nome dele.");
        return;
      }

      if (editando) {
        const atualizacao = await atualizarOrcamento({
          id: iniciais!.id!,
          clienteId: idCliente,
          dataEmissao,
          enderecoObra: enderecoObra.trim() || undefined,
          observacoes: observacoes.trim() || undefined,
          calheiroId: calheiroId ? Number(calheiroId) : null,
          desconto: desconto || "0",
        });
        if (!atualizacao.ok) {
          setErro(atualizacao.erro);
          return;
        }

        const itensSalvos = await salvarItens(iniciais!.id!, itensValidos);
        if (!itensSalvos.ok) {
          setErro(itensSalvos.erro);
          return;
        }

        router.push(
          depois === "enviar"
            ? `/orcamentos/${iniciais!.id}?enviar=1`
            : `/orcamentos/${iniciais!.id}`,
        );
        return;
      }

      const criacao = await criarOrcamento({
        clienteId: idCliente,
        dataEmissao,
        enderecoObra: enderecoObra.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        calheiroId: calheiroId ? Number(calheiroId) : null,
        itens: itensValidos,
      });
      if (!criacao.ok) {
        setErro(criacao.erro);
        return;
      }

      if (parsearReais(desconto) > 0) {
        await atualizarOrcamento({ id: criacao.dados.id, desconto });
      }

      router.push(
        depois === "enviar"
          ? `/orcamentos/${criacao.dados.id}?enviar=1`
          : `/orcamentos/${criacao.dados.id}`,
      );
    });
  }

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------- Cliente */}
      <section>
        <TituloSecao>Cliente</TituloSecao>
        <Cartao className="space-y-3 p-4">
          {clientes.length > 0 ? (
            <div className="flex gap-2" role="group" aria-label="Tipo de cliente">
              <button
                type="button"
                onClick={() => setModoCliente("cadastrado")}
                aria-pressed={modoCliente === "cadastrado"}
                className={`flex-1 rounded-lg border px-3 py-2 text-[14px] font-semibold ${
                  modoCliente === "cadastrado"
                    ? "border-tinta bg-tinta text-white"
                    : "border-linha-forte bg-cartao text-cinza"
                }`}
              >
                Já cadastrado
              </button>
              <button
                type="button"
                onClick={() => setModoCliente("novo")}
                aria-pressed={modoCliente === "novo"}
                className={`flex-1 rounded-lg border px-3 py-2 text-[14px] font-semibold ${
                  modoCliente === "novo"
                    ? "border-tinta bg-tinta text-white"
                    : "border-linha-forte bg-cartao text-cinza"
                }`}
              >
                Cliente novo
              </button>
            </div>
          ) : null}

          {modoCliente === "cadastrado" && clientes.length > 0 ? (
            <Seletor
              rotulo="Escolha o cliente"
              valor={clienteId}
              onChange={setClienteId}
              opcoes={[
                { valor: "", rotulo: "— escolher —" },
                ...clientes.map((c) => ({
                  valor: String(c.id),
                  rotulo: c.telefone ? `${c.nome} - ${c.telefone}` : c.nome,
                })),
              ]}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <CampoTexto
                rotulo="Nome do cliente"
                valor={nomeNovo}
                onChange={setNomeNovo}
                placeholder="Como você chama ele"
                autoFoco={!editando}
              />
              <CampoTexto
                rotulo="Telefone (WhatsApp)"
                valor={telefoneNovo}
                onChange={setTelefoneNovo}
                tipo="tel"
                placeholder="(00) 90000-0000"
              />
              <CampoTexto rotulo="Cidade" valor={cidadeNova} onChange={setCidadeNova} />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <CampoTexto
              rotulo="Endereço da obra"
              valor={enderecoObra}
              onChange={setEnderecoObra}
              placeholder="Rua, número, bairro"
            />
            <CampoTexto
              rotulo="Data do orçamento"
              valor={dataEmissao}
              onChange={setDataEmissao}
              tipo="date"
            />
          </div>
        </Cartao>
      </section>

      {/* ------------------------------------------------------- Itens */}
      <section>
        <TituloSecao
          acao={
            <span className="text-[13px] text-cinza">
              {itens.length} {itens.length === 1 ? "item" : "itens"}
            </span>
          }
        >
          Itens
        </TituloSecao>

        <div className="space-y-3">
          {itens.map((item, indice) => {
            const tipo = tipos.find((t) => t.id === item.tipoCalhaId);
            const quantidade = parsearQuantidade(item.quantidade);
            const material = Math.round((parsearReais(item.precoMaterial) * quantidade) / 1000);
            const maoObra = Math.round((parsearReais(item.precoMaoObra) * quantidade) / 1000);

            return (
              <Cartao key={item.chave} className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="font-condensada text-[13px] font-bold uppercase tracking-wide text-cinza">
                    Item {indice + 1}
                  </span>
                  {itens.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setItens((atual) => atual.filter((i) => i.chave !== item.chave))
                      }
                      className="text-[13px] font-semibold text-marca"
                    >
                      Remover
                    </button>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <Seletor
                    rotulo="Tipo"
                    valor={item.tipoCalhaId ? String(item.tipoCalhaId) : ""}
                    onChange={(v) => escolherTipo(item.chave, v)}
                    opcoes={[
                      { valor: "", rotulo: "— outro / escrever à mão —" },
                      ...tipos.map((t) => ({ valor: String(t.id), rotulo: t.nome })),
                    ]}
                    dica={
                      tipo
                        ? `Tabela: ${formatarReais(tipo.precoMaterialCentavos)} material + ${formatarReais(tipo.precoMaoObraCentavos)} mão de obra por ${rotuloUnidade[tipo.unidade]}`
                        : undefined
                    }
                  />

                  {item.tipoCalhaId == null ? (
                    <CampoTexto
                      rotulo="Descrição"
                      valor={item.descricao}
                      onChange={(v) => mudarItem(item.chave, { descricao: v })}
                      placeholder="Ex: arremate especial"
                    />
                  ) : null}

                  <div className="grid grid-cols-3 gap-2">
                    <CampoQuantidade
                      rotulo="Qtd"
                      valor={item.quantidade}
                      onChange={(v) => mudarItem(item.chave, { quantidade: v })}
                      unidade={rotuloUnidade[item.unidade]}
                    />
                    <CampoDinheiro
                      rotulo="Material"
                      valor={item.precoMaterial}
                      onChange={(v) => mudarItem(item.chave, { precoMaterial: v })}
                    />
                    <CampoDinheiro
                      rotulo="Mão de obra"
                      valor={item.precoMaoObra}
                      onChange={(v) => mudarItem(item.chave, { precoMaoObra: v })}
                    />
                  </div>

                  {quantidade > 0 ? (
                    <p className="tabular text-right text-[14px] text-cinza">
                      {formatarReais(material)} + {formatarReais(maoObra)} ={" "}
                      <strong className="text-tinta">{formatarReais(material + maoObra)}</strong>
                    </p>
                  ) : null}
                </div>
              </Cartao>
            );
          })}

          <Botao
            variante="secundario"
            onClick={() => setItens((atual) => [...atual, itemVazio()])}
            className="w-full"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden="true">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Adicionar item
          </Botao>
        </div>
      </section>

      {/* ------------------------------------------------ Fechamento */}
      <section>
        <TituloSecao>Fechamento</TituloSecao>
        <Cartao className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <CampoDinheiro
              rotulo="Desconto"
              valor={desconto}
              onChange={setDesconto}
              dica="Sai da sua margem, não da mão de obra do calheiro."
            />
            <Seletor
              rotulo="Calheiro que vai fazer"
              valor={calheiroId}
              onChange={setCalheiroId}
              opcoes={[
                { valor: "", rotulo: "— definir depois —" },
                ...calheiros.map((c) => ({ valor: String(c.id), rotulo: c.nome })),
              ]}
            />
          </div>

          <CampoAreaTexto
            rotulo="Observações"
            valor={observacoes}
            onChange={setObservacoes}
            placeholder="O que o cliente pediu, detalhe da obra, combinado de pagamento..."
          />

          <dl className="space-y-1 border-t border-linha pt-3 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-cinza">Material</dt>
              <dd className="tabular">{formatarReais(totais.totalMaterial)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-cinza">Mão de obra</dt>
              <dd className="tabular">{formatarReais(totais.totalMaoObra)}</dd>
            </div>
            {totais.desconto > 0 ? (
              <div className="flex justify-between text-marca">
                <dt>Desconto</dt>
                <dd className="tabular">- {formatarReais(totais.desconto)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-linha pt-2 text-[18px] font-bold">
              <dt>Total</dt>
              <dd className="tabular">{formatarReais(totais.total)}</dd>
            </div>
          </dl>
        </Cartao>
      </section>

      {erro ? <Aviso>{erro}</Aviso> : null}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Botao
          variante="marca"
          onClick={() => salvar("enviar")}
          desabilitado={salvando}
          className="flex-1"
        >
          {salvando ? "Salvando..." : "Salvar e enviar"}
        </Botao>
        <Botao
          variante="principal"
          onClick={() => salvar("ver")}
          desabilitado={salvando}
          className="flex-1"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </Botao>
      </div>
    </div>
  );
}
