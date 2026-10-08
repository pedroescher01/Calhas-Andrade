import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Sessao num cookie assinado.
 *
 * O cookie leva o id do usuario e a validade, mais uma assinatura HMAC.
 * Quem mexer no conteudo invalida a assinatura. Nao precisa de tabela de
 * sessao nem de biblioteca de fora: e um sistema de um dono so.
 */

const NOME_COOKIE = "calhas_sessao";
const DIAS_VALIDADE = 30;

const SEGREDO_DE_DESENVOLVIMENTO = "segredo-de-desenvolvimento-nao-use-em-producao";

/**
 * Em producao o segredo da sessao tem que vir do ambiente. Sem ele, qualquer
 * um que saiba como o cookie e montado entraria no sistema.
 *
 * Esta funcao so RESPONDE se esta configurado -- quem pergunta decide o que
 * fazer. Lancar erro aqui dentro fazia a tela de login nao reagir ao clique,
 * com a explicacao escondida no log do servidor: o jeito mais certo de
 * alguem desistir do sistema achando que esta quebrado.
 */
export function sessaoConfigurada(): boolean {
  const doAmbiente = process.env.SESSION_SECRET;
  if (doAmbiente && doAmbiente.length >= 16) return true;
  return process.env.NODE_ENV !== "production";
}

export const AVISO_SESSION_SECRET =
  "O servidor está sem a variável SESSION_SECRET (mínimo 16 caracteres). " +
  "Sem ela o sistema não consegue manter você conectado com segurança.";

function segredo(): string {
  const doAmbiente = process.env.SESSION_SECRET;
  if (doAmbiente && doAmbiente.length >= 16) return doAmbiente;
  // Fora de producao, segue com um segredo fixo para nao travar quem
  // acabou de clonar o projeto.
  return SEGREDO_DE_DESENVOLVIMENTO;
}

function assinar(dados: string): string {
  return createHmac("sha256", segredo()).update(dados).digest("base64url");
}

export function gerarSegredo(): string {
  return randomBytes(32).toString("hex");
}

type Conteudo = { uid: number; exp: number };

function montarToken(conteudo: Conteudo): string {
  const corpo = Buffer.from(JSON.stringify(conteudo)).toString("base64url");
  return `${corpo}.${assinar(corpo)}`;
}

export function lerToken(token: string | undefined): Conteudo | null {
  if (!token) return null;

  const separador = token.lastIndexOf(".");
  if (separador <= 0) return null;

  const corpo = token.slice(0, separador);
  const assinaturaRecebida = token.slice(separador + 1);
  const assinaturaEsperada = assinar(corpo);

  const a = Buffer.from(assinaturaRecebida);
  const b = Buffer.from(assinaturaEsperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const conteudo = JSON.parse(
      Buffer.from(corpo, "base64url").toString("utf8"),
    ) as Conteudo;
    if (typeof conteudo.uid !== "number" || typeof conteudo.exp !== "number") {
      return null;
    }
    if (conteudo.exp < Date.now()) return null;
    return conteudo;
  } catch {
    return null;
  }
}

export async function abrirSessao(usuarioId: number): Promise<void> {
  const exp = Date.now() + DIAS_VALIDADE * 24 * 60 * 60 * 1000;
  const loja = await cookies();
  loja.set(NOME_COOKIE, montarToken({ uid: usuarioId, exp }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS_VALIDADE * 24 * 60 * 60,
  });
}

export async function lerSessao(): Promise<Conteudo | null> {
  if (!sessaoConfigurada()) return null;
  const loja = await cookies();
  return lerToken(loja.get(NOME_COOKIE)?.value);
}

export async function encerrarSessao(): Promise<void> {
  const loja = await cookies();
  loja.delete(NOME_COOKIE);
}

export { NOME_COOKIE };
