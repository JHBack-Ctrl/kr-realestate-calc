# 땅값 몇 배 계산기 자료 만들기: tools/data/raw/의 원자료 → tools/data/land_index.json
#   python3 tools/data/convert_land_index.py
# 원자료를 새로 받으면(해마다 1월, 또는 최신 달을 더할 때) raw/ 파일을 바꾸고 이 스크립트를 돌린 뒤 빌드한다.
# 숫자는 손대지 않고 옮긴다. 연간 값 = 그해 12월 지수(연간 표와 월별 표의 12월이 같음을 확인하고 쓴다).
import os, re, csv, json, glob, zipfile
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
OUT = os.path.join(HERE, "land_index.json")
SOURCE = "한국부동산원 지가변동률조사 지가지수"
BASE = "2026년 6월=100"          # R-ONE 화면 표기(파일 안에는 없음). 기준 시점이 바뀌면 고칠 것
SKIP_TOP = {"수도권", "지방", "대도시", "시지역", "군지역"}   # 권역 묶음은 2009~2011년부터라 뺀다
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

def read_xlsx(path):
    """첫 시트를 행 목록으로 (표준 라이브러리만)."""
    z = zipfile.ZipFile(path)
    shared = [("".join(t.text or "" for t in si.iter(NS + "t"))) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(NS + "si")] \
        if "xl/sharedStrings.xml" in z.namelist() else []
    def col(ref):
        n = 0
        for ch in re.match(r"[A-Z]+", ref).group(0): n = n * 26 + ord(ch) - 64
        return n - 1
    rows = []
    for r in ET.fromstring(z.read("xl/worksheets/sheet1.xml")).iter(NS + "row"):
        cells = {}
        for c in r.iter(NS + "c"):
            v, t = c.find(NS + "v"), c.get("t")
            if t == "inlineStr": cells[col(c.get("r"))] = "".join(x.text or "" for x in c.iter(NS + "t"))   # 머리글 칸
            elif v is not None: cells[col(c.get("r"))] = shared[int(v.text)] if t == "s" else v.text
        rows.append([cells.get(i) for i in range(max(cells) + 1)] if cells else [])
    return rows

def table(path):
    rows = read_xlsx(path)
    head = rows[0]
    body = [r for r in rows[2:] if r and r[0] and str(r[0]).strip().isdigit()]
    return head, {tuple(r[1:4]): r for r in body}, [tuple(r[1:4]) for r in body]

def main():
    ah, A, _ = table(glob.glob(os.path.join(RAW, "rone_land_index_annual_*.xlsx"))[0])
    mh, M, order = table(glob.glob(os.path.join(RAW, "rone_land_index_monthly_*.xlsx"))[0])
    last_label = mh[-1]                                   # 예: "2026년 9월"
    ly, lm = map(int, re.findall(r"\d+", last_label))
    def cell(row, head, label):
        i = head.index(label) if label in head else -1
        return float(row[i]) if 0 <= i < len(row) and row[i] not in (None, "") else None
    # 2026-11 받은 연간 표는 경북(의성군부터)·경남·제주 구간에서 지역 이름과 숫자가 한 줄씩 어긋나 있다
    # (연간 「의성군」 줄의 숫자 = 월별 「(구)군위군」의 12월 값). 그래서 이름이 아니라 숫자로 맞춘다:
    # 연간 표에서 2005년 이후 값이 이 지역의 월별 12월 값과 모두 같은 줄을 찾아, 그 줄의 2004년 이전 값만 쓴다.
    # 2005년 이후는 월별 표(12월)를 그대로 쓴다. 맞는 줄이 하나가 아니면 2004년 이전은 비워 둔다.
    annual_rows = list(A.values())
    regions, realigned, unmatched = [], [], []
    for key in order:
        top, mid, low = key
        if top in SKIP_TOP or mid in ("시지역", "군지역") or (top == mid == low == "전남광주"): continue
        m = M[key]
        dec = {y: cell(m, mh, f"{y}년 12월") for y in range(2005, ly)}
        dec = {y: v for y, v in dec.items() if v is not None}
        series = {str(y): v for y, v in dec.items()}
        if dec:
            match = [a for a in annual_rows if all(cell(a, ah, f"{y}년") == v for y, v in dec.items())]
            if len(match) == 1:
                a = match[0]
                if tuple(a[1:4]) != key: realigned.append((key, tuple(a[1:4])))
                for y in range(1987, 2005):
                    v = cell(a, ah, f"{y}년")
                    if v is not None: series[str(y)] = v
            elif key in A and any(cell(A[key], ah, f"{y}년") is not None for y in range(1987, 2005)): unmatched.append(key)
        lv = cell(m, mh, mh[-1])
        if lv is not None: series[str(ly)] = lv
        series = dict(sorted(series.items()))
        if len(series) < 2: continue                     # 한 해치만 있으면 비교할 수 없다(2026년에 새로 생긴 구)
        # 이름: 「서울 전체」, 「서울 강남구」, 「경기 성남시 분당구」. 전남광주는 둘째 칸(전남·광주)이 시·도 구실을 한다
        if top == "전남광주": top, mid, low = mid, low, low
        if top == "전국": name = "전국"
        elif mid == low == top: name = top + " 전체"
        elif mid == low: name = top + " " + low
        else: name = f"{top} {mid} {low}"
        regions.append({"key": name, "sido": "" if key[0] == "전국" else key[0], "label": name, "series": series})
    print(f"연간 표 줄 어긋남을 숫자로 바로잡은 지역 {len(realigned)}곳, 연간 표에서 짝을 못 찾아 2005년부터만 쓰는 지역 {len(unmatched)}곳")
    for k, frm in realigned: print("  ", " ".join(k), "← 연간 표의", " ".join(frm), "줄")
    for k in unmatched: print("   짝 없음:", " ".join(k))
    keys = [r["key"] for r in regions]; assert len(keys) == len(set(keys)), "지역 이름이 겹칩니다"
    with open(glob.glob(os.path.join(RAW, "kosis_cpi_*.csv"))[0], encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    cpi = {y: float(v) for y, v in zip(rows[0][1:], rows[1][1:])}
    meta = {"source": SOURCE, "base": BASE, "latest": f"{ly}년 {lm}월", "latest_year": ly, "latest_month": lm,
            "cpi_source": "통계청 소비자물가지수(2020=100) 연간", "cpi_last": max(int(y) for y in cpi)}
    json.dump({"meta": meta, "regions": regions, "cpi": cpi}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=False)
    print(f"지역 {len(regions)}곳, {meta['latest']}까지, 물가 {min(cpi)}~{max(cpi)} → {OUT}")

if __name__ == "__main__":
    main()
