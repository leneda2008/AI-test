import { products, persistCatalog } from './products.js';
import { CART_KEY, formatPrice, getCart, writeStore, escapeHtml, notify, calculateTotals, readJSON, readText, writeJSON, removeStored } from './utils.js';

const PROMOS = { NOVA10: 10, WELCOME15: 15, FIRSTORDER: 15 };
export function applyCoupon(code) { const normalized = String(code || '').trim().toUpperCase(); return Object.prototype.hasOwnProperty.call(PROMOS, normalized) ? { valid: true, code: normalized, percent: PROMOS[normalized] } : { valid: false, code: normalized, percent: 0 }; }
const DELIVERY = {
  Nigeria: {
    'Akwa Ibom': { Uyo: [2500, '3–5 business days'], Eket: [3500, '4–6 business days'] },
    Lagos: { Ikeja: [2500, '1–2 business days'], 'Lagos Island': [3000, '1–3 business days'], Lekki: [3500, '2–3 business days'] },
    Rivers: { 'Port Harcourt': [3000, '2–4 business days'] }, 'Abuja/FCT': { Abuja: [3000, '2–4 business days'] },
    'Cross River': { Calabar: [3500, '4–6 business days'] }, Enugu: { Enugu: [3500, '3–5 business days'] },
    Anambra: { Awka: [3500, '3–5 business days'], Onitsha: [3500, '3–5 business days'] }, Delta: { Asaba: [4000, '4–6 business days'], Warri: [4000, '4–6 business days'] }
  },
  Ghana: { 'Greater Accra': { Accra: [6500, '5–7 business days'], Tema: [7500, '6–8 business days'] } },
  Kenya: { 'Nairobi County': { Nairobi: [9000, '6–9 business days'] } },
  'South Africa': { Gauteng: { Johannesburg: [11000, '7–10 business days'], Pretoria: [11000, '7–10 business days'] } }
};

export function initCheckout() {
  const root = document.querySelector('#checkout-root'); if (!root) return;
  const storedCart=getCart(),cart = storedCart.map(row => ({ ...row, product: products.find(p => p.id === row.id) })).filter(row => row.product);
  if(cart.length!==storedCart.length)writeStore(CART_KEY,cart.map(({product,...row})=>row));
  if (!cart.length) { root.innerHTML = `<div class="empty-state"><span>↗</span><h2>Your next favourite is waiting.</h2><p>Your bag is currently empty.</p><a href="shop.html" class="btn btn-dark mt-4">Browse NOVA ↗</a></div>`; return; }
  const subtotal = cart.reduce((sum, row) => sum + (row.product.oldPrice || row.product.price) * row.quantity, 0);
  const collectionSavings = cart.reduce((sum, row) => sum + (row.product.oldPrice ? row.product.oldPrice - row.product.price : 0) * row.quantity, 0);
  const itemTotal = subtotal - collectionSavings;
  const restoredPromo = readText('nova-promo');
  const storedDelivery=readJSON('nova-delivery',{}),restoredDelivery=storedDelivery&&typeof storedDelivery==='object'&&!Array.isArray(storedDelivery)?storedDelivery:{};
  let appliedPromo = PROMOS[restoredPromo] ? restoredPromo : '', selectedCountry = DELIVERY[restoredDelivery.country] ? restoredDelivery.country : 'Nigeria', selectedState = DELIVERY[selectedCountry]?.[restoredDelivery.state] ? restoredDelivery.state : '', selectedCity = DELIVERY[selectedCountry]?.[restoredDelivery.state]?.[restoredDelivery.city] ? restoredDelivery.city : '';

  root.innerHTML = `<form id="checkout-form" class="checkout-layout"><section class="checkout-form"><div class="checkout-section"><p class="eyebrow">01 · THE DETAILS</p><h2>Contact information</h2><div class="form-grid"><label class="span-2">Full name<input name="fullName" autocomplete="name" required></label><label>Email address<input name="email" type="email" autocomplete="email" required></label><label>Phone number<input name="phone" type="tel" autocomplete="tel" required></label></div></div><div class="checkout-section"><p class="eyebrow">02 · THE DESTINATION</p><h2>Shipping address</h2><div class="form-grid"><label class="span-2">Street address<input name="address" autocomplete="street-address" required></label><label>Country<select name="country" id="delivery-country" required>${Object.keys(DELIVERY).map(country => `<option ${country === selectedCountry ? 'selected' : ''}>${escapeHtml(country)}</option>`).join('')}</select></label><label>State / region<select name="state" id="delivery-state"><option value="">Select state</option></select></label><label>City<select name="city" id="delivery-city"><option value="">Select city</option></select></label><label>Postal code<input name="postal" autocomplete="postal-code" required></label></div><div class="delivery-estimator"><div><p class="eyebrow">ESTIMATE DELIVERY</p><h3>When will it arrive?</h3></div><div class="delivery-estimate-result" id="delivery-estimate-result"><span>Choose a state and city</span><strong>Estimated fee: <b id="delivery-fee-label">${formatPrice(itemTotal >= 75000 ? 0 : 5000)}</b></strong></div></div></div><div class="checkout-section"><p class="eyebrow">03 · THE PAYMENT</p><h2>Choose how to pay</h2><p class="demo-note">For demonstration only. No payment details are sent or stored.</p><div class="payment-options"><label><input type="radio" name="payment" value="card" checked><span>Card <small>Demo selection</small></span></label><label><input type="radio" name="payment" value="transfer"><span>Bank transfer <small>Demo selection</small></span></label><label><input type="radio" name="payment" value="cod"><span>Cash on delivery <small>Demo selection</small></span></label></div><div id="mock-card-fields" class="mock-card-fields"><label>Card number (demo)<input placeholder="••••  ••••  ••••  ••••" inputmode="none" autocomplete="off" readonly aria-label="Card number placeholder for demonstration"></label><div class="form-grid"><label>Expiry<input placeholder="MM / YY" readonly></label><label>Security code<input placeholder="•••" readonly></label></div></div></div><button class="btn btn-dark w-full place-order">Place demo order ↗</button><p class="checkout-privacy">This frontend demo does not process payments or retain your personal details.</p></section><aside class="order-summary checkout-summary"><p class="eyebrow">YOUR NOVA EDIT</p><h2>Order summary</h2><div class="checkout-lines">${cart.map(row => `<div class="checkout-line"><img src="${escapeHtml(row.product.image)}" alt="${escapeHtml(row.product.name)}"><div><strong>${escapeHtml(row.product.name)}</strong><span>${row.quantity} × ${formatPrice(row.product.price)}</span></div><b>${formatPrice(row.quantity * row.product.price)}</b></div>`).join('')}</div><div class="promo-entry"><label for="promo-code">Promo code</label><div><input id="promo-code" autocomplete="off" placeholder="Enter code" value="${escapeHtml(restoredPromo)}"><button type="button" id="apply-promo" class="btn btn-outline">Apply</button></div><p id="promo-message" aria-live="polite"></p></div><div class="summary-row"><span>Subtotal</span><strong id="checkout-subtotal">${formatPrice(subtotal)}</strong></div><div class="summary-row discount-row" id="checkout-collection-row" ${collectionSavings ? "" : "hidden"}><span>Collection savings</span><strong id="checkout-collection-discount">− ${formatPrice(collectionSavings)}</strong></div><div class="summary-row discount-row" id="checkout-discount-row" hidden><span id="checkout-discount-label">Promo discount</span><strong id="checkout-discount"></strong></div><div class="summary-row"><span>Delivery</span><strong id="checkout-shipping"></strong></div><div class="summary-total"><span>Total</span><strong id="checkout-total"></strong></div></aside></form>`;

  const form = root.querySelector('#checkout-form'), countrySelect = root.querySelector('#delivery-country'), stateSelect = root.querySelector('#delivery-state'), citySelect = root.querySelector('#delivery-city'), promoInput = root.querySelector('#promo-code'), promoMessage = root.querySelector('#promo-message');
  form.insertAdjacentHTML('afterbegin','<nav class="checkout-progress" aria-label="Checkout progress"><span>✓ Cart</span><i></i><span class="is-current" aria-current="step">02 Information</span><i></i><span>03 Delivery</span><i></i><span>04 Payment</span></nav>');
  form.elements.phone.pattern='[+0-9()\\s-]{7,20}';form.elements.phone.title='Enter a valid phone number using at least 7 digits.';form.elements.phone.inputMode='tel';form.elements.phone.addEventListener('input',()=>{const digits=form.elements.phone.value.replace(/\D/g,'');form.elements.phone.setCustomValidity(form.elements.phone.value&&digits.length<7?'Enter at least seven digits.':'');});
  let shippingFee = itemTotal >= 75000 ? 0 : 5000, deliveryDays = '';
  const updateSummary = () => {
    const totals = calculateTotals(itemTotal, shippingFee, appliedPromo ? PROMOS[appliedPromo] : 0), discount = totals.discount;
    root.querySelector("#checkout-subtotal").textContent = formatPrice(subtotal);
    root.querySelector("#checkout-collection-row").hidden = !collectionSavings;
    root.querySelector('#checkout-discount-row').hidden = !discount;
    root.querySelector('#checkout-discount-label').textContent = appliedPromo ? `Promo · ${appliedPromo}` : 'Promo discount';
    root.querySelector('#checkout-discount').textContent = `− ${formatPrice(discount)}`;
    root.querySelector('#checkout-shipping').textContent = shippingFee ? formatPrice(shippingFee) : 'Complimentary';
    root.querySelector('#checkout-total').textContent = formatPrice(totals.total);
    root.querySelector('#delivery-fee-label').textContent = shippingFee ? formatPrice(shippingFee) : 'Complimentary';
  };
  const populateStates = (country, preferred = '') => {
    const states = Object.keys(DELIVERY[country] || {});
    stateSelect.innerHTML = `<option value="">Select state</option>${states.map(state => `<option ${state === preferred ? 'selected' : ''}>${escapeHtml(state)}</option>`).join('')}`;
  };
  const populateCities = (country, state, preferred = '') => {
    const cities = Object.keys(DELIVERY[country]?.[state] || {});
    citySelect.innerHTML = `<option value="">Select city</option>${cities.map(city => `<option ${city === preferred ? 'selected' : ''}>${escapeHtml(city)}</option>`).join('')}`;
  };
  populateStates(selectedCountry, selectedState);
  if (selectedState && DELIVERY[selectedCountry]?.[selectedState]) populateCities(selectedCountry, selectedState, selectedCity);
  const estimateDelivery = () => {
    const country = countrySelect.value, state = stateSelect.value, city = citySelect.value, delivery = DELIVERY[country]?.[state]?.[city];
    if (delivery) {
      [shippingFee, deliveryDays] = delivery;
      root.querySelector('#delivery-estimate-result').innerHTML = `<span>Estimated delivery<strong>${deliveryDays}</strong></span><strong>Delivery fee <b id="delivery-fee-label">${formatPrice(shippingFee)}</b></strong>`;
      writeJSON('nova-delivery', { country, state, city });
    } else {
      shippingFee = itemTotal >= 75000 ? 0 : 5000; deliveryDays = '';
      root.querySelector('#delivery-estimate-result').innerHTML = `<span>Choose a state and city</span><strong>Estimated fee: <b id="delivery-fee-label">${formatPrice(shippingFee)}</b></strong>`;
      removeStored('nova-delivery');
    }
    updateSummary();
  };
  countrySelect.addEventListener('change', () => { selectedCountry = countrySelect.value; selectedState = ''; selectedCity = ''; populateStates(selectedCountry); populateCities(selectedCountry, ''); estimateDelivery(); });
  stateSelect.addEventListener('change', () => { selectedState = stateSelect.value; selectedCity = ''; populateCities(selectedCountry, selectedState); estimateDelivery(); });
  citySelect.addEventListener('change', () => { selectedCity = citySelect.value; estimateDelivery(); });
  if (selectedState && selectedCity) estimateDelivery();

  root.querySelector('#apply-promo').addEventListener('click', () => {
    const code = promoInput.value.trim().toUpperCase();
    const coupon = applyCoupon(code);
    if (!coupon.valid) { promoMessage.textContent = 'That code isn’t valid. Check it and try again.'; promoMessage.className = 'promo-error'; notify('Invalid promo code', 'error'); return; }
    if (appliedPromo === code) { promoMessage.textContent = 'This code is already applied to your order.'; promoMessage.className = 'promo-warning'; notify('That promo code is already applied', 'warning'); return; }
    appliedPromo = code; promoInput.value = code; writeText('nova-promo', code);
    promoMessage.textContent = `${code} applied — ${PROMOS[code]}% off your subtotal.`; promoMessage.className = 'promo-success'; notify('Promo code applied'); updateSummary();
  });
  promoInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); root.querySelector('#apply-promo').click(); } });
  promoInput.addEventListener('input', () => { if (appliedPromo && promoInput.value.trim().toUpperCase() !== appliedPromo) { appliedPromo = ''; removeStored('nova-promo'); updateSummary(); } promoMessage.textContent = ''; });
  form.addEventListener('change', event => { if (event.target.name === 'payment') root.querySelector('#mock-card-fields').hidden = event.target.value !== 'card'; });
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    if (cart.some(row => row.quantity > Number(row.product.stock || 0))) { notify('One or more items are no longer available in that quantity', 'error'); return; }
    const existingOrders=readJSON('nova-orders',[]),knownOrders=Array.isArray(existingOrders)?existingOrders:[];let order;do{order=`NOVA-${Math.floor(10000+Math.random()*90000)}`;}while(knownOrders.some(item=>item?.id===order));
    const storedOrders=readJSON('nova-orders',[]),savedOrders=Array.isArray(storedOrders)?storedOrders.filter(item=>item&&typeof item.id==='string'):[]; savedOrders.unshift({ id: order, date: new Date().toISOString(), status: 'Processing', customer: form.elements.fullName.value, email: form.elements.email.value, amount: Number(root.querySelector('#checkout-total').textContent.replace(/[^0-9]/g,'')), items: cart.map(row => ({ id: row.id, name: row.product.name, image: row.product.image, quantity: row.quantity, size: row.size, color: row.color })), location: `${citySelect.value || 'Lagos'}, ${stateSelect.value || 'Lagos'}, ${countrySelect.value || 'Nigeria'}`, delivery: deliveryDays || '3–5 business days' }); writeJSON('nova-orders', savedOrders);
    cart.forEach(row=>{row.product.stock=Math.max(0,Number(row.product.stock||0)-row.quantity);});persistCatalog();
    writeStore(CART_KEY, []); removeStored('nova-promo'); removeStored('nova-delivery');
    root.innerHTML = `<section class="order-success"><nav class="checkout-progress" aria-label="Order progress"><span>✓ Cart</span><i></i><span>✓ Information</span><i></i><span>✓ Delivery</span><i></i><span class="is-current" aria-current="step">✓ Confirmed</span></nav><div class="success-mark" aria-hidden="true">✓</div><p class="eyebrow">A MOMENT TO ENJOY</p><h1>Order <em>confirmed.</em></h1><p>Thank you for choosing NOVA. Your demo order is ready in this little preview.</p><div class="order-number">ORDER NUMBER<strong>#${order}</strong></div><a href="tracking.html?order=${order}" class="btn btn-outline">Track this order ↗</a> <a href="shop.html" class="btn btn-dark">Back to the collection ↗</a><p class="demo-note">This is a frontend simulation. No order was transmitted or payment processed.</p></section>`;
  });
  updateSummary();
}
