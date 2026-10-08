import { products, stockState } from './products.js';
import { CART_KEY, formatPrice, getCart, writeStore, notify, escapeHtml } from './utils.js';

export function initCart() {
  const root = document.querySelector('#cart-content'); if (!root) return;
  const render = () => {
    const focusedAction=document.activeElement?.closest('[data-row]')?{row:document.activeElement.closest('[data-row]').dataset.row,action:document.activeElement.dataset.action}:null;
    const storedCart=getCart(),cart = storedCart.map(row => ({ ...row, product: products.find(item => item.id === row.id) })).filter(row => row.product);
    if(cart.length!==storedCart.length)writeStore(CART_KEY,cart.map(({product,...row})=>row));
    const itemCount = cart.reduce((sum, row) => sum + row.quantity, 0);
    document.querySelector('#cart-item-count').textContent = `${itemCount} ${itemCount === 1 ? 'piece' : 'pieces'} chosen with care.`;
    if (!cart.length) {
      root.innerHTML = `<div class="empty-state cart-empty"><span aria-hidden="true">♡</span><h2>Your bag is waiting for something special.</h2><p>Choose a considered piece and it will be ready here when you are.</p><a href="shop.html" class="btn btn-dark mt-4">Continue shopping ↗</a></div>`;
      return;
    }
    const subtotal = cart.reduce((sum, row) => sum + (row.product.oldPrice || row.product.price) * row.quantity, 0);
    const savings = cart.reduce((sum, row) => sum + (row.product.oldPrice ? row.product.oldPrice - row.product.price : 0) * row.quantity, 0);
    const discountedSubtotal = subtotal - savings;
    const shipping = discountedSubtotal >= 75000 ? 0 : 5000;
    root.innerHTML = `<section class="cart-items">${cart.map(row => `<article class="cart-item" data-row="${row.id}:${escapeHtml(row.size)}:${escapeHtml(row.color)}"><a href="product.html?id=${row.id}" class="cart-item-image"><img src="${escapeHtml(row.product.image)}" alt="${escapeHtml(row.product.name)}"></a><div class="cart-item-main"><a class="cart-item-name" href="product.html?id=${row.id}">${escapeHtml(row.product.name)}</a><p>${escapeHtml(row.size)} · ${escapeHtml(row.color)}</p><small class="drawer-stock">${stockState(row.product)}</small><div class="cart-line-bottom"><div class="quantity-control"><button data-action="minus" aria-label="Decrease quantity">−</button><span>${row.quantity}</span><button data-action="plus" aria-label="Increase quantity">+</button></div><button class="remove-button" data-action="remove">Remove</button></div></div><strong class="cart-line-price">${formatPrice(row.product.price * row.quantity)}</strong></article>`).join('')}<button id="clear-cart" class="text-link clear-cart">Clear bag</button><a href="shop.html" class="continue-link">← Continue browsing</a></section><aside class="order-summary"><p class="eyebrow">THE DETAILS</p><h2>Order summary</h2><div class="summary-row"><span>Subtotal</span><strong>${formatPrice(subtotal)}</strong></div>${savings ? `<div class="summary-row discount-row"><span>Collection savings</span><strong>− ${formatPrice(savings)}</strong></div>` : ''}<div class="summary-row"><span>Delivery</span><strong>${shipping ? formatPrice(shipping) : 'Complimentary'}</strong></div><p class="shipping-note">${discountedSubtotal >= 75000 ? 'You have complimentary delivery.' : `Add ${formatPrice(75000 - discountedSubtotal)} for complimentary delivery.`}</p><div class="summary-total"><span>Total</span><strong>${formatPrice(discountedSubtotal + shipping)}</strong></div><a class="btn btn-dark w-full" href="checkout.html">Continue to checkout ↗</a><p class="secure-note">Secure checkout · Payment demo only</p></aside>`;
    if(focusedAction){const row=[...root.querySelectorAll('[data-row]')].find(item=>item.dataset.row===focusedAction.row);const target=row?.querySelector(`[data-action="${focusedAction.action}"]`)||root.querySelector('.cart-item [data-action],.cart-empty a');target?.focus();}
  };
  root.addEventListener('click', event => {
    if (event.target.closest('#clear-cart')) { writeStore(CART_KEY, []); notify('Cart cleared', 'info'); render(); return; }
    const itemElement = event.target.closest('[data-row]'); if (!itemElement) return;
    const [rawId, size, color] = itemElement.dataset.row.split(':');
    const id = Number(rawId), cart = getCart();
    const row = cart.find(item => item.id === id && item.size === size && item.color === color); if (!row) return;
    const decrement = Boolean(event.target.closest('[data-action="minus"]'));
    const remove = Boolean(event.target.closest('[data-action="remove"]'));
    const increment = Boolean(event.target.closest('[data-action="plus"]'));
    if (!decrement && !remove && !increment) return;
    if (increment) { if(row.quantity>=Number(products.find(item=>item.id===id)?.stock||0)){notify('Available stock limit reached','warning');return;} row.quantity++; }
    else if (decrement) row.quantity--;
    if (remove || row.quantity < 1) {
      writeStore(CART_KEY, cart.filter(item => !(item.id === id && item.size === size && item.color === color)));
      notify('Item removed from cart', 'info');
      return;
    }
    writeStore(CART_KEY, cart);
  });
  window.addEventListener('nova:state-change', render);
  render();
}
