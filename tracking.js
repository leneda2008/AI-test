import { readJSON, escapeHtml } from './utils.js';

const stages = ['Order Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
const demoOrders = [
  { id: 'NOVA-10294', date: '2026-10-04', status: 'Shipped', delivery: '2026-10-10', location: 'Victoria Island, Lagos', items: [{ name: 'Sunday Linen Shirt', quantity: 1, image: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=240&q=80' }] },
  { id: 'NOVA-48291', date: '2026-10-06', status: 'Processing', delivery: '2026-10-12', location: 'Uyo, Akwa Ibom', items: [{ name: 'The Form Tee', quantity: 1, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=240&q=80' }] }
];
const form = document.querySelector('#tracking-form');
const field = document.querySelector('#tracking-number');
const result = document.querySelector('#tracking-result');
field.pattern='NOVA-[0-9]{5}';field.title='Enter a NOVA order number, for example NOVA-10294.';field.autocomplete='off';field.addEventListener('input',()=>{field.value=field.value.toUpperCase();});

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'To be confirmed' : date.toLocaleDateString('en-NG', { dateStyle: 'long' });
}
function render(order) {
  if (!order) {
    result.innerHTML = '<div class="tracking-error"><h2>We could not find that order.</h2><p>Check the number and try again. Demo orders include NOVA-10294 and NOVA-48291.</p></div>';
    return;
  }
  const currentStatus = stages.includes(order.status) ? order.status : 'Processing';
  const activeStage = stages.indexOf(currentStatus);
  const items = Array.isArray(order.items) ? order.items.filter(item => item && typeof item.name === 'string') : [];
  result.innerHTML = `<article class="tracking-card"><div class="tracking-card-head"><div><p class="eyebrow">ORDER ${escapeHtml(order.id)}</p><h2>${escapeHtml(currentStatus)}</h2><p>Placed ${formatDate(order.date)} · Estimated delivery ${formatDate(order.delivery)}</p></div><span class="tracking-pill">${escapeHtml(currentStatus)}</span></div><div class="tracking-progress" aria-label="Order progress">${stages.map((stage, index) => `<div class="tracking-stage ${index <= activeStage ? 'is-complete' : ''} ${index === activeStage ? 'is-current' : ''}"><span aria-hidden="true">${index < activeStage ? '✓' : index + 1}</span><small>${stage}</small></div>`).join('')}</div><div class="tracking-detail-grid"><section><h3>Items in this order</h3>${items.length ? items.map(item => `<div class="tracking-item"><img src="${escapeHtml(item.image || '')}" alt="" loading="lazy" width="45" height="55"><span>${escapeHtml(item.name)}<small>Quantity ${Number(item.quantity) || 1}</small></span></div>`).join('') : '<p>Item details are unavailable in this demo record.</p>'}</section><section><h3>Delivery location</h3><p>${escapeHtml(order.location || 'Lagos, Nigeria')}</p><small>This order status is a local frontend simulation.</small></section></div></article>`;
}
function findOrder(id) {
  const savedOrders = readJSON('nova-orders', []), orders = Array.isArray(savedOrders) ? savedOrders : [];
  let order = orders.find(item => item && typeof item.id === 'string' && item.id.toUpperCase() === id);
  order ||= demoOrders.find(item => item.id === id);
  if (!order) return null;
  const savedStatuses = readJSON('nova-admin-orders', {}), statuses = savedStatuses && typeof savedStatuses === 'object' && !Array.isArray(savedStatuses) ? savedStatuses : {};
  return { ...order, status: statuses[order.id] || order.status };
}

form.addEventListener('submit', event => { event.preventDefault(); render(findOrder(field.value.trim().toUpperCase())); });
const initialOrder = new URLSearchParams(location.search).get('order');
if (initialOrder) { field.value = initialOrder; render(findOrder(initialOrder.toUpperCase())); }
