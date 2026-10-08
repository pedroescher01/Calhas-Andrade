/**
 * Datas de negocio sao texto "AAAA-MM-DD", no fuso de Sao Paulo.
 *
 * Usar `new Date()` direto no servidor e furada: o servidor roda em UTC,
 * e as 21h de Sao Paulo ja e o dia seguinte em UTC. Um pagamento feito
 * de noite apareceria no dia errado.
 */

export const FUSO = "America/Sao_Paulo";

/** Data de hoje em Sao Paulo, como "AAAA-MM-DD". */
export function hoje(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
  return partes; // en-CA ja devolve AAAA-MM-DD
}

/** "2026-10-08" -> "08/10/2026" */
export function formatarData(data: string | null | undefined): string {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

/** "2026-10-08" -> "08/10" (listas no celular, onde falta espaco) */
export function formatarDataCurta(data: string | null | undefined): string {
  if (!data) return "";
  const [, mes, dia] = data.split("-");
  if (!mes || !dia) return data;
  return `${dia}/${mes}`;
}

/** Soma dias a uma data "AAAA-MM-DD" e devolve no mesmo formato. */
export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  // Meio-dia UTC: longe o bastante das bordas para o fuso nao virar o dia.
  const d = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1, 12));
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Primeiro dia do mes de uma data. */
export function primeiroDiaDoMes(data: string): string {
  return `${data.slice(0, 7)}-01`;
}

/** Ultimo dia do mes de uma data. */
export function ultimoDiaDoMes(data: string): string {
  const [ano, mes] = data.split("-").map(Number);
  const d = new Date(Date.UTC(ano ?? 1970, mes ?? 1, 0, 12));
  return d.toISOString().slice(0, 10);
}

/** Uma conta esta vencida se o vencimento ja passou e nao foi paga. */
export function estaVencido(vencimento: string, referencia: string = hoje()): boolean {
  return vencimento < referencia;
}

/** Quantos dias faltam (negativo = atrasado). */
export function diasAte(data: string, referencia: string = hoje()): number {
  const ms =
    Date.parse(`${data}T12:00:00Z`) - Date.parse(`${referencia}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Texto amigavel: "hoje", "amanha", "atrasado 3 dias". */
export function descreverPrazo(data: string, referencia: string = hoje()): string {
  const dias = diasAte(data, referencia);
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanha";
  if (dias === -1) return "atrasado 1 dia";
  if (dias < 0) return `atrasado ${-dias} dias`;
  return `em ${dias} dias`;
}
