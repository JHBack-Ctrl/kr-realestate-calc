# 아파트값 몇 배 계산기 자료 만들기: tools/data/raw/의 원자료 → tools/data/apt_index.json
#   python3 tools/data/convert_apt_index.py
# 원자료를 새로 받으면(해마다 1월, 또는 최신 달을 더할 때) raw/ 파일을 바꾸고 이 스크립트를 돌린 뒤 빌드한다.
# 숫자는 손대지 않고 옮긴다. 연도 값 = 그해 12월 매매가격지수, 올해는 가장 최근 달 지수.
# 평균매매가격은 「몇 배」 계산에 쓰지 않고(부동산원 안내: 시계열 변동률 산정에 부적절), 가장 최근 달 값만 「지금 시세」 기본값으로 쓴다.
import os, re, csv, json, glob, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from convert_land_index import read_xlsx      # 표준 라이브러리만 쓰는 xlsx 읽기(땅값과 같은 것)

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
OUT = os.path.join(HERE, "apt_index.json")
SOURCE = "한국부동산원 전국주택가격동향조사 아파트 매매가격지수"
BASE = "2026년 6월=100"          # R-ONE 화면 표기(파일 안에는 없음, raw/README.md). 기준 시점이 바뀌면 고칠 것
SKIP_TOP = {"수도권", "지방권", "5대광역시", "4대광역시", "8개도", "7개도"}   # 전국 단위 권역 묶음

def is_group(name):
    """서울 강북지역·도심권, 경기 경부1권, 부산 중부산권처럼 시·군·구가 아닌 권역 묶음."""
    return name.endswith("권") or name in ("강북지역", "강남지역")

def body(rows):
    return [r for r in rows if r and r[0] and str(r[0]).strip().isdigit()]

def region_name(key):
    """(시도, 권역, 생활권·시, 시군구) → 「서울 강남구」, 「경기 성남시 분당구」, 「서울 전체」. 권역 묶음이면 None.
    전남광주는 둘째 칸(전남·광주)이 시·도 구실을 한다(땅값 계산기와 같은 이름 규칙)."""
    top, rest = key[0], list(key[1:])
    if top == "전남광주":
        if rest[0] == "전남광주": return None              # 통합 묶음(2026년 6월부터)
        top, rest = rest[0], rest[1:]
    if is_group(rest[-1]): return None                     # 맨 끝이 권역이면 권역 합계 줄
    parts = [top]
    for n in rest:
        if not is_group(n) and n != parts[-1]: parts.append(n)
    if top == "전국": return "전국"
    return top + " 전체" if len(parts) == 1 else " ".join(parts)

def main():
    ir = read_xlsx(glob.glob(os.path.join(RAW, "rone_apt_sale_index_monthly_*.xlsx"))[0])
    ar = read_xlsx(glob.glob(os.path.join(RAW, "rone_apt_avg_price_monthly_*.xlsx"))[0])
    mr = read_xlsx(glob.glob(os.path.join(RAW, "rone_apt_avg_price_per_m2_monthly_*.xlsx"))[0])
    # 지수 표: 달마다 두 열(1행 시점, 3행 '원자료'·'전기대비증감률') — 원자료 열만
    ih, isub = ir[0], ir[2]
    icol = {ih[j]: j for j in range(5, len(ih)) if isub[j] == "원자료"}
    last_label = [ih[j] for j in range(5, len(ih)) if isub[j] == "원자료"][-1]     # 예: "2026년 9월"
    ly, lm = map(int, re.findall(r"\d+", last_label))
    # 평균가격 표: 달마다 한 열, 3행이 단위
    assert ar[2][-1] == "천원" and mr[2][-1] == "천원/㎡", "평균가격 단위가 천원·천원/㎡이 아닙니다: " + str((ar[2][-1], mr[2][-1]))
    assert ar[0][-1] == last_label == mr[0][-1], "지수와 평균가격의 최신 달이 다릅니다: " + str((last_label, ar[0][-1], mr[0][-1]))
    avg = {tuple(r[1:5]): r[-1] for r in body(ar)}
    avgm2 = {tuple(r[1:5]): r[-1] for r in body(mr)}

    def val(row, label):
        j = icol.get(label)
        return float(row[j]) if j is not None and j < len(row) and row[j] not in (None, "") else None

    regions, skipped_short, groups = [], [], 0
    for r in body(ir):
        key = tuple(r[1:5])
        if key[0] in SKIP_TOP: groups += 1; continue
        name = region_name(key)
        if not name: groups += 1; continue
        series = {}
        for y in range(2003, ly):
            v = val(r, f"{y}년 12월")
            if v is not None: series[str(y)] = v
        v = val(r, last_label)
        if v is not None: series[str(ly)] = v
        if len(series) < 2: skipped_short.append(name); continue     # 올해 새로 생긴 구는 비교할 해가 없다
        sido = "" if key[0] == "전국" else key[0]
        item = {"key": name, "sido": sido, "label": name, "series": series}
        a, m = avg.get(key), avgm2.get(key)
        if a not in (None, ""): item["avg"] = round(float(a) * 1000)        # 천원 → 원
        if m not in (None, ""): item["avg_m2"] = round(float(m) * 1000)
        regions.append(item)
    keys = [x["key"] for x in regions]
    assert len(keys) == len(set(keys)), "지역 이름이 겹칩니다: " + str([k for k in keys if keys.count(k) > 1])
    no_avg = [x["key"] for x in regions if "avg" not in x]
    print(f"권역 묶음 {groups}줄 뺌, 자료가 한 해치뿐이라 뺀 지역 {len(skipped_short)}곳: {', '.join(skipped_short)}")
    print(f"평균매매가격이 없는 지역 {len(no_avg)}곳: {', '.join(no_avg)}")
    with open(glob.glob(os.path.join(RAW, "kosis_cpi_*.csv"))[0], encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    cpi = {y: float(v) for y, v in zip(rows[0][1:], rows[1][1:])}
    meta = {"source": SOURCE, "base": BASE, "latest": f"{ly}년 {lm}월", "latest_year": ly, "latest_month": lm,
            "avg_label": f"{ly}년 {lm}월", "avg_source": "한국부동산원 아파트 평균매매가격",
            "cpi_source": "통계청 소비자물가지수(2020=100) 연간", "cpi_last": max(int(y) for y in cpi)}
    json.dump({"meta": meta, "regions": regions, "cpi": cpi}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0, sort_keys=False)
    print(f"지역 {len(regions)}곳, {meta['latest']}까지, 평균매매가격 {len(regions) - len(no_avg)}곳 → {OUT}")

if __name__ == "__main__":
    main()
