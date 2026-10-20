const express = require("express");
const path = require("path");
const { Pool } = require("pg");

// Configuração EXCLUSIVAMENTE local. Não lê DATABASE_URL nem conecta ao Render.
const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: process.env.TOMATRIX_DB_USER || "postgres",
  password: process.env.TOMATRIX_DB_PASSWORD || "caio1201",
  database: "tomatrix",
});

const ESTUFAS = [
  { cultura: "tomate", nome: "Estufa de Tomate" },
  { cultura: "alface", nome: "Estufa de Alface" },
  { cultura: "agriao", nome: "Estufa de Agrião" },
];

async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS canteiros (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leituras (
      id SERIAL PRIMARY KEY,
      canteiro_id INTEGER NOT NULL REFERENCES canteiros(id) ON DELETE CASCADE,
      quando TEXT NOT NULL,
      valores JSONB NOT NULL
    );
    ALTER TABLE leituras ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE canteiros ADD COLUMN IF NOT EXISTS cultura TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS canteiros_cultura_unico ON canteiros (cultura);
  `);

  for (const estufa of ESTUFAS) {
    await pool.query(
      `INSERT INTO canteiros (nome, cultura)
       VALUES ($1, $2)
       ON CONFLICT (cultura) DO UPDATE SET nome = EXCLUDED.nome`,
      [estufa.nome, estufa.cultura]
    );
  }
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/canteiros", async (req, res, next) => {
  try {
    const canteiros = await pool.query(
      "SELECT id, nome, cultura FROM canteiros WHERE cultura IS NOT NULL ORDER BY id"
    );
    const leituras = await pool.query(
      "SELECT id, canteiro_id, quando, valores, criado_em FROM leituras ORDER BY criado_em, id"
    );
    res.json(canteiros.rows.map((c) => ({
      id: c.id,
      nome: c.nome,
      cultura: c.cultura,
      leituras: leituras.rows
        .filter((l) => l.canteiro_id === c.id)
        .map((l) => ({ id: l.id, quando: l.quando, valores: l.valores, criadoEm: l.criado_em })),
    })));
  } catch (erro) { next(erro); }
});

app.post("/api/canteiros/:id/leituras", async (req, res, next) => {
  try {
    const { quando, valores } = req.body;
    if (!quando || !valores || typeof valores !== "object" || Array.isArray(valores)) {
      return res.status(400).json({ erro: "Informe quando e valores válidos." });
    }
    const resultado = await pool.query(
      "INSERT INTO leituras (canteiro_id, quando, valores) VALUES ($1, $2, $3) RETURNING id",
      [req.params.id, quando, valores]
    );
    res.status(201).json({ id: resultado.rows[0].id, quando, valores });
  } catch (erro) { next(erro); }
});

app.delete("/api/leituras/:id", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM leituras WHERE id = $1", [req.params.id]);
    res.sendStatus(204);
  } catch (erro) { next(erro); }
});

app.delete("/api/canteiros/:id/leituras", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM leituras WHERE canteiro_id = $1", [req.params.id]);
    res.sendStatus(204);
  } catch (erro) { next(erro); }
});

app.use((erro, req, res, next) => {
  console.error("Erro na API:", erro.message);
  if (res.headersSent) return next(erro);
  res.status(500).json({ erro: "Erro interno. Confira o terminal do TOMATRIX." });
});

const PORT = 3000;

async function iniciar() {
  try {
    await pool.query("SELECT 1");
    await criarTabelas();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`TOMATRIX local rodando em http://localhost:${PORT}`);
      console.log("Banco utilizado: PostgreSQL local (localhost:5432/tomatrix)");
    });
  } catch (erro) {
    console.error("Não foi possível iniciar o TOMATRIX.");
    console.error("Confirme se o PostgreSQL está iniciado, se o banco 'tomatrix' existe e se a senha está correta.");
    console.error("Detalhe:", erro.message);
    process.exit(1);
  }
}

iniciar();
