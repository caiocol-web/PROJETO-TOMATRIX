
const SENSORES = [
  {
    id: "solo",
    nome: "Umidade do solo",
    unidade: "%",
    icone: "💧",
    ideal: [60, 80],
    aceitavel: [45, 90],
    escala: [0, 100],
    acaoSeBaixo: "Irrigar agora",
    acaoSeAlto: "Reduzir irrigação",
  },
  {
    id: "temp",
    nome: "Temperatura",
    unidade: "°C",
    icone: "🌡️",
    ideal: [18, 28],
    aceitavel: [12, 34],
    escala: [5, 45],
    acaoSeBaixo: "Proteger do frio",
    acaoSeAlto: "Ventilar ou sombrear",
  },
  {
    id: "ar",
    nome: "Umidade do ar",
    unidade: "%",
    icone: "💨",
    ideal: [50, 70],
    aceitavel: [35, 85],
    escala: [0, 100],
    acaoSeBaixo: "Nebulizar",
    acaoSeAlto: "Ventilar (risco de míldio)",
  },
  {
    id: "ph",
    nome: "pH do solo",
    unidade: "",
    icone: "⚗️",
    ideal: [6, 6.8],
    aceitavel: [5.5, 7.2],
    escala: [4, 9],
    acaoSeBaixo: "Aplicar calcário",
    acaoSeAlto: "Corrigir com enxofre",
  },
  {
    id: "luz",
    nome: "Luminosidade",
    unidade: "klux",
    icone: "☀️",
    ideal: [30, 60],
    aceitavel: [15, 80],
    escala: [0, 100],
    acaoSeBaixo: "Checar sombreamento",
    acaoSeAlto: "Usar tela de sombra",
  },
  {
    id: "nut",
    nome: "Nutrientes NPK",
    unidade: "%",
    icone: "🌱",
    ideal: [60, 90],
    aceitavel: [40, 100],
    escala: [0, 100],
    acaoSeBaixo: "Adubar com NPK",
    acaoSeAlto: "Lavar o solo",
  },
  {
    id: "chuva",
    nome: "Chuva",
    unidade: "mm/h",
    icone: "🌧️",
    ideal: [0, 2],
    aceitavel: [0, 8],
    escala: [0, 30],
    acaoSeBaixo: "",
    acaoSeAlto: "Suspender irrigação",
  },
];

const ROTULOS_STATUS = { ok: "Ideal", atencao: "Atenção", critico: "Crítico" };
const PONTOS_STATUS = { ok: 100, atencao: 50, critico: 0 };

let dados = { canteiros: [], selecionado: 0 };
let sensorComparado = null;

async function chamarApi(url, metodo = "GET", corpo) {
  const opcoes = { method: metodo, headers: {} };

  if (corpo !== undefined) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(corpo);
  }

  const resposta = await fetch(url, opcoes);
  if (!resposta.ok) {
    throw new Error("Erro " + resposta.status + " em " + metodo + " " + url);
  }
  if (resposta.status === 204) return null;
  return resposta.json();
}
async function carregarDados() {
  let canteiros = await chamarApi("/api/canteiros");

  if (canteiros.length === 0) {
    await chamarApi("/api/canteiros", "POST", { nome: "Estufa 1" });
    canteiros = await chamarApi("/api/canteiros");
  }

  dados.canteiros = canteiros;
  if (dados.selecionado >= canteiros.length) {
    dados.selecionado = 0;
  }
}

async function executar(acao) {
  try {
    await acao();
  } catch (erro) {
    console.error(erro);
    alert("Algo deu errado: " + erro.message);
  }
}

function porId(id) {
  return document.getElementById(id);
}

function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function canteiroAtual() {
  return dados.canteiros[dados.selecionado];
}

function calcularStatus(sensor, valor) {
  const [idealMin, idealMax] = sensor.ideal;
  const [aceitavelMin, aceitavelMax] = sensor.aceitavel;

  if (valor >= idealMin && valor <= idealMax) return "ok";
  if (valor >= aceitavelMin && valor <= aceitavelMax) return "atencao";
  return "critico";
}

function obterValoresAtuais(canteiro) {
  const valoresAtuais = {};
  for (const leitura of canteiro.leituras) {
    for (const sensor of SENSORES) {
      if (leitura.valores[sensor.id] !== undefined) {
        valoresAtuais[sensor.id] = leitura.valores[sensor.id];
      }
    }
  }
  return valoresAtuais;
}

function obterSerieDoSensor(canteiro, sensorId) {
  return canteiro.leituras
    .filter((leitura) => leitura.valores[sensorId] !== undefined)
    .map((leitura) => leitura.valores[sensorId]);
}

function calcularNota(canteiro) {
  const valoresAtuais = obterValoresAtuais(canteiro);
  const sensoresComLeitura = SENSORES.filter((sensor) => valoresAtuais[sensor.id] !== undefined);

  if (sensoresComLeitura.length === 0) return null;

  let soma = 0;
  for (const sensor of sensoresComLeitura) {
    soma += PONTOS_STATUS[calcularStatus(sensor, valoresAtuais[sensor.id])];
  }
  return Math.round(soma / sensoresComLeitura.length);
}

function statusDaNota(nota) {
  if (nota >= 75) return "ok";
  if (nota >= 45) return "atencao";
  return "critico";
}

function tituloDaNota(nota) {
  const titulos = {
    ok: "Condições boas",
    atencao: "Precisa de atenção",
    critico: "Intervenção necessária",
  };
  return titulos[statusDaNota(nota)];
}

function criarMedidor(sensor, valor, status) {
  const [escalaMin, escalaMax] = sensor.escala;

  function emPorcentagem(numero) {
    const porcentagem = ((numero - escalaMin) / (escalaMax - escalaMin)) * 100;
    return Math.max(0, Math.min(100, porcentagem));
  }

  const inicioIdeal = emPorcentagem(sensor.ideal[0]);
  const fimIdeal = emPorcentagem(sensor.ideal[1]);

  return `
    <div class="medidor">
      <i class="medidor-ideal" style="left:${inicioIdeal}%; width:${fimIdeal - inicioIdeal}%"></i>
      <b class="medidor-marcador" style="left:${emPorcentagem(valor)}%; background:var(--cor-${status})"></b>
    </div>
    <div class="medidor-legenda">
      <span>${escalaMin}</span>
      <span>ideal ${sensor.ideal[0]}–${sensor.ideal[1]}</span>
      <span>${escalaMax}</span>
    </div>`;
}

function criarGraficoLinha(valores, status) {
  if (valores.length < 2) return "";

  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const amplitude = maximo - minimo || 1;

  const pontos = valores
    .map((valor, indice) => {
      const x = (indice * 100) / (valores.length - 1);
      const y = 26 - ((valor - minimo) / amplitude) * 24;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return `
    <svg class="grafico-linha" viewBox="0 0 100 28" preserveAspectRatio="none">
      <polyline fill="none" stroke="var(--cor-${status})" stroke-width="2"
                vector-effect="non-scaling-stroke" points="${pontos}" />
    </svg>`;
}

function criarCardSensor(canteiro, sensor, titulo) {
  const serie = obterSerieDoSensor(canteiro, sensor.id);
  const nomeExibido = escaparHtml(titulo || sensor.nome);

  if (serie.length === 0) {
    return `
      <div class="sensor-card">
        <div class="sensor-topo"><span class="sensor-icone">${sensor.icone}</span></div>
        <div class="sensor-nome">${nomeExibido}</div>
        <div class="vazio">sem leitura</div>
      </div>`;
  }

  const valor = serie[serie.length - 1];
  const status = calcularStatus(sensor, valor);
  const atributosClique = titulo
    ? ""
    : `data-sensor="${sensor.id}" title="Ver em todos os canteiros"`;
  const classeClicavel = titulo ? "" : "clicavel";

  return `
    <div class="sensor-card status-${status} ${classeClicavel}" ${atributosClique}>
      <div class="sensor-topo">
        <span class="sensor-icone">${sensor.icone}</span>
        <span class="selo ${status}">${ROTULOS_STATUS[status]}</span>
      </div>
      <div class="sensor-nome">${nomeExibido}</div>
      <div class="sensor-valor">${valor}<small> ${sensor.unidade}</small></div>
      ${criarMedidor(sensor, valor, status)}
      ${criarGraficoLinha(serie.slice(-12), status)}
    </div>`;
}

function renderizarAbas() {
  let html = "";

  dados.canteiros.forEach((canteiro, indice) => {
    const nota = calcularNota(canteiro);
    const corBolinha = nota === null ? "" : statusDaNota(nota);
    const selecionado = indice === dados.selecionado;

    html += `
      <button class="aba ${selecionado ? "ativa" : ""}" data-indice="${indice}">
        <span class="bolinha ${corBolinha}"></span>${escaparHtml(canteiro.nome)}
      </button>`;

    if (selecionado) {
      html += `<button class="aba aba-remover" id="btn-remover-aba">✕ Remover</button>`;
    }
  });

  html += `<button class="aba aba-novo" id="btn-novo">+ Canteiro</button>`;
  porId("abas").innerHTML = html;

  document.querySelectorAll(".aba[data-indice]").forEach((botao) => {
    botao.addEventListener("click", () => {
      dados.selecionado = Number(botao.dataset.indice);
      renderizarTudo();
    });
  });
  porId("btn-remover-aba").addEventListener("click", () => executar(removerCanteiro));
  porId("btn-novo").addEventListener("click", () => executar(adicionarCanteiro));
}

function renderizarCampos() {
  porId("nome-canteiro").textContent = canteiroAtual().nome;

  porId("campos").innerHTML = SENSORES.map((sensor) => {
    const unidade = sensor.unidade ? ` (${sensor.unidade})` : "";
    return `
      <label>
        ${sensor.nome}${unidade}
        <input type="number" step="0.1" data-sensor="${sensor.id}"
               placeholder="ideal ${sensor.ideal[0]} a ${sensor.ideal[1]}">
        <div class="dica" id="dica-${sensor.id}"></div>
      </label>`;
  }).join("");

  document.querySelectorAll("#campos input").forEach((campo) => {
    campo.addEventListener("input", () => {
      const sensor = SENSORES.find((s) => s.id === campo.dataset.sensor);
      const dica = porId("dica-" + sensor.id);

      if (campo.value === "") {
        dica.textContent = "";
        dica.className = "dica";
        return;
      }

      const status = calcularStatus(sensor, parseFloat(campo.value));
      dica.textContent = ROTULOS_STATUS[status];
      dica.className = "dica " + status;
    });
  });
}

function renderizarSituacao() {
  const canteiro = canteiroAtual();
  const nota = calcularNota(canteiro);

  if (nota === null) {
    porId("situacao").innerHTML =
      `<div class="vazio">Nenhuma leitura ainda. Preencha os campos acima e salve.</div>`;
    return;
  }

  const valoresAtuais = obterValoresAtuais(canteiro);

  let acoesHtml = "";
  for (const sensor of SENSORES) {
    const valor = valoresAtuais[sensor.id];
    if (valor === undefined) continue;

    const status = calcularStatus(sensor, valor);
    if (status === "ok") continue;

    const textoAcao = valor < sensor.ideal[0] ? sensor.acaoSeBaixo : sensor.acaoSeAlto;
    if (textoAcao) {
      acoesHtml += `
        <div class="acao ${status}">
          ${sensor.icone} <span><b>${sensor.nome}</b>: ${textoAcao}</span>
        </div>`;
    }
  }

  const blocoAcoes = acoesHtml
    ? `<div class="acoes">${acoesHtml}</div>`
    : `<div class="vazio vazio-topo">✅ Tudo dentro do ideal.</div>`;

  porId("situacao").innerHTML = `
    <div class="resumo">
      <div class="anel ${statusDaNota(nota)}" style="--porcentagem:${nota}">
        <span>${nota}%</span>
      </div>
      <div>
        <div class="resumo-titulo">${tituloDaNota(nota)}</div>
        <div class="subtitulo">Saúde de ${escaparHtml(canteiro.nome)} · toque num sensor para comparar</div>
      </div>
    </div>
    <div class="grade-sensores">
      ${SENSORES.map((sensor) => criarCardSensor(canteiro, sensor)).join("")}
    </div>
    ${blocoAcoes}`;

  // Clicar em um card leva à comparação daquele sensor
  document.querySelectorAll(".sensor-card[data-sensor]").forEach((card) => {
    card.addEventListener("click", () => {
      sensorComparado = card.dataset.sensor;
      renderizarComparacao();
      porId("card-comparacao").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderizarComparacao() {
  porId("filtros").innerHTML = SENSORES.map((sensor) => {
    const ativo = sensor.id === sensorComparado ? "ativo" : "";
    return `<button class="filtro ${ativo}" data-sensor="${sensor.id}">${sensor.icone} ${sensor.nome}</button>`;
  }).join("");

  document.querySelectorAll(".filtro").forEach((botao) => {
    botao.addEventListener("click", () => {
      sensorComparado = botao.dataset.sensor;
      renderizarComparacao();
    });
  });

  const sensor = SENSORES.find((s) => s.id === sensorComparado);
  if (!sensor) {
    porId("comparacao").innerHTML =
      `<div class="vazio">Escolha um sensor para comparar todos os canteiros.</div>`;
    return;
  }

  porId("comparacao").innerHTML = `
    <div class="grade-sensores">
      ${dados.canteiros.map((canteiro) => criarCardSensor(canteiro, sensor, canteiro.nome)).join("")}
    </div>`;
}

function renderizarHistorico() {
  const leituras = canteiroAtual().leituras;

  if (leituras.length === 0) {
    porId("historico").innerHTML = `<div class="vazio">Sem leituras salvas.</div>`;
    return;
  }

  const cabecalho = SENSORES.map((sensor) => `<th>${sensor.nome}</th>`).join("");

  let linhas = "";
  for (let indice = leituras.length - 1; indice >= 0; indice--) {
    const leitura = leituras[indice];

    const celulas = SENSORES.map((sensor) => {
      const valor = leitura.valores[sensor.id];
      if (valor === undefined) return "<td>-</td>";
      return `<td class="${calcularStatus(sensor, valor)}">${valor}</td>`;
    }).join("");

    linhas += `
  <tr>
    <td>
      ${new Date(leitura.criadoEm).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
      })}
      ${leitura.quando ? `<br><small>${escaparHtml(leitura.quando)}</small>` : ""}
    </td>
    ${celulas}
    <td><button class="btn-secundario" data-id="${leitura.id}">x</button></td>
  </tr>`;
  }

  porId("historico").innerHTML = `
    <table class="tabela-historico">
      <tr><th>Quando</th>${cabecalho}<th></th></tr>
      ${linhas}
    </table>`;

  document.querySelectorAll("#historico button[data-id]").forEach((botao) => {
    botao.addEventListener("click", () => executar(() => apagarLeitura(botao.dataset.id)));
  });
}

function renderizarTudo() {
  renderizarAbas();
  renderizarCampos();
  renderizarSituacao();
  renderizarComparacao();
  renderizarHistorico();
  porId("mensagem").textContent = "";
}

function mostrarMensagem(texto, status) {
  const mensagem = porId("mensagem");
  mensagem.textContent = texto;
  mensagem.className = "dica " + status;
}

async function salvarLeitura() {
  const valores = {};
  document.querySelectorAll("#campos input").forEach((campo) => {
    const numero = parseFloat(campo.value);
    if (Number.isFinite(numero)) {
      valores[campo.dataset.sensor] = numero;
    }
  });

  if (Object.keys(valores).length === 0) {
    mostrarMensagem("Preencha pelo menos um campo.", "critico");
    return;
  }

  const observacao = porId("observacao").value.trim();

await chamarApi(`/api/canteiros/${canteiroAtual().id}/leituras`, "POST", {
  quando: observacao,
  valores,
});

const dataAtual = new Date().toLocaleString("pt-BR", {
  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
});
  await chamarApi(`/api/canteiros/${canteiroAtual().id}/leituras`, "POST", {
    quando: observacao || dataAtual,
    valores,
  });
  await carregarDados();

  porId("observacao").value = "";
  renderizarAbas();
  renderizarCampos();
  renderizarSituacao();
  renderizarComparacao();
  renderizarHistorico();
  mostrarMensagem("Leitura salva.", "ok");
}

async function adicionarCanteiro() {
  const nome = prompt("Nome do novo canteiro:");
  if (!nome || !nome.trim()) return;

  const novo = await chamarApi("/api/canteiros", "POST", { nome: nome.trim() });
  await carregarDados();

  dados.selecionado = dados.canteiros.findIndex((canteiro) => canteiro.id === novo.id);
  renderizarTudo();
}

async function renomearCanteiro() {
  const nome = prompt("Novo nome:", canteiroAtual().nome);
  if (!nome || !nome.trim()) return;

  await chamarApi(`/api/canteiros/${canteiroAtual().id}`, "PUT", { nome: nome.trim() });
  await carregarDados();
  renderizarTudo();
}

async function removerCanteiro() {
  if (dados.canteiros.length < 2) {
    alert("Mantenha pelo menos um canteiro.");
    return;
  }
  if (!confirm("Remover " + canteiroAtual().nome + " e todas as leituras dele?")) return;

  await chamarApi(`/api/canteiros/${canteiroAtual().id}`, "DELETE");
  dados.selecionado = 0;
  await carregarDados();
  renderizarTudo();
}

async function apagarLeitura(idLeitura) {
  await chamarApi(`/api/leituras/${idLeitura}`, "DELETE");
  await carregarDados();
  renderizarTudo();
}

async function limparHistorico() {
  if (!confirm("Apagar todas as leituras de " + canteiroAtual().nome + "?")) return;

  await chamarApi(`/api/canteiros/${canteiroAtual().id}/leituras`, "DELETE");
  await carregarDados();
  renderizarTudo();
}

porId("btn-salvar").addEventListener("click", () => executar(salvarLeitura));
porId("btn-renomear").addEventListener("click", () => executar(renomearCanteiro));
porId("btn-remover").addEventListener("click", () => executar(removerCanteiro));
porId("btn-limpar").addEventListener("click", () => executar(limparHistorico));

async function iniciar() {
  try {
    await carregarDados();
    renderizarTudo();
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(
      "Não foi possível conectar ao servidor. Rode 'node server.js' e abra http://localhost:3000.",
      "critico"
    );
  }
}

iniciar();