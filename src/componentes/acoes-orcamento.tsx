"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  registrarPagamento,
  estornarPagamento,
  atualizarOrcamento,
} from "@/servidor/acoes";
import { Aviso, Botao, CampoDinheiro, CampoTexto, Folha, Seletor } from "@/componentes/campos";
import { Cartao, TituloSecao } from "@/componentes/basicos";
import { formatarReais, formatarValor } from "@/dominio/dinheiro";
import { hoje } from "@/dominio/datas";
import { linkWhatsApp, montarMensagemOrcamento, normalizarTelefone } from "@/dominio/whatsapp";

type DadosOrcamento = {
  id: number;
  clienteNome: string;
  clienteTelefone: string | null;
  dataEmissao: string;
  validadeDias: number;
  enderecoObra: string | null;
  observacoes: string | null;
  situacaoObra: "a_fazer" | "agendada" | "feita";
  dataAgendada: string | null;
  calheiroId: number | null;
  total: number;
  pago: number;
  saldo: number;
  desconto: number;
  itens: {
    descricao: string;
    unidade: "m" | "un" | "vb";
    quantidadeMilesimos: number;
    totalCentavos: number;
  }[];
};

const formasPagamento = [
  { valor: "pix", rotulo: "Pix" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "transferencia", rotulo: "Transferência" },
  { valor: "cartao", rotulo: "Cartão" },
  { valor: "boleto", rotulo: "Boleto" },
  { valor: "cheque", rotulo: "Cheque" },
  { valor: "outro", rotulo: "Outro" },
] as const;

export function AcoesOrcamento({
  orcamento,
  calheiros,
  nomeEmpresa,
  pixChave,
  abrirEnviar = false,
}: {
  orcamento: DadosOrcamento;
  calheiros: { id: number; nome: string }[];
  nomeEmpresa: string;
  pixChave: string | null;
  abrirEnviar?: boolean;
}) {
  const router = useRouter();
  const [folha, setFolha] = useState<"nenhuma" | "pagamento" | "whats">(
    abrirEnviar ? "whats" : "nenhuma",
  );
  const [erro, setErro] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();

  // ---- pagamento
  const [valor, setValor] = useState(
    orcamento.saldo > 0 ? formatarValor(orcamento.saldo) : "",
  );
  const [dataPagamento, setDataPagamento] = useState(hoje());
  const [forma, setForma] = useState<string>("pix");

  // ---- obra
  const [situacao, setSituacao] = useState(orcamento.situacaoObra);
  const [dataAgendada, setDataAgendada] = useState(orcamento.dataAgendada ?? hoje());
  const [calheiroId, setCalheiroId] = useState(
    orcamento.calheiroId ? String(orcamento.calheiroId) : "",
  );

  const mensagem = montarMensagemOrcamento({
    nomeEmpresa,
    numero: orcamento.id,
    clienteNome: orcamento.clienteNome,
    dataEmissao: orcamento.dataEmissao,
    validadeDias: orcamento.validadeDias,
    enderecoObra: orcamento.enderecoObra,
    itens: orcamento.itens,
    totalCentavos: orcamento.total,
    descontoCentavos: orcamento.desconto,
    pagoCentavos: orcamento.pago,
    saldoCentavos: orcamento.saldo,
    pixChave,
    observacoes: orcamento.observacoes,
  });

  const temNumero = normalizarTelefone(orcamento.clienteTelefone) != null;

  function confirmarPagamento() {
    setErro(null);
    iniciar(async () => {
      const resposta = await registrarPagamento({
        orcamentoId: orcamento.id,
        valor,
        data: dataPagamento,
        forma: forma as "pix",
      });
      if (!resposta.ok) {
        setErro(resposta.erro);
        return;
      }
      setFolha("nenhuma");
      router.refresh();
    });
  }

  function salvarObra(nova: typeof situacao) {
    setErro(null);
    setSituacao(nova);
    iniciar(async () => {
      const resposta = await atualizarOrcamento({
        id: orcamento.id,
        situacaoObra: nova,
        dataAgendada: nova === "agendada" ? dataAgendada : undefined,
        calheiroId: calheiroId ? Number(calheiroId) : null,
      });
      if (!resposta.ok) {
        setErro(resposta.erro);
        setSituacao(orcamento.situacaoObra);
        return;
      }
      router.refresh();
    });
  }

  function trocarCalheiro(novo: string) {
    setCalheiroId(novo);
    iniciar(async () => {
      await atualizarOrcamento({
        id: orcamento.id,
        calheiroId: novo ? Number(novo) : null,
      });
      router.refresh();
    });
  }

  return (
    <>
      {/* ------------------------------------------------ Acoes rapidas */}
      <div className="nao-imprime grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Botao
          variante={orcamento.saldo > 0 ? "marca" : "secundario"}
          onClick={() => {
            setValor(orcamento.saldo > 0 ? formatarValor(orcamento.saldo) : "");
            setFolha("pagamento");
          }}
        >
          Marcar pagamento
        </Botao>
        <Botao variante="secundario" onClick={() => setFolha("whats")}>
          WhatsApp
        </Botao>
        <Link
          href={`/orcamento/${orcamento.id}/imprimir`}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-linha-forte bg-cartao px-4 py-2.5 text-[15px] font-semibold text-tinta hover:bg-superficie"
        >
          Imprimir / PDF
        </Link>
        <Link
          href={`/orcamentos/${orcamento.id}/editar`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-linha-forte bg-cartao px-4 py-2.5 text-[15px] font-semibold text-tinta hover:bg-superficie"
        >
          Editar
        </Link>
      </div>

      {erro ? <Aviso>{erro}</Aviso> : null}

      {/* -------------------------------------------------------- Obra */}
      <section className="nao-imprime">
        <TituloSecao>Obra</TituloSecao>
        <Cartao className="space-y-3 p-4">
          <div className="flex gap-2" role="group" aria-label="Situação da obra">
            {(
              [
                ["a_fazer", "A fazer"],
                ["agendada", "Agendada"],
                ["feita", "Feita"],
              ] as const
            ).map(([valorSituacao, rotulo]) => (
              <button
                key={valorSituacao}
                type="button"
                onClick={() => salvarObra(valorSituacao)}
                aria-pressed={situacao === valorSituacao}
                disabled={processando}
                className={`flex-1 rounded-lg border px-3 py-2 text-[14px] font-semibold disabled:opacity-60 ${
                  situacao === valorSituacao
                    ? "border-tinta bg-tinta text-white"
                    : "border-linha-forte bg-cartao text-cinza"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <CampoTexto
              rotulo="Data da obra"
              valor={dataAgendada}
              onChange={setDataAgendada}
              tipo="date"
              dica={
                situacao === "agendada"
                  ? "Aparece no painel em Obras da semana."
                  : "Toque em Agendada para usar esta data."
              }
            />
            <Seletor
              rotulo="Calheiro"
              valor={calheiroId}
              onChange={trocarCalheiro}
              opcoes={[
                { valor: "", rotulo: "— não definido —" },
                ...calheiros.map((c) => ({ valor: String(c.id), rotulo: c.nome })),
              ]}
              dica="A mão de obra desta obra entra na conta dele."
            />
          </div>
        </Cartao>
      </section>

      {/* ------------------------------------------- Folha de pagamento */}
      <Folha
        titulo="Registrar pagamento"
        aberta={folha === "pagamento"}
        onFechar={() => setFolha("nenhuma")}
      >
        <div className="space-y-4">
          <div>
            <p className="text-[14px] text-cinza">
              Total {formatarReais(orcamento.total)}
              {orcamento.pago > 0 ? ` - já pago ${formatarReais(orcamento.pago)}` : ""}
            </p>
            <p className="tabular text-[20px] font-bold text-marca">
              Falta {formatarReais(orcamento.saldo)}
            </p>
          </div>

          {orcamento.saldo > 0 ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValor(formatarValor(Math.round(orcamento.saldo / 2)))}
                className="flex-1 rounded-lg border border-linha-forte px-3 py-2 text-[14px] font-semibold text-tinta hover:bg-superficie"
              >
                Metade
              </button>
              <button
                type="button"
                onClick={() => setValor(formatarValor(orcamento.saldo))}
                className="flex-1 rounded-lg border border-linha-forte px-3 py-2 text-[14px] font-semibold text-tinta hover:bg-superficie"
              >
                Tudo - {formatarReais(orcamento.saldo)}
              </button>
            </div>
          ) : null}

          <CampoDinheiro rotulo="Valor recebido" valor={valor} onChange={setValor} autoFoco />
          <CampoTexto
            rotulo="Data"
            valor={dataPagamento}
            onChange={setDataPagamento}
            tipo="date"
          />
          <Seletor
            rotulo="Forma"
            valor={forma}
            onChange={setForma}
            opcoes={formasPagamento.map((f) => ({ valor: f.valor, rotulo: f.rotulo }))}
          />

          {erro ? <Aviso>{erro}</Aviso> : null}

          <Botao
            variante="marca"
            onClick={confirmarPagamento}
            desabilitado={processando}
            className="w-full"
          >
            {processando ? "Registrando..." : "Confirmar pagamento"}
          </Botao>
          <p className="text-center text-[13px] text-cinza">
            Entra sozinho no financeiro e libera a mão de obra do calheiro.
          </p>
        </div>
      </Folha>

      {/* --------------------------------------------- Folha de WhatsApp */}
      <Folha
        titulo="Enviar no WhatsApp"
        aberta={folha === "whats"}
        onFechar={() => setFolha("nenhuma")}
      >
        <div className="space-y-4">
          <p className="text-[14px] text-cinza">
            Para {orcamento.clienteNome}
            {orcamento.clienteTelefone ? ` - ${orcamento.clienteTelefone}` : ""}
          </p>

          {!temNumero ? (
            <p className="rounded-lg bg-aviso-fundo px-3 py-2 text-[13px] font-medium text-aviso">
              Este cliente não tem telefone com DDD cadastrado. O WhatsApp vai
              abrir com a mensagem pronta para você escolher o contato.
            </p>
          ) : null}

          <div className="max-h-56 overflow-y-auto rounded-lg bg-superficie p-3">
            <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-tinta">
              {mensagem}
            </pre>
          </div>

          <a
            href={linkWhatsApp(orcamento.clienteTelefone, mensagem)}
            target="_blank"
            rel="noopener"
            onClick={() => {
              // Mandar o orcamento e, na pratica, enviar: marca como enviado.
              void atualizarOrcamento({ id: orcamento.id, status: "enviado" }).then(() =>
                router.refresh(),
              );
            }}
            className="flex min-h-11 w-full items-center justify-center rounded-lg bg-pago px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-pago-escura"
          >
            Abrir WhatsApp
          </a>

          <Link
            href={`/orcamento/${orcamento.id}/imprimir`}
            target="_blank"
            rel="noopener"
            className="flex min-h-11 w-full items-center justify-center rounded-lg border border-linha-forte bg-cartao px-4 py-2.5 text-[15px] font-semibold text-tinta hover:bg-superficie"
          >
            Só baixar o PDF
          </Link>
        </div>
      </Folha>
    </>
  );
}

/** Botao de estorno, usado na lista de pagamentos. */
export function BotaoEstorno({ pagamentoId }: { pagamentoId: number }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [processando, iniciar] = useTransition();

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="nao-imprime text-[13px] font-semibold text-cinza hover:text-marca"
      >
        Estornar
      </button>
    );
  }

  return (
    <span className="nao-imprime inline-flex items-center gap-2">
      <button
        type="button"
        disabled={processando}
        onClick={() =>
          iniciar(async () => {
            await estornarPagamento(pagamentoId);
            setConfirmando(false);
            router.refresh();
          })
        }
        className="text-[13px] font-semibold text-marca"
      >
        {processando ? "..." : "Confirmar"}
      </button>
      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="text-[13px] text-cinza"
      >
        nao
      </button>
    </span>
  );
}
