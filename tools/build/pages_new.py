# 새 계산기 7개의 본문
from site_core import *

def money(id_, label, ph="", val=None, help_=None, unit="원"):
    v = f' value="{val}"' if val is not None else ""
    p = f' placeholder="{ph}"' if ph else ""
    h = f'\n                <p class="field-help">{help_}</p>' if help_ else ""
    return f'''              <div class="field">
                <label for="{id_}">{label}</label>
                <div class="input-wrap"><input id="{id_}" type="text" inputmode="numeric" autocomplete="off"{p}{v} data-money><span class="suffix">{unit}</span></div>{h}
              </div>'''

def num(id_, label, val="", unit="", step="0.1", min_="0", help_=None, max_=None):
    h = f'\n                <p class="field-help">{help_}</p>' if help_ else ""
    mx = f' max="{max_}"' if max_ else ""
    return f'''              <div class="field">
                <label for="{id_}">{label}</label>
                <div class="input-wrap"><input id="{id_}" type="number" inputmode="decimal" step="{step}" min="{min_}"{mx} value="{val}"><span class="suffix">{unit}</span></div>{h}
              </div>'''

def date(id_, label, help_=None, wrap_id=None, hidden=False):
    h = f'\n                <p class="field-help">{help_}</p>' if help_ else ""
    w = f' id="{wrap_id}"' if wrap_id else ""
    hd = " hidden" if hidden else ""
    return f'''              <div class="field"{w}{hd}>
                <label for="{id_}">{label}</label>
                <input id="{id_}" type="date">{h}
              </div>'''

def check(id_, label, help_=None):
    h = f'\n                <p class="field-help">{help_}</p>' if help_ else ""
    return f'''              <div class="field">
                <label class="toggle"><input type="checkbox" id="{id_}"><span class="knob" aria-hidden="true"></span>{label}</label>{h}
              </div>'''

def seg(name, label, opts, n=None):
    n = n or len(opts)
    items = "".join(f'<label class="seg-option"><input type="radio" name="{name}" value="{v}"{" checked" if i == 0 else ""}><span>{t}</span></label>' for i, (v, t) in enumerate(opts))
    return f'''              <div class="field">
                <span class="label-text" id="{name}-label">{label}</span>
                <div class="segmented" role="radiogroup" aria-labelledby="{name}-label" style="--n:{n}">{items}</div>
              </div>'''

def form_open(chips=None):
    c = ""
    if chips:
        c = '          <div class="chips" role="group" aria-label="예시 값 채우기">' + "".join(f'<button type="button" class="chip" data-preset="{k}">{t}</button>' for k, t in chips) + '</div>\n'
    return f'''        <section id="calc" class="card" aria-labelledby="calc-title">
          <div class="card-head">
            <h2 id="calc-title">입력</h2>
            <span class="muted" style="font-size:13px">입력 즉시 재계산</span>
          </div>
{c}          <form id="calc-form" novalidate>
'''

def form_close(cta):
    return REMEMBER_TOGGLE + f'''            <button type="submit" class="btn btn-primary">{cta}</button>
{action_buttons()}
          </form>
        </section>'''

def hero(eyebrow, h1, sub, body):
    return f'''    <section class="hero">
      <p class="eyebrow">{eyebrow}</p>
      <h1>{h1}</h1>
      <p class="hero-sub">{sub}</p>
      <p class="hero-body">{body}</p>
    </section>'''

def result_hero(kicker, big_id, unit, stats, note_id="out-note", kicker_id=None, big_unit_id=None):
    ki = f' id="{kicker_id}"' if kicker_id else ""
    ui = f' id="{big_unit_id}"' if big_unit_id else ""
    st = "".join(f'<div class="stat"><p class="k">{k}</p><p class="v"><span id="{i}">0</span><small>{u}</small></p></div>' for k, i, u in stats)
    return f'''        <section id="result" class="card result-hero" aria-live="polite" aria-labelledby="result-title">
          <h2 id="result-title" class="sr-only">계산 결과</h2>
          <p class="result-kicker"{ki}>{kicker}</p>
          <p class="result-big"><span id="{big_id}">0</span><span class="won"{ui}>{unit}</span></p>
          <div class="stat-row">{st}</div>
          <p class="result-note" id="{note_id}"></p>
        </section>'''

AD_SIDE = ''  # 계산기 옆 광고 자리. 승인 전에는 비워둔다 (site_core.rail 주석 참고)

def layout(left, right):
    return f'''
    <div class="layout">
      <div>
{left}
      </div>
      <div class="col-sticky">
{right}{AD_SIDE}
      </div>
    </div>'''

# ============================================================ 평수 변환
def area_page():
    faq = [
        ("1평은 정확히 몇 제곱미터인가요?", ["1평은 3.305785제곱미터입니다. 정확히는 400/121제곱미터로, 한 변이 약 1.818미터인 정사각형 넓이입니다.", "반대로 1제곱미터는 약 0.3025평입니다. 제곱미터에 0.3025를 곱하면 평이 나옵니다."]),
        ("아파트 34평이 왜 전용면적 84㎡인가요?", ["분양 광고의 34평은 공급면적 기준입니다. 공급면적은 전용면적에 계단·복도 같은 주거공용면적을 더한 값이라 전용면적보다 큽니다.", "전용 84㎡는 약 25.4평인데, 여기에 공용면적 약 28㎡를 더하면 112㎡, 약 34평이 됩니다. 등기부와 세금은 전용면적을 기준으로 봅니다."]),
        ("평당 가격은 어떤 면적으로 나누나요?", ["관행상 아파트는 공급면적, 오피스텔과 상가는 계약면적으로 평당 가격을 말하는 경우가 많습니다. 같은 매물이라도 어떤 면적을 쓰느냐에 따라 평당 가격이 크게 달라지니 비교할 때는 기준을 맞추세요.", "이 계산기는 입력한 면적을 그대로 나눕니다. 비교하려는 매물들의 면적 기준이 같은지 먼저 확인하세요."]),
        ("공식 문서에는 왜 평이 없나요?", ["2007년부터 법정 계량단위가 제곱미터로 통일되어 계약서와 등기부, 분양 공고에는 제곱미터만 씁니다. 평은 관습적으로 남아 있을 뿐입니다.", "그래서 제곱미터를 보고 바로 평수 감을 잡는 연습이 필요합니다. 대략 제곱미터에 0.3을 곱하면 평에 가깝습니다."]),
    ]
    guide = prose_section("면적 단위 제대로 읽기", [
        "<h3>전용면적, 공급면적, 계약면적</h3>",
        "<p><strong>전용면적</strong>은 현관문 안쪽, 실제로 내 가족만 쓰는 공간입니다. 발코니는 빠집니다. 등기부등본과 재산세, 취득세 기준이 됩니다.</p>",
        "<p><strong>공급면적</strong>은 전용면적에 계단, 복도, 엘리베이터 홀 같은 주거공용면적을 더한 값입니다. 아파트 분양 평수는 보통 이 기준입니다.</p>",
        "<p><strong>계약면적</strong>은 공급면적에 지하주차장, 관리사무소, 커뮤니티 시설 같은 기타공용면적까지 더한 값입니다. 오피스텔과 상가는 이 기준으로 평수를 말하는 경우가 많아 같은 전용면적이라도 평수가 훨씬 크게 보입니다.</p>",
        "<h3>전용률</h3>",
        "<p>전용면적을 공급면적(또는 계약면적)으로 나눈 비율입니다. 아파트는 보통 75~85%, 오피스텔은 50% 안팎입니다. 참고표의 전용면적 추정치는 아파트 기준 75~85%를 적용한 범위입니다.</p>",
        "<h3>발코니 확장</h3>",
        "<p>발코니는 서비스 면적이라 전용면적에 포함되지 않습니다. 확장하면 실제 쓰는 공간은 넓어지지만 서류상 면적은 그대로입니다. 그래서 같은 전용 84㎡라도 확장 여부에 따라 체감 크기가 다릅니다.</p>",
    ])
    left = form_open() + money("pyeong", "평 → 제곱미터", "25", unit="평").replace('inputmode="numeric" autocomplete="off"', 'inputmode="decimal" autocomplete="off"').replace(" data-money", "").replace('type="text"', 'type="number" step="0.01" min="0"') + \
        money("sqm", "제곱미터 → 평", "84", unit="㎡").replace('inputmode="numeric" autocomplete="off"', 'inputmode="decimal" autocomplete="off"').replace(" data-money", "").replace('type="text"', 'type="number" step="0.01" min="0"') + '''
            <fieldset style="margin-top:6px">
              <legend>단가 계산 <span class="unit">(선택)</span></legend>
''' + money("price", "총액 (매매가·보증금 등)", "500,000,000") + seg("priceUnit", "면적 단위", [("pyeong", "평"), ("sqm", "㎡")]) + \
        num("area", "면적", "", "평 또는 ㎡", "0.01") + '''            </fieldset>
''' + form_close("변환하기")
    right = result_hero("평 → 제곱미터", "out-sqm", "㎡", [("제곱미터 → 평", "out-pyeong", "평"), ("평당 가격", "out-per-pyeong", "원"), ("㎡당 가격", "out-per-sqm", "원")]) + '''
        <section class="card">
          <h2>평수 참고표 <span class="unit">아파트 기준</span></h2>
          <div class="table-wrap"><table class="tbl ref-table"><thead><tr><th scope="col">평</th><th scope="col">제곱미터</th><th scope="col">전용면적 추정 (전용률 75~85%)</th></tr></thead><tbody id="ref-body"></tbody></table></div>
          <p class="result-note" id="out-area-both"></p>
        </section>'''
    main = hero("Area · Unit", "평수 변환기", "평과 제곱미터를 바꾸고 평당 가격을 계산", "평을 제곱미터로, 제곱미터를 평으로 바꿉니다. 총액과 면적을 넣으면 평당·㎡당 가격이 나옵니다. 전용면적과 공급면적이 왜 다른지도 아래에 정리했습니다.") + layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("area.html")
    head_extra = app_ld("평수 변환기", desc_of("area.html"), "area.html") + faq_ld(faq) + breadcrumb_ld("평수 변환", "area.html")
    return main, head_extra

# ============================================================ 전월세 전환율
def conversion_page():
    faq = [
        ("법정 전환율은 언제 적용되나요?", ["주택임대차보호법상 전환율 상한은 계약 기간 중이거나 계약을 갱신하면서 전세 보증금의 전부 또는 일부를 월세로 바꿀 때 적용됩니다. 그 이상으로 월세를 요구하면 초과분은 무효입니다.", "처음 맺는 신규 계약에는 이 상한이 강제되지 않습니다. 신규 계약은 시장 전환율에 따라 정해지며 보통 법정 전환율보다 높습니다."]),
        ("기준금리는 어디서 확인하나요?", ["한국은행이 통화정책방향 회의 후 발표합니다. 한국은행 홈페이지 첫 화면에 현재 기준금리가 표시됩니다.", "이 계산기의 기본값은 스크립트 상단에 기준일과 함께 상수로 두었고, 화면에서 직접 고칠 수 있습니다. 기준금리가 바뀌면 값을 바꿔 넣으세요."]),
        ("전환율이 높으면 누구에게 유리한가요?", ["전환율은 보증금을 월세로 바꾸는 비율입니다. 같은 보증금을 줄일 때 전환율이 높을수록 월세가 커지므로 임대인에게 유리하고, 낮을수록 임차인에게 유리합니다.", "월세를 전세로 바꾸는 반대 방향에서는 전환율이 낮을수록 전세금이 커집니다. 방향에 따라 유불리가 뒤집히니 결과의 두 줄을 함께 보세요."]),
        ("월세 실부담 계산기와 무엇이 다른가요?", ["이 계산기는 법령이 정한 전환율로 금액을 바꾸는 도구이고, <a href='rent.html'>월세 실부담 계산기</a>는 내 기회비용 금리로 실제 부담을 비교하는 도구입니다.", "계약 갱신에서 집주인이 제시한 월세가 상한을 넘는지 확인하려면 이 페이지를, 전세와 월세 중 어느 쪽이 내 사정에 맞는지 보려면 실부담 계산기를 쓰세요."]),
    ]
    guide = prose_section("전환율 계산 방법", [
        "<h3>법정 전환율 산식</h3>",
        "<p>주택임대차보호법 시행령은 전환율 상한을 두 값 중 낮은 쪽으로 정합니다. 하나는 연 10%이고, 다른 하나는 한국은행 기준금리에 2%포인트를 더한 값입니다. 기준금리가 2.5%라면 4.5%가 상한입니다.</p>",
        "<h3>전세를 월세로</h3>",
        "<p>줄어드는 보증금에 전환율을 곱하고 12로 나누면 월세입니다. 전세 3억을 보증금 1억에 월세로 바꾸면 줄어드는 보증금은 2억이고, 전환율 4.5%라면 연 900만원, 월 75만원입니다.</p>",
        "<h3>월세를 전세로</h3>",
        "<p>월세에 12를 곱해 연 월세를 구하고 전환율로 나누면 월세에 해당하는 보증금이 나옵니다. 여기에 기존 보증금을 더하면 전세금입니다. 월 75만원은 연 900만원이고 4.5%로 나누면 2억, 보증금 1억을 더해 전세 3억이 됩니다.</p>",
        "<h3>시장 전환율과의 차이</h3>",
        "<p>실제 거래에서 쓰이는 전환율은 지역과 시기에 따라 다르며 보통 법정 상한보다 높습니다. 한국부동산원이 지역별 전월세전환율을 매달 발표합니다. 계산기의 시장 전환율 칸에 그 값을 넣으면 법정 기준과 나란히 비교됩니다.</p>",
        "<p>계산 결과는 참고용이며 실제 계약 조건은 당사자 합의로 정해집니다. 갱신 시 상한 초과 여부처럼 법률적 판단이 필요한 경우 주택임대차분쟁조정위원회나 변호사에게 확인하세요.</p>",
    ])
    left = form_open() + seg("mode", "환산 방향", [("j2m", "전세 → 월세"), ("m2j", "월세 → 전세")]) + f'''            <div id="j2m-fields">
{money("jeonse", "현재 전세보증금", "300,000,000")}
            </div>
{money("deposit", "월세 계약의 보증금", "100,000,000", help_="전세→월세에서는 남길 보증금, 월세→전세에서는 현재 보증금입니다.")}
            <div id="m2j-fields" hidden>
{money("rent", "월세", "750,000")}
            </div>
            <fieldset style="margin-top:6px">
              <legend>전환율</legend>
              <div class="grid-2">
{num("baseRate", "한국은행 기준금리", f"{BASE_RATE:.2f}", "%", "0.05", help_="법정 상한 = 기준금리 + 2%p (최대 10%). 갱신하거나 계약 중에 전세→월세로 바꿀 때만 적용되는 상한이고, 신규 계약에는 강제되지 않습니다.")}
{num("marketRate", "시장 전환율 (비교용)", "5.5", "%", "0.1", help_="실제 거래에서 보증금을 월세로 바꿀 때 적용되는 연 이자율. 지역·시기마다 다르고 보통 법정 상한보다 높습니다. 한국부동산원(R-ONE)에서 지역별 수치를 확인하세요.")}
              </div>
              <p class="field-help"><span id="legal-formula"></span> 기준금리 기본값은 <span id="base-date"></span> 기준이며 바뀌면 고쳐 넣으세요. <a href="base-rate-history.html">변동 이력</a></p>
            </fieldset>
''' + form_close("환산하기")
    right = result_hero("법정 전환율로 환산한 월세 (월)", "out-big", "원", [("법정 전환율", "out-legal-rate", "%"), ("시장 전환율", "out-market-rate", "%")], kicker_id="out-kicker", big_unit_id="out-unit") + '''
        <section class="card">
          <h2>두 전환율 비교</h2>
          <table class="tbl"><tbody>
            <tr><th scope="row">법정 전환율 적용</th><td><span id="out-legal">0</span></td></tr>
            <tr><th scope="row">시장 전환율 적용</th><td><span id="out-market">0</span></td></tr>
          </tbody></table>
          <p class="result-note" id="out-diff"></p>
        </section>'''
    main = hero("Rent · Conversion", "전월세 전환율 계산기", "법정 전환율로 전세와 월세를 서로 바꿔보기", "한국은행 기준금리에 2%포인트를 더한 법정 전환율로 전세를 월세로, 월세를 전세로 환산합니다. 시장 전환율을 넣으면 두 기준을 나란히 비교할 수 있습니다. 계약 갱신 때 집주인이 제시한 월세가 상한을 넘는지 확인하는 용도입니다.") + layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("conversion.html")
    return main, app_ld("전월세 전환율 계산기", desc_of("conversion.html"), "conversion.html") + faq_ld(faq) + breadcrumb_ld("전월세 전환율", "conversion.html")

# ============================================================ 청약 가점
def subscription_page():
    faq = [
        ("만 30세가 안 됐는데 무주택기간은 어떻게 되나요?", ["미혼이면 만 30세가 되는 날부터 무주택기간을 셉니다. 그 전에는 산정이 시작되지 않아 0점입니다.", "만 30세 전에 혼인했다면 혼인신고일부터 셉니다. 이 계산기는 혼인 여부와 혼인신고일을 넣으면 자동으로 빠른 날짜를 고릅니다."]),
        ("예전에 집을 팔았는데 무주택기간은 언제부터인가요?", ["주택을 소유했다가 처분했다면 마지막으로 무주택자가 된 날부터 다시 셉니다. 계산기에서 과거 소유 여부를 켜고 처분일을 넣으세요.", "배우자가 주택을 소유한 적이 있으면 배우자 기준도 함께 봐야 합니다. 세대 단위 판단은 청약홈 안내를 확인하세요."]),
        ("부양가족에 누가 들어가나요?", ["배우자, 같은 등본에 3년 이상 올라 있는 직계존속(부모·조부모, 배우자의 직계존속 포함), 만 30세 미만 미혼 자녀가 기본입니다. 만 30세 이상 미혼 자녀는 1년 이상 같은 등본이어야 합니다.", "본인은 세지 않습니다. 부양가족이 0명이어도 기본 5점이 있습니다."]),
        ("청약통장을 미성년 때 만들었는데 기간이 다 인정되나요?", ["만 19세 이전 가입 기간은 인정 한도가 있습니다. 한도는 제도 개편으로 바뀌어 왔으니 청약홈에서 현재 기준을 확인하세요.", "이 계산기는 가입일부터 오늘까지를 그대로 계산하므로 미성년 가입자는 실제 점수가 더 낮을 수 있습니다."]),
        ("여기서 나온 점수로 청약해도 되나요?", ["아닙니다. 참고용입니다. 실제 청약 시에는 청약홈에서 산정한 점수를 써야 하며, 점수를 잘못 넣어 당첨되면 부적격으로 취소되고 일정 기간 청약이 제한됩니다.", "특히 무주택기간과 부양가족은 판단이 까다로우니 청약 전에 청약홈 가점 계산기와 안내를 반드시 확인하세요."]),
    ]
    guide = prose_section("가점표 읽는 법", [
        "<h3>세 항목, 84점 만점</h3>",
        "<p><strong>무주택기간</strong>은 최대 32점입니다. 1년 미만 2점에서 시작해 1년마다 2점씩 올라 15년 이상이면 32점입니다. 현재 주택을 소유하고 있으면 0점입니다.</p>",
        "<p><strong>부양가족</strong>은 최대 35점입니다. 0명 5점에서 1명마다 5점씩 올라 6명 이상이면 35점입니다.</p>",
        "<p><strong>청약통장 가입기간</strong>은 최대 17점입니다. 6개월 미만 1점, 6개월 이상 1년 미만 2점, 1년 이상부터 1년마다 1점씩 올라 15년 이상이면 17점입니다.</p>",
        "<h3>무주택기간 시작일</h3>",
        "<p>만 30세가 되는 날이 기본입니다. 30세 전에 혼인했으면 혼인신고일부터입니다. 과거에 주택을 소유했다면 마지막으로 처분한 날 이후부터 다시 셉니다. 셋 중 가장 늦은 날이 시작일입니다.</p>",
        "<h3>기준일</h3>",
        "<p>실제 청약에서 무주택기간과 통장 가입기간은 오늘이 아니라 <strong>입주자모집공고일</strong>까지 셉니다. 공고일을 넣으면 그날 기준 점수가 나오고, 비워두면 오늘 기준입니다. 공고일이 몇 달 뒤라 그 사이에 1년 단위가 바뀌면 점수가 2점(무주택) 또는 1점(통장) 오를 수 있습니다.</p>",
        "<h3>가점제와 추첨제</h3>",
        "<p>모든 청약이 가점으로 정해지지는 않습니다. 지역과 면적, 주택 유형에 따라 가점제와 추첨제 비율이 다릅니다. 가점이 낮아도 추첨 물량에 도전할 수 있고, 특별공급은 별도 자격 요건을 봅니다.</p>",
        "<p>가점표는 주택공급에 관한 규칙 별표1에 있으며 제도 개편으로 바뀔 수 있습니다. 이 계산기의 점수표는 스크립트 상단에 상수로 두었습니다.</p>",
    ])
    left = form_open() + '''            <fieldset>
              <legend>무주택기간 산정 정보</legend>
              <p class="field-help" style="margin:-4px 0 12px">무주택기간은 직접 넣는 것이 아니라 아래 정보로 자동 산정됩니다. <strong>만 30세가 되는 날</strong>부터 세고, 그 전 기간은 들어가지 않습니다. 30세 전에 혼인했으면 혼인신고일부터, 집을 판 적이 있으면 마지막 처분일부터입니다.</p>
''' + date("birth", "생년월일") + check("married", "혼인했습니다", "만 30세 전 혼인이면 혼인신고일부터 무주택기간을 셉니다.") + date("marriage", "혼인신고일", wrap_id="marriage-field", hidden=True) + \
        check("ownedBefore", "과거에 주택을 소유한 적이 있습니다") + date("lastSale", "마지막 주택 처분일", wrap_id="lastSale-field", hidden=True) + \
        check("owner", "현재 주택을 소유하고 있습니다", "소유 중이면 무주택기간 점수는 0점입니다.") + '''            </fieldset>
            <fieldset>
              <legend>부양가족과 청약통장</legend>
''' + num("dependents", "부양가족 수 (본인 제외)", "0", "명", "1", max_="10", help_="배우자, 3년 이상 같은 등본의 직계존속, 미혼 자녀. 6명 이상은 35점으로 같습니다.") + date("account", "청약통장 가입일") + '''            </fieldset>
            <fieldset>
              <legend>기준일</legend>
''' + date("notice", "입주자모집공고일 (선택)", "실제 가점은 공고일 기준으로 셉니다. 비워두면 오늘 기준으로 계산합니다.") + '''            </fieldset>
''' + form_close("가점 계산하기")
    right = result_hero("예상 청약 가점 (84점 만점)", "out-total", "점", [("무주택기간 (32)", "out-homeless", "점"), ("부양가족 (35)", "out-dependent", "점"), ("통장 가입기간 (17)", "out-account", "점")]) + '''
        <section class="card">
          <h2>항목별 내역</h2>
          <div class="score-bar" aria-hidden="true"><span class="s1" id="sb-h"></span><span class="s2" id="sb-d"></span><span class="s3" id="sb-a"></span></div>
          <p class="legend"><span><i style="background:var(--accent)"></i>무주택기간</span><span><i style="background:color-mix(in srgb,var(--accent) 65%,var(--surface))"></i>부양가족</span><span><i style="background:color-mix(in srgb,var(--accent) 40%,var(--surface))"></i>통장기간</span></p>
          <ul class="ref-list">
            <li><p class="t">무주택기간</p><p class="d" id="note-homeless"></p></li>
            <li><p class="t">부양가족</p><p class="d" id="note-dependent"></p></li>
            <li><p class="t">청약통장 가입기간</p><p class="d" id="note-account"></p></li>
          </ul>
        </section>
        <section class="card">
          <h2>가점표</h2>
          <div class="table-wrap"><table class="tbl ref-table">
            <thead><tr><th scope="col">무주택기간</th><th scope="col">점</th><th scope="col">부양가족</th><th scope="col">점</th><th scope="col">통장기간</th><th scope="col">점</th></tr></thead>
            <tbody>
              <tr><td>1년 미만</td><td>2</td><td>0명</td><td>5</td><td>6개월 미만</td><td>1</td></tr>
              <tr><td>1~2년</td><td>4</td><td>1명</td><td>10</td><td>6개월~1년</td><td>2</td></tr>
              <tr><td>2~3년</td><td>6</td><td>2명</td><td>15</td><td>1~2년</td><td>3</td></tr>
              <tr><td>…</td><td>+2/년</td><td>3명</td><td>20</td><td>…</td><td>+1/년</td></tr>
              <tr><td>14~15년</td><td>30</td><td>4명</td><td>25</td><td>14~15년</td><td>16</td></tr>
              <tr><td>15년 이상</td><td>32</td><td>5명</td><td>30</td><td>15년 이상</td><td>17</td></tr>
              <tr><td>유주택</td><td>0</td><td>6명 이상</td><td>35</td><td></td><td></td></tr>
            </tbody></table></div>
        </section>'''
    main = hero("Subscription · Score", "청약 가점 계산기", "무주택기간·부양가족·통장기간으로 84점 만점 계산", "생년월일, 혼인 여부, 부양가족 수, 청약통장 가입일을 넣으면 가점을 계산합니다. 무주택기간은 만 30세부터 자동 산정되고, 입주자모집공고일을 넣으면 그날 기준으로 셉니다. 참고용이며 실제 청약에서는 청약홈이 산정한 점수를 써야 합니다. 잘못 넣어 당첨되면 취소될 수 있습니다.") + layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("subscription.html")
    return main, app_ld("청약 가점 계산기", desc_of("subscription.html"), "subscription.html") + faq_ld(faq) + breadcrumb_ld("청약 가점", "subscription.html")

# ============================================================ 월세 세액공제
def rent_tax_credit_page():
    faq = [
        ("세액공제와 소득공제는 무엇이 다른가요?", ["소득공제는 세금을 매기는 소득 자체를 줄이고, 세액공제는 계산된 세금에서 금액을 직접 뺍니다. 월세 세액공제는 후자라 같은 금액이면 효과가 더 큽니다.", "월세 세액공제 요건이 안 되면 현금영수증을 발급받아 소득공제로 받을 수 있습니다. 둘 다 받을 수는 없습니다."]),
        ("집주인 동의가 필요한가요?", ["필요 없습니다. 임대차계약서 사본과 월세 이체 내역만 있으면 됩니다. 계약서 주소지로 전입신고가 되어 있어야 합니다.", "다만 집주인이 임대소득을 신고하지 않은 경우 관계가 불편해질 수 있어 미리 알리는 경우가 많습니다. 법적으로는 동의 사항이 아닙니다."]),
        ("공제액을 전부 돌려받나요?", ["세액공제는 산출세액 범위 안에서만 됩니다. 이미 원천징수로 낸 세금이 공제액보다 적으면 그만큼만 돌려받습니다.", "소득이 낮아 결정세액이 0에 가까우면 공제받을 세금 자체가 없을 수 있습니다. 계산기 결과는 상한이라고 보시면 됩니다."]),
        ("놓친 해의 월세도 받을 수 있나요?", ["경정청구로 5년 이내 분은 소급해 신청할 수 있습니다. 홈택스에서 해당 연도 경정청구를 진행합니다.", "연도별로 요건과 공제율이 달랐으니 그 해 기준으로 계산해야 합니다. 이 계산기는 화면에 표시된 귀속연도 기준입니다."]),
    ]
    guide = prose_section("월세 세액공제 요건 정리", [
        "<h3>누가 받나</h3>",
        "<p>과세기간 종료일 기준 무주택 세대주가 기본입니다. 세대주가 공제를 받지 않으면 세대원도 가능합니다. 총급여 8,000만원 이하(종합소득금액 7,000만원 이하)여야 합니다.</p>",
        "<h3>어떤 집이어야 하나</h3>",
        "<p>국민주택규모인 전용 85㎡ 이하이거나, 면적이 커도 기준시가 4억원 이하면 됩니다. 주거용 오피스텔과 고시원도 포함됩니다. 임대차계약서 주소지에 전입신고가 되어 있어야 합니다.</p>",
        "<h3>얼마나 받나</h3>",
        "<p>연간 월세액 중 1,000만원까지가 대상이고, 총급여 5,500만원 이하면 17%, 그 초과 8,000만원 이하면 15%를 세액에서 뺍니다. 연 월세 600만원에 17%면 102만원입니다.</p>",
        "<h3>준비 서류</h3>",
        "<ul><li>임대차계약서 사본</li><li>월세 이체 내역(계좌이체 영수증, 무통장입금증 등)</li><li>주민등록등본(전입 확인)</li></ul>",
        "<p>요건과 공제율은 세법 개정으로 해마다 바뀔 수 있습니다. 이 계산기의 기준연도는 결과 아래에 표시되며, 값은 스크립트 상단 상수로 분리되어 있습니다. 최종 확인은 국세청 홈택스 연말정산 안내를 기준으로 하세요.</p>",
    ])
    left = form_open() + money("income", "총급여 (연)", "45,000,000") + '''            <div class="grid-2">
''' + money("rent", "월세 (월)", "500,000") + num("months", "납부 개월 수", "12", "개월", "1", max_="12") + '''            </div>
            <fieldset style="margin-top:6px">
              <legend>요건 확인</legend>
''' + check("homeless", "무주택 세대주(또는 공제받는 세대원)입니다") + check("housing", "전용 85㎡ 이하이거나 기준시가 4억 이하 주택입니다") + check("moved", "계약서 주소지로 전입신고했습니다") + '''            </fieldset>
''' + form_close("공제액 계산하기")
    right = result_hero("예상 세액공제액", "out-credit", "원", [("연 월세 납부액", "out-annual", "원"), ("공제 대상 (한도 1,000만)", "out-eligible", "원"), ("공제율", "out-rate", "%"), ("한도 초과분", "out-over", "원")]) + '''
        <section class="card">
          <h2>적용 기준</h2>
          <p class="hint" id="tax-year"></p>
          <table class="tbl"><tbody>
            <tr><th scope="row">총급여 5,500만원 이하</th><td>17%</td></tr>
            <tr><th scope="row">5,500만 초과 ~ 8,000만 이하</th><td>15%</td></tr>
            <tr><th scope="row">8,000만원 초과</th><td>대상 아님</td></tr>
            <tr><th scope="row">연 월세 한도</th><td>1,000만원</td></tr>
          </tbody></table>
          <p class="result-note">종합소득금액 7,000만원 초과자는 총급여와 무관하게 대상이 아닙니다.</p>
        </section>'''
    main = hero("Tax · Credit", "월세 세액공제 계산기", "연말정산에서 돌려받는 월세 세액공제액 추정", "총급여와 월세를 넣으면 공제율과 연 1,000만원 한도를 적용해 세액공제액을 계산합니다. 요건 세 가지를 확인 항목으로 두었습니다. 실제 환급액은 산출세액 범위 안에서 정해지므로 결과는 상한으로 보세요.") + layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("rent-tax-credit.html")
    return main, app_ld("월세 세액공제 계산기", desc_of("rent-tax-credit.html"), "rent-tax-credit.html") + faq_ld(faq) + breadcrumb_ld("월세 세액공제", "rent-tax-credit.html")

# ============================================================ DSR·LTV
def dsr_page():
    faq = [
        ("LTV와 DSR 중 무엇이 한도를 정하나요?", ["둘 중 낮은 쪽입니다. LTV는 담보 가치 기준, DSR은 소득 기준이라 고가 주택에 소득이 낮으면 DSR이, 소득이 높고 집값이 낮으면 LTV가 한도를 정합니다.", "결과 화면에 어느 기준이 한도를 결정했는지 표시됩니다. 그 기준을 바꿔야 한도가 늘어납니다."]),
        ("스트레스 금리가 뭔가요?", ["DSR을 계산할 때 실제 금리에 가산 금리를 더해 상환액을 크게 잡는 제도입니다. 금리가 오를 때를 대비해 한도를 보수적으로 잡습니다. 실제로 내는 이자에는 붙지 않습니다.", "가산폭은 단계적으로 커져 왔고 지역과 대출 종류에 따라 다릅니다. 2025년 10월 15일부터 수도권·규제지역 주택담보대출은 3.0%p, 지방은 1.5%p의 절반인 0.75%p가 붙습니다(변동금리 기준, 2026년 하반기). 고정금리 기간이 긴 상품은 더 낮게 붙습니다. 기본값 3.0%p는 수도권 변동금리 기준이니 은행 안내 값을 넣으세요."]),
        ("기존 대출 연간 상환액은 어떻게 구하나요?", ["신용대출, 자동차 할부, 학자금, 카드론 등 모든 대출의 1년치 원리금을 더합니다. 마이너스통장은 한도 기준으로 계산되는 경우가 있습니다.", "<a href='loan.html'>대출이자 계산기</a>에서 기존 대출 조건을 넣으면 월 상환액이 나오니 12를 곱해 넣으세요. 만기일시 신용대출은 원금을 약정 기간으로 나눠 반영하는 은행 규정이 있습니다."]),
        ("LTV 비율은 몇 퍼센트를 넣어야 하나요?", ["규제지역 여부, 주택 가격, 무주택·생애최초 여부에 따라 다릅니다. 2025년 10월 15일부터 서울 전역과 경기 12곳이 규제지역이 되어 LTV가 40%이고, 생애최초 구입은 70%입니다. 그 밖의 지역은 대체로 70%입니다. 수도권·규제지역은 시가 15억원 이하 6억원, 25억원 이하 4억원, 25억원 초과 2억원의 금액 상한도 붙습니다.", "은행 상담이나 금융위원회 발표 자료에서 본인 조건의 LTV를 확인해 입력하세요. 예시 버튼의 값은 대략적인 감을 잡기 위한 것입니다."]),
    ]
    guide = prose_section("대출 한도가 정해지는 원리", [
        "<h3>LTV, 담보 기준</h3>",
        "<p>담보인정비율입니다. 집값에 정해진 비율을 곱한 금액에서 이미 잡혀 있는 선순위 대출과 임차보증금 같은 선순위 채권을 뺍니다. 6억원 주택에 70%면 4.2억이 담보 기준 한도입니다.</p>",
        "<h3>DSR, 소득 기준</h3>",
        "<p>총부채원리금상환비율입니다. 모든 대출의 연간 원리금 상환액을 연소득으로 나눈 비율이 한도(은행 40%, 제2금융권 50%)를 넘지 않아야 합니다. 연소득 6,000만원이면 연 상환액 2,400만원까지입니다. 기존 대출 상환액을 빼고 남은 여력으로 신규 대출 원리금을 역산하면 소득 기준 한도가 나옵니다.</p>",
        "<h3>스트레스 DSR</h3>",
        "<p>DSR 계산 때만 금리에 가산폭을 더합니다. 4.5% 대출에 3.0%p를 더하면 7.5%로 상환액을 계산해 한도가 줄어듭니다. 실제 이자는 4.5%로 냅니다. 이 계산기는 한도는 스트레스 금리로, 월 상환액은 실제 금리로 각각 보여줍니다.</p>",
        "<h3>금액 상한</h3>",
        "<p>수도권과 규제지역 주택담보대출은 LTV·DSR과 별도로 금액 상한이 있습니다. 시가 15억원 이하 6억원, 15억원 초과 25억원 이하 4억원, 25억원 초과 2억원입니다(2025년 10월 15일부터). 해당하면 금액 상한 칸에 넣으세요. 세 한도 중 가장 낮은 금액이 예상 한도입니다.</p>",
        "<h3>이 계산기가 반영하지 않는 것</h3>",
        "<ul><li>신용등급에 따른 한도 조정과 금리 차등</li><li>전세대출·중도금대출 등 상품별 별도 규정(수도권·규제지역 1주택자의 전세대출 이자는 DSR에 들어갑니다)</li><li>DTI, 총량 규제, 은행별 내규</li><li>소득 인정 방식(증빙소득·인정소득·신고소득) 차이</li></ul>",
        "<p>규제는 자주 바뀝니다. 비율과 가산폭은 모두 화면에서 고칠 수 있게 두었으니 은행 안내 값을 넣고 참고하세요. 최종 한도는 은행 심사로 정해집니다.</p>",
    ])
    left = form_open([("local", "지방 예시"), ("reg", "서울·규제지역 예시"), ("clear", "비우기")]) + '''            <fieldset>
              <legend>소득과 담보</legend>
''' + money("income", "연소득 (세전)", "60,000,000") + money("value", "담보 시세 (KB시세·감정가)", "600,000,000") + '''              <div class="grid-2">
''' + num("ltv", "적용 LTV", "70", "%", "1", max_="100", help_="규제지역 40%(생애최초 70%), 그 밖은 대체로 70%") + money("senior", "선순위 채권", "0", val="0", help_="기존 담보대출 잔액, 임차보증금 등") + '''              </div>
            </fieldset>
            <fieldset>
              <legend>기존 대출과 신규 대출 조건</legend>
''' + money("existing", "기존 대출 연간 원리금 상환액", "0", val="0", help_="신용대출·할부 등 모든 대출의 1년치 원리금 합계") + money("cap", "주담대 금액 상한 (해당 시)", "비우면 미적용", help_="수도권·규제지역: 시가 15억 이하 6억, 25억 이하 4억, 초과 2억") + '''              <div class="grid-2">
''' + num("rate", "신규 대출 금리", "4.5", "%", "0.05") + num("years", "대출 기간", "30", "년", "1", max_="50") + num("stress", "스트레스 가산", "3.0", "%p", "0.05", help_="수도권·규제지역 3.0%p, 지방 0.75%p (변동금리)") + num("dsr", "DSR 한도", "40", "%", "1", max_="100", help_="은행 40%, 2금융 50%") + '''              </div>
            </fieldset>
''' + form_close("한도 계산하기")
    right = result_hero("예상 대출 한도", "out-limit", "원", [("LTV 한도", "out-ltv", "원"), ("DSR 한도", "out-dsr", "원"), ("월 상환액 (실제 금리)", "out-monthly", "원"), ("대출 후 DSR", "out-dsr-after", "%")]) + '''
        <section class="card">
          <h2>계산 내역</h2>
          <p class="hint" id="out-binding"></p>
          <ul class="ref-list">
            <li><p class="t">LTV 한도</p><p class="d" id="bd-ltv-formula"></p></li>
            <li><p class="t">DSR 한도</p><p class="d" id="bd-dsr-formula"></p></li>
            <li><p class="t">금액 상한</p><p class="d" id="bd-cap"></p></li>
            <li><p class="t">상환액 가정</p><p class="d" id="bd-stress"></p></li>
          </ul>
        </section>'''
    main = hero("Loan · Limit", "DSR·LTV 대출 한도 계산기", "연소득과 담보로 보는 주택담보대출 가능 금액", "연소득, 담보 시세, 기존 대출 상환액과 신규 대출 조건을 넣으면 LTV 한도와 DSR 한도를 각각 계산해 낮은 쪽을 예상 한도로 보여줍니다. 비율과 스트레스 가산폭은 규제에 따라 바뀌므로 직접 넣게 했습니다.") + layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("dsr.html")
    return main, app_ld("DSR·LTV 대출 한도 계산기", desc_of("dsr.html"), "dsr.html") + faq_ld(faq) + breadcrumb_ld("DSR·LTV 한도", "dsr.html")

# ============================================================ 중도상환수수료
def prepayment_page():
    faq = [
        ("중도상환수수료는 언제까지 붙나요?", ["대부분 대출 실행일로부터 3년까지입니다. 3년이 지나면 면제되는 경우가 일반적이며, 이 계산기의 부과 기간 기본값도 36개월입니다.", "상품에 따라 1년이나 2년으로 짧은 경우도 있으니 약정서의 조건을 확인해 부과 기간을 바꿔 넣으세요."]),
        ("수수료율은 몇 퍼센트인가요?", ["상품과 금리 유형에 따라 다릅니다. 2025년부터 실제 비용 기준으로 수수료율을 정하도록 제도가 바뀌어 이전보다 낮아진 상품이 많습니다.", "정확한 값은 약정서나 은행 앱의 대출 상세에서 확인하세요. 기본값 1.2%는 예시일 뿐입니다."]),
        ("일부만 갚아도 수수료가 붙나요?", ["붙습니다. 갚는 금액에 비례합니다. 다만 은행마다 연간 일정 비율(예: 원금의 10%)까지는 수수료 없이 갚을 수 있는 조건을 두기도 합니다.", "그 한도 안에서 매년 조금씩 갚으면 수수료를 아낄 수 있습니다. 약정서에서 무료 상환 한도를 확인하세요."]),
        ("갈아타기(대환)할 때 수수료를 어떻게 봐야 하나요?", ["새 대출의 이자 절감액이 중도상환수수료와 새 대출의 부대비용을 넘어야 갈아타는 의미가 있습니다. <a href='loan.html'>대출이자 계산기</a>로 두 대출의 총 이자를 비교하고 이 수수료를 더해 보세요.", "면제일이 몇 달 남지 않았다면 그때까지 기다리는 편이 나을 수 있습니다."]),
    ]
    guide = prose_section("수수료 계산 방법", [
        "<h3>공식</h3>",
        "<p>중도상환수수료는 갚는 금액에 수수료율을 곱하고, 부과 기간 중 남은 날짜 비율을 다시 곱합니다. 1억원을 수수료율 1.2%, 부과 기간 3년 중 1년 지난 시점에 갚으면, 1억 × 1.2% × (730일 ÷ 1,095일) ≈ 80만원입니다.</p>",
        "<h3>날짜가 지날수록 줄어듭니다</h3>",
        "<p>남은 날짜에 비례하므로 같은 금액이라도 나중에 갚을수록 수수료가 작습니다. 부과 기간이 끝나는 면제일 이후에는 0원입니다. 계산기는 면제일을 함께 표시합니다.</p>",
        "<h3>확인할 것</h3>",
        "<ul><li>약정서의 수수료율과 부과 기간</li><li>연간 무료 상환 한도 여부</li><li>고정금리와 변동금리의 수수료율 차이</li><li>대환 시 새 대출의 인지세·감정료 등 부대비용</li></ul>",
        "<p>계산 결과는 참고용입니다. 실제 수수료는 은행이 약정 조건에 따라 산출한 금액이 기준입니다.</p>",
    ])
    left = form_open() + money("amount", "중도상환 금액", "100,000,000") + '''            <div class="grid-2">
''' + num("feeRate", "수수료율", "1.2", "%", "0.01") + num("period", "수수료 부과 기간", "36", "개월", "1", help_="보통 36개월") + '''            </div>
            <div class="grid-2">
''' + date("start", "대출 실행일") + date("pay", "상환 예정일") + '''            </div>
''' + form_close("수수료 계산하기")
    right = result_hero("예상 중도상환수수료", "out-fee", "원", [("잔여일수", "out-remain", ""), ("부과 기간 총일수", "out-total", ""), ("잔여 비율", "out-ratio", "%"), ("수수료 면제일", "out-exempt", "")]) + '''
        <section class="card">
          <h2>계산식</h2>
          <p class="hint" id="out-formula"></p>
          <p class="result-note">수수료 = 상환금액 × 수수료율 × (잔여일수 ÷ 부과 기간 일수)</p>
        </section>'''
    main = hero("Loan · Prepayment", "중도상환수수료 계산기", "잔여일수 비율로 계산한 수수료와 면제일", "상환금액, 수수료율, 대출 실행일과 상환 예정일을 넣으면 남은 기간 비율로 중도상환수수료를 계산하고 수수료가 사라지는 면제일을 알려줍니다. 약정서의 수수료율과 부과 기간을 그대로 넣으세요.") + layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("prepayment.html")
    return main, app_ld("중도상환수수료 계산기", desc_of("prepayment.html"), "prepayment.html") + faq_ld(faq) + breadcrumb_ld("중도상환수수료", "prepayment.html")

# ============================================================ 취득세
def acquisition_tax_page():
    faq = [
        ("취득세는 언제까지 내나요?", ["취득일(보통 잔금일)로부터 60일 이내에 신고하고 납부합니다. 등기를 하려면 취득세 납부 영수증이 필요해 실무에서는 잔금일에 함께 처리합니다.", "기한을 넘기면 가산세가 붙습니다. 위택스에서 온라인 신고와 납부가 가능합니다."]),
        ("6억에서 9억 사이는 세율이 왜 소수점으로 나오나요?", ["이 구간은 1%에서 3%까지 가격에 비례해 올라가는 사선 구조입니다. 취득가액(억원)에 2/3을 곱하고 3을 빼면 세율(%)이 나옵니다. 7억 5천이면 2%입니다.", "6억 이하는 1%, 9억 초과는 3%로 고정입니다. 6억 1천만원과 5억 9천만원의 세율 차이가 갑자기 커지지 않도록 만든 구조입니다."]),
        ("일시적 2주택은 어떻게 넣나요?", ["기존 주택을 일정 기간 안에 처분하는 조건이면 1주택 세율을 적용받습니다. 계산기에서 1주택(또는 일시적 2주택)을 고르세요.", "처분 기한 안에 팔지 못하면 중과세율과의 차액을 추징당합니다. 기한은 지역과 시점에 따라 다르니 위택스나 세무사에게 확인하세요."]),
        ("생애최초 감면은 어떻게 받나요?", ["본인과 배우자 모두 주택을 소유한 적이 없고, 취득가액 12억원 이하 주택을 취득하면 취득세를 200만원 한도로 감면받습니다. 소득 요건은 폐지되었습니다.", "감면받은 뒤 3개월 내 전입하지 않거나 3년 내 처분·임대하면 추징될 수 있습니다. 요건과 한도는 바뀔 수 있어 신고 시점 기준으로 확인이 필요합니다."]),
        ("상가주택은 어떻게 계산하나요?", ["한 건물에 주택과 상가가 함께 있으면 취득가액을 주택 부분과 상가 부분으로 나눠, 주택 부분은 주택 세율(1~3%, 다주택이면 중과)을, 상가 부분은 주택 수와 관계없이 4%(지방교육세·농특세를 더해 4.6%)를 따로 적용합니다. 계산기에서 상가주택을 고르고 주택 부분 비율을 넣으세요.",
                                       "나누는 비율은 보통 주택 부분의 개별주택가격과 상가 부분의 건물·토지 시가표준액 비율입니다. 모르면 건축물대장의 면적 비율로 대략 넣어 볼 수 있습니다. 주택 부분 세율 구간은 주택 부분 가액으로 정했으며, 지자체 판단이 다를 수 있어 신고 전 관할 구청에 확인하세요."]),
        ("이 계산기 결과로 신고해도 되나요?", ["아닙니다. 참고용 추정입니다. 실제 세액은 위택스 신고 화면에서 자동 계산되며, 조정대상지역 지정 현황, 주택 수 산정(분양권·입주권·오피스텔 포함 여부), 감면 요건에 따라 달라집니다.", "세율표는 스크립트 상단 상수로 두었고 기준일을 표시합니다. 개정이 있으면 표가 갱신되기 전까지 결과가 다를 수 있습니다."]),
    ]
    guide = prose_section("취득세 구조 이해하기", [
        "<h3>세 가지 세금이 함께 붙습니다</h3>",
        "<p>취득세만 내는 것이 아닙니다. 지방교육세가 취득세에 연동해 붙고, 전용면적 85㎡를 넘는 주택은 농어촌특별세도 붙습니다. 흔히 말하는 '취득세 1.1%'는 취득세 1%에 지방교육세 0.1%를 더한 값입니다.</p>",
        "<h3>주택 표준세율</h3>",
        "<p>1주택자(또는 비조정지역 2주택자)는 취득가액에 따라 6억 이하 1%, 6억 초과 9억 이하 1~3% 비례, 9억 초과 3%입니다. 지방교육세는 취득세율의 10%, 농어촌특별세는 85㎡ 초과 시 0.2%입니다.</p>",
        "<h3>다주택 중과</h3>",
        "<p>조정대상지역에서 2주택이 되거나 비조정지역에서 3주택이 되면 8%, 조정대상지역 3주택 이상이나 비조정 4주택 이상, 법인은 12%입니다. 이때 지방교육세는 0.4%, 농어촌특별세는 85㎡ 초과 시 각각 0.6%와 1.0%입니다.</p>",
        "<h3>주택이 아닌 부동산</h3>",
        "<p>토지, 상가, 업무용 오피스텔은 취득세 4%에 지방교육세 0.4%, 농어촌특별세 0.2%를 더해 4.6%입니다. 면적과 무관하게 농어촌특별세가 붙습니다.</p>",
        "<h3>상가주택 (겸용주택)</h3>",
        "<p>1층 상가, 2~3층 주택처럼 한 건물에 두 용도가 섞여 있으면 취득가액을 주택 부분과 상가 부분으로 나눠 따로 계산합니다. 주택 부분은 위 주택 세율, 상가 부분은 4.6%입니다. 다주택 중과도 주택 부분에만 붙습니다. 이 계산기는 주택 부분 가액으로 1~3% 구간을 정하고, 넣은 비율대로 나눕니다. 자세한 예시는 <a href=\"guide-mixed-use-acquisition.html\">상가주택 취득세 안내 글</a>에 있습니다.</p>",
        "<h3>이 계산기가 다루지 않는 것</h3>",
        "<ul><li>증여(3.5%)와 상속(2.8%) 등 무상취득</li><li>주택 수 산정 세부 규칙(분양권·입주권·주거용 오피스텔 포함 여부, 상속주택 특례 등)</li><li>신축·원시취득, 지역별 감면 조례</li><li>감면분에 대한 농어촌특별세 등 부수 항목</li></ul>",
        "<p>세율과 요건은 지방세법 개정으로 바뀝니다. 결과 화면에 기준일을 표시했고, 세율표는 스크립트 상단 상수로 분리했습니다. 실제 신고 전에 위택스 계산 결과와 세무사 확인을 거치세요.</p>",
    ])
    sit_opts = "".join(f'<option value="{v}">{t}</option>' for v, t in [("one", "1주택 (또는 일시적 2주택)"), ("nonadj2", "비조정지역 2주택"), ("adj2", "조정대상지역 2주택"), ("nonadj3", "비조정지역 3주택"), ("adj3", "조정대상지역 3주택 이상"), ("nonadj4", "비조정지역 4주택 이상"), ("corp", "법인")])
    left = form_open([("house7", "주택 7억"), ("mixed12", "상가주택 12억"), ("clear", "지우기")]) + seg("kind", "물건 종류", [("house", "주택"), ("mixed", "상가주택"), ("nonhouse", "토지·상가")]) + money("price", "취득가액", "700,000,000") + f'''            <div id="mixed-fields" hidden>
{num("houseShare", "주택 부분 비율", "50", "%", step="1", max_="100", help_="취득가액 중 주택 부분 몫입니다. 보통 주택 부분 개별주택가격과 상가 부분 건물·토지 시가표준액의 비율로 나눕니다. 모르면 건축물대장의 면적 비율로 넣어 보세요.")}
            </div>
            <div id="house-fields">
              <div class="field">
                <label for="situation">취득 후 주택 수와 지역</label>
                <select id="situation">{sit_opts}</select>
                <p class="field-help">취득하는 주택을 포함한 세대 기준 주택 수입니다. 조정대상지역 여부는 취득 시점 지정 현황을 따릅니다. 상가주택이면 주택 부분에만 적용됩니다.</p>
              </div>
{check("large", "전용면적 85㎡ 초과", "초과하면 농어촌특별세가 붙습니다.")}{check("firstHome", "생애최초 주택 구입 감면 적용", "본인·배우자 모두 무주택 이력, 12억 이하, 표준세율 대상일 때 취득세 200만원 한도 감면.")}
            </div>
''' + form_close("취득세 계산하기")
    right = result_hero("예상 취득 관련 세금 합계", "out-total", "원", [("취득세", "out-tax", "원"), ("지방교육세", "out-edu", "원"), ("농어촌특별세", "out-rural", "원"), ("실효세율", "out-effective", "%")]) + '''
        <section class="card">
          <h2>세금 내역</h2>
          <p class="hint" id="out-kind"></p>
          <table class="tbl"><tbody>
            <tr><th scope="row">취득세 <span class="unit"><span id="out-tax-rate">0</span>%</span></th><td><span id="out-tax-d">0</span>원</td></tr>
            <tr><th scope="row">지방교육세 <span class="unit"><span id="out-edu-rate">0</span>%</span></th><td><span id="out-edu-d">0</span>원</td></tr>
            <tr><th scope="row">농어촌특별세 <span class="unit"><span id="out-rural-rate">0</span>%</span></th><td><span id="out-rural-d">0</span>원</td></tr>
            <tr id="reduction-row" hidden><th scope="row">생애최초 감면</th><td>−<span id="out-reduction">0</span>원</td></tr>
          </tbody></table>
          <p class="result-note"><span id="rate-date"></span>. 참고용 추정이며 실제 세액은 위택스 신고 화면과 세무사 확인이 기준입니다.</p>
        </section>
        <section class="card" id="mixed-card" hidden>
          <h2>상가주택 나눠 보기</h2>
          <div class="table-wrap"><table class="tbl">
            <thead><tr><th scope="col">구분</th><th scope="col">가액 (원)</th><th scope="col">세율</th><th scope="col">세금 (원)</th></tr></thead>
            <tbody>
              <tr><th scope="row">주택</th><td><span id="out-house-price">0</span></td><td><span id="out-house-rate">0</span>%</td><td><span id="out-house-sum">0</span></td></tr>
              <tr><th scope="row">상가</th><td><span id="out-shop-price">0</span></td><td><span id="out-shop-rate">0</span>%</td><td><span id="out-shop-sum">0</span></td></tr>
            </tbody></table></div>
          <p class="result-note">세율은 취득세·지방교육세·농어촌특별세를 더한 값입니다. 주택 부분 세율 구간은 주택 부분 가액으로 정했습니다.</p>
        </section>
        <section class="card">
          <h2>주택 취득세율표</h2>
          <div class="table-wrap"><table class="tbl ref-table nowrap-head">
            <thead><tr><th scope="col">구분</th><th scope="col">취득세</th><th scope="col">지방교육세</th><th scope="col">농특세 (85㎡ 초과)</th></tr></thead>
            <tbody>
              <tr><th scope="row">1주택 6억 이하</th><td>1%</td><td>0.1%</td><td>0.2%</td></tr>
              <tr><th scope="row">1주택 6억~9억</th><td>1~3% 비례</td><td>취득세의 10%</td><td>0.2%</td></tr>
              <tr><th scope="row">1주택 9억 초과</th><td>3%</td><td>0.3%</td><td>0.2%</td></tr>
              <tr><th scope="row">조정 2주택 · 비조정 3주택</th><td>8%</td><td>0.4%</td><td>0.6%</td></tr>
              <tr><th scope="row">조정 3주택↑ · 비조정 4주택↑ · 법인</th><td>12%</td><td>0.4%</td><td>1.0%</td></tr>
              <tr><th scope="row">토지·상가·업무용</th><td>4%</td><td>0.4%</td><td>0.2% (면적 무관)</td></tr>
              <tr><th scope="row">상가주택</th><td colspan="3">주택 부분은 위 주택 세율, 상가 부분은 토지·상가 세율</td></tr>
            </tbody></table></div>
        </section>'''
    main = hero("Tax · Acquisition", "취득세 계산기", "취득세·지방교육세·농어촌특별세 참고용 추정", "취득가액과 주택 수, 조정대상지역 여부, 전용면적을 넣으면 취득세와 함께 붙는 지방교육세, 농어촌특별세를 합한 예상 세금을 계산합니다. 상가주택은 주택 부분과 상가 부분을 나눠 계산합니다. 세율은 개정될 수 있고 주택 수 판정은 개인 상황에 따라 달라 결과는 참고용입니다. 실제 신고는 위택스 화면과 세무사 확인을 기준으로 하세요.") + layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("acquisition-tax.html")
    return main, app_ld("취득세 계산기", desc_of("acquisition-tax.html"), "acquisition-tax.html") + faq_ld(faq) + breadcrumb_ld("취득세", "acquisition-tax.html")

NEW_PAGES = {
    "area.html": (area_page, "js/area.js", "㎡ 환산"),
    "conversion.html": (conversion_page, "js/conversion.js", "환산 결과"),
    "subscription.html": (subscription_page, "js/subscription.js", "예상 가점"),
    "rent-tax-credit.html": (rent_tax_credit_page, "js/rent-tax-credit.js", "예상 세액공제"),
    "dsr.html": (dsr_page, "js/dsr.js", "예상 한도"),
    "prepayment.html": (prepayment_page, "js/prepayment.js", "예상 수수료"),
    "acquisition-tax.html": (acquisition_tax_page, "js/acquisition-tax.js", "예상 세금 합계"),
}
