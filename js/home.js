// 홈 타일 검색. 입력한 말이 들어간 타일만 남기고, 빈 묶음은 통째로 숨긴다.
(function () {
  'use strict';
  var q = document.getElementById('q');
  var empty = document.getElementById('tile-empty');
  if (!q) return;

  // NEW: 처음 게시한 지 30일 안 된 쪽(data-pub는 빌드가 page_dates.json에서 넣는다)
  var now = new Date();
  [].forEach.call(document.querySelectorAll('.tile[data-pub]'), function (t) {
    var age = (now - new Date(t.getAttribute('data-pub') + 'T00:00:00')) / 86400000;
    if (age >= 0 && age <= 30) { var b = document.createElement('span'); b.className = 'badge-new'; b.textContent = 'NEW'; t.appendChild(b); }
  });

  // 즐겨찾기: 계산기 화면에서 ☆를 누른 것. 아래 묶음의 타일을 복사해 맨 위에 둔다
  var favSec = document.getElementById('fav-sec'), favTiles = document.getElementById('fav-tiles');
  if (favSec && favTiles && window.Site) {
    var added = 0;
    Site.getFavs().forEach(function (f) {
      var src = document.querySelector('[data-group] .tile[href="' + f + '"]');
      if (src) { favTiles.appendChild(src.cloneNode(true)); added++; }
    });
    favSec.hidden = !added;   // 즐겨찾기가 없으면 묶음째 숨긴다(2026-11: 빈 상자가 첫 화면을 차지했음). 방법은 계산기 제목 아래 ☆ 단추에 적혀 있다
  }
  var hasFav = !!(favTiles && favTiles.children.length);
  var more = document.getElementById('more-guides');   // 접어 둔 안내 글. 검색할 때는 펼쳐서 찾는다

  var groups = [].slice.call(document.querySelectorAll('[data-group]')).map(function (g) {
    return {
      sec: g.closest('.sec'),
      tiles: [].slice.call(g.querySelectorAll('.tile')).map(function (t) {
        var label = t.querySelector('.t');
        return { el: t, key: ((t.getAttribute('data-k') || '') + ' ' + (label ? label.textContent : '')).toLowerCase() };
      })
    };
  });

  function apply() {
    var v = q.value.trim().toLowerCase();
    var any = false, i, secs = [], counts = [];
    for (i = 0; i < groups.length; i++) {
      var g = groups[i], shown = 0;
      for (var j = 0; j < g.tiles.length; j++) {
        var hit = !v || g.tiles[j].key.indexOf(v) !== -1;
        g.tiles[j].el.hidden = !hit;
        if (hit) shown++;
      }
      var k = secs.indexOf(g.sec); if (k < 0) { k = secs.push(g.sec) - 1; counts[k] = 0; }   // 한 묶음에 타일 상자가 둘일 수 있다(안내 글: 새 글 + 접힌 글)
      counts[k] += shown;
      if (shown) any = true;
    }
    for (i = 0; i < secs.length; i++) if (secs[i]) secs[i].hidden = !counts[i];
    if (more) {
      if (v && !more.hasAttribute('data-was')) { more.setAttribute('data-was', more.open ? '1' : '0'); more.open = true; }
      if (!v && more.hasAttribute('data-was')) { more.open = more.getAttribute('data-was') === '1'; more.removeAttribute('data-was'); }
      more.classList.toggle('searching', !!v);
    }
    if (empty) empty.hidden = any;
    if (favSec) favSec.hidden = !!v || !hasFav;   // 검색 중에는 즐겨찾기 묶음을 숨겨 결과만 보이게
  }

  q.addEventListener('input', apply);
  // 검색창에서 엔터를 치면 첫 결과로 이동
  q.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var first = document.querySelector('.tile:not([hidden])');
    if (first) { e.preventDefault(); location.href = first.getAttribute('href'); }
  });
})();
