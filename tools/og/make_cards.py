"""공유 카드(og:image) 그리기 — 내용이 바뀐 카드만 다시 그린다.

    python3 tools/og/make_cards.py           # 바뀐 카드만
    python3 tools/og/make_cards.py --all     # 전부 다시

카드 내용은 tools/build/og_cards.py(계산기 문구, 안내 글은 제목·핵심 숫자)에서 나온다.
빌드(build.py)를 먼저 돌려 숫자 확인(check_og_cards)을 통과한 뒤에 돌릴 것. 그림은 og/<쪽>.jpg(JPEG 88, 장당 50KB 안팎), 공통 카드는 og.jpg.
그린 카드의 내용 해시는 tools/og/og_hashes.json에 적고, tools/verify.js가 빌드의 tools/og/cards.json과 맞는지 본다.
글꼴(Pretendard, SIL OFL)은 tools/og/.font/에 없으면 npm 레지스트리에서 한 번 받아 둔다(저장소에는 넣지 않음).
Playwright(verify와 같은 것)가 필요하다.
"""
import json, os, subprocess, sys, tarfile, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools", "build"))
from og_cards import card_specs, spec_hash, TEMPLATE   # noqa: E402

FONT_VER = "1.3.9"
FONT = os.path.join(HERE, ".font", "PretendardVariable.woff2")
HASHES = os.path.join(HERE, "og_hashes.json")

def ensure_font():
    if os.path.exists(FONT): return
    os.makedirs(os.path.dirname(FONT), exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(["npm", "pack", f"pretendard@{FONT_VER}", "--silent"], cwd=d, check=True, stdout=subprocess.DEVNULL)
        with tarfile.open(os.path.join(d, f"pretendard-{FONT_VER}.tgz")) as t:
            m = t.getmember("package/dist/web/variable/woff2/PretendardVariable.woff2")
            open(FONT, "wb").write(t.extractfile(m).read())
    print("글꼴 받음:", FONT)

def main():
    force = "--all" in sys.argv
    specs = card_specs()
    done = json.load(open(HASHES, encoding="utf-8")) if os.path.exists(HASHES) else {}
    todo = [k for k, s in specs.items() if force or done.get(k) != spec_hash(s) or not os.path.exists(os.path.join(ROOT, k))]
    extra = sorted(set(done) - set(specs))
    if extra: print("등록부에 없는 카드(그림은 그대로 둠, 필요하면 지울 것):", ", ".join(extra))
    if not todo: print("바뀐 카드 없음"); return
    ensure_font()
    os.makedirs(os.path.join(ROOT, "og"), exist_ok=True)
    jobs = [{"out": os.path.join(ROOT, k), "card": specs[k]} for k in todo]
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump({"template": TEMPLATE, "font": FONT, "jobs": jobs}, f, ensure_ascii=False); job = f.name
    try:
        r = subprocess.run(["node", os.path.join(HERE, "render.js"), job], cwd=ROOT)
    finally:
        os.unlink(job)
    if r.returncode not in (0, 1): sys.exit(r.returncode)
    if r.returncode == 0:   # 넘친 카드가 있으면 해시를 적지 않아 다음에 다시 그린다
        for k in todo: done[k] = spec_hash(specs[k])
    done = {k: done[k] for k in sorted(done) if k in specs}
    open(HASHES, "w", encoding="utf-8").write(json.dumps(done, ensure_ascii=False, indent=1, sort_keys=True) + "\n")
    print("카드", len(todo), "장 그림" + (" — 글자가 넘친 카드가 있습니다. 위 목록의 문구를 줄이세요" if r.returncode == 1 else ""))
    if r.returncode == 1: sys.exit(1)

if __name__ == "__main__":
    main()
