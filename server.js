const express = require("express");
const { Pool } = require("pg");
const registrarSequencia = require("./public/sequencia-api.js");

// Conexão com o PostgreSQL instalado neste computador
const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "caio1201",
  database: "tomatrix",
});

// Estufas fixas do sistema.
// "cultura" liga a estufa às faixas ideais do script.js (não mude esse código).
// "nome" é o texto que aparece no painel e pode ser alterado à vontade.
const ESTUFAS = [
  { cultura: "tomate", nome: "Estufa de Tomate" },
  { cultura: "alface", nome: "Estufa de Alface" },
  { cultura: "agriao", nome: "Estufa de Agrião" },
];

async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS canteiros (
      id   SERIAL PRIMARY KEY,
      nome TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS leituras (
      id          SERIAL PRIMARY KEY,
      canteiro_id INTEGER NOT NULL REFERENCES canteiros(id) ON DELETE CASCADE,
      quando      TEXT NOT NULL,
      valores     JSONB NOT NULL
    );
    ALTER TABLE leituras ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE canteiros ADD COLUMN IF NOT EXISTS cultura TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS canteiros_cultura_unico ON canteiros (cultura);
  `);

  // Garante que as três estufas existam (e atualiza o nome se você mudar acima)
  for (const estufa of ESTUFAS) {
    await pool.query(
      "INSERT INTO canteiros (nome, cultura) VALUES ($1, $2) ON CONFLICT (cultura) DO UPDATE SET nome = EXCLUDED.nome",
      [estufa.nome, estufa.cultura]
    );
  }
}
criarTabelas().catch((erro) => console.error("Erro ao criar tabelas:", erro));

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Lista só as estufas fixas, com as leituras de cada uma
app.get("/api/canteiros", async (req, res) => {
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
      .map((l) => ({
        id: l.id,
        quando: l.quando,
        valores: l.valores,
        criadoEm: l.criado_em,
      })),
  })));
});

app.post("/api/canteiros/:id/leituras", async (req, res) => {
  const { quando, valores } = req.body;
  const r = await pool.query(
    "INSERT INTO leituras (canteiro_id, quando, valores) VALUES ($1, $2, $3) RETURNING id",
    [req.params.id, quando, valores]
  );
  res.json({ id: r.rows[0].id, quando, valores });
});

app.delete("/api/leituras/:id", async (req, res) => {
  await pool.query("DELETE FROM leituras WHERE id = $1", [req.params.id]);
  res.sendStatus(204);
});

app.delete("/api/canteiros/:id/leituras", async (req, res) => {
  await pool.query("DELETE FROM leituras WHERE canteiro_id = $1", [req.params.id]);
  res.sendStatus(204);
});

// Sequência semanal da horta
registrarSequencia(app, pool);

app.listen(3000, () => console.log("Rodando em http://localhost:3000"));