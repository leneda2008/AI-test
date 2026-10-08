import { products } from './products.js';
import { formatPrice, notify, readJSON, writeJSON, writeStore, getCart, getWishlist, getRecentlyViewed, getCompare, CART_KEY, WISHLIST_KEY, RECENT_KEY, COMPARE_KEY, escapeHtml } from './utils.js';

const ORDER_KEY = 'nova-orders';
const STATUS_KEY = 'nova-admin-orders';
const DELETED_KEY = 'nova-deleted-products';
const mockCustomers = [
  { name: 'Amina Okafor', email: 'amina@example.com', orders: 4, total: 286000 },
  { name: 'Tomi Rhodes', email: 'tomi@example.com', orders: 2, total: 154000 },
  { name: 'Nneka Eze', email: 'nneka@example.com', orders: 3, total: 219000 }
];
const chartData = [128, 182, 148, 246, 198, 286, 232];
let deleted = readArray(DELETED_KEY);
let statuses = readObject(STATUS_KEY);
const orderHeader=document.querySelector('#admin-orders')?.closest('table')?.tHead?.rows?.[0];
if(orderHeader&&orderHeader.cells.length===5){const cell=orderHeader.insertCell(2);cell.outerHTML='<th scope="col">Items</th>';}

function readArray(key) { const value = readJSON(key, []); return Array.isArray(value) ? value : []; }
function readObject(key) { const value = readJSON(key, {}); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
function saveCatalog() { writeJSON('nova-product-catalog', [...products, ...deleted.map(id => ({ id, deleted: true }))]); }

function render() {
  const orders = readArray(ORDER_KEY).filter(order => order && typeof order.id === 'string');
  statuses = readObject(STATUS_KEY);
  document.querySelector('#admin-revenue').textContent = formatPrice(orders.reduce((sum, order) => sum + Number(order.amount || 0), 0) + 1234000);
  document.querySelector('#admin-order-count').textContent = orders.length + 24;
  document.querySelector('#admin-product-count').textContent = products.length;
  document.querySelector('#admin-customer-count').textContent = mockCustomers.length + orders.length;
  document.querySelector('#admin-chart').innerHTML = chartData.map((value, index) => `<div><i style="height:${value / 3}px"></i><small>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}</small></div>`).join('');

  const demoOrders = [
    { id: 'NOVA-10294', customer: 'Amina Okafor', date: '2026-10-04', amount: 94000, status: 'Shipped', items: [{ name: 'Sunday Linen Shirt', quantity: 1 }] },
    { id: 'NOVA-48291', customer: 'Tomi Rhodes', date: '2026-10-06', amount: 62000, status: 'Processing', items: [{ name: 'The Form Tee', quantity: 1 }] }
  ];
  document.querySelector('#admin-orders').innerHTML = [...orders, ...demoOrders].slice(0, 8).map(order => {
    const itemText = (order.items || []).map(item => `${item.name} × ${item.quantity}`).join(', ') || 'NOVA edit';
    const status = statuses[order.id] || order.status || 'Processing';
    return `<tr><td>${escapeHtml(order.id)}</td><td>${escapeHtml(order.customer || 'NOVA customer')}</td><td title="${escapeHtml(itemText)}">${escapeHtml(itemText)}</td><td>${new Date(order.date).toLocaleDateString('en-NG')}</td><td>${formatPrice(order.amount || 0)}</td><td><select data-order-status="${escapeHtml(order.id)}" aria-label="Order status for ${escapeHtml(order.id)}">${['Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'].map(value => `<option ${status === value ? 'selected' : ''}>${value}</option>`).join('')}</select></td></tr>`;
  }).join('');

  document.querySelector('#admin-products').innerHTML = products.map(product => `<article class="admin-product-row"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" width="45" height="52"><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.category)} · ${formatPrice(product.price)}</small></div><label>Stock<input type="number" min="0" value="${Number(product.stock) || 0}" data-stock-edit="${product.id}" aria-label="Stock for ${escapeHtml(product.name)}"></label><span class="admin-stock-state">${Number(product.stock) === 0 ? 'Out of stock' : Number(product.stock) <= 5 ? 'Low stock' : 'In stock'}</span><button data-edit-product="${product.id}" aria-label="Edit ${escapeHtml(product.name)}">Edit</button><button data-delete-product="${product.id}" aria-label="Delete ${escapeHtml(product.name)}">Delete</button></article>`).join('');
  document.querySelector('#admin-customers').innerHTML = mockCustomers.map(customer => `<tr><td>${escapeHtml(customer.name)}</td><td>${escapeHtml(customer.email)}</td><td>${customer.orders}</td><td>${formatPrice(customer.total)}</td></tr>`).join('');
}

const form = document.querySelector('#admin-product-form');
document.querySelector('[data-add-product]').addEventListener('click', () => { form.hidden = false; form.dataset.edit = ''; form.reset(); form.elements.name.focus(); });
document.querySelector('[data-cancel-product]').addEventListener('click', () => { form.hidden = true; });
form.addEventListener('submit', event => {
  event.preventDefault(); if (!form.reportValidity()) return;
  const data = new FormData(form);
  const id = form.dataset.edit ? Number(form.dataset.edit) : Math.max(...products.map(item => item.id), ...deleted, 0) + 1;
  const existing = products.find(item => item.id === id);
  const image = String(data.get('image')).trim();
  if (!/^https?:\/\//i.test(image)) { form.elements.image.setCustomValidity('Enter a valid http or https image URL.'); form.elements.image.reportValidity(); form.elements.image.setCustomValidity(''); return; }
  const updated = { ...(existing || {}), id, name: String(data.get('name')).trim(), category: data.get('category'), type: ['Men', 'Women'].includes(data.get('category')) ? 'Clothing' : data.get('category'), price: Number(data.get('price')), oldPrice: existing?.oldPrice || null, rating: existing?.rating || 4.8, reviews: existing?.reviews || 0, image, images: existing?.images || [image], description: existing?.description || 'A considered NOVA essential, made for everyday wear.', sizes: existing?.sizes || ['S', 'M', 'L', 'XL'], colors: existing?.colors || ['Black', 'Ecru'], stock: Number(data.get('stock')), featured: existing?.featured || false, isNew: !existing, trending: existing?.trending || false, onSale: existing?.onSale || false, tags: existing?.tags || [] };
  if (existing) Object.assign(existing, updated); else products.push(updated);
  deleted = deleted.filter(deletedId => deletedId !== id);
  writeJSON(DELETED_KEY, deleted); saveCatalog(); form.hidden = true; render(); notify(existing ? 'Product updated' : 'Product added');
});

document.addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit-product]');
  const deleteButton = event.target.closest('[data-delete-product]');
  if (editButton) {
    const product = products.find(item => item.id === Number(editButton.dataset.editProduct));
    if (!product) return;
    form.hidden = false; form.dataset.edit = product.id;
    for (const key of ['name', 'category', 'price', 'stock', 'image']) form.elements[key].value = product[key];
    form.scrollIntoView({ behavior: 'smooth', block: 'center' }); form.elements.name.focus();
  }
  if (deleteButton) {
    const id = Number(deleteButton.dataset.deleteProduct), index = products.findIndex(item => item.id === id);
    if (index < 0) return;
    products.splice(index, 1); deleted = [...new Set([...deleted, id])]; writeJSON(DELETED_KEY, deleted); saveCatalog();
    writeStore(CART_KEY,getCart().filter(item=>item.id!==id));writeStore(WISHLIST_KEY,getWishlist().filter(item=>item!==id));writeStore(RECENT_KEY,getRecentlyViewed().filter(item=>item!==id));writeStore(COMPARE_KEY,getCompare().filter(item=>item!==id));
    render(); notify('Product removed from the local catalog', 'info');
  }
  if (event.target.closest('[data-admin-menu]')) {
    const sidebar = document.querySelector('#admin-sidebar'), button = event.target.closest('[data-admin-menu]');
    const open = sidebar.classList.toggle('is-open');if(matchMedia('(max-width: 760px)').matches)sidebar.inert=!open;button.setAttribute('aria-expanded', String(open));button.setAttribute('aria-label', open ? 'Close dashboard menu' : 'Open dashboard menu');if(open)sidebar.querySelector('nav a')?.focus();
  }
});

document.addEventListener('change', event => {
  const stockInput = event.target.closest('[data-stock-edit]'), statusSelect = event.target.closest('[data-order-status]');
  if (stockInput) {
    const product = products.find(item => item.id === Number(stockInput.dataset.stockEdit));
    if (product) { product.stock = Math.max(0, Number(stockInput.value) || 0); saveCatalog();const label=stockInput.closest('.admin-product-row').querySelector('.admin-stock-state');label.textContent=product.stock===0?'Out of stock':product.stock<=5?'Low stock':'In stock';notify('Stock updated'); }
  }
  if (statusSelect) {
    statuses[statusSelect.dataset.orderStatus] = statusSelect.value; writeJSON(STATUS_KEY, statuses);
    const orders = readArray(ORDER_KEY), order = orders.find(item => item.id === statusSelect.dataset.orderStatus);
    if (order) { order.status = statusSelect.value; writeJSON(ORDER_KEY, orders); }
    notify('Demo order status updated');
  }
});

const adminSidebar=document.querySelector('#admin-sidebar'),adminMenuButton=document.querySelector('[data-admin-menu]');if(matchMedia('(max-width: 760px)').matches)adminSidebar.inert=true;
document.querySelectorAll('.admin-sidebar nav a').forEach(link => link.addEventListener('click', () => {
  adminSidebar.classList.remove('is-open');if(matchMedia('(max-width: 760px)').matches)adminSidebar.inert=true;
  document.querySelector('[data-admin-menu]').setAttribute('aria-expanded', 'false');
  if(matchMedia('(max-width: 760px)').matches)adminMenuButton.focus();
}));
window.addEventListener('resize',()=>{if(matchMedia('(max-width: 760px)').matches)adminSidebar.inert=!adminSidebar.classList.contains('is-open');else{adminSidebar.inert=false;adminSidebar.classList.remove('is-open');adminMenuButton.setAttribute('aria-expanded','false');}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&adminSidebar.classList.contains('is-open')){adminSidebar.classList.remove('is-open');adminSidebar.inert=true;adminMenuButton.setAttribute('aria-expanded','false');adminMenuButton.focus();}if(event.key==='Tab'&&adminSidebar.classList.contains('is-open')){const links=[...adminSidebar.querySelectorAll('a[href]')];if(event.shiftKey&&document.activeElement===links[0]){event.preventDefault();links.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===links.at(-1)){event.preventDefault();links[0].focus();}}});
render();
