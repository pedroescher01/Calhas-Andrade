import { formatarReais, formatarQuantidade } from "./dinheiro";
import { formatarData } from "./datas";

/**
 * Mensagem e link de WhatsApp.
 *
 * O cliente recebe um resumo legivel no chat e, se quiser, o PDF em
 * seguida. A mensagem mostra o total e, quando ja houve pagamento, o que
 * falta -- separar material de mao de obra e assunto interno da fabrica,
 * nao do cliente.
 */

/**
 * Deixa o telefone no formato que o link do WhatsApp aceita.
 *
 * Aceita "(19) 99999-8888", "19999998888", "+55 19 99999-8888".
 * Devolve null quando nao da para adivinhar um numero valido.
 */
export function normalizarTelefone(
  telefone: string | null | undefined,
  paisPadrao = "55",
): string | null {
  if (!telefone) return null;

  let digitos = telefone.replace(/\D/g, "");
  if (digitos === "") return null;

  // Tira o zero de operadora na frente: 0 19 99999-8888
  if (digitos.length > 11 && digitos.startsWith("0")) digitos = digitos.slice(1);

  // Ja veio com o codigo do pais.
  if (digitos.startsWith(paisPadrao) && (digitos.length === 12 || digitos.length === 13)) {
    return digitos;
  }

  // Celular com DDD (11) ou fixo com DDD (10).
  if (digitos.length === 10 || digitos.length === 11) return paisPadrao + digitos;

  // Numero sem DDD nao da para montar link.
  if (digitos.length <= 9) return null;

  return digitos;
}

export type ItemMensagem = {
  descricao: string;
  unidade: "m" | "un" | "vb";
  quantidadeMilesimos: number;
  totalCentavos: number;
};

export function montarMensagemOrcamento(dados: {
  nomeEmpresa: string;
  numero: number;
  clienteNome: string;
  dataEmissao: string;
  validadeDias?: number;
  enderecoObra?: string | null;
  itens: ItemMensagem[];
  totalCentavos: number;
  descontoCentavos?: number;
  pagoCentavos?: number;
  saldoCentavos?: number;
  pixChave?: string | null;
  observacoes?: string | null;
  linkPdf?: string | null;
}): string {
  const linhas: string[] = [];

  linhas.push(`*${dados.nomeEmpresa}*`);
  linhas.push(`Orçamento nº ${dados.numero} - ${formatarData(dados.dataEmissao)}`);
  linhas.push("");
  linhas.push(`Cliente: ${dados.clienteNome}`);
  if (dados.enderecoObra) linhas.push(`Obra: ${dados.enderecoObra}`);
  linhas.push("");

  for (const item of dados.itens) {
    const quantidade = formatarQuantidade(item.quantidadeMilesimos);
    linhas.push(
      `- ${item.descricao}: ${quantidade} ${item.unidade} - ${formatarReais(item.totalCentavos)}`,
    );
  }

  if (dados.descontoCentavos && dados.descontoCentavos > 0) {
    linhas.push(`- Desconto: -${formatarReais(dados.descontoCentavos)}`);
  }

  linhas.push("");
  linhas.push(`*Total: ${formatarReais(dados.totalCentavos)}*`);

  if (dados.pagoCentavos && dados.pagoCentavos > 0) {
    linhas.push(`Já pago: ${formatarReais(dados.pagoCentavos)}`);
    linhas.push(`*Falta: ${formatarReais(dados.saldoCentavos ?? 0)}*`);
  }

  if (dados.validadeDias && dados.validadeDias > 0) {
    linhas.push("");
    linhas.push(`Válido por ${dados.validadeDias} dias.`);
  }

  if (dados.observacoes) {
    linhas.push("");
    linhas.push(dados.observacoes);
  }

  if (dados.pixChave) {
    linhas.push("");
    linhas.push(`Pix: ${dados.pixChave}`);
  }

  if (dados.linkPdf) {
    linhas.push("");
    linhas.push(dados.linkPdf);
  }

  return linhas.join("\n");
}

/** Link que abre a conversa com a mensagem pronta. */
export function linkWhatsApp(
  telefone: string | null | undefined,
  mensagem: string,
): string {
  const numero = normalizarTelefone(telefone);
  const texto = encodeURIComponent(mensagem);
  // Sem numero, abre o WhatsApp com o texto para ele escolher o contato.
  return numero
    ? `https://wa.me/${numero}?text=${texto}`
    : `https://wa.me/?text=${texto}`;
}
