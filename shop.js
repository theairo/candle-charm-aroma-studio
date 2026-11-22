// Shared cart + catalog logic (ES module). Cart lives in localStorage, so it survives moving between pages.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const money = n => `${n} ₴`;

const KEY = "candle-cart-v1";
let cart = [];                                   // [{id, name, price, img, qty}]
try { cart = JSON.parse(localStorage.getItem(KEY)) || []; } catch {}
if (!Array.isArray(cart)) cart = [];

const commit = () => {
  try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {}
  window.dispatchEvent(new Event("cart:change"));
};

export const getCart = () => cart;
export const cartCount = () => cart.reduce((a, i) => a + i.qty, 0);
export const cartTotal = () => cart.reduce((a, i) => a + i.qty * i.price, 0);
export const clearCart = () => { cart = []; commit(); };

export function addToCart(p) {
  const found = cart.find(i => i.id === p.id);
  if (found) found.qty++; else cart.push({ id: p.id, name: p.name, price: Number(p.price), img: p.image_url, qty: 1 });
  commit();
}

export function changeQty(id, delta) {              // delta = +1 / -1; "rm" removes
  const it = cart.find(i => String(i.id) === String(id)); if (!it) return;
  if (delta === "rm") cart = cart.filter(i => i !== it);
  else { it.qty += delta; if (it.qty <= 0) cart = cart.filter(i => i !== it); }
  commit();
}

// Loads the catalog; also refreshes cart prices/names and drops products that were removed.
export async function loadProducts() {
  try {
    const db = createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    const { data, error } = await db.from("candles").select("*").order("sort_order");
    if (error) throw error;
    cart = cart.filter(i => data.some(p => p.id === i.id)).map(i => {
      const p = data.find(p => p.id === i.id); return { ...i, name: p.name, price: Number(p.price), img: p.image_url };
    });
    commit();
    return data;
  } catch (e) {
    console.warn("Supabase unavailable:", e);
    return null;
  }
}

export const productCard = c => `
  <article class="card">
    <div class="img"><img src="${esc(c.image_url)}" alt="${esc(c.name)}" loading="lazy">${
      c.images?.[1] ? `<img class="alt" src="${esc(c.images[1])}" alt="${esc(c.name)}" loading="lazy">` : ""}</div>
    <div class="body">
      <h3>${esc(c.name)}</h3>
      <div class="desc">${esc(c.description)}</div>
      <div class="meta">${c.weight_g ? `<b>Вага:</b> ${c.weight_g} г<br>` : ""}${c.composition ? `<b>Склад:</b> ${esc(c.composition)}` : ""}</div>
      <div class="row"><span class="price">${money(Number(c.price))}</span><button class="order" type="button" data-id="${c.id}">У кошик</button></div>
    </div>
  </article>`;

// One click handler for any grid of product cards.
export function bindAdd(container, data) {
  container.onclick = e => {
    const b = e.target.closest("button.order"); if (!b) return;
    addToCart(data.find(p => String(p.id) === b.dataset.id));
    b.classList.add("added"); b.textContent = "Додано ✓";
    setTimeout(() => { b.classList.remove("added"); b.textContent = "У кошик"; }, 1200);
  };
}

export const failedCatalog = `<p class="state">Не вдалося завантажити каталог. Спробуйте оновити сторінку або напишіть нам в
  <a href="https://www.instagram.com/candle_charm_aroma_studio/" target="_blank" rel="noopener" style="text-decoration:underline">Instagram</a>.</p>`;
