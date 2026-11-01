/* Weft storefront. Products, orders and newsletter signups all go through the Express API. */
(function () {
  'use strict';
  var G = window.Garments;
  var cats = ['All', 'Shirts', 'Tees', 'Knitwear', 'Bottoms', 'Outerwear'];
  var FREE = 3000, SHIP = 99;

  var catalog = [];   // every product, loaded once (used for the hero, cart and lookups)
  var shown = [];     // products matching the current filter, search and sort (from the API)
  var state = { cat: 'All', sort: 'featured', q: '', sel: {}, status: 'loading' };
  var modal = null, view = 'cart', cart = {};
  try { cart = JSON.parse(localStorage.getItem('weft-cart') || '{}') || {}; } catch (e) { cart = {}; }

  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
  function byId(id) { for (var i = 0; i < catalog.length; i++) if (catalog[i].id === +id) return catalog[i]; }
  function save() { try { localStorage.setItem('weft-cart', JSON.stringify(cart)); } catch (e) {} }

  /* ---------- API ---------- */
  function api(path, opts) {
    var init = { headers: { 'Content-Type': 'application/json' } };
    if (opts) { init.method = opts.method; init.body = opts.body; }
    return fetch(path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) {
        if (!r.ok) { var err = new Error(b.error || 'Request failed'); err.details = b.details; throw err; }
        return b;
      });
    });
  }
  // The garment drawing code expects colours as [name, hex] pairs and facts as [label, value] pairs.
  function normalize(p) {
    p.colors = p.colors.map(function (c) { return [c.name, c.hex]; });
    p.facts = (p.facts || []).map(function (f) { return [f.label, f.value]; });
    p.o = p.options || {};
    return p;
  }

  var reqId = 0;
  function load() {
    var id = ++reqId;
    state.status = 'loading';
    renderGrid();
    var qs = new URLSearchParams();
    if (state.cat !== 'All') qs.set('cat', state.cat);
    if (state.q.trim()) qs.set('q', state.q.trim());
    qs.set('sort', state.sort);
    return api('/api/products?' + qs.toString()).then(function (d) {
      if (id !== reqId) return;
      shown = d.products.map(normalize);
      state.status = 'ready';
      renderGrid();
    }).catch(function () {
      if (id !== reqId) return;
      state.status = 'error';
      renderGrid();
    });
  }
  function init() {
    state.status = 'loading';
    renderGrid();
    return api('/api/products').then(function (d) {
      catalog = d.products.map(normalize);
      shown = catalog.slice();
      state.status = 'ready';
      renderHero();
      renderGrid();
      renderCart();
    }).catch(function () {
      state.status = 'error';
      renderGrid();
    });
  }

  /* ---------- Rendering ---------- */
  function badge(p) { return p.tag ? '<span class="badge' + (p.tag === 'Sale' ? ' sale' : '') + '">' + esc(p.tag) + '</span>' : ''; }
  function priceHtml(p) { return fmt(p.price) + (p.was ? '<s>' + fmt(p.was) + '</s>' : ''); }

  function renderChips() {
    $('#chips').innerHTML = cats.map(function (c) {
      return '<button class="chip" data-cat="' + c + '" aria-pressed="' + (state.cat === c) + '">' + c + '</button>';
    }).join('');
  }
  function renderGrid() {
    var grid = $('#grid');
    if (state.status === 'loading' && !shown.length) {
      $('#count').textContent = '';
      grid.innerHTML = '<div class="empty">Loading the collection…</div>';
      return;
    }
    if (state.status === 'error') {
      $('#count').textContent = '';
      grid.innerHTML = '<div class="empty">We could not load the products.<br><br><button class="add" data-retry>Try again</button></div>';
      return;
    }
    $('#count').textContent = shown.length + (shown.length === 1 ? ' product' : ' products');
    if (!shown.length) {
      grid.innerHTML = '<div class="empty">No products match that search. Try a different word or clear the filter.</div>';
      return;
    }
    grid.style.opacity = state.status === 'loading' ? '.6' : '';
    grid.innerHTML = shown.map(function (p) {
      var ci = state.sel[p.id] || 0;
      var dots = p.colors.map(function (c, i) {
        return '<button class="dot" data-sw="' + p.id + ':' + i + '" style="--c:' + esc(c[1]) + '" aria-label="' + esc(c[0]) + '" aria-pressed="' + (i === ci) + '"></button>';
      }).join('');
      return '<article class="card">' +
        '<button class="tile" data-view="' + p.id + '" aria-label="View ' + esc(p.name) + '">' + G.garment(p, ci) + badge(p) + '</button>' +
        '<div class="info"><div class="sw">' + dots + '</div>' +
        '<h3><button class="link" data-view="' + p.id + '">' + esc(p.name) + '</button></h3>' +
        '<div class="spec">' + esc(p.spec) + '</div>' +
        '<div class="rate"><b>★ ' + p.rating.toFixed(1) + '</b> (' + p.n + ')</div>' +
        '<div class="row"><span class="price">' + priceHtml(p) + '</span><button class="add" data-view="' + p.id + '">Choose size</button></div></div>' +
        '</article>';
    }).join('');
  }
  function renderHero() {
    var picks = [[5, 0], [1, 0], [8, 0]].filter(function (s) { return byId(s[0]); });
    $('#heroart').innerHTML = picks.map(function (s) { return '<div class="tile">' + G.garment(byId(s[0]), s[1]) + '</div>'; }).join('');
  }
  function renderCloth() {
    var f = [['Oxford cotton', '140 GSM', 'Structured and slightly textured. Softens with washing and holds a collar.', 'oxford', '#9DB8D9'],
             ['Washed linen', '170 GSM', 'Airy and crisp. It creases naturally and gets softer every wash.', 'linen', '#D8CDB6'],
             ['Selvedge denim', '12 oz', 'Stiff when new. Fades along your creases and pockets over time.', 'denim', '#2B3F66'],
             ['Merino knit', '280 GSM', 'Fine, warm and breathable. Resists odour between washes.', 'knit', '#2F4F3E']];
    $('#fgrid').innerHTML = f.map(function (x) {
      return '<div class="fab">' + G.swatch(x[3], x[4]) + '<div><b>' + x[0] + '</b><div class="w">' + x[1] + '</div><p>' + x[2] + '</p></div></div>';
    }).join('');
  }

  /* ---------- Cart ---------- */
  function parse(key) { var a = key.split('|'); return { p: byId(a[0]), ci: +a[1], size: a[2] }; }
  function cartKeys() { return Object.keys(cart).filter(function (k) { var l = parse(k); return l.p && l.p.colors[l.ci]; }); }
  function totals() {
    var items = 0, sub = 0;
    cartKeys().forEach(function (k) { var l = parse(k); items += cart[k]; sub += l.p.price * cart[k]; });
    return { items: items, sub: sub, ship: (sub >= FREE || sub === 0) ? 0 : SHIP };
  }
  function summary(t) {
    return '<div class="sum"><span>Subtotal</span><span>' + fmt(t.sub) + '</span></div>' +
      '<div class="sum"><span>Shipping</span><span>' + (t.ship ? fmt(t.ship) : 'Free') + '</span></div>' +
      '<div class="sum tot"><span>Total</span><span>' + fmt(t.sub + t.ship) + '</span></div>';
  }
  function renderCart() {
    var t = totals();
    $('#cartN').textContent = t.items;
    if (view === 'checkout') { renderCheckout(t); return; }
    if (view === 'done') return;
    var keys = cartKeys(), body = $('#cartBody'), foot = $('#cartFoot');
    if (!keys.length) {
      body.innerHTML = '<div class="done"><h3>Your cart is empty</h3><p>Pick a shirt, a tee or a pair of jeans and it will show up here.</p><button class="btn" data-close>Keep shopping</button></div>';
      foot.innerHTML = ''; foot.hidden = true; return;
    }
    foot.hidden = false;
    var left = Math.max(0, FREE - t.sub), pct = Math.min(100, Math.round(t.sub / FREE * 100));
    var html = '<div class="free">' + (left > 0 ? 'Add <b style="font-family:var(--f-mono)">' + fmt(left) + '</b> more for free shipping' : '<b style="color:var(--good)">You have free shipping</b>') + '<div class="meter"><i style="width:' + pct + '%"></i></div></div>';
    html += keys.map(function (k) {
      var l = parse(k), q = cart[k];
      return '<div class="line"><div class="tile">' + G.garment(l.p, l.ci) + '</div><div>' +
        '<h4>' + esc(l.p.name) + '</h4><div class="spec">' + esc(l.p.colors[l.ci][0]) + ' · Size ' + esc(l.size) + '</div><div class="lp">' + fmt(l.p.price * q) + '</div>' +
        '<div><span class="qty"><button data-dec="' + esc(k) + '" aria-label="Decrease quantity">−</button><span>' + q + '</span><button data-inc="' + esc(k) + '" aria-label="Increase quantity">+</button></span>' +
        '<button class="rm" data-rm="' + esc(k) + '">Remove</button></div></div></div>';
    }).join('');
    body.innerHTML = html;
    foot.innerHTML = summary(t) + '<button class="btn" data-checkout>Checkout</button><p class="note">Taxes included. Delivery details come next.</p>';
  }
  function renderCheckout(t) {
    $('#cartBody').innerHTML =
      '<form id="checkoutForm" class="cform" novalidate>' +
      '<h3>Delivery details</h3>' +
      '<div class="field"><label for="c-name">Full name</label><input id="c-name" name="name" autocomplete="name" maxlength="80" required></div>' +
      '<div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" autocomplete="email" maxlength="120" required></div>' +
      '<div class="field"><label for="c-phone">Phone</label><input id="c-phone" name="phone" type="tel" autocomplete="tel" maxlength="20" required></div>' +
      '<div class="field"><label for="c-address">Address</label><input id="c-address" name="address" autocomplete="street-address" maxlength="200" required></div>' +
      '<div class="two"><div class="field"><label for="c-city">City</label><input id="c-city" name="city" autocomplete="address-level2" maxlength="60" required></div>' +
      '<div class="field"><label for="c-pin">PIN code</label><input id="c-pin" name="pin" inputmode="numeric" autocomplete="postal-code" maxlength="6" required></div></div>' +
      '<fieldset class="payment-choice"><legend>Payment method</legend>' +
      '<label><input type="radio" name="paymentMethod" value="razorpay" checked> <span><b>Razorpay</b><small>Pay online using UPI, cards and supported methods</small></span></label>' +
      '<label><input type="radio" name="paymentMethod" value="cod"> <span><b>Cash on Delivery</b><small>Pay when your order arrives</small></span></label></fieldset>' +
      '<div class="err" id="cErr" role="alert"></div></form>';
    $('#cartFoot').hidden = false;
    $('#cartFoot').innerHTML = summary(t) +
      '<button class="btn" type="submit" form="checkoutForm" id="placeBtn">Place order</button>' +
      '<button class="rm back" data-back>Back to cart</button>' +
      '<p class="note">Choose Razorpay for online payment or Cash on Delivery to pay when your order arrives.</p>';
  }

  function placeOrder(f) {
    var v = function (n) { return f.elements[n].value.trim(); };
    var err = $('#cErr'), btn = $('#placeBtn');
    var customer = { name: v('name'), email: v('email'), phone: v('phone'), address: v('address'), city: v('city'), pin: v('pin') };
    var paymentMethod = (f.elements.paymentMethod && f.elements.paymentMethod.value) || 'razorpay';
    for (var k in customer) { if (!customer[k]) { err.textContent = 'Please fill in every field.'; return; } }
    var items = cartKeys().map(function (key) { var l = parse(key); return { productId: l.p.id, colorIndex: l.ci, size: l.size, qty: cart[key] }; });
    err.textContent = '';
    btn.disabled = true; btn.textContent = 'Placing order…';
    api('/api/orders', { method: 'POST', body: JSON.stringify({ items: items, customer: customer, paymentMethod: paymentMethod }) }).then(function (o) {
      if (o.paymentMethod === 'cod') {
        cart = {}; save(); view = 'done'; $('#cartN').textContent = '0';
        $('#cartBody').innerHTML = '<div class="done"><h3>Order placed</h3><p>Thank you, ' + esc(customer.name.split(' ')[0]) + '. Your COD order <b style="font-family:var(--f-mono)">' + esc(o.orderNumber) + '</b> is confirmed. Pay ' + fmt(o.total) + ' when it arrives.</p><button class="btn" data-close>Continue shopping</button></div>';
        $('#cartFoot').innerHTML = ''; $('#cartFoot').hidden = true; return;
      }
      if (!window.Razorpay) throw new Error('Payment checkout could not load. Please refresh and try again.');
      btn.disabled = false; btn.textContent = 'Pay ' + fmt(o.total);
      var options = {
        key: o.keyId, amount: o.amount, currency: o.currency, name: 'Weft Clothing',
        description: 'Order ' + o.orderNumber, order_id: o.razorpayOrderId,
        prefill: { name: o.customer.name, email: o.customer.email, contact: o.customer.phone },
        notes: { orderNumber: o.orderNumber }, theme: { color: '#171717' },
        handler: function (response) {
          btn.disabled = true; btn.textContent = 'Verifying payment…';
          api('/api/orders/verify-payment', { method: 'POST', body: JSON.stringify({ orderNumber: o.orderNumber, razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }) }).then(function () {
            cart = {}; save(); view = 'done'; $('#cartN').textContent = '0';
            $('#cartBody').innerHTML = '<div class="done"><h3>Payment successful</h3><p>Thank you, ' + esc(customer.name.split(' ')[0]) + '. Your order number is <b style="font-family:var(--f-mono)">' + esc(o.orderNumber) + '</b>. Payment received: ' + fmt(o.total) + '.</p><button class="btn" data-close>Continue shopping</button></div>';
            $('#cartFoot').innerHTML = ''; $('#cartFoot').hidden = true;
          }).catch(function (e) { err.textContent = e.message || 'Payment was received but could not be verified here. Contact support with order ' + o.orderNumber + '.'; btn.disabled = false; btn.textContent = 'Retry verification'; });
        },
        modal: { ondismiss: function () { btn.disabled = false; btn.textContent = 'Pay ' + fmt(o.total); err.textContent = 'Payment was not completed. Your cart is still saved; you can try again.'; } }
      };
      var checkout = new window.Razorpay(options);
      checkout.on('payment.failed', function (response) { err.textContent = (response.error && response.error.description) || 'Payment failed. Please try another payment method.'; btn.disabled = false; btn.textContent = 'Pay ' + fmt(o.total); });
      checkout.open();
    }).catch(function (e) { err.textContent = e.message || 'Could not start payment. Please try again.'; btn.disabled = false; btn.textContent = 'Place order'; });
  }

  /* ---------- Drawer, modal, toast ---------- */
  function openCart() {
    view = 'cart'; renderCart();
    $('#drawer').classList.add('open'); $('#scrim').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false');
  }
  function closeAll() {
    $('#drawer').classList.remove('open'); $('#scrim').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true');
    $('#modal').classList.remove('open'); modal = null;
  }
  function renderModal() {
    var p = byId(modal.id), ci = modal.ci;
    var dots = p.colors.map(function (c, i) {
      return '<button class="dot big" data-mc="' + i + '" style="--c:' + esc(c[1]) + '" aria-label="' + esc(c[0]) + '" aria-pressed="' + (i === ci) + '"></button>';
    }).join('');
    var sizes = p.sizes.map(function (s) {
      var out = p.out.indexOf(s) > -1;
      return '<button class="size" data-ms="' + esc(s) + '" aria-pressed="' + (modal.size === s) + '"' + (out ? ' disabled' : '') + '>' + esc(s) + '</button>';
    }).join('');
    $('#panel').innerHTML = '<button class="x" data-close aria-label="Close">✕</button>' +
      '<div class="tile" style="border-radius:8px">' + G.garment(p, ci) + badge(p) + '</div>' +
      '<div><div class="spec" style="text-transform:uppercase;letter-spacing:.08em">' + esc(p.cat) + '</div><h2>' + esc(p.name) + '</h2>' +
      '<div class="rate" style="margin-bottom:14px"><b>★ ' + p.rating.toFixed(1) + '</b> (' + p.n + ' reviews)</div>' +
      '<p>' + esc(p.desc) + '</p><div class="price">' + priceHtml(p) + '</div>' +
      '<div class="lbl"><span>Colour</span><em>' + esc(p.colors[ci][0]) + '</em></div><div class="sw" style="gap:10px">' + dots + '</div>' +
      '<div class="lbl"><span>' + (p.cat === 'Bottoms' ? 'Waist (in)' : 'Size') + '</span><em>' + (modal.size ? esc(modal.size) : 'Select') + '</em></div><div class="sizes">' + sizes + '</div>' +
      '<button class="btn" data-addclose="1"' + (modal.size ? '' : ' disabled') + '>' + (modal.size ? 'Add to cart' : 'Select a size') + '</button>' +
      '<ul>' + p.facts.map(function (f) { return '<li><span>' + esc(f[0]) + '</span><span>' + esc(f[1]) + '</span></li>'; }).join('') + '</ul></div>';
  }
  function openView(id) {
    if (!byId(id)) return;
    modal = { id: +id, ci: state.sel[id] || 0, size: '' };
    renderModal(); $('#modal').classList.add('open');
  }

  /* ---------- Events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-cat],[data-sw],[data-view],[data-mc],[data-ms],[data-addclose],[data-inc],[data-dec],[data-rm],[data-close],[data-checkout],[data-back],[data-retry],[data-nav],#openCart,#closeCart,#scrim,#modal');
    if (!t) return;
    if (t.id === 'modal' && e.target !== t) return;
    var d = t.dataset;
    if (d.cat) { state.cat = d.cat; renderChips(); load(); }
    else if (d.nav) { state.cat = d.nav; renderChips(); load(); }
    else if (d.retry !== undefined) { catalog.length ? load() : init(); }
    else if (d.sw) { var a = d.sw.split(':'); state.sel[a[0]] = +a[1]; renderGrid(); }
    else if (d.view) { openView(d.view); }
    else if (d.mc !== undefined) { modal.ci = +d.mc; state.sel[modal.id] = modal.ci; renderModal(); renderGrid(); }
    else if (d.ms) { modal.size = d.ms; renderModal(); }
    else if (d.addclose) {
      var key = modal.id + '|' + modal.ci + '|' + modal.size;
      cart[key] = Math.min(10, (cart[key] || 0) + 1); save();
      $('#modal').classList.remove('open'); modal = null; openCart();
    }
    else if (d.inc) { cart[d.inc] = Math.min(10, cart[d.inc] + 1); save(); renderCart(); }
    else if (d.dec) { cart[d.dec]--; if (cart[d.dec] <= 0) delete cart[d.dec]; save(); renderCart(); }
    else if (d.rm) { delete cart[d.rm]; save(); renderCart(); }
    else if (d.checkout !== undefined) { view = 'checkout'; renderCart(); }
    else if (d.back !== undefined) { view = 'cart'; renderCart(); }
    else if (t.id === 'openCart') { openCart(); }
    else if (t.id === 'closeCart' || t.id === 'scrim' || t.id === 'modal' || d.close !== undefined) { closeAll(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

  var searchT;
  $('#q').addEventListener('input', function (e) {
    state.q = e.target.value;
    clearTimeout(searchT);
    searchT = setTimeout(load, 250);
  });
  $('#sort').addEventListener('change', function (e) { state.sort = e.target.value; load(); });

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'checkoutForm') { e.preventDefault(); placeOrder(f); }
    else if (f.id === 'news') {
      e.preventDefault();
      var msg = $('#newsMsg');
      msg.style.color = '';
      api('/api/subscribers', { method: 'POST', body: JSON.stringify({ email: $('#email').value }) }).then(function (r) {
        msg.textContent = r.message; $('#email').value = '';
      }).catch(function (err) {
        msg.style.color = 'var(--sale)'; msg.textContent = err.message;
      });
    }
  });

  // Account creation and login use MongoDB-backed accounts with an HTTP-only session cookie.
  var authMode = 'register';
  function setAuthMode(mode) {
    authMode = mode;
    $('#authTitle').textContent = mode === 'register' ? 'Create your account' : 'Log in to Weft';
    $('#authNameWrap').hidden = mode !== 'register';
    $('#authName').required = mode === 'register';
    $('#authPassword').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    $('#authSubmit').textContent = mode === 'register' ? 'Create account' : 'Log in';
    $('#authErr').textContent = '';
    document.querySelectorAll('[data-auth-mode]').forEach(function (b) { b.className = 'btn' + (b.dataset.authMode === mode ? '' : ' alt'); });
  }
  function openAccount() {
    $('#authOverlay').hidden = false;
    api('/api/auth/me').then(function (r) {
      if (r.user) {
        $('#authTitle').textContent = 'Hello, ' + r.user.name;
        $('#authForm').hidden = true; $('#authLogout').hidden = false;
        $('#openAccount').textContent = r.user.name.split(' ')[0];
      } else {
        $('#authForm').hidden = false; $('#authLogout').hidden = true; setAuthMode('register');
      }
    }).catch(function () { $('#authForm').hidden = false; setAuthMode('register'); });
  }
  $('#openAccount').addEventListener('click', openAccount);
  $('#closeAccount').addEventListener('click', function () { $('#authOverlay').hidden = true; });
  $('#authOverlay').addEventListener('click', function (e) { if (e.target === $('#authOverlay')) $('#authOverlay').hidden = true; });
  document.querySelectorAll('[data-auth-mode]').forEach(function (b) { b.addEventListener('click', function () { $('#authForm').hidden = false; $('#authLogout').hidden = true; setAuthMode(b.dataset.authMode); }); });
  $('#authForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.currentTarget, data = { email: form.elements.email.value.trim(), password: form.elements.password.value };
    if (authMode === 'register') data.name = form.elements.name.value.trim();
    $('#authErr').textContent = '';
    $('#authSubmit').disabled = true;
    api('/api/auth/' + authMode, { method: 'POST', body: JSON.stringify(data) }).then(function (r) {
      $('#authTitle').textContent = 'Hello, ' + r.user.name;
      $('#authForm').hidden = true; $('#authLogout').hidden = false;
      $('#openAccount').textContent = r.user.name.split(' ')[0];
    }).catch(function (err) { $('#authErr').textContent = err.message; }).finally(function () { $('#authSubmit').disabled = false; });
  });
  $('#authLogout').addEventListener('click', function () {
    api('/api/auth/logout', { method: 'POST', body: '{}' }).then(function () {
      $('#authOverlay').hidden = true; $('#authForm').reset(); $('#authForm').hidden = false; $('#authLogout').hidden = true; $('#openAccount').textContent = 'Create account / Log in';
    });
  });
  api('/api/auth/me').then(function (r) { if (r.user) $('#openAccount').textContent = r.user.name.split(' ')[0]; }).catch(function () {});

  renderChips();
  renderCloth();
  renderCart();
  init();
})();
