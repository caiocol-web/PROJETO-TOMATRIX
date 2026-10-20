const express = require("express");
const { Pool } = require("pg");
const cors = require('cors');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: "localhost",
      port: 5432,
      user: "postgres",
      password: "admin",
      database: "tomatrix",
    });

// Estufas fixas do 'sistema'.
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
      CREATE TABLE IF NOT EXISTS sequencia_tomate (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      semanas_consecutivas INTEGER NOT NULL DEFAULT 0,
      vidas INTEGER NOT NULL DEFAULT 3,
      ultima_semana DATE,
      perdido BOOLEAN NOT NULL DEFAULT FALSE
    );

    INSERT INTO sequencia_tomate (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;
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
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
const path = require("path");

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

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
    const semanaAtual = inicioDaSemana();
  const resultadoTomate = await pool.query(
    "SELECT * FROM sequencia_tomate WHERE id = 1"
  );

  const tomate = resultadoTomate.rows[0];

  if (tomate.perdido) {
    // Uma nova atividade inicia uma nova sequência.
    await pool.query(
      `UPDATE sequencia_tomate
       SET semanas_consecutivas = 1,
           vidas = 3,
           ultima_semana = $1,
           perdido = FALSE
       WHERE id = 1`,
      [semanaAtual]
    );
  } else if (!tomate.ultima_semana) {
    await pool.query(
      `UPDATE sequencia_tomate
       SET semanas_consecutivas = 1,
           ultima_semana = $1
       WHERE id = 1`,
      [semanaAtual]
    );
  } else {
    const semanaAnterior = String(tomate.ultima_semana).slice(0, 10);
    const diferenca = diferencaSemanas(semanaAnterior, semanaAtual);

    if (diferenca >= 1) {
      await pool.query(
        `UPDATE sequencia_tomate
         SET semanas_consecutivas = CASE
               WHEN $1 = 1 THEN semanas_consecutivas + 1
               ELSE 1
             END,
             ultima_semana = $2
         WHERE id = 1`,
        [diferenca, semanaAtual]
      );
    }
  }
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

const PORT = process.env.PORT || 3000;
// =====================================
// SEQUÊNCIA SEMANAL DO TOMATRIX
// =====================================

function inicioDaSemana(data = new Date()) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));

  return inicio.toISOString().slice(0, 10);
}

function diferencaSemanas(dataAntiga, dataAtual) {
  const antiga = new Date(`${dataAntiga}T00:00:00Z`);
  const atual = new Date(`${dataAtual}T00:00:00Z`);

  return Math.round((atual - antiga) / (7 * 24 * 60 * 60 * 1000));
}

async function atualizarSequencia() {
  const semanaAtual = inicioDaSemana();

  const resultado = await pool.query(
    "SELECT * FROM sequencia_tomate WHERE id = 1"
  );

  const tomate = resultado.rows[0];

  if (!tomate.ultima_semana || tomate.perdido) {
    return tomate;
  }

  const diferenca = diferencaSemanas(
    String(tomate.ultima_semana).slice(0, 10),
    semanaAtual
  );

  // Só semanas completas sem atividade consomem vidas.
  const vidasPerdidas = Math.max(0, diferenca - 1);

  if (vidasPerdidas > 0) {
    const novasVidas = Math.max(0, tomate.vidas - vidasPerdidas);
    const perdeuTomate = novasVidas === 0;

    const atualizado = await pool.query(
      `UPDATE sequencia_tomate
       SET vidas = $1,
           semanas_consecutivas = CASE
             WHEN $2 THEN 0
             ELSE semanas_consecutivas
           END,
           perdido = $2
       WHERE id = 1
       RETURNING *`,
      [novasVidas, perdeuTomate]
    );

    return atualizado.rows[0];
  }

  return tomate;
}

// Consultar o estado atual do tomate.
app.get("/api/sequencia", async (req, res) => {
  try {
    const tomate = await atualizarSequencia();
    res.json(tomate);
  } catch (erro) {
    console.error("Erro ao consultar sequência:", erro);
    res.status(500).json({ erro: "Não foi possível consultar a sequência." });
  }
});
app.listen(PORT, () => console.log("Rodando na porta " + PORT));