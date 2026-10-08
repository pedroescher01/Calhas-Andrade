"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  lancarMovimentoCalheiro,
  cancelarMovimentoCalheiro,
  salvarCalheiro,
} from "@/servidor/acoes";
import { Aviso, Botao, CampoDinheiro, CampoTexto, Folha, Seletor } from "@/componentes/campos";
import { formatarReais, formatarValor } from "@/dominio/dinheiro";
import { hoje } from "@/dominio/datas";

const formas = [
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "pix", rotulo: "Pix" },
  { valor: "transferencia", rotulo: "Transferência" },
  { valor: "cheque", rotulo: "Cheque" },
  { valor: "outro", rotulo: "Outro" },
];

/**
 * Vale e acerto.
 *
 * O botao de acerto ja vem com o saldo preenchido, porque na pratica e isso
 * que acontece: o dono fecha a conta do que esta liberado.
 */
export function BotaoMovimentoCalheiro({
  calheiro,
  tipo,
  variante = "secundario",
}: {
  calheiro: { id: number; nome: string; saldo: number };
  tipo: "vale" | "acerto";
  variante?: "principal" | "marca" | "secundario";
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [forma, setForma] = useState(tipo === "vale" ? "dinheiro" : "pix");
  const [descricao, setDescricao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const titulo = tipo === "vale" ? "Dar vale" : "Acertar";

  function abrir() {
    setValor(
      tipo === "acerto" && calheiro.saldo > 0 ? formatarValor(calheiro.saldo) : "",
    );
    setErro(null);
    setAberta(true);
  }

  return (
    <>
      <Botao variante={variante} onClick={abrir}>
        {titulo}
      </Botao>

      <Folha
        titulo={`${titulo} - ${calheiro.nome}`}
        aberta={aberta}
        onFechar={() => setAberta(false)}
      >
        <div className="space-y-3">
          <p className="text-[14px] text-cinza">
            {calheiro.saldo > 0 ? (
              <>
                A acertar com ele hoje:{" "}
                <strong className="text-tinta">{formatarReais(calheiro.saldo)}</strong>
              </>
            ) : calheiro.saldo < 0 ? (
              <>
                Ele está adiantado em{" "}
                <strong className="text-tinta">{formatarReais(-calheiro.saldo)}</strong>
              </>
            ) : (
              "A conta dele está zerada."
            )}
          </p>

          {tipo === "acerto" && calheiro.saldo > 0 ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setValor(formatarValor(Math.round(calheiro.saldo / 2)))}
                className="flex-1 rounded-lg border border-linha-forte px-3 py-2 text-[14px] font-semibold text-tinta"
              >
                Metade
              </button>
              <button
                type="button"
                onClick={() => setValor(formatarValor(calheiro.saldo))}
                className="flex-1 rounded-lg border border-linha-forte px-3 py-2 text-[14px] font-semibold text-tinta"
              >
                Tudo
              </button>
            </div>
          ) : null}

          <CampoDinheiro rotulo="Valor" valor={valor} onChange={setValor} autoFoco />
          <CampoTexto rotulo="Data" valor={data} onChange={setData} tipo="date" />
          <Seletor
            rotulo="Forma"
            valor={forma}
            onChange={setForma}
            opcoes={formas.map((f) => ({ valor: f.valor, rotulo: f.rotulo }))}
          />
          <CampoTexto
            rotulo="Observação"
            valor={descricao}
            onChange={setDescricao}
            placeholder={tipo === "vale" ? "Vale da semana" : "Acerto da obra"}
          />

          {erro ? <Aviso>{erro}</Aviso> : null}

          <Botao
            variante="principal"
            desabilitado={salvando}
            className="w-full"
            onClick={() =>
              iniciar(async () => {
                const resposta = await lancarMovimentoCalheiro({
                  calheiroId: calheiro.id,
                  tipo,
                  valor,
                  data,
                  forma: forma as "pix",
                  descricao: descricao || undefined,
                });
                if (!resposta.ok) {
                  setErro(resposta.erro);
                  return;
                }
                setAberta(false);
                router.refresh();
              })
            }
          >
            {salvando ? "Registrando..." : `Confirmar ${titulo.toLowerCase()}`}
          </Botao>
          <p className="text-center text-[13px] text-cinza">
            Sai do caixa e abaixa o que você deve a ele.
          </p>
        </div>
      </Folha>
    </>
  );
}

export function BotaoNovoCalheiro() {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipo, setTipo] = useState<"terceiro" | "funcionario">("terceiro");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  return (
    <>
      <Botao variante="principal" onClick={() => setAberta(true)}>
        Novo calheiro
      </Botao>

      <Folha titulo="Novo calheiro" aberta={aberta} onFechar={() => setAberta(false)}>
        <div className="space-y-3">
          <CampoTexto rotulo="Nome" valor={nome} onChange={setNome} autoFoco />
          <CampoTexto rotulo="Telefone" valor={telefone} onChange={setTelefone} tipo="tel" />
          <Seletor
            rotulo="Tipo"
            valor={tipo}
            onChange={(v) => setTipo(v as "terceiro")}
            opcoes={[
              { valor: "terceiro", rotulo: "Terceiro (por obra)" },
              { valor: "funcionario", rotulo: "Funcionario" },
            ]}
          />
          {erro ? <Aviso>{erro}</Aviso> : null}
          <Botao
            variante="principal"
            desabilitado={salvando}
            className="w-full"
            onClick={() =>
              iniciar(async () => {
                const resposta = await salvarCalheiro({
                  nome,
                  telefone: telefone || undefined,
                  tipo,
                });
                if (!resposta.ok) {
                  setErro(resposta.erro);
                  return;
                }
                setAberta(false);
                setNome("");
                setTelefone("");
                router.refresh();
              })
            }
          >
            {salvando ? "Salvando..." : "Salvar"}
          </Botao>
        </div>
      </Folha>
    </>
  );
}

export function BotaoCancelarMovimento({ movimentoId }: { movimentoId: number }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [processando, iniciar] = useTransition();

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="text-[13px] font-semibold text-cinza hover:text-marca"
      >
        Cancelar
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={processando}
        onClick={() =>
          iniciar(async () => {
            await cancelarMovimentoCalheiro(movimentoId);
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
