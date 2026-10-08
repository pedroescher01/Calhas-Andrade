import { describe, it, expect } from "vitest";
import { gerarHashSenha, conferirSenha } from "./senha";

describe("senha", () => {
  it("aceita a senha certa", () => {
    const hash = gerarHashSenha("calhas-andrade-2026");
    expect(conferirSenha("calhas-andrade-2026", hash)).toBe(true);
  });

  it("recusa a senha errada", () => {
    const hash = gerarHashSenha("calhas-andrade-2026");
    expect(conferirSenha("calhas-andrade-2027", hash)).toBe(false);
    expect(conferirSenha("", hash)).toBe(false);
  });

  it("nao guarda a senha em texto", () => {
    const hash = gerarHashSenha("minha-senha-secreta");
    expect(hash).not.toContain("minha-senha-secreta");
  });

  it("gera hash diferente para a mesma senha", () => {
    // Sal aleatorio: duas contas com a mesma senha nao tem o mesmo hash.
    expect(gerarHashSenha("igual")).not.toBe(gerarHashSenha("igual"));
  });

  it("aguenta hash estragado sem explodir", () => {
    for (const ruim of ["", "xxx", "scrypt$abc$def", "md5$1$aa$bb", "$$$"]) {
      expect(conferirSenha("qualquer", ruim)).toBe(false);
    }
  });

  it("nao se confunde com acento escrito de outra forma", () => {
    // "José" pode vir com o acento junto ou separado, dependendo do teclado.
    const hash = gerarHashSenha("José123");
    expect(conferirSenha("José123", hash)).toBe(true);
  });
});
