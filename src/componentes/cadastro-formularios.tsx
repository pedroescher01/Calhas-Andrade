"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  salvarCliente,
  salvarFornecedor,
  salvarTipoCalha,
  salvarConfiguracoes,
  trocarSenha,
  sair,
  adicionarItemLista,
  marcarItemComprado,
  removerItemLista,
} from "@/servidor/acoes";
import { Aviso, Botao, CampoDinheiro, CampoTexto, Folha, Seletor } from "@/componentes/campos";
import { formatarValor } from "@/dominio/dinheiro";

const categoriasFornecedor = [
  "Chapa galvanizada",
  "Condutor/tubo",
  "Bocais e acessórios",
  "Silicone/vedação",
  "Rebites/parafusos/buchas",
  "Estanho/solda",
  "Ferramentas",
  "Combustível",
  "Serviços",
  "Outros",
];

export function BotaoNovoCliente() {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [documento, setDocumento] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  return (
    <>
      <Botao variante="principal" onClick={() => setAberta(true)}>
        Novo cliente
      </Botao>

      <Folha titulo="Novo cliente" aberta={aberta} onFechar={() => setAberta(false)}>
        <div className="space-y-3">
          <CampoTexto rotulo="Nome" valor={nome} onChange={setNome} autoFoco />
          <CampoTexto
            rotulo="Telefone (WhatsApp)"
            valor={telefone}
            onChange={setTelefone}
            tipo="tel"
            placeholder="(00) 90000-0000"
            dica="Com DDD, para o envio no WhatsApp funcionar."
          />
          <CampoTexto rotulo="Endereço" valor={endereco} onChange={setEndereco} />
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto rotulo="Bairro" valor={bairro} onChange={setBairro} />
            <CampoTexto rotulo="Cidade" valor={cidade} onChange={setCidade} />
          </div>
          <CampoTexto rotulo="CPF / CNPJ" valor={documento} onChange={setDocumento} />
          {erro ? <Aviso>{erro}</Aviso> : null}
          <Botao
            variante="principal"
            desabilitado={salvando}
            className="w-full"
            onClick={() =>
              iniciar(async () => {
                const resposta = await salvarCliente({
                  nome,
                  telefone: telefone || undefined,
                  endereco: endereco || undefined,
                  bairro: bairro || undefined,
                  cidade: cidade || undefined,
                  documento: documento || undefined,
                });
                if (!resposta.ok) {
                  setErro(resposta.erro);
                  return;
                }
                setAberta(false);
                setNome("");
                setTelefone("");
                setEndereco("");
                setBairro("");
                setCidade("");
                setDocumento("");
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

export function BotaoNovoFornecedor() {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [categoria, setCategoria] = useState("Outros");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  return (
    <>
      <Botao variante="secundario" onClick={() => setAberta(true)}>
        Novo fornecedor
      </Botao>

      <Folha titulo="Novo fornecedor" aberta={aberta} onFechar={() => setAberta(false)}>
        <div className="space-y-3">
          <CampoTexto rotulo="Nome" valor={nome} onChange={setNome} autoFoco />
          <CampoTexto rotulo="Telefone" valor={telefone} onChange={setTelefone} tipo="tel" />
          <Seletor
            rotulo="Categoria"
            valor={categoria}
            onChange={setCategoria}
            opcoes={categoriasFornecedor.map((c) => ({ valor: c, rotulo: c }))}
          />
          {erro ? <Aviso>{erro}</Aviso> : null}
          <Botao
            variante="principal"
            desabilitado={salvando}
            className="w-full"
            onClick={() =>
              iniciar(async () => {
                const resposta = await salvarFornecedor({
                  nome,
                  telefone: telefone || undefined,
                  categoria: categoria as "Outros",
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

/**
 * Tabela de preços editavel.
 *
 * Cada linha guarda sozinha, sem botao de salvar geral: assim o dono pode
 * corrigir um preco no meio do dia sem medo de mexer nos outros.
 */
export function LinhaPreco({
  tipo,
}: {
  tipo: {
    id: number;
    nome: string;
    unidade: "m" | "un" | "vb";
    precoMaterialCentavos: number;
    precoMaoObraCentavos: number;
  };
}) {
  const router = useRouter();
  const [material, setMaterial] = useState(formatarValor(tipo.precoMaterialCentavos));
  const [maoObra, setMaoObra] = useState(formatarValor(tipo.precoMaoObraCentavos));
  const [estado, setEstado] = useState<"parado" | "salvo" | "erro">("parado");
  const [salvando, iniciar] = useTransition();

  function salvar() {
    iniciar(async () => {
      const resposta = await salvarTipoCalha({
        id: tipo.id,
        nome: tipo.nome,
        unidade: tipo.unidade,
        precoMaterial: material,
        precoMaoObra: maoObra,
      });
      setEstado(resposta.ok ? "salvo" : "erro");
      if (resposta.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 px-4 py-3">
      <div className="min-w-40 flex-1">
        <p className="font-semibold text-tinta">{tipo.nome}</p>
        <p className="text-[13px] text-cinza">
          por {tipo.unidade === "m" ? "metro" : tipo.unidade === "un" ? "peca" : "verba"}
        </p>
      </div>
      <CampoDinheiro
        rotulo="Material"
        valor={material}
        onChange={(v) => {
          setMaterial(v);
          setEstado("parado");
        }}
        className="w-32"
      />
      <CampoDinheiro
        rotulo="Mão de obra"
        valor={maoObra}
        onChange={(v) => {
          setMaoObra(v);
          setEstado("parado");
        }}
        className="w-32"
      />
      <div className="flex items-center gap-2">
        <Botao variante="secundario" onClick={salvar} desabilitado={salvando}>
          {salvando ? "..." : "Salvar"}
        </Botao>
        {estado === "salvo" ? (
          <span className="text-[13px] font-semibold text-pago">pronto</span>
        ) : null}
        {estado === "erro" ? (
          <span className="text-[13px] font-semibold text-marca">erro</span>
        ) : null}
      </div>
    </div>
  );
}

export function BotaoNovoTipo() {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState<"m" | "un" | "vb">("m");
  const [material, setMaterial] = useState("");
  const [maoObra, setMaoObra] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  return (
    <>
      <Botao variante="principal" onClick={() => setAberta(true)}>
        Novo tipo
      </Botao>

      <Folha titulo="Novo tipo de calha" aberta={aberta} onFechar={() => setAberta(false)}>
        <div className="space-y-3">
          <CampoTexto
            rotulo="Nome"
            valor={nome}
            onChange={setNome}
            placeholder="Ex: calha americana"
            autoFoco
          />
          <Seletor
            rotulo="Cobrado por"
            valor={unidade}
            onChange={(v) => setUnidade(v as "m")}
            opcoes={[
              { valor: "m", rotulo: "Metro linear" },
              { valor: "un", rotulo: "Peca" },
              { valor: "vb", rotulo: "Verba (valor fechado)" },
            ]}
          />
          <CampoDinheiro rotulo="Material" valor={material} onChange={setMaterial} />
          <CampoDinheiro
            rotulo="Mão de obra"
            valor={maoObra}
            onChange={setMaoObra}
            dica="É esta parte que vai para a conta do calheiro."
          />
          {erro ? <Aviso>{erro}</Aviso> : null}
          <Botao
            variante="principal"
            desabilitado={salvando}
            className="w-full"
            onClick={() =>
              iniciar(async () => {
                const resposta = await salvarTipoCalha({
                  nome,
                  unidade,
                  precoMaterial: material || "0",
                  precoMaoObra: maoObra || "0",
                });
                if (!resposta.ok) {
                  setErro(resposta.erro);
                  return;
                }
                setAberta(false);
                setNome("");
                setMaterial("");
                setMaoObra("");
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

export function FormularioConfiguracoes({
  iniciais,
}: {
  iniciais: {
    nomeEmpresa: string;
    telefone: string;
    documento: string;
    endereco: string;
    pixChave: string;
    pixFavorecido: string;
    percentualNota: string;
    validadePadraoDias: number;
  };
}) {
  const router = useRouter();
  const [valores, setValores] = useState(iniciais);
  const [estado, setEstado] = useState<"parado" | "salvo">("parado");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function mudar(campo: keyof typeof valores, valor: string) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
    setEstado("parado");
  }

  return (
    <div className="space-y-3">
      <CampoTexto
        rotulo="Nome da empresa"
        valor={valores.nomeEmpresa}
        onChange={(v) => mudar("nomeEmpresa", v)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoTexto
          rotulo="Telefone"
          valor={valores.telefone}
          onChange={(v) => mudar("telefone", v)}
          tipo="tel"
        />
        <CampoTexto
          rotulo="CNPJ / CPF"
          valor={valores.documento}
          onChange={(v) => mudar("documento", v)}
        />
      </div>
      <CampoTexto
        rotulo="Endereço"
        valor={valores.endereco}
        onChange={(v) => mudar("endereco", v)}
        dica="Sai no cabeçalho do orçamento impresso."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoTexto
          rotulo="Chave Pix"
          valor={valores.pixChave}
          onChange={(v) => mudar("pixChave", v)}
          dica="Vai na mensagem do WhatsApp e no impresso."
        />
        <CampoTexto
          rotulo="Favorecido do Pix"
          valor={valores.pixFavorecido}
          onChange={(v) => mudar("pixFavorecido", v)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoTexto
          rotulo="Acrescimo de nota fiscal (%)"
          valor={valores.percentualNota}
          onChange={(v) => mudar("percentualNota", v)}
          dica="Usado quando o cliente pede nota. O sistema não emite nota."
        />
        <CampoTexto
          rotulo="Validade do orçamento (dias)"
          valor={String(valores.validadePadraoDias)}
          onChange={(v) => mudar("validadePadraoDias", v)}
        />
      </div>

      {erro ? <Aviso>{erro}</Aviso> : null}
      {estado === "salvo" ? (
        <p className="text-[14px] font-semibold text-pago">Configurações salvas.</p>
      ) : null}

      <Botao
        variante="principal"
        desabilitado={salvando}
        onClick={() =>
          iniciar(async () => {
            const resposta = await salvarConfiguracoes({
              nomeEmpresa: valores.nomeEmpresa,
              telefone: valores.telefone || undefined,
              documento: valores.documento || undefined,
              endereco: valores.endereco || undefined,
              pixChave: valores.pixChave || undefined,
              pixFavorecido: valores.pixFavorecido || undefined,
              percentualNota: valores.percentualNota,
              validadePadraoDias: Number(valores.validadePadraoDias) || 15,
            });
            if (!resposta.ok) {
              setErro(resposta.erro);
              return;
            }
            setErro(null);
            setEstado("salvo");
            router.refresh();
          })
        }
      >
        {salvando ? "Salvando..." : "Salvar configurações"}
      </Botao>
    </div>
  );
}

export function FormularioTrocarSenha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  return (
    <div className="space-y-3">
      <CampoTexto rotulo="Senha atual" valor={atual} onChange={setAtual} />
      <CampoTexto rotulo="Nova senha" valor={nova} onChange={setNova} />
      {erro ? <Aviso>{erro}</Aviso> : null}
      {mensagem ? (
        <p className="text-[14px] font-semibold text-pago">{mensagem}</p>
      ) : null}
      <Botao
        variante="secundario"
        desabilitado={salvando}
        onClick={() =>
          iniciar(async () => {
            const resposta = await trocarSenha(atual, nova);
            if (!resposta.ok) {
              setErro(resposta.erro);
              setMensagem(null);
              return;
            }
            setErro(null);
            setMensagem("Senha trocada.");
            setAtual("");
            setNova("");
          })
        }
      >
        {salvando ? "Trocando..." : "Trocar senha"}
      </Botao>
    </div>
  );
}

export function BotaoSair() {
  const [saindo, iniciar] = useTransition();
  return (
    <Botao
      variante="perigo"
      desabilitado={saindo}
      onClick={() => iniciar(async () => void (await sair()))}
    >
      {saindo ? "Saindo..." : "Sair do sistema"}
    </Botao>
  );
}

/** Lista de compras: anotar no celular o que falta na fabrica. */
export function ListaDeCompras({
  itens,
}: {
  itens: { id: number; descricao: string; quantidade: string | null; fornecedorNome: string | null }[];
}) {
  const router = useRouter();
  const [novo, setNovo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [salvando, iniciar] = useTransition();

  function adicionar() {
    if (novo.trim() === "") return;
    iniciar(async () => {
      await adicionarItemLista({ descricao: novo, quantidade: quantidade || undefined });
      setNovo("");
      setQuantidade("");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex gap-2 border-b border-linha p-3">
        <input
          type="text"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") adicionar();
          }}
          placeholder="O que está faltando?"
          className="min-w-0 flex-1 rounded-lg border border-linha-forte px-3 py-2.5 text-tinta placeholder:text-cinza-claro"
        />
        <input
          type="text"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          placeholder="qtd"
          className="w-20 rounded-lg border border-linha-forte px-3 py-2.5 text-tinta placeholder:text-cinza-claro"
        />
        <Botao variante="principal" onClick={adicionar} desabilitado={salvando}>
          +
        </Botao>
      </div>

      {itens.length === 0 ? (
        <p className="px-4 py-6 text-center text-[15px] text-cinza">
          Nada anotado. Conforme for faltando material na fábrica, anote aqui.
        </p>
      ) : (
        <ul className="divide-y divide-linha">
          {itens.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                aria-label={`Marcar ${item.descricao} como comprado`}
                onClick={() =>
                  iniciar(async () => {
                    await marcarItemComprado(item.id);
                    router.refresh();
                  })
                }
                className="flex size-6 shrink-0 items-center justify-center rounded border-2 border-linha-forte hover:border-pago"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-tinta">{item.descricao}</p>
                {item.quantidade || item.fornecedorNome ? (
                  <p className="text-[13px] text-cinza">
                    {item.quantidade ?? ""}
                    {item.quantidade && item.fornecedorNome ? " - " : ""}
                    {item.fornecedorNome ?? ""}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() =>
                  iniciar(async () => {
                    await removerItemLista(item.id);
                    router.refresh();
                  })
                }
                className="text-[13px] text-cinza hover:text-marca"
              >
                tirar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
