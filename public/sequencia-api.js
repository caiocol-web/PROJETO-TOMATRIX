// Sequência semanal da horta ("Minha sequência").
//
// Regras:
//  - A semana vai de segunda a domingo (fuso de São Paulo).
//  - Cada semana com pelo menos 1 leitura (em qualquer estufa) soma 1 na sequência.
//  - Cada semana inteira sem leitura gasta 1 vida do tomate (são 3 vidas).
//  - Registrar uma leitura devolve as 3 vidas.
//  - Sem vidas, o tomate está perdido e a próxima leitura começa outra sequência.
//
// Tudo é calculado a partir da tabela "leituras" (coluna criado_em),
// então apagar leituras também atualiza a sequência.

const MAX_VIDAS = 3;
const FUSO = "America/Sao_Paulo";
const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000;

// Quantas semanas existem entre duas segundas-feiras no formato "AAAA-MM-DD"
function diferencaEmSemanas(de, ate) {
  const [anoA, mesA, diaA] = de.split("-").map(Number);
  const [anoB, mesB, diaB] = ate.split("-").map(Number);
  const inicio = Date.UTC(anoA, mesA - 1, diaA);
  const fim = Date.UTC(anoB, mesB - 1, diaB);
  return Math.round((fim - inicio) / MS_POR_SEMANA);
}

// semanasComLeitura: segundas-feiras (em ordem) das semanas que têm leitura
// semanaAtual: segunda-feira da semana de hoje
function calcularSequencia(semanasComLeitura, semanaAtual) {
  let semanasConsecutivas = 0;
  let ultimaSemana = null;

  for (const semana of semanasComLeitura) {
    if (ultimaSemana !== null) {
      const semanasPerdidas = diferencaEmSemanas(ultimaSemana, semana) - 1;
      if (MAX_VIDAS - semanasPerdidas <= 0) {
        semanasConsecutivas = 0; // o tomate tinha morrido: começa outra sequência
      }
    }
    semanasConsecutivas += 1;
    ultimaSemana = semana;
  }

  if (ultimaSemana === null) {
    return {
      semanas_consecutivas: 0,
      vidas: MAX_VIDAS,
      perdido: false,
      ultima_semana: null,
      ativa_nesta_semana: false,
    };
  }

  // A semana de hoje ainda está em andamento, então só conta como perdida depois que acaba
  const semanasPerdidas = Math.max(0, diferencaEmSemanas(ultimaSemana, semanaAtual) - 1);
  const vidas = Math.max(0, MAX_VIDAS - semanasPerdidas);
  const perdido = vidas === 0;

  return {
    semanas_consecutivas: perdido ? 0 : semanasConsecutivas,
    vidas,
    perdido,
    ultima_semana: ultimaSemana,
    ativa_nesta_semana: ultimaSemana === semanaAtual,
  };
}

function registrarSequencia(app, pool) {
  app.get("/api/sequencia", async (req, res) => {
    const semanas = await pool.query(`
      SELECT DISTINCT to_char(date_trunc('week', criado_em AT TIME ZONE '${FUSO}'), 'YYYY-MM-DD') AS semana
      FROM leituras
      ORDER BY semana
    `);
    const hoje = await pool.query(`
      SELECT to_char(date_trunc('week', now() AT TIME ZONE '${FUSO}'), 'YYYY-MM-DD') AS semana
    `);

    res.json(calcularSequencia(semanas.rows.map((linha) => linha.semana), hoje.rows[0].semana));
  });
}

module.exports = registrarSequencia;
module.exports.calcularSequencia = calcularSequencia;