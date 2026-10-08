import { multiplicarPorMilesimos, proporcao } from "./dinheiro";

/**
 * Contas do orcamento.
 *
 * Todo orcamento tem duas naturezas de valor somadas no mesmo documento:
 * MATERIAL (chapa, condutor, bocal) e MAO DE OBRA (o servico do calheiro).
 * O cliente ve um total so, mas a fabrica precisa dos dois separados:
 * o material e custo/margem da fabrica, a mao de obra e divida com o
 * calheiro assim que o cliente paga.
 */

export type StatusFinanceiro = "aberto" | "parcial" | "pago";

export type ItemCalculavel = {
  quantidadeMilesimos: number;
  precoMaterialCentavos: number;
  precoMaoObraCentavos: number;
};

export type PagamentoCalculavel = {
  valorCentavos: number;
  estornadoEm?: Date | string | null;
};

export type TotaisItem = {
  material: number;
  maoObra: number;
  total: number;
};

export type TotaisOrcamento = {
  /** Soma do material de todos os itens. */
  totalMaterial: number;
  /** Soma da mao de obra de todos os itens. */
  totalMaoObra: number;
  /** Material + mao de obra, antes de nota e desconto. */
  subtotal: number;
  acrescimoNota: number;
  desconto: number;
  /** O que o cliente deve pagar. */
  total: number;
  /** Soma dos pagamentos que nao foram estornados. */
  pago: number;
  /** Quanto falta receber. Nunca negativo. */
  saldo: number;
  /** Pagou a mais do que o total (troco a devolver ou credito). */
  sobra: number;
  statusFinanceiro: StatusFinanceiro;
  /**
   * Mao de obra ja LIBERADA para acerto com o calheiro.
   *
   * Regra do dono: "assim que o cliente paga, eu ja acerto a mao de obra
   * com o calheiro". Entao a mao de obra vai sendo liberada na mesma
   * proporcao do que o cliente pagou. Cliente pagou metade, metade da mao
   * de obra entra como a acertar. Quitou, libera tudo.
   *
   * O desconto sai da margem da fabrica, nao da mao de obra: se o cliente
   * pagou o total cobrado, o calheiro recebe a mao de obra inteira.
   */
  maoObraLiberada: number;
};

export function calcularItem(item: ItemCalculavel): TotaisItem {
  const material = multiplicarPorMilesimos(
    item.precoMaterialCentavos,
    item.quantidadeMilesimos,
  );
  const maoObra = multiplicarPorMilesimos(
    item.precoMaoObraCentavos,
    item.quantidadeMilesimos,
  );
  return { material, maoObra, total: material + maoObra };
}

export function calcularTotais(entrada: {
  itens: readonly ItemCalculavel[];
  pagamentos?: readonly PagamentoCalculavel[];
  descontoCentavos?: number;
  acrescimoNotaCentavos?: number;
}): TotaisOrcamento {
  let totalMaterial = 0;
  let totalMaoObra = 0;

  for (const item of entrada.itens) {
    const calculado = calcularItem(item);
    totalMaterial += calculado.material;
    totalMaoObra += calculado.maoObra;
  }

  const subtotal = totalMaterial + totalMaoObra;
  const acrescimoNota = entrada.acrescimoNotaCentavos ?? 0;
  const desconto = entrada.descontoCentavos ?? 0;
  const total = Math.max(0, subtotal + acrescimoNota - desconto);

  const pago = (entrada.pagamentos ?? [])
    .filter((p) => !p.estornadoEm)
    .reduce((soma, p) => soma + p.valorCentavos, 0);

  const saldo = Math.max(0, total - pago);
  const sobra = Math.max(0, pago - total);

  const statusFinanceiro: StatusFinanceiro =
    pago <= 0 ? "aberto" : pago >= total ? "pago" : "parcial";

  // Obra de cortesia (desconto zerou o total): nao existe pagamento para
  // esperar, mas o calheiro trabalhou. A mao de obra entra inteira.
  const maoObraLiberada =
    total <= 0 ? totalMaoObra : proporcao(totalMaoObra, pago, total);

  return {
    totalMaterial,
    totalMaoObra,
    subtotal,
    acrescimoNota,
    desconto,
    total,
    pago,
    saldo,
    sobra,
    statusFinanceiro,
    maoObraLiberada,
  };
}

export const rotuloStatusFinanceiro: Record<StatusFinanceiro, string> = {
  aberto: "A receber",
  parcial: "Parcial",
  pago: "Pago",
};

export const rotuloSituacaoObra = {
  a_fazer: "A fazer",
  agendada: "Agendada",
  feita: "Feita",
} as const;

export const rotuloStatusOrcamento = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  cancelado: "Cancelado",
} as const;
