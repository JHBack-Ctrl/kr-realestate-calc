/* 전국부동산계산기 서비스 워커: 정적 자산은 캐시 우선, HTML은 네트워크 우선(오프라인 시 캐시) */
var VERSION = 'jipcalc-c73ded72ae';
var ASSETS = ["css/site.css", "js/common.js", "js/analytics.js", "js/forms.js", "js/home.js", "favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "manifest.json", "js/rent.js", "js/loan.js", "js/yield.js", "js/fee.js", "js/area.js", "js/conversion.js", "js/subscription.js", "js/rent-tax-credit.js", "js/dsr.js", "js/prepayment.js", "js/acquisition-tax.js", "js/capital-gains-tax.js", "js/renewal.js", "js/tax-calendar.js", "js/moving.js", "js/rate-compare.js", "js/buy-vs-rent.js", "js/jeonse-insurance.js", "js/jeonse-fraud-check.js", "js/salary.js", "js/severance.js", "rent.html", "conversion.html", "rent-tax-credit.html", "fee.html", "loan.html", "dsr.html", "prepayment.html", "acquisition-tax.html", "capital-gains-tax.html", "yield.html", "subscription.html", "area.html", "renewal.html", "jeonse-insurance.html", "jeonse-fraud-check.html", "moving.html", "rate-compare.html", "buy-vs-rent.html", "tax-calendar.html", "salary.html", "severance.html", "checklist.html", "policy.html", "guides.html", "tables.html", "forms.html", "refs.html", "guide-repayment.html", "guide-brokerage.html", "guide-conversion.html", "guide-jeonse-vs-monthly.html", "guide-acquisition-tax.html", "guide-cgt-exemption.html", "guide-subscription-points.html", "guide-dsr-ltv.html", "guide-salary-net.html", "guide-severance.html", "guide-jeonse-registry.html", "guide-renewal-refusal.html", "guide-jeonse-insurance-fail.html", "guide-area-84.html", "guide-rent-tax-credit-who.html", "guide-fixed-vs-variable.html", "guide-loan-rate-structure.html", "guide-officetel.html", "guide-property-tax.html", "guide-prepayment.html", "guide-moving-14days.html", "guide-yield-vacancy.html", "guide-buy-vs-rent.html", "guide-deposit-vs-rent.html", "guide-subscription-notice-date.html", "about.html", "privacy.html", "terms.html", "table-acquisition-tax.html", "table-capital-gains-tax.html", "table-brokerage-fee.html", "table-subscription-points.html", "base-rate-history.html", "form-rent-receipt.html", "form-notice.html", "form-special-terms.html", "glossary.html", "index.html", "404.html"];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(ASSETS.map(function (a) { return new Request(a, { cache: 'reload' }); })).catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  var isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;
  if (isHTML) {
    e.respondWith(fetch(req).then(function (res) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); return res; })
      .catch(function () { return caches.match(req).then(function (r) { return r || caches.match('404.html'); }); }));
  } else {
    e.respondWith(caches.match(req).then(function (r) { return r || fetch(req).then(function (res) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); return res; }); }));
  }
});
