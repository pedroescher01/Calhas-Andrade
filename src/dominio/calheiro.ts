/**
 * Conta corrente do calheiro.
 *
 * O calheiro nao tem salario fixo: ele tem mao de obra a receber das obras
 * que fez, e vai pegando vale durante a semana. O saldo e a diferenca.
 *
 *   saldo a acertar = mao de obra liberada pelas obras dele
 *                   - (vales + acertos + ajustes ja pagos)
 *
 * "Liberada" e a parte que o cliente ja pagou (ver dominio/orcamento.ts).
 * Nao existe tabela de "divida": ela e sempre recalculada dos orcamentos,
 * entao nao da para o numero ficar desatualizado.
 */

export type ObraDoCalheiro = {
  orcamentoId: number;
  /** Mao de obra total da obra. */
  totalMaoObra: number;
  /** Parte ja liberada porque o cliente pagou. */
  maoObraLiberada: number;
};

export type MovimentoCalculavel = {
  tipo: "vale" | "acerto" | "ajuste";
  valorCentavos: number;
  canceladoEm?: Date | string | null;
};

export type SaldoCalheiro = {
  /** Mao de obra das obras dele que o cliente ja pagou. */
  liberado: number;
  /** Mao de obra das obras dele que o cliente ainda nao pagou. */
  aLiberar: number;
  vales: number;
  acertos: number;
  ajustes: number;
  /** Total que ja saiu do caixa para ele. */
  pago: number;
  /** Positivo: a fabrica deve a ele. Negativo: ele esta adiantado. */
  saldo: number;
};

export function calcularSaldoCalheiro(entrada: {
  obras: readonly ObraDoCalheiro[];
  movimentos: readonly MovimentoCalculavel[];
}): SaldoCalheiro {
  let liberado = 0;
  let maoObraTotal = 0;
  for (const obra of entrada.obras) {
    liberado += obra.maoObraLiberada;
    maoObraTotal += obra.totalMaoObra;
  }

  let vales = 0;
  let acertos = 0;
  let ajustes = 0;
  for (const mov of entrada.movimentos) {
    if (mov.canceladoEm) continue;
    if (mov.tipo === "vale") vales += mov.valorCentavos;
    else if (mov.tipo === "acerto") acertos += mov.valorCentavos;
    else ajustes += mov.valorCentavos;
  }

  const pago = vales + acertos + ajustes;

  return {
    liberado,
    aLiberar: maoObraTotal - liberado,
    vales,
    acertos,
    ajustes,
    pago,
    saldo: liberado - pago,
  };
}
