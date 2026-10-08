"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  salvarLancamento,
  pagarConta,
  cancelarLancamento,
  definirSaldoInicial,
} from "@/servidor/acoes";
import { Aviso, Botao, CampoDinheiro, CampoTexto, Folha, Seletor } from "@/componentes/campos";
import { hoje } from "@/dominio/datas";
import { formatarReais } from "@/dominio/dinheiro";

const formas = [
  { valor: "pix", rotulo: "Pix" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "transferencia", rotulo: "Transferência" },
  { valor: "cartao", rotulo: "Cartão" },
  { valor: "boleto", rotulo: "Boleto" },
  { valor: "cheque", rotulo: "Cheque" },
  { valor: "outro", rotulo: "Outro" },
];

/** Categorias que aparecem na fabrica, para nao digitar sempre. */
const categorias = [
  "Chapa galvanizada",
  "Condutor/tubo",
  "Bocais e acessórios",
  "Silicone/vedação",
  "Rebites/parafusos/buchas",
  "Estanho/solda",
  "Ferramentas",
  "Combustível",
  "Mão de obra",
  "Aluguel",
  "Energia",
  "Telefone/internet",
  "Imposto",
  "Manutenção",
  "Serviços",
  "Retirada do dono",
  "Outros",
];

export function BotaoNovoLancamento({
  fornecedores,
}: {
  fornecedores: { id: number; nome: string }[];
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [tipo, setTipo] = useState<"saida" | "entrada">("saida");
  const [categoria, setCategoria] = useState("Outros");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState(hoje());
  const [fornecedorId, setFornecedorId] = useState("");
  const [jaPago, setJaPago] = useState(false);
  const [forma, setForma] = useState("pix");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const resposta = await salvarLancamento({
        tipo,
        categoria,
        descricao,
        valor,
        vencimento,
        jaPago,
        forma: jaPago ? (forma as "pix") : undefined,
        fornecedorId: fornecedorId ? Number(fornecedorId) : null,
      });
      if (!resposta.ok) {
        setErro(resposta.erro);
        return;
      }
      setAberta(false);
      setDescricao("");
      setValor("");
      setJaPago(false);
      router.refresh();
    });
  }

  return (
    <>
      <Botao variante="principal" onClick={() => setAberta(true)}>
        Lançar conta
      </Botao>

      <Folha titulo="Novo lancamento" aberta={aberta} onFechar={() => setAberta(false)}>
        <div className="space-y-3">
          <div className="flex gap-2" role="group" aria-label="Tipo de lancamento">
            <button
              type="button"
              onClick={() => setTipo("saida")}
              aria-pressed={tipo === "saida"}
              className={`flex-1 rounded-lg border px-3 py-2 text-[14px] font-semibold ${
                tipo === "saida"
                  ? "border-marca bg-marca-fundo text-marca-escura"
                  : "border-linha-forte text-cinza"
              }`}
            >
              Saida
            </button>
            <button
              type="button"
              onClick={() => setTipo("entrada")}
              aria-pressed={tipo === "entrada"}
              className={`flex-1 rounded-lg border px-3 py-2 text-[14px] font-semibold ${
                tipo === "entrada"
                  ? "border-pago bg-pago-fundo text-pago-escura"
                  : "border-linha-forte text-cinza"
              }`}
            >
              Entrada
            </button>
          </div>

          <CampoTexto
            rotulo="Descrição"
            valor={descricao}
            onChange={setDescricao}
            placeholder={tipo === "saida" ? "Ex: bobina galvanizada" : "Ex: venda de sucata"}
            autoFoco
          />
          <CampoDinheiro rotulo="Valor" valor={valor} onChange={setValor} />
          <Seletor
            rotulo="Categoria"
            valor={categoria}
            onChange={setCategoria}
            opcoes={categorias.map((c) => ({ valor: c, rotulo: c }))}
          />
          <CampoTexto
            rotulo={jaPago ? "Data" : "Vencimento"}
            valor={vencimento}
            onChange={setVencimento}
            tipo="date"
          />

          {fornecedores.length > 0 && tipo === "saida" ? (
            <Seletor
              rotulo="Fornecedor"
              valor={fornecedorId}
              onChange={setFornecedorId}
              opcoes={[
                { valor: "", rotulo: "— nenhum —" },
                ...fornecedores.map((f) => ({ valor: String(f.id), rotulo: f.nome })),
              ]}
            />
          ) : null}

          <label className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              checked={jaPago}
              onChange={(e) => setJaPago(e.target.checked)}
              className="size-5 rounded border-linha-forte"
            />
            <span className="text-[15px] text-tinta">Já foi pago</span>
          </label>

          {jaPago ? (
            <Seletor
              rotulo="Forma"
              valor={forma}
              onChange={setForma}
              opcoes={formas.map((f) => ({ valor: f.valor, rotulo: f.rotulo }))}
            />
          ) : null}

          {erro ? <Aviso>{erro}</Aviso> : null}

          <Botao
            variante="principal"
            onClick={salvar}
            desabilitado={salvando}
            className="w-full"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </Botao>
        </div>
      </Folha>
    </>
  );
}

export function BotaoPagarConta({
  conta,
}: {
  conta: { id: number; descricao: string; valorCentavos: number };
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [data, setData] = useState(hoje());
  const [forma, setForma] = useState("pix");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="shrink-0 rounded-lg border border-linha-forte px-3 py-1.5 text-[13px] font-semibold text-tinta hover:bg-superficie"
      >
        Pagar
      </button>

      <Folha titulo="Pagar conta" aberta={aberta} onFechar={() => setAberta(false)}>
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-tinta">{conta.descricao}</p>
            <p className="tabular text-[20px] font-bold text-marca">
              {formatarReais(conta.valorCentavos)}
            </p>
          </div>
          <CampoTexto rotulo="Data do pagamento" valor={data} onChange={setData} tipo="date" />
          <Seletor
            rotulo="Forma"
            valor={forma}
            onChange={setForma}
            opcoes={formas.map((f) => ({ valor: f.valor, rotulo: f.rotulo }))}
          />
          {erro ? <Aviso>{erro}</Aviso> : null}
          <Botao
            variante="principal"
            desabilitado={salvando}
            className="w-full"
            onClick={() =>
              iniciar(async () => {
                const resposta = await pagarConta({
                  id: conta.id,
                  data,
                  forma: forma as "pix",
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
            {salvando ? "Registrando..." : "Confirmar pagamento"}
          </Botao>
          <button
            type="button"
            className="w-full py-2 text-[14px] font-semibold text-cinza"
            onClick={() =>
              iniciar(async () => {
                await cancelarLancamento(conta.id);
                setAberta(false);
                router.refresh();
              })
            }
          >
            Cancelar esta conta
          </button>
        </div>
      </Folha>
    </>
  );
}

export function FormularioSaldoInicial({
  valorAtual,
  dataAtual,
}: {
  valorAtual: string;
  dataAtual: string;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(valorAtual);
  const [data, setData] = useState(dataAtual || hoje());
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [salvando, iniciar] = useTransition();

  return (
    <div className="space-y-3">
      <p className="text-[14px] text-cinza">
        Informe quanto tinha em caixa num dia e o sistema soma tudo que entrou
        e saiu desde então. Sem isso, o sistema mostra o movimento mas não
        arrisca dizer o saldo.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoDinheiro rotulo="Saldo em caixa" valor={valor} onChange={setValor} />
        <CampoTexto rotulo="Nesta data" valor={data} onChange={setData} tipo="date" />
      </div>
      {erro ? <Aviso>{erro}</Aviso> : null}
      {pronto ? (
        <p className="text-[14px] font-semibold text-pago">Saldo gravado.</p>
      ) : null}
      <Botao
        variante="principal"
        desabilitado={salvando}
        onClick={() =>
          iniciar(async () => {
            const resposta = await definirSaldoInicial({ valor, data });
            if (!resposta.ok) {
              setErro(resposta.erro);
              return;
            }
            setErro(null);
            setPronto(true);
            router.refresh();
          })
        }
      >
        {salvando ? "Gravando..." : "Gravar saldo"}
      </Botao>
    </div>
  );
}
