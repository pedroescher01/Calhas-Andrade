/**
 * Dinheiro e quantidade, sempre em inteiro.
 *
 * Dinheiro vive em CENTAVOS. Quantidade vive em MILESIMOS.
 * Numero com virgula (float) nao serve para dinheiro: 0.1 + 0.2 da
 * 0.30000000000000004, e no fim do mes o caixa fecha errado por centavos.
 */

/** Arredonda para o inteiro mais proximo, meio para longe do zero. */
export function arredondar(valor: number): number {
  return valor < 0 ? -Math.round(-valor) : Math.round(valor);
}

/**
 * Multiplica um preco por unidade (centavos) por uma quantidade
 * (milesimos) e devolve centavos inteiros.
 *
 * 12,5 m a R$ 48,00/m  ->  multiplicar(4800, 12500) = 60000 (R$ 600,00)
 */
export function multiplicarPorMilesimos(
  precoCentavos: number,
  quantidadeMilesimos: number,
): number {
  return arredondar((precoCentavos * quantidadeMilesimos) / 1000);
}

/**
 * Aplica um percentual em pontos-base. 1200 bp = 12%.
 * Pontos-base evitam guardar 0.12 como float na configuracao.
 */
export function aplicarBp(centavos: number, bp: number): number {
  return arredondar((centavos * bp) / 10_000);
}

/**
 * Parte proporcional de um valor, feita com inteiros.
 * Usada para liberar mao de obra conforme o cliente paga.
 */
export function proporcao(
  valorCentavos: number,
  numerador: number,
  denominador: number,
): number {
  if (denominador <= 0) return 0;
  if (numerador >= denominador) return valorCentavos;
  if (numerador <= 0) return 0;
  return arredondar((valorCentavos * numerador) / denominador);
}

const formatadorReais = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** 123456 -> "R$ 1.234,56" */
export function formatarReais(centavos: number | null | undefined): string {
  return formatadorReais.format((centavos ?? 0) / 100);
}

/** 123456 -> "1.234,56" (sem o "R$", para dentro de campos) */
export function formatarValor(centavos: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((centavos ?? 0) / 100);
}

/**
 * Separa um numero digitado em parte inteira e parte decimal.
 *
 * Em portugues a virgula e o decimal e o ponto e o milhar, mas o dono pode
 * digitar de qualquer jeito, inclusive no teclado do celular, que costuma
 * oferecer ponto. As regras:
 *
 *   - Virgula e ponto juntos: o ultimo e o decimal.  "1.234,56"
 *   - So virgula: e o decimal.                        "1234,56"
 *   - So ponto com exatamente 3 casas depois: milhar. "1.500" = mil e quinhentos
 *   - So ponto com outra quantidade de casas: decimal. "12.50"
 *
 * A regra do ponto de milhar e o que faz "1.000" metros voltar como mil
 * metros, e nao como um metro, depois de formatado na tela.
 */
function separarPartes(texto: string): {
  negativo: boolean;
  inteiros: string;
  decimais: string;
} {
  const limpo = texto.trim().replace(/[^\d,.-]/g, "");
  if (limpo === "" || limpo === "-") {
    return { negativo: false, inteiros: "0", decimais: "" };
  }

  const negativo = limpo.startsWith("-");
  const corpo = limpo.replace(/-/g, "");

  const ultimaVirgula = corpo.lastIndexOf(",");
  const ultimoPonto = corpo.lastIndexOf(".");
  let separadorDecimal = -1;

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    separadorDecimal = Math.max(ultimaVirgula, ultimoPonto);
  } else if (ultimaVirgula >= 0) {
    separadorDecimal = ultimaVirgula;
  } else if (ultimoPonto >= 0) {
    const casas = corpo.length - ultimoPonto - 1;
    separadorDecimal = casas === 3 ? -1 : ultimoPonto;
  }

  if (separadorDecimal < 0) {
    return { negativo, inteiros: corpo.replace(/[,.]/g, ""), decimais: "" };
  }
  return {
    negativo,
    inteiros: corpo.slice(0, separadorDecimal).replace(/[,.]/g, ""),
    decimais: corpo.slice(separadorDecimal + 1).replace(/[,.]/g, ""),
  };
}

/** Monta o inteiro final na escala pedida (2 = centavos, 3 = milesimos). */
function montarEscalado(texto: string, casas: number): number {
  const { negativo, inteiros, decimais } = separarPartes(texto);
  const fracao = (decimais + "0".repeat(casas)).slice(0, casas);
  const total =
    Number(inteiros || "0") * 10 ** casas + Number(fracao || "0");
  return negativo ? -total : total;
}

/**
 * Le o que o dono digitou e devolve centavos.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234,56", "1234".
 */
export function parsearReais(entrada: string | number | null | undefined): number {
  if (typeof entrada === "number") return arredondar(entrada * 100);
  if (entrada == null) return 0;
  return montarEscalado(entrada, 2);
}

/**
 * Le quantidade digitada e devolve milesimos.
 * "12,5" -> 12500. "0,25" -> 250. "3" -> 3000. "1.000" -> 1000000.
 */
export function parsearQuantidade(
  entrada: string | number | null | undefined,
): number {
  if (typeof entrada === "number") return arredondar(entrada * 1000);
  if (entrada == null) return 0;
  return montarEscalado(entrada, 3);
}

/** 12500 -> "12,5" | 3000 -> "3" | 250 -> "0,25" */
export function formatarQuantidade(milesimos: number): string {
  const texto = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(milesimos / 1000);
  return texto;
}
