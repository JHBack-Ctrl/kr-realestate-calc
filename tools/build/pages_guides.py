# 안내 글 4편, 안내 글 목록, 홈 허브
from site_core import *

def article(path, h1, lead, blocks, cta, related_tools):
    cta_html = f'''
        <div class="cta-box"><p>{cta[0]}</p><a class="btn btn-primary" href="{cta[1]}">{cta[2]}</a></div>'''
    rel = "".join(f'<a class="tool-card" href="{f}"><p class="t">{n}</p><p class="d">{d}</p></a>' for (f, n, _t, _d, _c, d) in [t for t in TOOLS if t[0] in related_tools])
    body = "\n".join(blocks)
    return f'''    <article class="article">
      <section class="hero">
        <p class="eyebrow">Guide</p>
        <h1>{h1}</h1>
        <p class="lead">{lead}</p>
        <p class="meta">전국부동산계산기 · {TODAY.replace("-", ".")} · 참고용 설명이며 금융·세무·법률 자문이 아닙니다</p>
      </section>
      <section class="card">
        <div class="prose">
{body}
        </div>{cta_html}
      </section>{INLINE_AD}
      <section class="card related" aria-labelledby="rel-title">
        <h2 id="rel-title">이 글과 함께 쓰는 계산기</h2>
        <div class="tool-grid">{rel}</div>
      </section>
      <p class="hint" style="margin-top:14px"><a href="guides.html">← 안내 글 목록</a></p>
    </article>'''

def guide_repayment():
    g = GUIDES[0]
    blocks = [
        "<p>대출을 받을 때 은행이 묻는 첫 질문 중 하나가 상환 방식입니다. 원리금균등, 원금균등, 만기일시 세 가지가 있고, 같은 금액을 같은 금리로 빌려도 매달 내는 돈과 총 이자가 달라집니다. 숫자로 놓고 비교하면 차이가 분명해집니다.</p>",
        "<h2>같은 조건, 세 가지 결과</h2>",
        "<p>1억원을 연 4.5%로 10년간 빌린다고 해봅시다.</p>",
        '<div class="table-wrap"><table class="tbl"><thead><tr><th scope="col">방식</th><th scope="col">첫 달</th><th scope="col">마지막 달</th><th scope="col">총 이자</th></tr></thead><tbody>'
        '<tr><th scope="row">원리금균등</th><td>1,036,384원</td><td>1,036,384원</td><td>약 2,437만원</td></tr>'
        '<tr><th scope="row">원금균등</th><td>1,208,333원</td><td>836,458원</td><td>약 2,269만원</td></tr>'
        '<tr><th scope="row">만기일시</th><td>375,000원</td><td>100,375,000원</td><td>4,500만원</td></tr></tbody></table></div>',
        "<p>총 이자만 보면 원금균등이 가장 적고 만기일시가 가장 많습니다. 하지만 첫 달 부담은 정반대입니다. 이 표 하나가 세 방식의 성격을 다 보여줍니다.</p>",
        "<h2>원리금균등: 매달 같은 금액</h2>",
        "<p>원금과 이자를 합한 총액이 매달 같습니다. 초반에는 그 안에서 이자 비중이 크고, 갚아갈수록 원금 비중이 커집니다. 매달 나가는 돈이 일정해 생활비 계획을 세우기 쉽고, 급여 생활자가 가장 많이 고르는 방식입니다.</p>",
        "<p>단점은 초반에 원금이 천천히 줄어 총 이자가 원금균등보다 많다는 점입니다. 위 예시에서는 약 170만원 차이입니다.</p>",
        "<h2>원금균등: 처음이 무겁고 갈수록 가벼움</h2>",
        "<p>매달 갚는 원금이 같습니다. 이자는 남은 원금에 붙으니 매달 조금씩 줄어들어 총 납부액도 매달 줄어듭니다. 원금이 빨리 줄어 총 이자가 가장 적습니다.</p>",
        "<p>첫 달 부담이 원리금균등보다 크다는 점이 부담입니다. 소득이 앞으로 늘어날 사람보다는, 지금 여유가 있고 총 비용을 줄이고 싶은 사람에게 맞습니다.</p>",
        "<h2>만기일시: 이자만 내다 한 번에</h2>",
        "<p>기간 내내 이자만 내고 만기에 원금을 한 번에 갚습니다. 매달 부담이 가장 가볍지만 원금이 전혀 줄지 않아 총 이자가 가장 많습니다. 전세자금대출처럼 만기에 목돈이 돌아오는 상황에 쓰는 방식입니다.</p>",
        "<p>일반 주택담보대출이나 신용대출을 이 방식으로 받으면 만기에 원금을 마련하지 못해 다시 대출을 받는 상황이 생기기 쉽습니다.</p>",
        "<h2>어떻게 고르나</h2>",
        "<ul><li>매달 지출을 일정하게 유지하는 것이 중요하면 <strong>원리금균등</strong></li><li>초반 부담을 감당할 수 있고 총 이자를 줄이고 싶으면 <strong>원금균등</strong></li><li>만기에 목돈이 들어오는 것이 확실하면 <strong>만기일시</strong></li></ul>",
        "<p>총 이자 숫자 하나로 정하지 마세요. 원금균등으로 아낀 이자보다 초반에 묶인 현금의 가치가 더 클 수도 있습니다. 반대로 매달 여유가 있는데 원리금균등을 고르면 이자를 더 내는 셈입니다.</p>",
        "<h2>거치기간이 있을 때</h2>",
        "<p>거치기간은 원금 상환을 미루고 이자만 내는 기간입니다. 당장 부담은 줄지만 그 기간만큼 원금이 안 줄어 이후 상환액이 커지고 총 이자도 늘어납니다. 거치를 넣을 때는 거치가 끝난 뒤의 월 상환액을 반드시 확인하세요.</p>",
    ]
    return page(g[2], g[3], g[0], article(g[0], g[1], "같은 돈을 빌려도 상환 방식에 따라 매달 내는 돈과 총 이자가 달라집니다. 세 방식을 숫자로 놓고 비교합니다.", blocks,
                ("내 조건으로 세 방식을 바로 비교해 보세요.", "loan.html", "대출이자 계산기 열기"), ["loan.html", "dsr.html", "prepayment.html", "rent.html"]),
                extra_head=article_ld(g[2], g[3], g[0]) + breadcrumb_ld(g[1], g[0]), og_type="article")

def guide_brokerage():
    g = GUIDES[1]
    blocks = [
        "<p>복비, 정식 명칭으로 중개보수는 부동산 거래에서 가장 자주 다투는 비용입니다. 얼마가 맞는지 모르면 부르는 대로 내게 됩니다. 요율표를 읽을 줄 알면 최대치를 알 수 있고, 그 안에서 협의할 수 있습니다.</p>",
        "<h2>요율은 상한이다</h2>",
        "<p>공인중개사법 시행규칙이 정한 요율은 '이 이상 받을 수 없다'는 상한입니다. 정가가 아닙니다. 상한 이내에서 중개업소와 협의해 정하는 것이 원칙이고, 계약서에 금액을 적어두면 뒤탈이 없습니다.</p>",
        "<h2>주택 매매 요율표</h2>",
        '<div class="table-wrap"><table class="tbl"><thead><tr><th scope="col">거래금액</th><th scope="col">상한 요율</th><th scope="col">한도액</th></tr></thead><tbody>'
        '<tr><th scope="row">5천만원 미만</th><td>0.6%</td><td>25만원</td></tr><tr><th scope="row">5천만~2억 미만</th><td>0.5%</td><td>80만원</td></tr>'
        '<tr><th scope="row">2억~9억 미만</th><td>0.4%</td><td>없음</td></tr><tr><th scope="row">9억~12억 미만</th><td>0.5%</td><td>없음</td></tr>'
        '<tr><th scope="row">12억~15억 미만</th><td>0.6%</td><td>없음</td></tr><tr><th scope="row">15억 이상</th><td>0.7%</td><td>없음</td></tr></tbody></table></div>',
        "<p>3억원 아파트를 사면 0.4%인 120만원이 상한입니다. 임대차는 구간마다 요율이 조금 낮아 같은 3억 전세면 0.3%인 90만원입니다.</p>",
        "<h2>월세는 환산부터</h2>",
        "<p>월세 계약은 보증금과 월세가 따로 있어 그대로 요율을 적용할 수 없습니다. 보증금에 월세의 100배를 더해 거래금액을 만듭니다. 보증금 1,000만원에 월세 70만원이면 1,000만 + 7,000만 = 8,000만원입니다. 이 금액이 5천만원보다 작으면 월세의 70배로 다시 계산합니다.</p>",
        "<p>8,000만원은 임대차 5천만~1억 미만 구간이라 0.4%, 32만원인데 한도액 30만원이 걸려 최종 상한은 30만원입니다.</p>",
        "<h2>한도액을 놓치지 마세요</h2>",
        "<p>낮은 구간에는 요율과 별개로 금액 한도가 있습니다. 4,500만원 거래는 0.6%로 27만원이지만 한도 25만원이 상한입니다. 소액 거래에서는 한도액이 요율보다 먼저 걸리는 경우가 많습니다.</p>",
        "<h2>오피스텔과 상가</h2>",
        "<p>전용 85㎡ 이하에 부엌과 화장실을 갖춘 주거용 오피스텔은 매매 0.5%, 임대차 0.4%입니다. 그 외 오피스텔과 토지, 상가는 0.9% 이내에서 협의합니다. 상가는 협의 폭이 넓어 계약 전 합의가 특히 중요합니다.</p>",
        "<h2>부가세와 영수증</h2>",
        "<p>일반과세 중개업소는 보수에 부가세 10%를 더해 청구할 수 있습니다. 간이과세 업소는 다릅니다. 지급 후 현금영수증을 요청할 수 있으며, 매수인은 나중에 양도소득세 필요경비로 쓸 수 있으니 영수증을 보관하세요.</p>",
        "<h2>협의 요령</h2>",
        "<ul><li>계약 전에 금액을 물어보고 계약서 특약에 적습니다</li><li>양쪽 당사자가 각자 부담한다는 점을 기억합니다. 한쪽이 두 배를 내는 것이 아닙니다</li><li>요율표는 개정될 수 있고 시·도 조례로 다를 수 있으니 계약 시점 기준을 확인합니다</li></ul>",
    ]
    return page(g[2], g[3], g[0], article(g[0], g[1], "요율표를 읽을 줄 알면 최대치를 알 수 있습니다. 월세 환산, 한도액, 부가세까지 한 번에 정리합니다.", blocks,
                ("거래 조건을 넣고 상한을 바로 확인하세요.", "fee.html", "중개보수 계산기 열기"), ["fee.html", "rent.html", "acquisition-tax.html", "conversion.html"]),
                extra_head=article_ld(g[2], g[3], g[0]) + breadcrumb_ld(g[1], g[0]), og_type="article")

def guide_conversion():
    g = GUIDES[2]
    blocks = [
        "<p>전월세 전환율은 보증금을 월세로, 또는 월세를 보증금으로 바꿀 때 쓰는 비율입니다. 집주인이 '전세 3억을 보증금 1억에 월세 90만원으로 바꾸자'고 하면, 그 90만원이 적정한지 판단하는 기준이 이 숫자입니다.</p>",
        "<h2>계산 방법</h2>",
        "<p>줄어드는 보증금에 전환율을 곱하고 12로 나누면 월세입니다. 전세 3억을 보증금 1억으로 낮추면 줄어드는 보증금은 2억입니다. 전환율이 4.5%면 2억 × 4.5% = 900만원, 월 75만원입니다. 집주인이 90만원을 요구했다면 전환율 5.4%를 적용한 셈입니다.</p>",
        "<h2>법정 전환율</h2>",
        "<p>주택임대차보호법은 전환율에 상한을 둡니다. 연 10%와 한국은행 기준금리에 2%포인트를 더한 값 중 낮은 쪽입니다. 기준금리가 3%면 상한은 5%입니다.</p>",
        "<p>중요한 점은 <strong>적용 범위</strong>입니다. 이 상한은 계약 기간 중이거나 계약을 갱신하면서 전세를 월세로 바꿀 때 적용됩니다. 위 예시처럼 갱신하며 90만원을 요구하면 4.5% 상한인 75만원을 넘는 부분은 무효입니다.</p>",
        "<p>반면 처음 맺는 신규 계약에는 이 상한이 강제되지 않습니다. 새 세입자와 맺는 계약의 월세는 시장에서 정해집니다.</p>",
        "<h2>시장 전환율</h2>",
        "<p>실제 거래에서 쓰이는 전환율은 지역과 시기에 따라 다르고 대개 법정 상한보다 높습니다. 한국부동산원이 매달 지역별 전월세전환율을 발표합니다. 신규 계약 조건이 적정한지 볼 때는 이 숫자와 비교해야 합니다.</p>",
        "<h2>월세를 전세로 바꿀 때</h2>",
        "<p>반대 방향은 월세에 12를 곱해 연 월세를 구하고 전환율로 나눕니다. 월세 75만원은 연 900만원이고 4.5%로 나누면 2억, 여기에 보증금 1억을 더해 전세 3억이 됩니다. 이 방향에서는 전환율이 낮을수록 전세금이 커진다는 점을 기억하세요.</p>",
        "<h2>전환율과 내 기회비용은 다르다</h2>",
        "<p>전환율은 계약 조건을 바꾸는 비율이고, 내가 전세와 월세 중 무엇을 택할지는 <strong>내 돈의 기회비용</strong>으로 판단해야 합니다. 보증금을 예금하면 3% 받을 수 있는 사람에게 4.5% 전환율의 월세는 비쌉니다. 반대로 보증금을 5% 대출로 마련해야 하는 사람에게는 같은 월세가 쌉니다.</p>",
        "<p>그래서 전환율 계산기로 조건의 적정성을 확인하고, 실부담 계산기로 내 사정에 맞는지 따로 보는 순서가 맞습니다.</p>",
    ]
    return page(g[2], g[3], g[0], article(g[0], g[1], "집주인이 제시한 월세가 적정한지 판단하는 기준입니다. 법정 상한이 적용되는 경우와 아닌 경우를 구분합니다.", blocks,
                ("법정 전환율과 시장 전환율을 나란히 비교해 보세요.", "conversion.html", "전월세 전환율 계산기 열기"), ["conversion.html", "rent.html", "fee.html", "rent-tax-credit.html"]),
                extra_head=article_ld(g[2], g[3], g[0]) + breadcrumb_ld(g[1], g[0]), og_type="article")

def guide_jeonse_vs_monthly():
    g = GUIDES[3]
    blocks = [
        "<p>전세는 보증금이 크고 월세가 없습니다. 월세는 보증금이 작고 매달 돈이 나갑니다. 겉으로 보이는 숫자가 달라 그대로는 비교가 안 됩니다. 같은 기준으로 바꾸는 방법이 있습니다.</p>",
        "<h2>보증금도 비용이다</h2>",
        "<p>보증금은 돌려받는 돈이라 비용이 아니라고 생각하기 쉽습니다. 하지만 그 돈이 묶여 있는 동안 얻을 수 있었던 이자를 포기한 것입니다. 이것을 기회비용이라고 합니다. 보증금 2억을 예금하면 연 3%로 600만원, 월 50만원을 받을 수 있는데 이걸 포기한 셈입니다.</p>",
        "<p>보증금을 대출로 마련했다면 더 분명합니다. 실제로 이자를 내니까요. 이때는 대출금리가 기회비용입니다.</p>",
        "<h2>계산 순서</h2>",
        "<ol><li>전세 조건: 보증금 × 연금리 ÷ 12 = 월 기회비용. 여기에 관리비를 더합니다.</li><li>월세 조건: 월세 + 관리비 + (보증금 × 연금리 ÷ 12).</li><li>두 값을 나란히 놓습니다.</li></ol>",
        "<p>전세 2억(3%)은 월 50만원 + 관리비, 보증금 2천만 월세 60만원은 월 60만 + 5만 + 관리비입니다. 관리비가 같다면 전세가 월 15만원 적습니다. 대출로 보증금을 마련해 금리가 5%라면 전세는 월 83만원이 되어 순서가 바뀝니다.</p>",
        "<h2>흔한 착각</h2>",
        "<ul><li><strong>전세는 공짜다.</strong> 기회비용을 빼먹은 계산입니다.</li><li><strong>보증금을 올리면 무조건 이득이다.</strong> 전환율이 내 기회비용보다 높을 때만 그렇습니다.</li><li><strong>월세는 버리는 돈이다.</strong> 전세 이자도 똑같이 사라지는 돈입니다. 다만 월세는 눈에 보이고 이자는 안 보일 뿐입니다.</li></ul>",
        "<h2>숫자 밖의 것들</h2>",
        "<p>계산이 비슷하게 나오면 다음이 결정적입니다.</p>",
        "<ul><li><strong>보증금 회수 위험.</strong> 전세는 보증금이 크니 돌려받지 못할 때 손실이 큽니다. 등기부등본, 선순위 채권, 보증보험 가입 가능 여부를 확인하세요.</li><li><strong>목돈이 묶이는 부담.</strong> 그 돈으로 할 수 있는 다른 일이 있는지.</li><li><strong>이사 계획.</strong> 2년 안에 옮길 생각이면 큰 보증금을 맡기는 것이 번거롭습니다.</li><li><strong>세액공제.</strong> 월세는 요건이 맞으면 연말정산 세액공제를 받을 수 있어 실부담이 줄어듭니다.</li></ul>",
        "<p>계산기는 어느 쪽이 유리한지 판정하지 않습니다. 같은 기준의 숫자를 보여줄 뿐이고, 위 항목까지 넣어 판단하는 것은 본인의 몫입니다.</p>",
    ]
    return page(g[2], g[3], g[0], article(g[0], g[1], "보증금 기회비용을 넣으면 전세와 월세를 같은 저울에 올릴 수 있습니다. 계산 순서와 흔한 착각을 정리합니다.", blocks,
                ("두 조건을 넣고 월 부담을 나란히 비교해 보세요.", "rent.html", "월세 실부담 계산기 열기"), ["rent.html", "conversion.html", "rent-tax-credit.html", "loan.html"]),
                extra_head=article_ld(g[2], g[3], g[0]) + breadcrumb_ld(g[1], g[0]), og_type="article")

def guides_index():
    r = REFS[2]
    cards = "".join(f'<a class="tool-card" href="{f}"><p class="t">{n}</p><p class="d">{d}</p></a>' for (f, n, _t, d) in GUIDES)
    main = f'''    <section class="hero">
      <p class="eyebrow">Guides</p>
      <h1>안내 글</h1>
      <p class="hero-sub">부동산 숫자를 읽는 법</p>
      <p class="hero-body">계산기에 넣는 숫자가 무엇을 뜻하는지, 결과를 어떻게 읽어야 하는지 설명합니다. 세율이나 법령을 확정 해석하지 않으며, 개념과 계산 방법에 집중합니다.</p>
    </section>
    <section class="card">
      <div class="tool-grid">{cards}</div>
    </section>{INLINE_AD}
    <section class="card">
      <h2>계산기로 바로 가기</h2>
      <div class="tool-grid">{"".join(f'<a class="tool-card" href="{f}"><p class="t">{n}</p><p class="d">{d}</p></a>' for (f, n, _t, _d, _c, d) in TOOLS[:6])}</div>
    </section>'''
    return page(r[2], r[3], r[0], main, extra_head=breadcrumb_ld("안내 글", "guides.html"))

def _hub(path, eyebrow, h1, sub, body, sections):
    h = [x for x in HUBS if x[0] == path][0]
    secs = ""
    for (title, note, cards) in sections:
        note_html = f'<p class="hub-sub">{note}</p>' if note else ""
        cards_html = "".join(f'<a class="tool-card" href="{f}"><p class="t">{n}</p><p class="d">{d}</p></a>' for (f, n, d) in cards)
        secs += f'''
    <section class="card">
      <h2>{title}</h2>{note_html}
      <div class="tool-grid">{cards_html}</div>
    </section>'''
    main = f'''    <section class="hero">
      <p class="eyebrow">{eyebrow}</p>
      <h1>{h1}</h1>
      <p class="hero-sub">{sub}</p>
      <p class="hero-body">{body}</p>
    </section>{secs}'''
    return page(h[2], h[3], path, main, extra_head=breadcrumb_ld(h[1], path))

def tables_index():
    return _hub("tables.html", "Tables", "표·자료", "계산기 속 세율표와 요율표를 표 하나로",
                "세율과 요율은 바뀝니다. 각 표에는 기준일이 붙어 있고, 계산기의 상수와 같은 값입니다.",
                [("세율표·요율표", None, [(f, n, d) for (f, n, _t, _d, d) in TABLES])])

def forms_index():
    return _hub("forms.html", "Forms · Glossary", "서식·용어", "계약할 때 바로 쓰는 서식과 용어 설명",
                "입력하면 완성되는 영수증, 복사해서 쓰는 통지문과 특약 문구, 한 페이지에 하나씩 설명한 용어 사전입니다. 입력값은 저장하지 않습니다.",
                [("서식", None, [(f, n, d) for (f, n, _t, _d, d) in FORMS]),
                 ("용어 사전", "대항력, 확정일자, 근저당, DSR… 계약·등기·세금·대출 용어를 쉬운 말로.", [("glossary.html", "부동산 용어 사전", "39개 용어, 항목마다 관련 계산기 연결")])])

def refs_index():
    return _hub("refs.html", "References", "참고 자료", "계약과 세금 전에 확인할 것",
                "세율이나 법령을 해석하지 않습니다. 무엇을 어디서 확인해야 하는지, 숫자를 어떻게 읽어야 하는지 안내합니다.",
                [("확인 목록·확인처", None, [(f, n, d) for (f, n, _t, _d, _c, d) in REFS if f != "guides.html"]),
                 ("안내 글", f"부동산 숫자를 읽는 법 {len(GUIDES)}편.", [(f, n, "") for (f, n, _t, _d) in GUIDES] + [("guides.html", "안내 글 목록 전체 보기", "")])])

def home():
    """타일형 홈. 등록부에서 직접 만들기 때문에 계산기를 추가하면 홈에도 자동으로 붙는다."""
    def tile(f, name, desc, extra_cls=""):
        k = TILE_KEYS.get(f, "")
        d = f'<span class="d">{desc}</span>' if desc else ""
        return (f'<a class="tile{extra_cls}" href="{f}" data-k="{name} {k}">'
                f'{tile_icon(f)}<span class="t">{name}</span>{d}</a>')

    POPULAR = ["rent.html", "loan.html", "acquisition-tax.html", "capital-gains-tax.html", "salary.html", "subscription.html"]
    pop = "".join(tile(f, n, d) for (f, n, _t, _d, _c, d) in sorted(
        [t for t in TOOLS if t[0] in POPULAR], key=lambda t: POPULAR.index(t[0])))

    def section(title, inner, count, cls=""):
        n_ = f'<span class="n">{count}개</span>' if count else ""
        return f'''
    <section class="sec" data-sec>
      <div class="sec-head"><h2>{title}</h2>{n_}</div>
      <div class="tiles{cls}" data-group>{inner}</div>
    </section>'''

    cat_secs = []
    for cat in CATS[:4]:
        items = [t for t in tools_by_cat(cat) if t[0] != "guides.html"]
        cat_secs.append(section(cat, "".join(tile(f, n, d) for (f, n, _t, _d, _c, d) in items), len(items)))
    # 광고는 첫 두 묶음 뒤에
    cats_html = "".join(cat_secs[:2]) + INLINE_AD + "".join(cat_secs[2:])

    mini = ("".join(tile(f, n, "") for (f, n, _t, _d, _d2) in TABLES)
            + "".join(tile(f, n, "") for (f, n, _t, _d, _d2) in FORMS)
            + tile(GLOSSARY_INDEX[0], GLOSSARY_INDEX[1], ""))
    mini_sec = section("표 · 서식 · 용어", mini, len(TABLES) + len(FORMS) + 1, cls=" mini")

    # 안내 글 제목은 기사 제목이라 타일에는 짧은 이름으로 건다
    GUIDE_SHORT = {"guide-repayment.html": "상환 방식 차이", "guide-brokerage.html": "복비 계산법",
                   "guide-conversion.html": "전월세 전환율이란", "guide-jeonse-vs-monthly.html": "전세 vs 월세 읽는 법",
                   "guide-acquisition-tax.html": "취득세, 왜 달라지나", "guide-cgt-exemption.html": "양도세 비과세 2년",
                   "guide-subscription-points.html": "청약 가점이 안 오르는 이유", "guide-dsr-ltv.html": "DSR과 LTV 차이",
                   "guide-salary-net.html": "연봉 실수령액 구조", "guide-severance.html": "퇴직금 요건과 계산",
                   "guide-jeonse-registry.html": "전세 전 등기부 보는 법",
                   "guide-renewal-refusal.html": "갱신 거절되는 경우", "guide-jeonse-insurance-fail.html": "보증보험 안 되는 집",
                   "guide-area-84.html": "84㎡가 34평이 아닌 이유", "guide-rent-tax-credit-who.html": "월세 세액공제 조건",
                   "guide-fixed-vs-variable.html": "고정 vs 변동 고르기",
                   "guide-loan-rate-structure.html": "대출금리 정해지는 구조",
                   "guide-officetel.html": "오피스텔은 주택인가",
                   "guide-property-tax.html": "재산세·종부세와 6월 1일",
                   "guide-prepayment.html": "중도상환수수료와 3년",
                   "guide-moving-14days.html": "이사 후 14일",
                   "guide-yield-vacancy.html": "상가 수익률과 공실",
                   "guide-buy-vs-rent.html": "매매 vs 전세 손익분기",
                   "guide-deposit-vs-rent.html": "보증금 올리고 월세 내리기"}
    ref = ("".join(f'<a class="tile" href="{f}" data-k="{n}">{tile_icon(f)}<span class="t">{GUIDE_SHORT.get(f, n)}</span></a>'
                   for (f, n, _t, _d) in GUIDES)
           + "".join(tile(f, n, "") for (f, n, _t, _d, _c, _s) in REFS if f != "guides.html"))
    ref_sec = section("안내 글 · 참고", ref, len(GUIDES) + len(REFS) - 1, cls=" mini")

    n_tools = len(TOOLS)
    main = f'''    <section class="hero tile-hero">
      <p class="eyebrow">Real Estate · Calculators</p>
      <h1>전국부동산계산기</h1>
      <p class="hero-sub">계산기 {n_tools}개와 세율표·서식·용어 사전. 회원가입 없이 브라우저에서만 계산합니다.</p>
    </section>
    <div class="tool-search-wrap">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <label class="sr-only" for="q">계산기 검색</label>
      <input class="tool-search" id="q" type="search" placeholder="무엇을 계산하시나요?  예: 취득세, 연봉, 전세" autocomplete="off">
    </div>{section("많이 찾는 계산기", pop, 0, cls=" hot")}{cats_html}{mini_sec}{ref_sec}
    <p class="tile-empty" id="tile-empty" hidden>찾는 계산기가 없습니다. 다른 말로 검색해 보세요.</p>
    <section class="card" style="margin-top:28px">
      <h2>이 사이트의 원칙</h2>
      <div class="prose">
        <ul>
          <li><strong>판단하지 않고 숫자만 보여줍니다.</strong> 어느 쪽이 이득이라고 단정하지 않습니다.</li>
          <li><strong>계산 기준을 숨기지 않습니다.</strong> 공식과 반영하지 않는 항목을 각 페이지에 적어두었습니다.</li>
          <li><strong>세율표에는 기준일을 붙입니다.</strong> 바뀔 수 있는 값은 상수로 분리해 두었습니다.</li>
          <li><strong>입력값을 수집하지 않습니다.</strong> 최근 계산 기억 기능을 켜도 이 기기 브라우저에만 저장됩니다.</li>
        </ul>
        <p>자세한 내용은 <a href="about.html">사이트 소개</a>에 있습니다.</p>
      </div>
    </section>'''
    ld = jsonld({"@context": "https://schema.org", "@type": "WebSite", "name": "전국부동산계산기", "url": BASE, "inLanguage": "ko-KR",
                 "description": "부동산 계산기 모음. 월세 실부담, 대출이자, 취득세, 청약 가점, 평수 변환 등을 브라우저에서만 계산합니다.",
                 "publisher": {"@type": "Organization", "name": "전국부동산계산기", "url": BASE}})
    # 예전 공유 링크(index.html?r=…)는 월세 계산기로 넘김
    redirect = '''  <script>(function(){var q=location.search;if(/[?&](r|m|d|rent|deposit)=/.test(q)){location.replace('rent.html'+q);}})();</script>
'''
    return page("전국부동산계산기 — 월세 실부담부터 양도세, 연봉 실수령액까지 계산기 모음",
                f"월세 실부담, 계약 갱신 청구권, 대출이자, DSR·LTV 한도, 취득세, 양도소득세, 청약 가점, 연봉 실수령액, 퇴직금 등 계산기 {n_tools}개와 세율표, 부동산 용어 사전, 계약 서식. 회원가입 없이 브라우저에서만 계산하며 입력값을 저장하지 않습니다.",
                "index.html", main, extra_head=ld + redirect, scripts=("js/home.js",))
