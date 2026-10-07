const express = require("express");
const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "caio1201",
  database: "tomatrix",
});

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.get("/api/canteiros", async (req, res) => {
  const canteiros = await pool.query("SELECT id, nome FROM canteiros ORDER BY id");
  const leituras = await pool.query("SELECT id, canteiro_id, quando, valores FROM leituras ORDER BY id");

  res.json(canteiros.rows.map((c) => ({
    id: c.id,
    nome: c.nome,
    leituras: leituras.rows
      .filter((l) => l.canteiro_id === c.id)
      .map((l) => ({ id: l.id, quando: l.quando, valores: l.valores })),
  })));
});

app.post("/api/canteiros", async (req, res) => {
  const r = await pool.query("INSERT INTO canteiros (nome) VALUES ($1) RETURNING id, nome", [req.body.nome]);
  res.json({ ...r.rows[0], leituras: [] });
});

app.put("/api/canteiros/:id", async (req, res) => {
  await pool.query("UPDATE canteiros SET nome = $1 WHERE id = $2", [req.body.nome, req.params.id]);
  res.sendStatus(204);
});

app.delete("/api/canteiros/:id", async (req, res) => {
  await pool.query("DELETE FROM canteiros WHERE id = $1", [req.params.id]);
  res.sendStatus(204);
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

app.listen(3000, () => console.log("Rodando em http://localhost:3000"));