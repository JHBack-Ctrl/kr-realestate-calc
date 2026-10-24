/* 공통 유틸: 숫자 파싱/포맷, 금액 입력 콤마, 토스트, 공유, 이미지 저장, 최근 계산 기억, 테마, 내비 */
(function (global) {
  'use strict';

  var STORAGE_PREFIX = 'jipcalc:';
  var REMEMBER_KEY = STORAGE_PREFIX + 'remember';   // "1"이면 최근 계산 기억 켜짐
  var THEME_KEY = STORAGE_PREFIX + 'theme';         // "light" | "dark" | 없음(자동)
  // 한글 도메인은 location.host 가 퓨니코드(xn--...)로 나오므로 사람이 보는 문구에는 이 값을 쓴다
  var SITE_HOST = '전국부동산계산기.com';
  // 퓨니코드 주소는 한글로 보여준다. host가 비는 경우(file://로 연 경우)에도 사이트 주소가 나와야 한다.
  function displayHost() { return (!location.host || /^xn--/.test(location.hostname)) ? SITE_HOST : location.host; }

  function $(id) { return document.getElementById(id); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ---- 안전한 로컬 저장소 (프라이빗 모드 등에서 예외 방지) ----
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* 무시 */ } }

  // ---- 숫자 ----
  function parseMoney(str) {
    var digits = String(str == null ? '' : str).replace(/[^\d]/g, '');
    if (!digits) return 0;
    var n = parseInt(digits, 10);
    return isFinite(n) ? n : 0;
  }
  function parseNonNegative(str) {
    var n = parseFloat(String(str == null ? '' : str).replace(/,/g, ''));
    if (!isFinite(n) || n < 0) return 0;
    return n;
  }
  function parseNumber(str) { // 음수 허용
    var n = parseFloat(String(str == null ? '' : str).replace(/,/g, ''));
    return isFinite(n) ? n : 0;
  }
  function fmtWon(n) { return Math.round(n || 0).toLocaleString('ko-KR'); }
  function fmtRate(r) { return (Math.round((r || 0) * 100) / 100).toString(); }
  function fmtPct(r) { return (Math.round((r || 0) * 100) / 100).toFixed(2); }
  function fmtNum(n, d) { var p = Math.pow(10, d == null ? 2 : d); return (Math.round((n || 0) * p) / p).toLocaleString('ko-KR', { maximumFractionDigits: d == null ? 2 : d }); }
  function fmtKorean(n) {
    n = Math.round(n || 0);
    var neg = n < 0; n = Math.abs(n);
    if (n < 10000) return (neg ? '−' : '') + fmtWon(n) + '원';
    var eok = Math.floor(n / 100000000);
    var man = Math.floor((n % 100000000) / 10000);
    var won = n % 10000;
    var parts = [];
    if (eok) parts.push(fmtWon(eok) + '억');
    if (man) parts.push(fmtWon(man) + '만');
    if (won && !eok) parts.push(fmtWon(won));
    return (neg ? '−' : '') + parts.join(' ') + '원';
  }
  function setText(id, text) { var el = $(id); if (el) el.textContent = text; }

  // ---- 금액 입력 콤마 ----
  function formatMoneyField(el) {
    var raw = el.value;
    if (raw === '') return;
    var n = parseMoney(raw);
    var formatted = n.toLocaleString('ko-KR');
    if (el.value !== formatted) {
      el.value = formatted;
      try { el.setSelectionRange(formatted.length, formatted.length); } catch (e) { /* 미지원 */ }
    }
  }
  function bindMoneyInputs(root, onChange) {
    $$('input[data-money]', root).forEach(function (el) {
      el.addEventListener('input', function () { formatMoneyField(el); if (onChange) onChange(); });
      el.addEventListener('blur', function () { if (el.value !== '') formatMoneyField(el); });
    });
  }
  function setMoney(id, n) { var el = $(id); if (el) el.value = n ? Number(n).toLocaleString('ko-KR') : (n === 0 ? '0' : ''); }
  // 금액 칸 아래에 「3억 2,000만원」처럼 읽기 쉬운 단위를 붙인다. 계산기 폼 안의 금액 칸만, 1만원 이상일 때만
  function updateMoneyHints() {
    $$('#calc-form input[data-money]').forEach(function (el) {
      var hint = el._hint;
      if (!hint) {
        var wrap = el.closest('.input-wrap') || el;
        hint = document.createElement('p'); hint.className = 'money-hint'; hint.setAttribute('aria-hidden', 'true');
        wrap.parentNode.insertBefore(hint, wrap.nextSibling); el._hint = hint;
      }
      var n = parseMoney(el.value);
      hint.textContent = n >= 10000 ? fmtKorean(n) : '';
    });
  }

  // ---- 즐겨찾기: 계산기 제목 아래 ☆ 버튼. 이 기기 브라우저에만 저장하고 홈 맨 위에 모아 보여 준다(home.js) ----
  var FAV_KEY = STORAGE_PREFIX + 'favs', FAV_MAX = 24;
  function getFavs() { try { var v = JSON.parse(lsGet(FAV_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function pageFile() { return location.pathname.split('/').pop() || 'index.html'; }
  function initFavButton() {
    var h1 = document.querySelector('main h1');
    if (!$('calc-form') || !h1) return;
    var f = pageFile(), btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'fav-btn';
    function paint() { var on = getFavs().indexOf(f) !== -1; btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.textContent = on ? '★ 즐겨찾기됨' : '☆ 즐겨찾기'; }
    btn.addEventListener('click', function () {
      var a = getFavs(), i = a.indexOf(f);
      if (i === -1) a.unshift(f); else a.splice(i, 1);
      lsSet(FAV_KEY, JSON.stringify(a.slice(0, FAV_MAX))); paint();
      toast(i === -1 ? '홈 맨 위 「즐겨찾기」에 넣었습니다' : '즐겨찾기에서 뺐습니다');
    });
    paint(); h1.parentNode.insertBefore(btn, h1.nextSibling);
  }

  // ---- 토스트 ----
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  // ---- 클립보드 ----
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); resolve(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  // ---- 공유 링크 (입력값을 URL 쿼리에만 담음) ----
  function buildShareUrl(params) {
    var q = [];
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === '' || v == null) return;
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    return location.origin + location.pathname + (q.length ? '?' + q.join('&') : '');
  }
  function readQuery() {
    var out = {};
    var s = location.search.replace(/^\?/, '');
    if (!s) return out;
    s.split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      var k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i));
      var v = decodeURIComponent(i < 0 ? '' : kv.slice(i + 1));
      out[k] = v;
    });
    return out;
  }
  function bindShareButton(btnId, getParams) {
    var btn = $(btnId);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var url = buildShareUrl(getParams());
      copyText(url).then(function () { toast('결과 링크를 복사했습니다'); })
        .catch(function () { toast('복사에 실패했습니다. 주소창을 복사해 주세요'); });
      try { history.replaceState(null, '', url); } catch (e) { /* 무시 */ }
    });
  }

  // ---- 기기 공유창 (카카오톡 등 설치된 앱으로 바로 공유) ----
  function bindNativeShare(btnId, getShare) {
    var btn = $(btnId);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var d = getShare(); // { title, text, params }
      var url = buildShareUrl(d.params || {});
      if (navigator.share) {
        navigator.share({ title: d.title, text: d.text, url: url }).catch(function () { /* 사용자 취소 */ });
      } else {
        copyText(d.text + '\n' + url).then(function () { toast('이 기기는 공유창을 지원하지 않아 내용을 복사했습니다'); })
          .catch(function () { toast('복사에 실패했습니다'); });
      }
    });
  }

  // ---- 결과 이미지 저장 (외부 라이브러리 없이 캔버스에 직접 그림) ----
  function bindImageSave(btnId, getCard) {
    var btn = $(btnId);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var c = getCard(); // { title, kicker, big, unit, rows:[[k,v],...], note }
      try {
        var W = 1080, pad = 72, scale = 2;
        var rows = c.rows || [];
        var font = '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
        // 높이는 내용에서 계산한다. 고정값으로 잡으면 설명 줄 수에 따라 아래가 비거나 잘린다.
        var mctx = document.createElement('canvas').getContext('2d');
        mctx.font = '400 20px ' + font;
        var noteLines = c.note ? wrapLines(mctx, c.note, W - pad * 2).length : 0;
        var H = pad + 270 + rows.length * 56 + (c.note ? 40 + noteLines * 28 : 0) + 76;
        var cv = document.createElement('canvas');
        cv.width = W * scale; cv.height = H * scale;
        var ctx = cv.getContext('2d');
        ctx.scale(scale, scale);
        var dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
          (!document.documentElement.getAttribute('data-theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
        var bg = dark ? '#1b1d20' : '#ffffff', ink = dark ? '#eef0f2' : '#17191c', ink2 = dark ? '#b6bbc3' : '#4a4f57', ink3 = dark ? '#7f858f' : '#7b818b', accent = dark ? '#4fc39d' : '#0e6b52', accentInk = dark ? '#08160f' : '#ffffff', line = dark ? '#2b2f35' : '#e2dfd6';
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        // 브랜드 마크: 헤더의 .brand-mark(22px)를 34px로 키워 그대로 그림
        drawBrandMark(ctx, pad, pad, 34, accent, accentInk);
        ctx.fillStyle = ink; ctx.font = '700 26px ' + font; ctx.textBaseline = 'middle';
        ctx.fillText('전국부동산계산기', pad + 46, pad + 17);
        ctx.fillStyle = ink3; ctx.font = '500 22px ' + font; ctx.textAlign = 'right';
        ctx.fillText(c.title || '', W - pad, pad + 17); ctx.textAlign = 'left';
        // 설명 줄 (윗선 기준으로 그려 아래 큰 숫자와 겹치지 않게 함)
        var y = pad + 84;
        ctx.textBaseline = 'top';
        ctx.fillStyle = ink3; ctx.font = '600 24px ' + font; ctx.fillText(c.kicker || '', pad, y);
        y += 24 + 22; // 설명 줄 높이 + 여백 = 큰 숫자의 윗선
        // 큰 숫자: 폭이 넘치면 글자 크기를 줄임
        var bigSize = 84, unitSize = 34, maxW = W - pad * 2;
        ctx.font = '800 ' + bigSize + 'px ' + font;
        var bw = ctx.measureText(c.big || '').width;
        ctx.font = '600 ' + unitSize + 'px ' + font;
        var uw = c.unit ? ctx.measureText(c.unit).width + 10 : 0;
        if (bw + uw > maxW) {
          var k = maxW / (bw + uw);
          bigSize = Math.floor(bigSize * k); unitSize = Math.floor(unitSize * k);
          ctx.font = '800 ' + bigSize + 'px ' + font; bw = ctx.measureText(c.big || '').width;
        }
        y += bigSize; // 큰 숫자의 밑선
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = ink; ctx.font = '800 ' + bigSize + 'px ' + font; ctx.fillText(c.big || '', pad, y);
        ctx.fillStyle = ink3; ctx.font = '600 ' + unitSize + 'px ' + font; ctx.fillText(c.unit || '', pad + bw + 10, y);
        y += 36;
        ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
        y += 20;
        // 행
        ctx.textBaseline = 'middle';
        rows.forEach(function (r) {
          y += 28;
          ctx.fillStyle = ink2; ctx.font = '500 26px ' + font; ctx.textAlign = 'left'; ctx.fillText(String(r[0]), pad, y);
          ctx.fillStyle = ink; ctx.font = '700 26px ' + font; ctx.textAlign = 'right'; ctx.fillText(String(r[1]), W - pad, y);
          y += 28;
          ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
        });
        ctx.textAlign = 'left';
        if (c.note) { y += 40; ctx.fillStyle = ink3; ctx.font = '400 20px ' + font; wrapText(ctx, c.note, pad, y, W - pad * 2, 28); }
        // 푸터: 이 이미지가 공유됐을 때 어디서 왔는지 보여야 한다. 주소는 강조색으로 크게,
        // 면책 문구는 작게 오른쪽에.
        var fy = H - 40;
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad, fy - 26); ctx.lineTo(W - pad, fy - 26); ctx.stroke();
        ctx.fillStyle = accent; ctx.font = '700 26px ' + font; ctx.textAlign = 'left';
        ctx.fillText(displayHost(), pad, fy);
        ctx.fillStyle = ink3; ctx.font = '400 19px ' + font; ctx.textAlign = 'right';
        ctx.fillText('참고용 · 금융·세무·법률 자문 아님', W - pad, fy);
        var a = document.createElement('a');
        a.download = (c.file || 'result') + '.png';
        a.href = cv.toDataURL('image/png');
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        toast('이미지를 저장했습니다');
      } catch (e) { toast('이미지 저장에 실패했습니다'); }
    });
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // 헤더 .brand-mark 와 같은 모양: 둥근 네모(반지름 7/22) 안에 45° 돌린 작은 네모 테두리, 윗변은 비움
  function drawBrandMark(ctx, x, y, size, fill, stroke) {
    var k = size / 22;
    ctx.fillStyle = fill; roundRect(ctx, x, y, size, size, 7 * k); ctx.fill();
    ctx.save();
    ctx.translate(x + 11 * k, y + 11 * k); ctx.rotate(Math.PI / 4);
    var s = 8 * k / 2; // 10px 상자에서 2px 테두리 중심선까지 = 8px, 그 절반
    ctx.strokeStyle = stroke; ctx.lineWidth = 2 * k; ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(s, -s); ctx.lineTo(s, s); ctx.lineTo(-s, s); ctx.lineTo(-s, -s); ctx.stroke();
    ctx.restore();
  }
  function wrapLines(ctx, text, maxW) {
    var words = String(text).split(' '), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxW && i > 0) { lines.push(line); line = words[i] + ' '; }
      else line = test;
    }
    lines.push(line);
    return lines;
  }
  function wrapText(ctx, text, x, y, maxW, lh) {
    wrapLines(ctx, text, maxW).forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
  }

  // ---- 최근 계산 기억 (브라우저에만 저장, 켜고 끄는 스위치) ----
  // 페이지에서 remember({ key, get: ()=>state, set: (state)=>void }) 호출.
  // 토글 요소 id="remember-toggle"이 있으면 연결한다.
  function remember(opt) {
    var key = STORAGE_PREFIX + 'state:' + opt.key;
    var toggle = $('remember-toggle');
    var on = lsGet(REMEMBER_KEY) === '1';
    if (toggle) {
      toggle.checked = on;
      toggle.addEventListener('change', function () {
        if (toggle.checked) { lsSet(REMEMBER_KEY, '1'); save(); toast('이 기기에서 최근 계산을 기억합니다'); }
        else {
          lsDel(REMEMBER_KEY);
          // 모든 계산기의 저장값 삭제
          try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(STORAGE_PREFIX + 'state:') === 0) localStorage.removeItem(k); }); } catch (e) { /* 무시 */ }
          toast('기억을 끄고 저장된 값을 지웠습니다');
        }
      });
    }
    function save() {
      if (lsGet(REMEMBER_KEY) !== '1') return;
      try { lsSet(key, JSON.stringify(opt.get())); } catch (e) { /* 무시 */ }
    }
    function load() {
      if (!on) return false;
      var raw = lsGet(key);
      if (!raw) return false;
      try { opt.set(JSON.parse(raw)); return true; } catch (e) { return false; }
    }
    return { save: save, load: load };
  }

  // ---- 테마 (자동 / 밝게 / 어둡게) ----
  function applyTheme(t) {
    var root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    var btn = $('theme-toggle');
    if (btn) {
      var isDark = t === 'dark' || (!t && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      btn.setAttribute('aria-label', isDark ? '밝은 화면으로 전환' : '어두운 화면으로 전환');
      btn.title = t ? (t === 'dark' ? '어둡게 (수동)' : '밝게 (수동)') : '기기 설정 따름';
    }
  }
  function initTheme() {
    applyTheme(lsGet(THEME_KEY));
    var btn = $('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var cur = lsGet(THEME_KEY);
      var isDark = cur === 'dark' || (!cur && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var next = isDark ? 'light' : 'dark';
      lsSet(THEME_KEY, next); applyTheme(next);
    });
  }

  // ---- 전체 메뉴 패널 ----
  function initMenu() {
    var btn = $('menu-toggle'), panel = $('menu-panel');
    if (!btn || !panel) return;
    function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () {
      var open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close(); });
  }

  // ---- 내비: 현재 페이지 표시 ----
  function markCurrentNav() {
    var here = location.pathname.split('/').pop() || 'index.html';
    $$('.tool-nav a, .menu-panel a, .footer-links a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('?')[0].split('#')[0];
      if (href === here || (here === 'index.html' && (href === './' || href === '.' || href === ''))) a.setAttribute('aria-current', 'page');
    });
  }

  // ---- 빠른 이동 가로 스크롤 ----
  // 좁은 화면에서 목록이 넘치면 스크롤바를 숨겨 두어서, 마우스만 있는 사람은 넘길 방법이 없었다.
  // 세로 휠을 가로 스크롤로 돌리고, 더 있는 쪽 가장자리를 흐리게 해서 넘친다는 걸 보여준다.
  function initNavScroll() {
    var nav = document.querySelector('.tool-nav');
    if (!nav) return;
    function mark() {
      var over = nav.scrollWidth - nav.clientWidth > 2;
      var left = nav.scrollLeft > 2, right = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2;
      nav.setAttribute('data-overflow', !over ? 'none' : left && right ? 'both' : left ? 'left' : 'right');
    }
    nav.addEventListener('wheel', function (e) {
      if (nav.scrollWidth - nav.clientWidth <= 2) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;   // 트랙패드 가로 제스처는 그대로
      e.preventDefault(); nav.scrollLeft += e.deltaY;
    }, { passive: false });
    nav.addEventListener('scroll', mark, { passive: true });
    window.addEventListener('resize', mark);
    // 현재 페이지 항목이 가려져 있으면 보이게 당겨 온다
    var cur = nav.querySelector('a[aria-current="page"]');
    if (cur && cur.offsetLeft + cur.offsetWidth > nav.clientWidth) nav.scrollLeft = cur.offsetLeft - 16;
    mark();
  }

  // ---- 모바일 하단 요약 바 ----
  function bindStickySummary(targetId) {
    var bar = $('sticky-summary'), target = $(targetId);
    if (!bar || !target || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { bar.classList.toggle('show', !en.isIntersecting && en.boundingClientRect.top > 0); });
    }, { threshold: 0.2 });
    io.observe(target);
  }

  // ---- 앱 설치(서비스 워커) ----
  function initServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    try { navigator.serviceWorker.register('sw.js').catch(function () { /* 등록 실패는 무시 */ }); } catch (e) { /* 무시 */ }
  }

  // ---- 홈 화면에 추가 안내 ----
  // 모바일 첫 방문에만 한 번 뜨고, 닫으면 다시 뜨지 않는다.
  // 안드로이드 크롬은 브라우저가 준 설치 프롬프트를 바로 띄우고,
  // 아이폰 사파리는 자동 설치를 막아놓아 공유 버튼 경로를 글로 안내한다.
  var INSTALL_KEY = STORAGE_PREFIX + 'install-dismissed';
  function initInstallPrompt() {
    if (location.protocol === 'file:') return;
    if (lsGet(INSTALL_KEY)) return;                       // 이미 닫았거나 추가함
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return;  // 이미 설치해서 연 화면
    if (navigator.standalone) return;                     // iOS 홈 화면에서 연 경우
    if (!window.matchMedia || !window.matchMedia('(max-width: 899px)').matches) return;        // 모바일 폭에서만

    var ua = navigator.userAgent;
    var isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    var isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    var deferred = null;

    function dismiss(bar) { lsSet(INSTALL_KEY, '1'); if (bar) bar.classList.remove('show'); setTimeout(function () { if (bar && bar.parentNode) bar.parentNode.removeChild(bar); }, 300); }

    function build(mode) {
      var bar = document.createElement('div');
      bar.className = 'install-bar';
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', '홈 화면에 추가 안내');
      var actionHTML = mode === 'ios'
        ? '<p class="t">홈 화면에 추가하면 앱처럼 쓸 수 있어요</p><p class="d">아래 <strong>공유</strong> 버튼을 누르고 <strong>홈 화면에 추가</strong>를 고르세요</p>'
        : '<p class="t">홈 화면에 추가하면 앱처럼 쓸 수 있어요</p><p class="d">설치 없이 아이콘만 생깁니다</p>';
      bar.innerHTML = '<div class="install-mark" aria-hidden="true"></div><div class="install-text">' + actionHTML + '</div>' +
        (mode === 'ios' ? '' : '<button type="button" class="btn btn-primary btn-sm install-go">추가</button>') +
        '<button type="button" class="install-close" aria-label="안내 닫기">✕</button>';
      document.body.appendChild(bar);
      requestAnimationFrame(function () { bar.classList.add('show'); });
      bar.querySelector('.install-close').addEventListener('click', function () { dismiss(bar); });
      var go = bar.querySelector('.install-go');
      if (go) go.addEventListener('click', function () {
        if (!deferred) { dismiss(bar); return; }
        deferred.prompt();
        deferred.userChoice.then(function () { deferred = null; dismiss(bar); }).catch(function () { dismiss(bar); });
      });
      return bar;
    }

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault(); deferred = e;
      setTimeout(function () { if (!lsGet(INSTALL_KEY)) build('android'); }, 2500);
    });
    window.addEventListener('appinstalled', function () { lsSet(INSTALL_KEY, '1'); });
    if (isSafari) setTimeout(function () { if (!lsGet(INSTALL_KEY)) build('ios'); }, 2500);
  }

  // ---- 준비 중 링크 토스트 ----
  function initSoonLinks() {
    $$('[data-soon]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); toast(el.getAttribute('data-soon') + ' — 준비 중'); });
    });
  }

  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  // ---- 폼 직렬화: 계산기 입력을 {id: 값} 객체로 (공유 링크·기억 기능 공용) ----
  function formState(form) {
    var st = {};
    $$('input, select', form).forEach(function (el) {
      if (el.id === 'remember-toggle') return;
      if (el.type === 'radio') { if (el.checked && el.name) st[el.name] = el.value; return; }
      if (!el.id) return;
      if (el.type === 'checkbox') st[el.id] = el.checked ? '1' : '0';
      else if (el.hasAttribute('data-money')) st[el.id] = String(parseMoney(el.value));
      else st[el.id] = el.value;
    });
    return st;
  }
  function applyState(form, st) {
    if (!st) return;
    Object.keys(st).forEach(function (k) {
      var v = st[k];
      var radios = $$('input[type="radio"][name="' + k + '"]', form);
      if (radios.length) { radios.forEach(function (r) { r.checked = r.value === v; }); return; }
      var el = $(k);
      if (!el || !form.contains(el) || el.id === 'remember-toggle') return;
      if (el.type === 'checkbox') el.checked = v === '1' || v === 'true';
      else if (el.hasAttribute('data-money')) setMoney(k, parseMoney(v));
      else el.value = v;
    });
  }

  // ---- 계산기 페이지 배선 ----
  // o = { key, recalc, share: () => {title, text}, card: () => 이미지 카드, preset?: (name) => void, onApply?: () => void }
  function wireCalc(o) {
    var form = $('calc-form');
    var mem = remember({ key: o.key, get: function () { return formState(form); }, set: function (st) { applyState(form, st); if (o.onApply) o.onApply(); } });
    function recalc() { o.recalc(); updateMoneyHints(); mem.save(); }
    bindMoneyInputs(document, recalc);
    $$('input[type="number"], input[type="date"], input[type="text"]:not([data-money]), select', form).forEach(function (el) { el.addEventListener('input', recalc); el.addEventListener('change', recalc); });
    $$('input[type="radio"], input[type="checkbox"]', form).forEach(function (el) { if (el.id !== 'remember-toggle') el.addEventListener('change', recalc); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); recalc();
      var r = $('result'); if (r && r.scrollIntoView) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $$('.chip[data-preset]').forEach(function (c) {
      c.addEventListener('click', function () {
        if (o.preset) o.preset(c.getAttribute('data-preset'));
        $$('.chip[data-preset]').forEach(function (x) { x.classList.toggle('active', x === c && c.getAttribute('data-preset') !== 'clear'); });
        recalc();
      });
    });
    var shareParams = function () { return formState(form); };
    bindShareButton('share-btn', shareParams);
    bindNativeShare('native-share-btn', function () { var s = o.share(); return { title: s.title, text: s.text, params: shareParams() }; });
    bindImageSave('image-btn', o.card);
    var q = readQuery();
    if (Object.keys(q).length) { applyState(form, q); if (o.onApply) o.onApply(); }
    else mem.load();
    recalc();
    bindStickySummary('result');
    return recalc;
  }

  // 날짜 유틸
  function parseDate(str) { if (!str) return null; var d = new Date(str + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function monthsBetween(a, b) { // a→b 경과 개월(내림), 음수면 0
    if (!a || !b || b < a) return 0;
    var m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (b.getDate() < a.getDate()) m -= 1;
    return Math.max(0, m);
  }
  function daysBetween(a, b) { if (!a || !b) return 0; return Math.round((b - a) / 86400000); }
  function addMonths(d, m) { var x = new Date(d.getTime()); x.setMonth(x.getMonth() + m); return x; }
  function fmtDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  global.Site = {
    $: $, $$: $$, parseMoney: parseMoney, parseNonNegative: parseNonNegative, parseNumber: parseNumber,
    fmtWon: fmtWon, fmtRate: fmtRate, fmtPct: fmtPct, fmtNum: fmtNum, fmtKorean: fmtKorean, setText: setText,
    bindMoneyInputs: bindMoneyInputs, setMoney: setMoney, formatMoneyField: formatMoneyField,
    toast: toast, copyText: copyText, buildShareUrl: buildShareUrl, readQuery: readQuery,
    bindShareButton: bindShareButton, bindNativeShare: bindNativeShare, bindImageSave: bindImageSave,
    remember: remember, bindStickySummary: bindStickySummary, ready: ready,
    formState: formState, applyState: applyState, wireCalc: wireCalc,
    parseDate: parseDate, today: today, monthsBetween: monthsBetween, daysBetween: daysBetween, addMonths: addMonths, fmtDate: fmtDate,
    lsGet: lsGet, lsSet: lsSet, getFavs: getFavs
  };

  // 테마는 화면 깜빡임을 줄이기 위해 즉시 적용
  applyTheme(lsGet(THEME_KEY));
  ready(function () { initTheme(); initMenu(); markCurrentNav(); initNavScroll(); initSoonLinks(); initServiceWorker(); initInstallPrompt(); initFavButton(); });
})(window);
