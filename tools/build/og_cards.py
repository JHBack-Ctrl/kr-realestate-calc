# 쪽마다 공유 카드(og:image) (2026-11). 카톡·SNS에 링크를 붙였을 때 뜨는 1200×630 그림.
# - 계산기 38개: 아래 OG_TOOLS에 대표 예시 한 줄씩(머리말 · 큰 숫자 · 아래 줄)
# - 안내 글: 제목과 guide_keys.GUIDE_KEYS(글 맨 위 핵심 숫자)로 자동
# - 그 밖의 쪽(홈·표·서식·용어·문서): 공통 카드 og.jpg(계산기 수는 TOOLS에서)
# 카드의 숫자는 그 계산기 쪽이나 관련 안내 글(TOOL_GUIDES, src) 본문에 똑같이 있어야 한다. 없으면 빌드가 멈춘다(build.py check_og_cards).
# 그림은 `python3 tools/og/make_cards.py`가 바뀐 카드만 다시 그린다. 카드 내용과 그림이 어긋나면 verify가 잡는다.
import hashlib, json, os, re
from site_core import ROOT, TOOLS, GUIDES, GUIDE_TOPICS, TOOL_GUIDES, BASE_RATE, man_won, conv_monthly
from guide_keys import GUIDE_KEYS

TEMPLATE = os.path.join(ROOT, "tools", "og", "card.html")   # 카드 틀. 바꾸면 모든 카드가 다시 그려진다(해시에 들어감)

# 파일: (칩, 머리말, 큰 숫자 앞말, 큰 숫자, 아래 줄[, 숫자가 있는 안내 글])
OG_TOOLS = {
    "rent.html": ("월세 실부담 계산기", "같은 집, 보증금 5,000만원 · 월세 100만원이면", "월 주거비", "112만 5,000원", "전세 3억원(대출 80%)은 95만원 · 보증금 기회비용까지 넣은 실부담", "guide-jeonse-loan-vs-rent.html"),
    # 전환율 카드는 지금 기준금리로 계산한다(금리가 바뀌면 RATE_HISTORY만 고치면 됨). 숫자는 기준금리 글의 표에 있다
    "conversion.html": ("전월세 전환율 계산기", f"전세 3억을 보증금 1억으로 낮추면(전환율 {min(BASE_RATE + 2, 10):g}%)", "월세", man_won(conv_monthly(BASE_RATE)), "집주인이 월 90만원을 부르면 전환율 5.4%를 적용한 셈", "guide-base-rate-change.html"),
    "rent-tax-credit.html": ("월세 세액공제 계산기", "총급여 5,000만원 · 월세 60만원이면", "1년", "122만 4,000원", "공제율 17% · 총급여 8,000만원 이하 무주택 세대주"),
    "fee.html": ("중개보수 계산기", "3억원 아파트를 사면", "중개보수 상한", "120만원", "같은 3억원 전세는 90만원 · 법정 상한 요율 기준"),
    "loan.html": ("대출이자 계산기", "3억원을 연 4%로 30년 동안 갚으면", "월", "143만 2,246원", "원리금균등 · 30년 총이자 2억 1,560만 8,519원"),
    "dsr.html": ("DSR·LTV 한도 계산기", "연소득 6,000만원이면 DSR 40%로 낼 수 있는 원리금", "", "월 200만원", "기존 대출 상환액이 있으면 그만큼 줄어듭니다 · 스트레스 금리 반영"),
    "prepayment.html": ("중도상환수수료 계산기", "1억원 · 수수료율 1.2% 대출을 6개월 만에 갚으면", "수수료", "998,540원", "2년이면 400,000원 · 3년이 지나면 0원"),
    "acquisition-tax.html": ("취득세 계산기", "6억원 아파트를 1주택으로 사면", "취득세", "660만원", "9억원이면 2,970만원 · 지방교육세 포함", "guide-self-registration.html"),
    "capital-gains-tax.html": ("양도소득세 계산기", "차익 4억원 · 2주택 중과가 붙으면", "양도세", "2억 3,382만원", "중과가 없으면 1억 1,117만원 · 2026년 5월 10일 양도분부터"),
    "yield.html": ("상가 수익률 계산기", "광고 수익률 6.67%에 공실 5% · 운영비를 넣으면", "실제", "5.54%", "매매가 5억원 · 월세 250만원 예시의 총투자 수익률"),
    "subscription.html": ("청약 가점 계산기", "만 32세 · 미혼 · 통장 6년이면", "청약 가점", "18점", "84점 만점 · 부양가족 1명마다 5점"),
    "area.html": ("평수 변환 계산기", "아파트 전용 84㎡는", "", "25.4평", "34평형은 공급면적 기준 · 1평은 3.3058㎡"),
    "renewal.html": ("계약 갱신 청구권 계산기", "전세 3억원을 갱신할 때 올릴 수 있는", "상한", "3억 1,500만원", "5% 상한 · 만기 6개월 전부터 2개월 전까지 요구"),
    "jeonse-insurance.html": ("전세보증보험 자가진단", "보증금 + 선순위 채권이 시세의 이만큼을 넘으면 가입 불가", "", "90%", "선순위 채권만 60%를 넘어도 · 계약 기간 절반이 지나도 안 됩니다"),
    "jeonse-fraud-check.html": ("전세 사기 위험 체크", "전세가율 80% 집이 2년 뒤 10% 떨어지면", "전세가율", "88.9%", "90% 집은 10%만 떨어져도 100% · 계약 전 위험 신호 점검"),
    "moving.html": ("이사 체크리스트", "이사하면 전입신고 법정 기한은", "", "14일", "대항력은 다음 날 0시부터 · 자동차 주소 변경은 30일"),
    "rate-compare.html": ("고정 vs 변동금리 계산기", "10년 대출에서 변동금리가 매년 이만큼 오르면 고정과 같아짐", "", "0.16%p", "20년 대출이면 0.07%p · 생각보다 작은 숫자"),
    "buy-vs-rent.html": ("매매 vs 전세 계산기", "6억원 매매와 4억원 전세, 집값이 그대로면 5년간", "차이", "5,570만원", "한 달로 매매 201만 5,000원 · 전세 약 108만 7,000원"),
    "tax-calendar.html": ("부동산 세금 달력", "11월 2일 잔금으로 집을 팔면 양도세 예정신고 기한", "", "2027년 1월 31일", "양도한 달의 말일부터 2개월 · 취득·보유 세금도 D-day로"),
    "property-tax.html": ("재산세 계산기", "공시가격 6억원 · 1세대 1주택이면 1년", "재산세", "78만 7,200원", "3억원 29만 9,400원 · 9억원 151만 2,000원 · 7월·9월에 나눠 냄"),
    "comprehensive-property-tax.html": ("종합부동산세 계산기", "1주택 공시가격 15억원이면", "종부세", "69만 1,200원", "1주택 12억원 · 2주택 이상 9억원까지는 0원 · 농특세 포함"),
    "gift-tax.html": ("증여세 계산기", "성년 자녀에게 10년 동안 세금 없이 줄 수 있는 돈", "", "5,000만원", "미성년 2,000만원 · 혼인·출산은 1억원 더"),
    "salary.html": ("연봉 실수령액 계산기", "연봉 5,000만원이면", "월", "356만 5,667원", "국민연금·건강보험·소득세를 빼고 손에 쥐는 돈"),
    "severance.html": ("퇴직금 계산기", "월급 300만원으로 10년 일하면", "퇴직금", "2,936만 3,907원", "5년이면 1,468만 1,954원 · 1년에 한 달치 월급 정도"),
    "inheritance-tax.html": ("상속세 계산기", "배우자와 자녀가 받으면 상속세가 없는 재산", "", "10억원", "자녀만 받으면 5억 500만원까지 · 15억원이면 2억 3,134만 5,000원(자녀 2명)"),
    "jeonse-loan.html": ("전세자금대출 계산기", "전세 3억원을 대출 80%(연 4%)로 들어가면", "월 주거비", "95만원", "대출 이자 80만원 + 내 돈 기회비용 15만원"),
    "savings.html": ("예금·적금 이자 계산기", "1억원을 연 3% 정기예금에 1년 넣으면", "세후 이자", "253만 8,000원", "이자소득세 15.4%(46만 2,000원)를 뗀 금액"),
    "unemployment-benefit.html": ("실업급여 계산기", "50세 미만 · 고용보험 3년 이상 5년 미만이면 180일", "", "1,188만 8,640원", "하루 하한 66,048원 기준 · 받는 날수는 120일에서 270일"),
    "hourly-wage.html": ("시급·주휴수당 계산기", "시급 12,000원 · 주 40시간이면", "월급", "250만 8,000원", "주휴수당 포함 209시간 · 15,000원이면 313만 5,000원"),
    "year-end-tax.html": ("연말정산 계산기", "총급여 5,000만원 · 체크카드 2,000만원이면", "카드 공제 환급", "37만 1,250원", "신용카드면 18만 5,620원 · 한도를 채우면 49만 5,000원"),
    "registration-cost.html": ("등기비용 계산기", "6억원 아파트 등기, 법무사 없이 해도 드는 돈", "", "778만 2,000원", "취득세 660만원 · 국민주택채권 할인 109만 2,000원 포함"),
    "pension-tax-credit.html": ("연금저축·IRP 세액공제 계산기", "연금저축·IRP에 1년 900만원을 넣으면", "환급", "148만 5,000원", "총급여 5,500만원 이하 · 넘으면 118만 8,000원"),
    "parental-leave.html": ("육아휴직 급여 계산기", "육아휴직 급여 월 상한, 첫 3개월", "", "250만원", "4~6개월 200만원 · 이후 통상임금 80%, 160만원 상한"),
    "annual-leave.html": ("연차휴가 계산기", "입사 1년을 채운 다음 날 생기는 연차", "", "15일", "첫해는 한 달 개근마다 1일(최대 11일) · 최대 25일"),
    "rental-income-tax.html": ("주택임대소득세 계산기", "2주택자가 월세 100만원을 받으면 1년", "세금", "61만 6,000원", "임대사업자로 등록하면 12만 3,200원 · 분리과세 기준"),
    "income-tax.html": ("종합소득세 계산기", "프리랜서 수입 3,000만원 · 배우자와 부모님 공제면", "5월 환급", "65만 3,180원", "3.3%로 미리 뗀 세금을 정산 · 단순경비율 기준"),
    "land-multiple.html": ("땅값 몇 배 계산기", "전국 땅값, 2006년 12월부터 2026년 9월까지", "", "1.57배", "서울 1.77배 · 1987년부터 세면 3.92배 · 한국부동산원 지가지수"),
    "apartment-multiple.html": ("아파트값 몇 배 계산기", "전국 아파트값, 2006년 12월부터 2026년 9월까지", "", "1.47배", "서울 1.68배 · 제주 1.78배 · 한국부동산원 매매가격지수"),
}

HOME_CARD = "og.jpg"   # 공통 카드(홈·표·서식·용어·문서·404)

def _topic(path):
    slug = path[6:-5]
    for k, label, names in GUIDE_TOPICS:
        if slug in names.split(): return label
    return ""

def card_specs():
    """{그림 파일: 카드 내용}. 그림 파일은 og/<쪽>.jpg, 공통은 og.jpg"""
    specs = {}
    tools = {t[0]: t for t in TOOLS}
    missing = [t[0] for t in TOOLS if t[0] not in OG_TOOLS]
    assert not missing, "공유 카드(og_cards.OG_TOOLS)가 없는 계산기: " + ", ".join(missing)
    for f, v in OG_TOOLS.items():
        assert f in tools, "OG_TOOLS에 없는 계산기: " + f
        chip, lead, pre, big, sub = v[:5]
        specs["og/" + f[:-5] + ".jpg"] = {"kind": "tool", "page": f, "chip": chip, "lead": lead, "pre": pre, "big": big, "sub": sub,
                                          "foot": "가입 없이 바로 계산 · 참고용", "src": list(v[5:6])}
    for g in GUIDES:
        f = g[0]
        keys = GUIDE_KEYS.get(f[6:-5], [])
        specs["og/" + f[:-5] + ".jpg"] = {"kind": "guide", "page": f, "chip": "안내 글 · " + _topic(f), "title": g[1],
                                          "keys": [list(k) for k in keys[:3]], "foot": "참고용 · 계산 기준과 출처는 본문에 있습니다"}
    specs[HOME_CARD] = {"kind": "home", "page": "index.html", "chip": "", "title": "월세 실부담부터<br>양도세·연봉까지",
                        "sub": f"부동산·생활 계산기 {len(TOOLS)}개, 세율표와 용어 사전까지",
                        "tags": ["월세 실부담", "양도소득세", "취득세", "연봉 실수령액"], "foot": "가입 없이 브라우저에서만 계산합니다"}
    return specs

def _template_hash():
    return hashlib.sha1(open(TEMPLATE, "rb").read()).hexdigest()[:12] if os.path.exists(TEMPLATE) else "none"

def spec_hash(spec):
    return hashlib.sha1((json.dumps(spec, ensure_ascii=False, sort_keys=True) + _template_hash()).encode("utf-8")).hexdigest()[:12]

_SPECS = None
def og_image(path):
    """쪽의 og:image 주소(사이트 기준 상대). 내용이 바뀌면 ?v=가 바뀌어 메신저·검색이 새 그림을 받는다"""
    global _SPECS
    if _SPECS is None: _SPECS = card_specs()
    key = "og/" + path[:-5] + ".jpg"
    if key not in _SPECS: key = HOME_CARD
    return key + "?v=" + spec_hash(_SPECS[key])[:8], key

def image_alt(path):
    global _SPECS
    if _SPECS is None: _SPECS = card_specs()
    key = og_image(path)[1]; s = _SPECS[key]
    if s["kind"] == "tool": return f"{s['lead']} {s['pre']} {s['big']}".replace("  ", " ")
    if s["kind"] == "guide": return re.sub(r"<[^>]+>", " ", s["title"]) + " — " + " · ".join(f"{l} {v}" for v, l in s["keys"])
    return "전국부동산계산기 — " + s["sub"]

_NUM = re.compile(r"\d[\d,.]*(?:(?:억|만)(?: \d[\d,.]*(?:만)?)?)*(?: ?(?:원|%p|%|배|평|㎡|점|일|개월|년|시간))?")

def check_og_cards(read):
    """카드의 숫자가 계산기 쪽·관련 안내 글 본문에 똑같이 있는지. read(path) → html"""
    plain = lambda h: re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", h.replace("&amp;", "&")))
    bad = []
    for key, s in card_specs().items():
        if s["kind"] != "tool": continue
        pool = plain(read(s["page"])) + " " + " ".join(plain(read(g)) for g in TOOL_GUIDES.get(s["page"], []) + s["src"])
        for field in ("lead", "big", "sub"):
            for tok in _NUM.findall(s[field]):
                if not re.search(r"(원|%p|%|배|평|㎡|점|일|개월|년|시간|억|만)$", tok): continue
                if tok not in pool: bad.append(f"{s['page']}: {tok}")
    assert not bad, "공유 카드 숫자가 계산기·안내 글 본문에 없습니다 — " + ", ".join(bad)

def write_specs(path):
    out = {k: dict(v, hash=spec_hash(v)) for k, v in card_specs().items()}
    open(path, "w", encoding="utf-8").write(json.dumps(out, ensure_ascii=False, indent=1, sort_keys=True) + "\n")
