// Shared header + footer, so the five pages don't repeat them. Classic script (runs before the page paints).
(function () {
  var IG = "https://www.instagram.com/candle_charm_aroma_studio/";
  var links = [
    ["index.html", "Головна"],
    ["shop.html", "Каталог"],
    ["about.html", "Про нас"],
    ["delivery.html", "Доставка та оплата"],
  ];
  var here = location.pathname.split("/").pop() || "index.html";

  var nav = links.map(function (l) {
    return '<a href="' + l[0] + '"' + (here === l[0] ? ' class="on"' : "") + ">" + l[1] + "</a>";
  }).join("");

  document.body.insertAdjacentHTML("afterbegin",
    '<header class="site-header"><div class="wrap">' +
      '<a href="index.html" class="logo"><img src="img/mark.png" alt="">Candle &amp; Charm</a>' +
      '<nav class="nav">' + nav + "</nav>" +
      '<a href="checkout.html" class="cart-link" aria-label="Кошик">Кошик <span class="n" id="cartN" data-n="0"></span></a>' +
    "</div></header>");

  function count() {
    var n = 0;
    try { JSON.parse(localStorage.getItem("candle-cart-v1") || "[]").forEach(function (i) { n += i.qty || 0; }); } catch (e) {}
    var el = document.getElementById("cartN");
    if (el) { el.textContent = n || ""; el.setAttribute("data-n", n); }
  }
  count();
  window.addEventListener("cart:change", count);
  window.addEventListener("storage", count);
  window.addEventListener("pageshow", count);

  document.addEventListener("DOMContentLoaded", function () {
    document.body.insertAdjacentHTML("beforeend",
      '<footer class="site-footer"><div class="wrap"><div class="cols">' +
        '<div><div class="logo"><img src="img/mark.png" alt="">Candle &amp; Charm</div>' +
          "<p>Aroma Studio · свічки ручної роботи з соєвого воску.</p></div>" +
        '<div><h4>Сторінки</h4>' + links.map(function (l) { return '<a href="' + l[0] + '">' + l[1] + "</a>"; }).join("") + "</div>" +
        '<div><h4>Контакти</h4><a href="' + IG + '" target="_blank" rel="noopener">Instagram @candle_charm_aroma_studio</a>' +
          "<p>Підтверджуємо замовлення у Viber.</p></div>" +
      '</div><div class="copy">© 2026 Candle &amp; Charm · Aroma Studio</div></div></footer>');
  });
})();
