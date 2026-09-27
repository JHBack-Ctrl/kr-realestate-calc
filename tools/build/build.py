# 전체 조립: 기존 페이지 재포장, 새 페이지 생성, 부속 파일
import os, re, json, sys, hashlib
sys.path.insert(0, os.path.dirname(__file__))
from site_core import *
from pages_new import NEW_PAGES
from pages_cgt import CGT_PAGES
from pages_tools2 import TOOLS2_PAGES
NEW_PAGES.update(CGT_PAGES); NEW_PAGES.update(TOOLS2_PAGES)
from pages_guides import guide_repayment, guide_brokerage, guide_conversion, guide_jeonse_vs_monthly, guides_index, home, tables_index, forms_index, refs_index
from pages_guides2 import GUIDES2
from pages_tables import TABLE_PAGES
from pages_forms import FORM_PAGES
from pages_glossary import TERMS, term_page, term_path, glossary_index

os.chdir(ROOT)

# ---------- 1) 기존 계산기 4개: 본문 추출 → 새 틀로 재포장 ----------
OLD_CALC = {  # 파일: (스크립트, 하단 요약 라벨) — 등록부는 파일명으로 찾는다(번호로 찾으면 TOOLS 순서가 바뀔 때 어긋남)
    "rent.html": ("js/rent.js", "월 실부담"),
    "loan.html": ("js/loan.js", "첫 달 상환액"),
    "yield.html": ("js/yield.js", "자기자본 수익률"),
    "fee.html": ("js/fee.js", "예상 최대 중개보수"),
}
for src, (script, sticky) in OLD_CALC.items():
    html = read(src)
    entry = [t for t in TOOLS if t[0] == src]
    assert entry, src + ": TOOLS 등록부에 없습니다"
    f, name, title, desc, cat, short = entry[0]
    main = extract_main(html)
    ld = extract_ld(html)
    assert 'id="calc-form"' in main, src + ": 계산기 본문이 아닙니다"
    main = patch_calc_main(main)
    if 'id="rel-title"' not in main: main += related(f)
    if 'BreadcrumbList' not in ld: ld += breadcrumb_ld(name, f)
    write(f, page(title, desc, f, main, extra_head=ld, scripts=[script], sticky=sticky))

# ---------- 2) 참고·문서 페이지: 본문만 유지하고 틀 교체 ----------
for (f, name, title, desc, cat, short) in REFS[:2]:
    html = read(f); main = extract_main(html)
    write(f, page(title, desc, f, main, extra_head=breadcrumb_ld(name, f), disclaimer="본 페이지는 참고용이며 금융·세무·법률 자문이 아닙니다."))
for f, name in DOCS:
    html = read(f); main = extract_main(html)
    t = re.search(r"<title>(.*?)</title>", html, re.S).group(1).strip()
    d = re.search(r'<meta name="description" content="(.*?)">', html).group(1)
    # 문서 페이지는 광고 레일 없이 담백하게
    write(f, page(t, d, f, main, with_rails=False, disclaimer="본 사이트는 참고용이며 금융·세무·법률 자문이 아닙니다."))
# 404
html = read("404.html"); main = extract_main(html)
main = main.replace('<a class="tool-card" href="index.html"><p class="t">월세 실부담 계산기</p>', '<a class="tool-card" href="rent.html"><p class="t">월세 실부담 계산기</p>')
write("404.html", page("페이지를 찾을 수 없습니다 — 전국부동산계산기", "요청하신 페이지가 없습니다. 전국부동산계산기의 계산기 목록에서 원하시는 도구를 찾아보세요.", "404.html", main, noindex=True, with_rails=False))

# ---------- 3) 새 계산기 7개 ----------
for f, (fn, script, sticky) in NEW_PAGES.items():
    main, extra = fn()
    t = [x for x in TOOLS if x[0] == f][0]
    write(f, page(t[2], t[3], f, main, extra_head=extra, scripts=[script], sticky=sticky))

# ---------- 4) 안내 글, 목록, 홈 ----------
write("guide-repayment.html", guide_repayment())
write("guide-brokerage.html", guide_brokerage())
write("guide-conversion.html", guide_conversion())
write("guide-jeonse-vs-monthly.html", guide_jeonse_vs_monthly())
for f, fn in GUIDES2: write(f, fn())
write("guides.html", guides_index())
write("tables.html", tables_index()); write("forms.html", forms_index()); write("refs.html", refs_index())
write("index.html", home())

# ---------- 4b) 표·자료, 서식, 용어 사전 ----------
for f, fn in TABLE_PAGES.items(): write(f, fn())
for f, fn in FORM_PAGES.items(): write(f, fn())
for t in TERMS: write(term_path(t[0]), term_page(t))
write("glossary.html", glossary_index())

# ---------- 5) 부속 파일 ----------
manifest = {
    "name": "전국부동산계산기", "short_name": "전국부동산계산기", "description": "월세 실부담부터 양도세, 연봉 실수령액까지 계산기 모음",
    "start_url": "./", "scope": "./", "display": "standalone", "background_color": "#f6f4ee", "theme_color": "#0e6b52", "lang": "ko",
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]
}
write("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

# ads.txt — 애드센스 게시자 ID는 site_core.ADSENSE_PUB 한 곳에서. 파일에는 "ca-" 없이 pub-만 쓴다.
# f08c47fec0942fa0는 구글의 공인 인증기관 ID(고정값).
write("ads.txt", "google.com, " + ADSENSE_PUB.replace("ca-", "", 1) + ", DIRECT, f08c47fec0942fa0\n")

TERM_HTML = [term_path(t[0]) for t in TERMS]
ALL_HTML = [t[0] for t in TOOLS] + [r[0] for r in REFS] + [h[0] for h in HUBS] + [g[0] for g in GUIDES] + [d[0] for d in DOCS] + [x[0] for x in TABLES] + [x[0] for x in FORMS] + ["glossary.html", "index.html", "404.html"]
assets = ["css/site.css", "js/common.js", "js/analytics.js", "js/forms.js", "js/home.js", "favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "manifest.json"] + \
         [f"js/{n}.js" for n in ["rent", "loan", "yield", "fee", "area", "conversion", "subscription", "rent-tax-credit", "dsr", "prepayment", "acquisition-tax", "capital-gains-tax",
                                 "renewal", "tax-calendar", "moving", "rate-compare", "buy-vs-rent", "jeonse-insurance", "jeonse-fraud-check", "salary", "severance"]]

analytics = """/* 방문 통계 — ID를 비우면 그 도구는 아무것도 로드하지 않는다.
   GA4: analytics.google.com 의 측정 ID (G-로 시작)
   네이버 애널리틱스: analytics.naver.com 사이트정보의 발급ID
   ID를 바꾸거나 도구를 더하면 privacy.html 6-1 항목도 함께 갱신할 것. */
(function () {
  var GA_ID = 'G-H6LHC9GYQH';
  var NAVER_ID = '1c5c9c6d95dc2d0';
  if (location.protocol === 'file:') return;   // 로컬에서 열었을 때는 집계하지 않는다
  if (GA_ID) {
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID; document.head.appendChild(s);
    window.dataLayer = window.dataLayer || []; function gtag() { dataLayer.push(arguments); } window.gtag = gtag;
    gtag('js', new Date()); gtag('config', GA_ID, { anonymize_ip: true });
  }
  if (NAVER_ID) {
    // 네이버가 발급한 스니펫과 같은 형태 (wcs.pstatic.net, wcs_add.wa 설정 후 wcs_do)
    window.wcs_add = window.wcs_add || {};
    window.wcs_add.wa = NAVER_ID;
    var n = document.createElement('script'); n.async = true; n.src = 'https://wcs.pstatic.net/wcslog.js';
    n.onload = function () { if (window.wcs_do) window.wcs_do(); };
    document.head.appendChild(n);
  }
})();
"""
write("js/analytics.js", analytics)

# 기준금리 상수는 site_core.RATE_HISTORY 마지막 값을 js에 주입한다. 손으로 고치지 말 것.
for jsf in ["js/conversion.js", "js/renewal.js"]:
    js = read(jsf)
    js = re.sub(r"var BASE_RATE_DEFAULT = [\d.]+", f"var BASE_RATE_DEFAULT = {BASE_RATE:.2f}", js, count=1)
    js = re.sub(r"var BASE_RATE_DATE = '[^']*'", f"var BASE_RATE_DATE = '{BASE_RATE_LABEL}'", js, count=1)
    write(jsf, js)


# 서비스 워커 버전은 캐시 대상 파일 내용의 해시로 만든다. 어떤 파일이든 바뀌면 버전이 바뀌어
# 방문자 브라우저의 옛 캐시가 버려진다. 손으로 올리는 번호는 빼먹기 쉬워서(#20에서 실제로 빼먹음) 없앴다.
# 그래서 sw.js는 다른 산출물이 전부 쓰인 뒤 맨 마지막에 만든다.
def sw_version():
    h = hashlib.sha1()
    for f in assets + ALL_HTML + TERM_HTML:
        fp = os.path.join(ROOT, f)
        if os.path.exists(fp): h.update(open(fp, "rb").read())
    return h.hexdigest()[:10]

sw = """/* 전국부동산계산기 서비스 워커: 정적 자산은 캐시 우선, HTML은 네트워크 우선(오프라인 시 캐시) */
var VERSION = 'jipcalc-%s';
var ASSETS = %s;
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
""" % (sw_version(), json.dumps(assets + ALL_HTML, ensure_ascii=False))
write("sw.js", sw)

# sitemap
def url(f, freq, pri):
    return f"  <url>\n    <loc>{BASE + ('' if f == 'index.html' else f)}</loc>\n    <lastmod>{TODAY}</lastmod>\n    <changefreq>{freq}</changefreq>\n    <priority>{pri}</priority>\n  </url>\n"
sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
sm += url("index.html", "weekly", "1.0")
for t in TOOLS: sm += url(t[0], "monthly", "0.9")
for r in REFS: sm += url(r[0], "monthly", "0.6")
for h in HUBS: sm += url(h[0], "monthly", "0.6")
for g in GUIDES: sm += url(g[0], "monthly", "0.7")
for x in TABLES: sm += url(x[0], "monthly", "0.8")
for x in FORMS: sm += url(x[0], "monthly", "0.7")
sm += url("glossary.html", "weekly", "0.8")
for f in TERM_HTML: sm += url(f, "monthly", "0.6")
for d in DOCS: sm += url(d[0], "yearly", "0.3")
sm += "</urlset>\n"
write("sitemap.xml", sm)
print("완료")
