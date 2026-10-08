import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O PGlite roda o Postgres dentro do processo do servidor (uso local).
  // Em producao o banco e um Postgres de verdade via DATABASE_URL.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
};

export default nextConfig;
