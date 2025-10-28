// --- 1. PEGANDO OS ELEMNTOS DO HTML ---

//primeiramente determina-se o que será cada variável que serão manipuladas.
const fileInput = document.getElementById('file');      // Input é onde o usuário carrega a imagem
const canvas = document.getElementById('canvas');       // Canvas onde desenharemos a imagem
const ctx = canvas.getContext('2d');                            // Contexto 2D do canvas (permite desenhar e manipular cada pixel)
const filterSelect = document.getElementById('filterSelect');       // Menu para seleção de filtros
const paramsDiv = document.getElementById('params');            // Div é onde aparecerão os controles
const applyBtn = document.getElementById('applyBtn');           // Botão para aplicar o filtro
const resetBtn = document.getElementById('resetBtn');           // Botão para voltar aà imagem original
const downloadBtn = document.getElementById('downloadBtn');     // Botão para baixar a imagem final


// Variáveis globais onde vamos guardar os dados da imagem

let imagemOriginal = null; // Guarda o objeto da imagem carregada
let guardaPixImagemOriginal = null; // Guarda os pixels originais da imagem (para poder resetar depois) 

// --- 2. FUNÇÃO QUE CARREGA A IMAGEM NO CANVAS ---

// Essa função irá desenhar a imagem dentro do <canvas> e salva seus pixels originais

function carregaImgParaCanvas(img) {
  // ajusta canvas para o tamanho da imagem
  canvas.width = img.width;
  canvas.height = img.height;

  // Limpa o que tinha antes e desenha a nova imagem
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0);

  // Guarda os pixels origniais (cada pixel = [R,G,B,A])
  guardaPixImagemOriginal = ctx.getImageData(0,0,canvas.width,canvas.height);
}

// ---3. O QUE ACONTECE QUANDO O USUÁRIO ESCOLHE UM ARQUIVO DE IMAGEM ---

// Quando ele seleciona uma imagem, o código cria um objeto imagem e desenha no canvas
fileInput.addEventListener('change', (ev)=>{
  const f = ev.target.files && ev.target.files[0];  //ele pega o arquivo que foi feito o upload
  if(!f) return;  // checa se houve o upload, se não o programa para

  //cria uma URL temporária para carregar a imagem
  const url = URL.createObjectURL(f);
  const img = new Image();

  //quando a imagem termina de carregar
  img.onload = ()=>{
    imagemOriginal = img;       // Guarda o objeto imagem
    carregaImgParaCanvas(img);  // Denha no canvas
    URL.revokeObjectURL(url);   // Libera a memória da URL temporária
  };

  img.src = url; //define o caminho para poder acessar a imagem
});

// --- 4. MUDAR OS CONTROLES QUANDO ESCOLHER UM DOS FILTROS ---

//cada filtro precisa d eparâmetros diferrentes (ex: brilho precisa de k)
filterSelect.addEventListener('change', ()=>{
  const v = filterSelect.value;
  paramsDiv.innerHTML = ''; //limpa o que tinha antes

  // -- CONTROLES DO "FILTRO DO BRILHO" --
  if(v === 'brightness') {
    paramsDiv.innerHTML = `
      <label>Multiplicador k (brilho) — default 1.2</label>
      <input id="kBrightness" type="range" min="0" max="3" step="0.01" value="1.2" />
      <div class="small">k: <span id="kValB">1.2</span></div>
    `;
    const k = document.getElementById('kBrightness');
    const kv = document.getElementById('kValB');
    k.addEventListener('input', ()=>kv.innerText = k.value);

    // -- CONTROLES DO "FILTRO DE ESCURECIMENTO" --
  } else if(v === 'darken') {
    paramsDiv.innerHTML = `
      <label>Multiplicador k (escurecer) — default 0.7</label>
      <input id="kDark" type="range" min="0" max="1" step="0.01" value="0.7" />
      <div class="small">k: <span id="kValD">0.7</span></div>
    `;
    const k = document.getElementById('kDark');
    const kv = document.getElementById('kValD');
    k.addEventListener('input', ()=>kv.innerText = k.value);

    // -- CONTROLES DO "FILTRO PRETO BRANCO (COMBINAÇÃO LINEAR RGB)" --
  } else if(v === 'grayscale') {
    // pesos lineares — podem alterar para mostrar a ideia de combinação linear
    paramsDiv.innerHTML = `
      <label>Pesos R,G,B (soma não precisa ser 1, será normalizado visualmente)</label>
      <div class="small">R: <input id="wR" type="range" min="0" max="2" step="0.01" value="0.299" /></div>
      <div class="small">G: <input id="wG" type="range" min="0" max="2" step="0.01" value="0.587" /></div>
      <div class="small">B: <input id="wB" type="range" min="0" max="2" step="0.01" value="0.114" /></div>
      <div class="small">Pesos: <span id="wVals">0.299, 0.587, 0.114</span></div>
    `;
    const wR = document.getElementById('wR');
    const wG = document.getElementById('wG');
    const wB = document.getElementById('wB');
    const wVals = document.getElementById('wVals');
    function upd(){ wVals.innerText = `${wR.value}, ${wG.value}, ${wB.value}` }
    wR.addEventListener('input',upd);
    wG.addEventListener('input',upd);
    wB.addEventListener('input',upd);

    // -- CONTROLES DO "FILTRO DE ROTAÇÃO" --
  } else if(v === 'rotate') {
    paramsDiv.innerHTML = `
      <label>Ângulo (graus)</label>
      <input id="angle" type="range" min="-180" max="180" step="1" value="30" />
      <div class="small">ângulo: <span id="angleVal">30</span>°</div>
    `;
    const a = document.getElementById('angle');
    const av = document.getElementById('angleVal');
    a.addEventListener('input', ()=>av.innerText = a.value);
  }
});

// --- 5. FUNÇÕES DE FILTRO (TRANFORMAÇÕES LINEARES) ---

// --- Brilho: Multiplicar cada pixel por k (transformação linear v'= kv)
function applyBrightness(k){        // k é o valor da multiplicação para aumentar o brilho
  if(!guardaPixImagemOriginal) return;
  const out = new ImageData(new Uint8ClampedArray(guardaPixImagemOriginal.data), guardaPixImagemOriginal.width, guardaPixImagemOriginal.height);
  const d = out.data;

  for(let i=0;i<d.length;i+=4){     // length = 3, o 4 é a transparência, logo o i deve pular para o próximo 'conjunto de rgb'
    d[i] = clamp(d[i]*k);           // d[0]=R
    d[i+1] = clamp(d[i+1]*k);       // d[1]=G
    d[i+2] = clamp(d[i+2]*k);       // d[2]=B
  }


  ctx.putImageData(out,0,0);
}

// --- ESCURECIMENTO: multiplicar cada pixel por k, porem esse k só pode ser menor do que 1, se quiser apresentar a imagem original ainda aí é só colocar o próprio 1,pq não irá alterar.
function applyDarken(k){
  if(!guardaPixImagemOriginal) return;
  const out = new ImageData(new Uint8ClampedArray(guardaPixImagemOriginal.data), guardaPixImagemOriginal.width, guardaPixImagemOriginal.height);
  const d = out.data;
  for(let i=0;i<d.length;i+=4){     //Mesmo raciocínio da função do brilho
    d[i] = clamp(d[i]*k);
    d[i+1] = clamp(d[i+1]*k);
    d[i+2] = clamp(d[i+2]*k);
  }
  ctx.putImageData(out,0,0);
}

// --- PRETO E BRANCO: para criar uma foto em preto e branco, cada um dos "vetores" da cor tem que ser iguais, apenas alterando a sua intensidade, ex: um vermelho (200,50,50) já um tom de cinza é (128,128,128)
function applyGrayscale(wR,wG,wB){
  if(!guardaPixImagemOriginal) return;
  // combinação linear: I = wR*R + wG*G + wB*B
  const out = new ImageData(new Uint8ClampedArray(guardaPixImagemOriginal.data), guardaPixImagemOriginal.width, guardaPixImagemOriginal.height);
  const d = out.data;
  for(let i=0;i<d.length;i+=4){
    const R = d[i], G = d[i+1], B = d[i+2];  // existe uma variavel definindo cada letra, "RGB"
    const I = wR*R + wG*G + wB*B; // combinação linear com os pesos diferentes, para alterar a intensidade do pixel
    const v = clamp(I);
    d[i]=d[i+1]=d[i+2]=v; // deixa todos os canais iguais
  }
  ctx.putImageData(out,0,0);
}

// --- ROTAÇÃO DA IMAGEM
function applyRotation(deg){
  if(!imagemOriginal) return;
  // para rotacionar sem cortar, criamos canvas temporário com tamanho que cabe a imagem rotacionada

  const rad = deg * Math.PI/180;    //convertendo graus para radianos
  const w = imagemOriginal.width, h = imagemOriginal.height;
  
  // novo tamanho do bloco do canvas para não cortar a imagem já aplicando a matriz de rotação 2x2
  const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
  const newW = Math.ceil(w * cos + h * sin);    //R(0)|cos0 -sin0|
  const newH = Math.ceil(w * sin + h * cos);    //    |sin0  cos0|

  const off = document.createElement('canvas');
  off.width = newW; off.height = newH;
  const oc = off.getContext('2d');

  // muda o centro de referencia para o meio da imagem
  oc.translate(newW/2, newH/2);
  oc.rotate(rad);
  oc.drawImage(imagemOriginal, -w/2, -h/2);

  // redimensiona canvas visível para encaixar e desenha imagem rotacionada
  canvas.width = newW; canvas.height = newH;
  ctx.clearRect(0,0,newW,newH);
  ctx.drawImage(off,0,0);
}

// função auxiliar para manter o limite de cada cor entre 0 e 255, que são os valores permitidos para o RGB
//Quando multiplicamos um pixel por k, às vezes dá valores fora do intervalo válido (ex: 270, -5).
//O clamp() serve para “travar” o valor dentro dos limites permitidos.

function clamp(v){ 
    return Math.max(0, Math.min(255, Math.round(v)));
}

// --- 6. BOTÕES (APLICAR, RESETAR, BAIXAR) ---

// Quando clicar em "Aplicar", ele checa todas as possibilidades, se a pessoa não colocou a foto, se ela só selecionou o filtro, e em seguida manda aplicar cada filtro dependendo da escolha da pessoa
applyBtn.addEventListener('click', ()=>{
  const v = filterSelect.value;

  if(!guardaPixImagemOriginal && v !== 'rotate'){
    alert('Carregue uma imagem primeiro.');
    return;
  }
  if(v === 'none'){ alert('Selecione um filtro.'); return; }

  if(v === 'brightness'){
    const k = parseFloat(document.getElementById('kBrightness').value);
    applyBrightness(k);
  } else if(v === 'darken'){
    const k = parseFloat(document.getElementById('kDark').value);
    applyDarken(k);
  } else if(v === 'grayscale'){
    const wR = parseFloat(document.getElementById('wR').value);
    const wG = parseFloat(document.getElementById('wG').value);
    const wB = parseFloat(document.getElementById('wB').value);
    applyGrayscale(wR,wG,wB);
  } else if(v === 'rotate'){
    const deg = parseFloat(document.getElementById('angle').value);
    applyRotation(deg);
  }
});

// Botão de "Resetar" salva o canvas com a imagem original que foi feito o upload
resetBtn.addEventListener('click', ()=>{
  if(!imagemOriginal) return;
  carregaImgParaCanvas(imagemOriginal);
});

downloadBtn.addEventListener('click', ()=>{
  const link = document.createElement('a');
  link.download = 'resultado.png';
  link.href = canvas.toDataURL('image/png'); // converte o canvas em imagem
  link.click(); // faz o download da imagem
});

// inicia tudo com um filtro "transparente" ou sem filtro no caso
filterSelect.dispatchEvent(new Event('change'));

// Grupo
// Samuel de Souza Araújo - 2510348
// Henrique Pires Coteletti - 2510324
// Leonardo Pires Coteletti - 2510302 