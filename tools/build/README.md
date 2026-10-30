# 사이트 빌더

헤더·메뉴·푸터·메타 태그를 모든 페이지에 같은 틀로 씌우고, 새 계산기·안내 글·홈을 생성합니다.

```
python3 tools/build/build.py
```

- `site_core.py` — 페이지 등록부(TOOLS, TABLES, FORMS, REFS, GUIDES, HUBS, DOCS)와 공통 틀, 기준금리 이력(RATE_HISTORY). 메뉴나 sitemap을 바꾸려면 등록부만 고칩니다.
  `TOOL_GUIDES`는 계산기 쪽 결과 아래에 붙는 「함께 읽는 안내 글」 목록입니다. 새 안내 글을 쓰면 관련 계산기 줄에 더합니다
- `pages_new.py` / `pages_cgt.py` / `pages_tools2.py` / `pages_tax.py` / `pages_tools3.py` / `pages_tools4.py` — 계산기 본문(폼·결과·설명·FAQ)
- `pages_guides.py` — 홈, 안내 글 목록, 허브 3쪽(표·자료/서식·용어/참고 자료), 안내 글 4편
- `pages_guides2.py` — 안내 글 49편
- `pages_tables.py` / `pages_forms.py` / `pages_glossary.py` — 표·서식·용어
- `build.py` — 기존 페이지는 `<main>` 본문만 추출해 새 틀로 재포장하고, 나머지는 생성합니다. `manifest.json`, `sw.js`, `sitemap.xml`, `js/analytics.js`도 함께 씁니다.
  `sw.js`의 VERSION은 캐시 대상 파일 해시로 자동 생성되므로 손으로 올리지 마세요

주의: `rent.html`, `loan.html`, `yield.html`, `fee.html`, 참고·문서 페이지는 현재 파일의 `<main>` 내용을 그대로 씁니다.
본문을 고칠 때는 HTML을 직접 고친 뒤 빌더를 돌리면 틀만 새로 씌워집니다.

정기 점검 일정(금통위·세제개편·4대보험 요율)과 상수 위치는 저장소 루트의 `CLAUDE.md`에 있습니다.
