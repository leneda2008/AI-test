export const CART_KEY = 'nova-cart';
export const WISHLIST_KEY = 'nova-wishlist';
export const RECENT_KEY = 'nova-recently-viewed';
export const COMPARE_KEY = 'nova-compare';
export const THEME_KEY = 'nova-theme';

export const formatPrice = value => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
export function calculateTotals(subtotal, shipping = 0, discountPercent = 0) { const discount = Math.round(subtotal * discountPercent / 100); return { subtotal, discount, shipping, total: Math.max(0, subtotal - discount + shipping) }; }
export function readJSON(key, fallback = null) { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } }
export function readText(key, fallback = '') { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
export function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
export function writeText(key, value) { try { localStorage.setItem(key, String(value)); return true; } catch { return false; } }
export function removeStored(key) { try { localStorage.removeItem(key); return true; } catch { return false; } }
export function readStore(key, fallback = []) { const value = readJSON(key, fallback); return Array.isArray(value) ? value : fallback; }
export function writeStore(key, value) { if (!writeJSON(key, value)) return false; window.dispatchEvent(new CustomEvent('nova:state-change', { detail: { key } })); return true; }
export const getCart = () => readStore(CART_KEY).filter(row => row && Number.isInteger(Number(row.id)) && Number.isFinite(Number(row.quantity)) && Number(row.quantity) >= 1).map(row => ({...row,id:Number(row.id),quantity:Math.floor(Number(row.quantity)),size:String(row.size||'One size'),color:String(row.color||'Natural')}));
export const getWishlist = () => [...new Set(readStore(WISHLIST_KEY).map(Number).filter(id=>Number.isInteger(id)&&id>0))];
export const getRecentlyViewed = () => [...new Set(readStore(RECENT_KEY).map(Number).filter(id=>Number.isInteger(id)&&id>0))].slice(0,6);
export const getCompare = () => [...new Set(readStore(COMPARE_KEY).map(Number).filter(id=>Number.isInteger(id)&&id>0))].slice(0,3);
export function cartCount() { return getCart().reduce((total, row) => total + Number(row.quantity || 0), 0); }
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function notify(message, type = 'success') {
  let node = document.querySelector('[data-toast]');
  if (!node) { node = document.createElement('div'); node.className = 'toast'; node.dataset.toast = ''; node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite'); document.body.append(node); }
  const icons = { success: '✓', error: '!', warning: '△', info: 'i' };
  node.innerHTML = `<span class="toast-icon" aria-hidden="true">${icons[type] || icons.info}</span><span>${escapeHtml(message)}</span>`;
  node.className = `toast toast--${type} is-visible`;
  clearTimeout(window.novaToastTimer);
  window.novaToastTimer = setTimeout(() => node.classList.remove('is-visible'), 3000);
}
export const showToast = notify;
const modalHandlers = new WeakMap(), modalFocus = new WeakMap();
export function openModal(modal) {
  if (!modal) return;
  modalFocus.set(modal, document.activeElement);
  modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('modal-open');
  const focusable = () => [...modal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(item => item.offsetParent !== null);
  const handler = event => {
    if (event.key === 'Escape') { closeModal(modal); return; }
    if (event.key !== 'Tab') return;
    const items=focusable(); if(!items.length){event.preventDefault();modal.focus();return;}
    if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1).focus();}
    else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0].focus();}
  };
  modalHandlers.set(modal,handler);document.addEventListener('keydown',handler);
  requestAnimationFrame(()=>{const target=focusable()[0];target?.focus();});
}
export function closeModal(modal) {
  if (!modal || !modal.classList.contains('is-open')) return;
  modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true');
  const handler=modalHandlers.get(modal);if(handler)document.removeEventListener('keydown',handler);modalHandlers.delete(modal);
  if(!document.querySelector('[aria-modal="true"].is-open'))document.body.classList.remove('modal-open');
  const previous=modalFocus.get(modal);if(previous?.isConnected)previous.focus();
}

export function updateCounters() {
  const count = cartCount();
  document.querySelectorAll('[data-cart-count]').forEach(el => { el.textContent = count; el.hidden = count === 0; });
  const wishes = getWishlist().length;
  document.querySelectorAll('[data-wishlist-count]').forEach(el => { el.textContent = wishes; el.hidden = wishes === 0; });
  const compared = getCompare().length;
  document.querySelectorAll('[data-compare-count]').forEach(el => { el.textContent = compared; el.hidden = compared === 0; });
}
export function addToCart(productId, quantity = 1, size = 'One size', color = 'Natural') {
  const id = Number(productId); let stock = id === 14 ? 0 : ([6, 10, 23].includes(id) ? 3 : 18 + id);
  try { const saved = JSON.parse(localStorage.getItem('nova-product-catalog') || '[]').find(item => Number(item.id) === id); if (saved) stock = Math.max(0, Number(saved.stock || 0)); } catch {}
  const cart = getCart(); const key = `${id}:${size}:${color}`;
  const row = cart.find(item => `${item.id}:${item.size}:${item.color}` === key);
  const already = row?.quantity || 0, requested = Math.max(1, Number(quantity) || 1);
  if (!stock || already + requested > stock) { notify(stock ? `Only ${stock - already} available` : 'This item is out of stock', 'warning'); return false; }
  if (row) row.quantity += requested; else cart.push({ id, quantity: requested, size, color });
  if (!writeStore(CART_KEY, cart)) { notify('Your browser could not save the cart. Please check storage settings.', 'error'); return false; } updateCounters(); window.dispatchEvent(new CustomEvent('nova:cart-added')); return true;
}
export function removeFromCart(productId, size, color) { writeStore(CART_KEY, getCart().filter(row => !(row.id === Number(productId) && row.size === size && row.color === color))); updateCounters(); }
export function updateCart(cart) { writeStore(CART_KEY, cart); updateCounters(); }
export function toggleWishlist(productId) {
  const id = Number(productId), list = getWishlist();
  const next = list.includes(id) ? list.filter(item => item !== id) : [...list, id];
  writeStore(WISHLIST_KEY, next); updateCounters(); return next.includes(id);
}
export function addToWishlist(productId) { const list = getWishlist(); if (!list.includes(Number(productId))) writeStore(WISHLIST_KEY, [...list, Number(productId)]); updateCounters(); }
export function removeFromWishlist(productId) { writeStore(WISHLIST_KEY, getWishlist().filter(id => id !== Number(productId))); updateCounters(); }
export function saveRecentlyViewed(productId) {
  const id = Number(productId); const next = [id, ...getRecentlyViewed().filter(item => item !== id)].slice(0, 6);
  writeStore(RECENT_KEY, next); return next;
}
export function toggleCompare(productId) {
  const id = Number(productId), current = getCompare();
  if (current.includes(id)) { const next = current.filter(item => item !== id); writeStore(COMPARE_KEY, next); updateCounters(); return { added: false, ids: next }; }
  if (current.length >= 3) return { added: false, limit: true, ids: current };
  const next = [...current, id]; writeStore(COMPARE_KEY, next); updateCounters(); return { added: true, ids: next };
}
