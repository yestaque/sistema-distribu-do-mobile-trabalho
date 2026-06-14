/* ============================================================
   BAZAR & SALÃO DE BELEZA — app.js
   Sistema Distribuído Mobile
   Tecnologias: HTML5 · CSS3 · JS · API RESTful · SQLite (localStorage)
               · GPS Sensor · PIX · Mercado Pago
============================================================ */

'use strict';

/* ============================================================
   BANCO DE DADOS LOCAL (simula SQLite / AsyncStorage)
   Em produção: substituir por Firebase Firestore ou Supabase
============================================================ */
const DB_KEY = 'bazarSalaoDB_v1';

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function saveDB() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(DB));
  } catch (e) {
    console.warn('Erro ao salvar DB:', e);
  }
}

let DB = loadDB() || {
  users: [
    { id: 1, name: 'Admin', email: 'admin@bazar.com', pass: '123456', createdAt: new Date().toISOString() }
  ],
  currentUser: null,
  cart: [],
  orders: []
};

/* ============================================================
   CATÁLOGO DE PRODUTOS (em produção: fetch da API RESTful)
============================================================ */
const PRODUCTS = [
  { id:  1, name: 'Vestido Floral',       desc: 'Verão 2024',       price: 89.90,  emoji: '👗', cat: 'roupas',  destaque: true  },
  { id:  2, name: 'Blusa Cropped',        desc: 'Tendência',        price: 45.00,  emoji: '👕', cat: 'roupas',  destaque: true  },
  { id:  3, name: 'Calça Jeans Slim',     desc: 'Slim fit',         price: 129.90, emoji: '👖', cat: 'roupas',  destaque: false },
  { id:  4, name: 'Saia Midi',            desc: 'Floral romantic',  price: 69.90,  emoji: '🩱', cat: 'roupas',  destaque: false },
  { id:  5, name: 'Batom Vermelho',       desc: 'Longa duração',    price: 32.50,  emoji: '💄', cat: 'beleza',  destaque: true  },
  { id:  6, name: 'Perfume Floral 60ml',  desc: 'Delicado',         price: 78.00,  emoji: '🌸', cat: 'beleza',  destaque: false },
  { id:  7, name: 'Máscara de Cílios',    desc: 'Volume extremo',   price: 28.90,  emoji: '👁️', cat: 'beleza',  destaque: false },
  { id:  8, name: 'Hidratante Corporal',  desc: 'Pele seca',        price: 35.00,  emoji: '🧴', cat: 'beleza',  destaque: true  },
  { id:  9, name: 'Kit Maquiagem',        desc: 'Completo',         price: 89.00,  emoji: '🎨', cat: 'beleza',  destaque: false },
  { id: 10, name: 'Escova Profissional',  desc: 'Cerâmica',         price: 55.00,  emoji: '💇', cat: 'salao',   destaque: false },
  { id: 11, name: 'Máscara Capilar',      desc: 'Nutrição intensa', price: 42.00,  emoji: '✨', cat: 'salao',   destaque: true  },
  { id: 12, name: 'Óleo Capilar',         desc: 'Brilho e maciez',  price: 38.00,  emoji: '💫', cat: 'salao',   destaque: false },
  { id: 13, name: 'Shampoo Premium',      desc: 'Anti-resíduos',    price: 34.00,  emoji: '🚿', cat: 'salao',   destaque: false },
  { id: 14, name: 'Leave-in Tratamento',  desc: 'Sem enxágue',      price: 29.90,  emoji: '💧', cat: 'salao',   destaque: false },
];

const CAT_BG = {
  roupas: '#fce0e8',
  beleza: '#e0f0fa',
  salao:  '#e0fae8',
};

function catBg(cat) { return CAT_BG[cat] || '#f0e0fa'; }

/* ============================================================
   AUTENTICAÇÃO
============================================================ */
let currentAuthTab = 'login';

function switchTab(tab) {
  currentAuthTab = tab;
  document.querySelectorAll('.auth-tab').forEach((el, i) => {
    el.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
  document.getElementById('loginForm').style.display    = tab === 'login'    ? '' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('authMsg').innerHTML = '';
}

function showAuthMsg(msg, ok) {
  document.getElementById('authMsg').innerHTML =
    `<div class="${ok ? 'msg-success' : 'msg-error'}">${msg}</div>`;
}

function doLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPass').value;
  if (!email || !pass) { showAuthMsg('Preencha todos os campos.', false); return; }
  const user = DB.users.find(u => u.email === email && u.pass === pass);
  if (!user) { showAuthMsg('E-mail ou senha incorretos.', false); return; }
  DB.currentUser = user;
  saveDB();
  initApp(user);
}

function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('regPass').value;
  if (!name || !email || !pass) { showAuthMsg('Preencha todos os campos.', false); return; }
  if (pass.length < 6)          { showAuthMsg('Senha deve ter ao menos 6 caracteres.', false); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthMsg('E-mail inválido.', false); return; }
  if (DB.users.find(u => u.email === email)) { showAuthMsg('E-mail já cadastrado.', false); return; }
  const newUser = { id: Date.now(), name, email, pass, createdAt: new Date().toISOString() };
  DB.users.push(newUser);
  DB.currentUser = newUser;
  saveDB();
  showAuthMsg('Conta criada com sucesso! Entrando...', true);
  setTimeout(() => initApp(newUser), 800);
}

function logout() {
  if (!confirm('Deseja sair da conta?')) return;
  DB.currentUser = null;
  saveDB();
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('authMsg').innerHTML = '';
}

/* ============================================================
   INICIALIZAR APP
============================================================ */
function initApp(user) {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appShell').style.display   = 'flex';
  document.getElementById('topbarUser').textContent   = 'Olá, ' + user.name.split(' ')[0] + '! 👋';

  renderFeatured();
  renderStore();
  renderCart();
  startClock();
  fetchWeather();
  initCarousel();
  goPage('home');
}

/* Verificar sessão salva */
if (DB.currentUser) {
  initApp(DB.currentUser);
}

/* ============================================================
   RELÓGIO & DATA — sensor de tempo
============================================================ */
function startClock() {
  function tick() {
    const now = new Date();
    document.getElementById('clockVal').textContent =
      now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('dateVal').textContent =
      now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }
  tick();
  setInterval(tick, 1000);
}

/* ============================================================
   CLIMA — API RESTful Open-Meteo (sem chave) + GPS (sensor)
============================================================ */
const WEATHER_CODES = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️',
  80: '🌦️', 81: '🌦️', 82: '🌧️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

function fetchWeather() {
  const setDefault = () => {
    document.getElementById('tempVal').textContent  = '32°C';
    document.getElementById('cityName').textContent = 'Natal, RN';
    document.getElementById('weatherIcon').textContent = '☀️';
  };

  if (!navigator.geolocation) { setDefault(); return; }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;

      /* Cidade via Nominatim (API gratuita) */
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        );
        const geoData = await geoRes.json();
        const city = geoData.address.city ||
                     geoData.address.town ||
                     geoData.address.municipality ||
                     geoData.address.state || 'Sua cidade';
        const state = geoData.address.state_code || '';
        document.getElementById('cityName').textContent = city + (state ? ', ' + state : '');
      } catch { /* usa padrão */ }

      /* Temperatura via Open-Meteo (API gratuita, sem chave) */
      try {
        const wtRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&timezone=auto`
        );
        const wtData = await wtRes.json();
        const temp = Math.round(wtData.current.temperature_2m);
        const code = wtData.current.weathercode;
        document.getElementById('tempVal').textContent     = temp + '°C';
        document.getElementById('weatherIcon').textContent = WEATHER_CODES[code] || '🌡️';
      } catch { setDefault(); }
    },
    setDefault,
    { timeout: 8000 }
  );
}

/* ============================================================
   CARROSSEL
============================================================ */
const SLIDES = [
  { emoji: '🛍️', caption: 'Novidades do Bazar!',       cls: 'cs-1' },
  { emoji: '💇‍♀️', caption: 'Salão de Beleza Premium',  cls: 'cs-2' },
  { emoji: '✨',  caption: 'Ofertas Imperdíveis!',       cls: 'cs-3' },
];

let slideIdx   = 0;
let slideTimer = null;

function initCarousel() {
  const inner = document.getElementById('carouselInner');
  const dots  = document.getElementById('carouselDots');
  inner.innerHTML = '';
  dots.innerHTML  = '';

  SLIDES.forEach((s, i) => {
    const slide = document.createElement('div');
    slide.className = `carousel-slide ${s.cls}`;
    slide.innerHTML = `${s.emoji}<span class="carousel-caption">${s.caption}</span>`;
    inner.appendChild(slide);

    const dot = document.createElement('button');
    dot.className = 'dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Slide ' + (i + 1));
    dot.onclick = () => goSlide(i);
    dots.appendChild(dot);
  });

  goSlide(0);
  clearInterval(slideTimer);
  slideTimer = setInterval(() => goSlide((slideIdx + 1) % SLIDES.length), 3500);
}

function goSlide(i) {
  slideIdx = ((i % SLIDES.length) + SLIDES.length) % SLIDES.length;
  document.getElementById('carouselInner').style.transform = `translateX(-${slideIdx * 100}%)`;
  document.querySelectorAll('.dot').forEach((d, j) =>
    d.classList.toggle('active', j === slideIdx)
  );
}

/* ============================================================
   HOME — PRODUTOS EM DESTAQUE
============================================================ */
let featuredCat = 'all';

function filterCat(cat, el) {
  featuredCat = cat;
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  renderFeatured();
}

function renderFeatured() {
  const list = PRODUCTS.filter(p =>
    p.destaque && (featuredCat === 'all' || p.cat === featuredCat)
  );
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  grid.innerHTML = list.map(p => `
    <div class="product-card">
      <div class="product-img" style="background:${catBg(p.cat)}">${p.emoji}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-bottom">
          <span class="product-price">R$ ${fmtPrice(p.price)}</span>
          <button class="btn-add" onclick="addToCart(${p.id}, this)">+ Add</button>
        </div>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   LOJA
============================================================ */
let storeCat = 'all';

function storeFilter(cat, el) {
  storeCat = cat;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderStore();
}

function renderStore() {
  const list = storeCat === 'all'
    ? PRODUCTS
    : PRODUCTS.filter(p => p.cat === storeCat);

  const grid = document.getElementById('storeGrid');
  if (!grid) return;

  grid.innerHTML = list.map(p => `
    <div class="store-card">
      <div class="store-img" style="background:${catBg(p.cat)}">${p.emoji}</div>
      <div class="store-info">
        <div class="store-name">${p.name}</div>
        <div class="store-cat">${p.desc}</div>
        <div class="store-price">R$ ${fmtPrice(p.price)}</div>
        <button class="btn-add-full" onclick="addToCart(${p.id}, this)">🛒 Adicionar</button>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   CARRINHO — CRUD
============================================================ */
function addToCart(id, btn) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;

  const existing = DB.cart.find(i => i.id === id);
  if (existing) {
    existing.qty += 1;
  } else {
    DB.cart.push({ ...product, qty: 1 });
  }
  saveDB();
  updateCartBadge();
  renderCart();

  /* Feedback visual */
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '✓ Ok!';
    btn.style.background = '#4caf50';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.background = '';
    }, 700);
  }
}

function changeQty(id, delta) {
  const item = DB.cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    DB.cart = DB.cart.filter(i => i.id !== id);
  }
  saveDB();
  updateCartBadge();
  renderCart();
}

function removeItem(id) {
  DB.cart = DB.cart.filter(i => i.id !== id);
  saveDB();
  updateCartBadge();
  renderCart();
}

function updateCartBadge() {
  const total  = DB.cart.reduce((s, i) => s + i.qty, 0);
  const badge  = document.getElementById('cartBadge');
  if (!badge) return;
  badge.textContent     = total;
  badge.style.display   = total > 0 ? 'flex' : 'none';
}

function cartTotal() {
  return DB.cart.reduce((s, i) => s + i.price * i.qty, 0);
}

function renderCart() {
  updateCartBadge();
  const content = document.getElementById('cartContent');
  const bar     = document.getElementById('cartTotalBar');
  if (!content) return;

  if (!DB.cart.length) {
    content.innerHTML = `
      <div class="cart-empty">
        <span>🛒</span>
        Seu carrinho está vazio.<br>
        <button onclick="goPage('store')" style="margin-top:14px;background:var(--purple);color:#fff;border:none;border-radius:10px;padding:10px 24px;font-size:14px;font-weight:700;cursor:pointer">
          🛍️ Ir para a Loja
        </button>
      </div>`;
    if (bar) bar.style.display = 'none';
    return;
  }

  const total = cartTotal();
  content.innerHTML = `<div class="cart-list">${
    DB.cart.map(i => `
      <div class="cart-item">
        <div class="cart-item-emoji">${i.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${i.name}</div>
          <div class="cart-item-unit">R$ ${fmtPrice(i.price)} / un.</div>
          <div class="cart-item-price">R$ ${fmtPrice(i.price * i.qty)}</div>
        </div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty(${i.id}, -1)">−</button>
          <span class="qty-num">${i.qty}</span>
          <button class="qty-btn" onclick="changeQty(${i.id}, 1)">+</button>
        </div>
      </div>
    `).join('')
  }</div>`;

  if (bar) {
    bar.style.display = 'block';
    document.getElementById('cartTotalVal').textContent = 'R$ ' + fmtPrice(total);
  }
}

/* ============================================================
   PAGAMENTO
============================================================ */
let payMethod = 'pix';

function renderPayment() {
  const screen = document.getElementById('payScreen');
  if (!screen) return;

  const total = cartTotal();

  if (!DB.cart.length) {
    screen.innerHTML = `
      <div class="cart-empty">
        <span>💳</span>
        Nenhum item no carrinho.
        <button onclick="goPage('store')" style="margin-top:14px;background:var(--purple);color:#fff;border:none;border-radius:10px;padding:10px 24px;font-size:14px;font-weight:700;cursor:pointer">
          🛍️ Ver Loja
        </button>
      </div>`;
    return;
  }

  screen.innerHTML = `
    <div class="pay-card">
      <div class="pay-title">Forma de Pagamento</div>
      <div class="pay-total">R$ ${fmtPrice(total)}</div>
      <div class="pay-opts">
        <div class="pay-opt ${payMethod === 'pix' ? 'active' : ''}" onclick="selectPayMethod('pix', this)">
          <span class="pay-opt-icon">📱</span>
          <div class="pay-opt-label">PIX</div>
        </div>
        <div class="pay-opt ${payMethod === 'mp' ? 'active' : ''}" onclick="selectPayMethod('mp', this)">
          <span class="pay-opt-icon">💳</span>
          <div class="pay-opt-label">Mercado Pago</div>
        </div>
      </div>
      <div id="payMethodContent"></div>
      <button class="btn-pay-final" onclick="confirmPay()">✅ Confirmar Pagamento</button>
    </div>`;

  renderPayMethodContent();
}

function selectPayMethod(method, el) {
  payMethod = method;
  document.querySelectorAll('.pay-opt').forEach(e => e.classList.remove('active'));
  if (el) el.classList.add('active');
  renderPayMethodContent();
}

function renderPayMethodContent() {
  const el = document.getElementById('payMethodContent');
  if (!el) return;

  if (payMethod === 'pix') {
    el.innerHTML = `
      <div class="pix-box">
        <div class="pix-qr">📱</div>
        <div class="pix-label">Chave PIX (e-mail):</div>
        <div class="pix-key">bazar.salao@pagamentos.com.br</div>
        <button class="btn-copy" onclick="copyPix()">📋 Copiar Chave PIX</button>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="mp-box">
        <div class="mp-logo">💳</div>
        <div class="mp-text">
          Você será redirecionado para o Mercado Pago
          para finalizar o pagamento com total segurança.
          Aceita cartão, boleto e saldo MP.
        </div>
        <div class="mp-seal">🔒 Ambiente seguro SSL/TLS</div>
      </div>`;
  }
}

function copyPix() {
  const key = 'bazar.salao@pagamentos.com.br';
  if (navigator.clipboard) {
    navigator.clipboard.writeText(key).then(() => alert('✅ Chave PIX copiada!\n' + key));
  } else {
    alert('Chave PIX:\n' + key);
  }
}

function confirmPay() {
  const total  = cartTotal();
  const method = payMethod === 'pix' ? 'PIX' : 'Mercado Pago';

  /* Salva pedido no "banco" */
  const order = {
    id: 'PED-' + Date.now(),
    items: [...DB.cart],
    total,
    method,
    user: DB.currentUser.email,
    date: new Date().toISOString(),
    status: 'confirmado'
  };
  DB.orders.push(order);
  DB.cart = [];
  saveDB();
  renderCart();
  updateCartBadge();

  const screen = document.getElementById('payScreen');
  screen.innerHTML = `
    <div class="success-screen">
      <div class="success-icon">✅</div>
      <div class="success-title">Pedido Confirmado!</div>
      <div class="success-sub">
        Pagamento via <b>${method}</b> registrado com sucesso.<br>
        Pedido: <b>${order.id}</b><br>
        Você receberá a confirmação no e-mail cadastrado.
      </div>
      <button class="btn-back-home" onclick="goPage('home')">🏠 Voltar ao Início</button>
    </div>`;
}

/* ============================================================
   NAVEGAÇÃO
============================================================ */
const PAGE_TITLES = {
  home:    '🛍️ Bazar & Salão',
  store:   '🛍️ Nossa Loja',
  cart:    '🛒 Carrinho',
  payment: '💳 Pagamento',
};

function goPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  const navEl  = document.getElementById('nav-'  + page);

  if (pageEl) pageEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');

  document.getElementById('topbarTitle').textContent = PAGE_TITLES[page] || 'Bazar & Salão';

  if (page === 'cart')    renderCart();
  if (page === 'payment') renderPayment();

  /* Scroll topo */
  if (pageEl) pageEl.scrollTop = 0;
}

/* ============================================================
   MODAIS
============================================================ */
function showAboutModal() {
  document.getElementById('aboutModal').style.display = 'flex';
}
function closeAbout() {
  document.getElementById('aboutModal').style.display = 'none';
}

function openWhatsApp() {
  /* Altere o número abaixo */
  const phone   = '5584999999999';
  const message = encodeURIComponent('Olá! Vim pelo app Bazar & Salão de Beleza. Gostaria de mais informações! 😊');
  window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
}

/* ============================================================
   UTILITÁRIOS
============================================================ */
function fmtPrice(value) {
  return value.toFixed(2).replace('.', ',');
}

/* ============================================================
   TOUCH SWIPE no carrossel
============================================================ */
(function initSwipe() {
  let startX = 0;
  const wrap = document.getElementById('carouselInner');
  if (!wrap) return;

  wrap.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend',   e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      goSlide(slideIdx + (diff > 0 ? 1 : -1));
    }
  }, { passive: true });
})();

/* ============================================================
   FECHAR MODAL AO CLICAR FORA
============================================================ */
document.getElementById('aboutModal').addEventListener('click', function(e) {
  if (e.target === this) closeAbout();
});
