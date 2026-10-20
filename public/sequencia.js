// Painel "Minha sequência": semanas seguidas com leitura e vidas do tomate.
// Os dados vêm de /api/sequencia (calculados no servidor).

const SEQUENCIA_TEXTOS = {
  perdido: {
    icone: "🥀",
    estado: "Tomate perdido",
    classeEstado: "critico",
    mensagem: "Registre uma nova leitura para começar outra sequência.",
  },
  semLeituras: {
    icone: "🍅",
    estado: "Tomate saudável",
    classeEstado: "",
    mensagem: "Registre sua primeira leitura para iniciar a sequência!",
  },
  ativa: {
    icone: "🍅",
    estado: "Tomate saudável",
    classeEstado: "",
    mensagem: "Boa! Você já cuidou do seu tomate nesta semana.",
  },
  ultimaVida: {
    icone: "🍅",
    estado: "Última vida!",
    classeEstado: "critico",
    classeTomate: "tomate-muito-murcho",
    mensagem: "Registre uma leitura para cuidar do tomate!",
  },
  duasVidas: {
    icone: "🍅",
    estado: "Tomate murchando",
    classeEstado: "atencao",
    classeTomate: "tomate-murcho",
    mensagem: "Não deixe outra semana passar sem uma leitura!",
  },
  emDia: {
    icone: "🍅",
    estado: "Tomate saudável",
    classeEstado: "",
    mensagem: "Registre uma leitura nesta semana para manter a sequência.",
  },
};

function escolherTextoSequencia(sequencia) {
  if (sequencia.perdido || sequencia.vidas <= 0) return SEQUENCIA_TEXTOS.perdido;
  if (!sequencia.ultima_semana) return SEQUENCIA_TEXTOS.semLeituras;
  if (sequencia.ativa_nesta_semana) return SEQUENCIA_TEXTOS.ativa;
  if (sequencia.vidas === 1) return SEQUENCIA_TEXTOS.ultimaVida;
  if (sequencia.vidas === 2) return SEQUENCIA_TEXTOS.duasVidas;
  return SEQUENCIA_TEXTOS.emDia;
}

function desenharSequencia(sequencia) {
  const mascote = document.getElementById("tomate-mascote");
  const semanas = document.getElementById("sequencia-semanas");
  const mensagem = document.getElementById("mensagem-sequencia");
  const estado = document.getElementById("estado-tomate");
  const total = sequencia.semanas_consecutivas;

  semanas.textContent = `${total} ${total === 1 ? "semana" : "semanas"}`;

  [1, 2, 3].forEach((numero) => {
    document
      .getElementById("vida-" + numero)
      .classList.toggle("vida-perdida", numero > sequencia.vidas);
  });

  const texto = escolherTextoSequencia(sequencia);

  mascote.className = "tomate-mascote";
  if (sequencia.perdido || sequencia.vidas <= 0) mascote.classList.add("tomate-perdido");
  if (texto.classeTomate) mascote.classList.add(texto.classeTomate);

  mascote.textContent = texto.icone;
  estado.textContent = texto.estado;
  estado.className = "estado-tomate " + texto.classeEstado;
  mensagem.textContent = texto.mensagem;
}

async function atualizarPainelSequencia() {
  if (!document.getElementById("painel-sequencia")) return;

  try {
    const resposta = await fetch("/api/sequencia");
    if (!resposta.ok) throw new Error("Erro " + resposta.status + " em /api/sequencia");
    desenharSequencia(await resposta.json());
  } catch (erro) {
    console.error(erro);
  }
}