# 계산기 2차: 갱신 청구권, 세금 달력, 이사 체크리스트, 고정 vs 변동, 매매 vs 전세, 전세보증보험, 전세 사기 체크, 연봉 실수령, 퇴직금
from site_core import *
from pages_new import money, num, date, check, seg, form_open, form_close, hero, result_hero, layout, AD_SIDE
from pages_cgt import select

def head_for(path, faq):
    t = [x for x in TOOLS if x[0] == path][0]
    return app_ld(t[2].split(" — ")[0], t[3], path) + faq_ld(faq) + breadcrumb_ld(t[1], path)

# ============================================================ 계약 갱신 청구권 · 5% 상한
def renewal_page():
    faq = [
        ("계약 갱신 요구는 언제까지 해야 하나요?", ["계약 만기 6개월 전부터 2개월 전까지 임대인에게 도달해야 합니다. 2020년 12월 10일 전에 체결된 계약이 아직 갱신되지 않았다면 1개월 전까지입니다.", "문자, 카카오톡, 내용증명처럼 날짜와 내용이 남는 방법으로 보내세요. 전화만으로는 나중에 입증하기 어렵습니다."]),
        ("임대인은 갱신을 거절할 수 있나요?", ["임대인이나 직계존비속이 실제 거주하려는 경우, 임차인이 2기 이상 월세를 연체한 경우, 무단 전대·파손 등 법이 정한 사유가 있을 때만 거절할 수 있습니다.", "실거주를 이유로 거절한 뒤 2년 안에 제3자에게 임대하면 손해배상 책임이 생길 수 있습니다."]),
        ("5% 상한은 보증금과 월세 각각인가요?", ["둘 중 하나만 올릴 때는 그 항목의 5%입니다. 보증금과 월세를 동시에 바꾸거나 일부를 월세로 돌릴 때는 법정 전환율로 환산한 보증금 기준으로 5% 이내인지 봅니다.", "이 계산기의 '환산보증금 기준 상한'이 그 값입니다. 전환율은 한국은행 기준금리에 2%p를 더한 값이며 10%를 넘지 못합니다."]),
        ("묵시적 갱신과 갱신 요구권은 뭐가 다른가요?", ["묵시적 갱신은 양쪽 모두 만기 6~2개월 전에 아무 말이 없어 같은 조건으로 2년 연장되는 것이고, 이때는 갱신 요구권을 쓴 것이 아니라 요구권 1회가 그대로 남습니다.", "묵시적 갱신 상태에서 임차인은 언제든 해지를 통지할 수 있고 통지 3개월 뒤 효력이 생깁니다. 임대인은 그럴 수 없습니다."]),
        ("갱신 요구권은 몇 번 쓸 수 있나요?", ["1회입니다. 한 번 행사해 2년 연장되면 그 다음 만기에는 요구권이 없고, 임대인과 합의해야 합니다.", "다만 같은 집에서 계약이 여러 번 갱신되었더라도 요구권을 명시적으로 행사한 적이 없다면 아직 1회가 남아 있습니다."]),
    ]
    guide = prose_section("갱신 요구권 제대로 쓰기", [
        "<h3>기간 계산</h3><p>만기가 2027년 3월 31일이면 요구 가능 기간은 2026년 9월 30일부터 2027년 1월 30일까지입니다. '2개월 전까지'는 만기 2개월 전 날짜의 전날까지 도달해야 한다는 뜻이므로 마지막 날에 보내지 말고 며칠 여유를 두세요.</p>",
        "<h3>증액 5%</h3><p>갱신할 때 임대인은 보증금이나 월세를 5% 넘게 올릴 수 없습니다. 임차인이 요구권을 써서 갱신하는 경우에 적용되며, 서로 합의해 새 계약을 쓰는 경우는 상한이 없습니다. 어느 쪽인지 계약서에 분명히 적어두세요.</p>",
        "<h3>전세를 월세로 돌리자고 할 때</h3><p>보증금 일부를 월세로 바꾸는 것은 임차인이 동의해야 합니다. 동의하더라도 법정 전환율(기준금리 + 2%p) 이내여야 하고, 환산한 총액이 5%를 넘으면 안 됩니다. <a href='conversion.html'>전월세 전환율 계산기</a>에서 월세를 확인하세요.</p>",
        "<h3>통지 방법</h3><p>내용증명이 가장 확실하지만 문자와 카카오톡도 도달 사실이 남으면 됩니다. 임대인이 읽었다는 표시나 답장을 받아두면 다툼이 줄어듭니다. <a href='form-notice.html'>갱신 요구·계약 종료 통지 예시</a>를 참고하세요.</p>",
    ])
    left = form_open([("soon", "만기 4개월 전"), ("early", "만기 16개월 전"), ("clear", "지우기")]) + \
        date("start", "계약 시작일 (입주일)", help_="계약서의 임대차 기간 시작일. 갱신한 적이 있으면 마지막 갱신 계약의 시작일") + \
        num("months", "계약 기간", "24", "개월", step="1", min_="1", help_="보통 24개월. 2년 미만으로 정했어도 임차인은 2년을 주장할 수 있습니다") + \
        money("deposit", "현재 보증금", "50,000,000") + money("rent", "현재 월세", "600,000", help_="전세면 0") + \
        num("baseRate", "한국은행 기준금리", f"{BASE_RATE:.2f}", "%", step="0.05", help_="보증금↔월세 전환 시 상한 계산에 사용. 전환율 = 기준금리 + 2%p (상한 10%)") + \
        form_close("기간과 상한 계산")
    right = result_hero("갱신 요구 마감까지", "out-big", "", [("현재 상태", "out-status", ""), ("계약 만기일", "out-end", ""), ("요구 가능 시작", "out-wstart", ""), ("요구 마감일", "out-wend", "")]) + f'''
        <section class="card">
          <h2>임대료 인상 상한 (5%)</h2>
          <div class="table-wrap"><table class="tbl"><thead><tr><th scope="col">항목</th><th scope="col">상한</th><th scope="col">최대 인상</th></tr></thead><tbody>
            <tr><th scope="row">보증금만 올릴 때</th><td><span id="out-dep-cap">0</span>원</td><td><span id="out-dep-up">0</span>원</td></tr>
            <tr><th scope="row">월세만 올릴 때</th><td><span id="out-rent-cap">0</span>원</td><td><span id="out-rent-up">0</span>원</td></tr>
            <tr><th scope="row">둘 다 바꿀 때 (환산보증금 기준)</th><td><span id="out-equiv-cap">0</span>원</td><td class="muted">현재 환산 <span id="out-equiv">0</span>원</td></tr>
          </tbody></table></div>
          <p class="result-note">환산보증금 = 보증금 + 연 월세 ÷ 법정 전환율(<span id="out-conv">0</span>%). 갱신 요구 가능 기간: <span id="out-window-rule"></span>. <span id="rules-date"></span></p>
        </section>
        <section class="card">
          <h2>알아둘 것</h2>
          <ul class="ref-list">
            <li><p class="t">묵시적 갱신 후 해지</p><p class="d">임차인이 오늘 해지를 통지하면 <span id="out-terminate">—</span>에 효력. 임대인은 묵시적 갱신 기간 중 해지할 수 없습니다.</p></li>
            <li><p class="t">임대인의 갱신 거절 사유</p><p class="d">실거주, 2기 이상 연체, 무단 전대, 고의 파손, 재건축 등 법정 사유가 있을 때만 가능합니다.</p></li>
            <li><p class="t">전환 시 월세</p><p class="d"><a href="conversion.html">전월세 전환율 계산기</a>에서 보증금을 월세로 바꿀 때 상한을 확인하세요.</p></li>
          </ul>
        </section>'''
    main = hero("Renewal · 5% Cap", "계약 갱신 청구권 · 임대료 5% 상한 계산기", "언제까지 갱신을 요구해야 하는지, 얼마까지 올릴 수 있는지",
                "계약 시작일과 기간을 넣으면 만기와 갱신 요구 가능 기간, 오늘 기준 남은 날짜가 나옵니다. 보증금과 월세를 넣으면 5% 상한과 전환 시 환산 기준까지 계산합니다.") + \
        layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("renewal.html")
    return main, head_for("renewal.html", faq)

# ============================================================ 세금 달력
def tax_calendar_page():
    faq = [
        ("취득세는 언제까지 내야 하나요?", ["매매는 잔금일(취득일)부터 60일 이내에 신고하고 납부합니다. 상속은 상속개시일이 속한 달의 말일부터 6개월, 증여는 취득일이 속한 달의 말일부터 3개월입니다.", "기한을 넘기면 무신고 가산세 20%와 납부지연 가산세가 붙습니다. 보통 잔금일에 법무사가 등기와 함께 처리합니다."]),
        ("재산세는 누가 내나요?", ["매년 6월 1일 현재 소유자가 그 해 재산세 전부를 냅니다. 5월 31일에 잔금을 치르면 매수인이, 6월 2일에 치르면 매도인이 내는 셈이라 잔금일을 정할 때 고려하세요.", "주택은 7월과 9월에 절반씩 나오고, 세액이 20만원 이하면 7월에 한 번에 나옵니다."]),
        ("양도세 예정신고를 안 하면 어떻게 되나요?", ["양도일이 속한 달의 말일부터 2개월 안에 예정신고와 납부를 해야 합니다. 안 하면 무신고 가산세 20%가 붙습니다.", "비과세라도 12억 초과 고가주택이면 신고해야 하고, 12억 이하 비과세면 신고 의무가 없지만 해두는 편이 안전합니다."]),
        ("기한이 주말이면 어떻게 되나요?", ["신고·납부 기한이 토요일, 일요일, 공휴일이면 그 다음 영업일까지로 연장됩니다. 이 달력은 원래 날짜를 보여주므로 실제 기한은 하루 이틀 늦을 수 있습니다."]),
    ]
    guide = prose_section("부동산 세금 1년 흐름", [
        "<h3>거래할 때 한 번</h3><p>살 때 취득세(60일), 팔 때 양도소득세 예정신고(양도 달 말일부터 2개월). 이 둘은 날짜가 거래일에 따라 정해지므로 위에 잔금일을 넣어 확인하세요.</p>",
        "<h3>가지고 있는 동안 매년</h3><p>6월 1일 기준으로 재산세(7월·9월)와 종합부동산세(12월)가 나옵니다. 재산세는 지자체, 종부세는 국세청이 고지합니다. 고지서가 오므로 신고는 필요 없지만 납부 기한을 넘기면 3% 가산금이 붙습니다.</p>",
        "<h3>임대 소득이 있으면</h3><p>2월 10일까지 사업장현황신고, 5월에 종합소득세 신고를 합니다. 연 임대수입 2,000만원 이하는 분리과세(14%)를 고를 수 있습니다.</p>",
        "<h3>기한이 주말·공휴일이면</h3><p>법에 정한 기한이 토요일·일요일·공휴일이면 그다음 날까지입니다. 이 달력은 법에 적힌 날짜를 그대로 보여 주므로 실제 마감일은 달력에서 한 번 더 확인하세요. 예를 들어 2027년 2월 28일은 일요일이고 3월 1일이 삼일절이라 3월 2일까지입니다(<a href='guide-cgt-filing.html'>양도세 신고 기한</a>).</p>",
        "<p>세액이 얼마인지는 <a href='acquisition-tax.html'>취득세 계산기</a>와 <a href='capital-gains-tax.html'>양도소득세 계산기</a>에서 참고용으로 볼 수 있습니다.</p>",
    ])
    left = form_open([("buy", "지난달 매수"), ("sell", "지난달 매도"), ("clear", "지우기")]) + \
        date("acqDate", "취득일 (잔금일)", help_="매매는 잔금 지급일, 상속은 사망일, 증여는 증여계약일") + \
        select("acqCause", "취득 원인", [("sale", "매매"), ("inherit", "상속"), ("gift", "증여")]) + \
        date("saleDate", "양도일 (잔금일)", help_="팔 계획이 없으면 비워두세요") + \
        check("owner", "주택·토지를 보유 중 (재산세)", "6월 1일 기준 소유자에게 부과") + \
        check("ctax", "종합부동산세 대상", "인별 주택 공시가격 합계가 9억(1세대 1주택 12억)을 넘는 경우") + \
        check("rental", "주택 임대소득 있음", "월세를 받거나 보증금 합계가 커서 간주임대료가 나오는 경우") + \
        form_close("기한 계산")
    right = result_hero("다음 기한까지", "out-big", "", [("다음 기한", "out-next-name", ""), ("날짜", "out-next-date", ""), ("표시된 기한", "out-count", "건")]) + '''
        <section class="card">
          <h2>기한 목록</h2>
          <div class="table-wrap"><table class="tbl nowrap-head"><thead><tr><th scope="col">기한</th><th scope="col">항목</th><th scope="col">어디서</th><th scope="col">남은 날</th></tr></thead><tbody id="event-body"></tbody></table></div>
          <p class="result-note"><span id="rules-date"></span>. 기한이 공휴일이면 다음 영업일까지. 참고용이며 고지서와 홈택스·위택스 안내가 우선합니다.</p>
        </section>'''
    main = hero("Tax Calendar", "부동산 세금 달력 · 신고 납부 기한 계산기", "취득세 60일, 양도세 예정신고, 재산세 7·9월, 종부세 12월",
                "잔금일을 넣으면 취득세와 양도세 신고 기한이, 보유 항목을 켜면 매년 돌아오는 재산세·종부세·임대소득세 일정이 오늘 기준 D-day와 함께 나옵니다.") + \
        layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("tax-calendar.html")
    return main, head_for("tax-calendar.html", faq)

# ============================================================ 이사 체크리스트
MOVING_PHASES = [
    (-30, "한 달 전", [("이사업체 견적 비교·예약", "성수기(봄·가을, 손 없는 날)는 한 달 전에도 늦습니다. 견적서에 사다리차·보관 조건을 적어두세요"), ("현재 집 계약 종료·보증금 반환일 확정", "임대인에게 퇴거 날짜를 문자로 남기고, 보증금을 잔금일에 받는 일정으로 맞추세요"), ("새 집 잔금일·입주 가능일 확인", "잔금과 입주가 같은 날이면 오전에 잔금, 오후에 입주로 시간을 정해두세요"), ("이사 휴가·연차 신청", ""), ("아이 전학 준비", "초등학교는 전입신고 후 배정 통지서를 받아 학교에 제출합니다")]),
    (-14, "2주 전", [("인터넷·TV 이전 신청", "이전 설치 예약이 밀리는 경우가 많아 2주 전에 신청하세요"), ("도시가스 철거·설치 예약", "지역 도시가스 고객센터에 이사 전날 철거, 당일 설치를 예약"), ("정수기·렌탈 제품 이전 신청", ""), ("대형폐기물 배출 신고", "구청 홈페이지나 앱에서 신고하고 스티커를 붙여 배출"), ("불필요한 짐 정리·중고 처분", "")]),
    (-7, "1주 전", [("우체국 주소 이전 서비스 신청", "3개월간 옛 주소로 온 우편물을 새 주소로 보내줍니다"), ("은행·카드·통신사·보험 주소 변경", "정부24 '주소변경 원스톱'에서 한 번에 처리할 수 있습니다"), ("관리비 정산 예약 (장기수선충당금)", "세입자였다면 장기수선충당금은 집주인에게 돌려받는 돈입니다. 관리사무소에 정산 요청"), ("짐 포장, 귀중품·서류 따로 챙기기", "계약서, 신분증, 통장, 상비약은 손에 드는 가방에"), ("냉장고 비우기 시작", "")]),
    (-1, "전날", [("세탁기 물 빼기, 냉장고 정리", ""), ("전기·가스·수도 계량기 사진", "정산 분쟁을 막는 가장 확실한 증거입니다"), ("현재 집 하자·원상복구 상태 사진", ""), ("새 집 열쇠·비밀번호·주차 등록 방법 확인", ""), ("이사 당일 현금·간식·공구 준비", "")]),
    (0, "이사 당일", [("잔금 송금 전 등기부등본 다시 확인", "계약 후 근저당이 새로 잡히지 않았는지 잔금 직전에 열람"), ("잔금 지급·보증금 반환 확인", "보증금을 받기 전에는 짐을 다 빼지 말고, 잔금은 소유자 명의 계좌로"), ("현재 집 관리비·공과금 정산 완료", ""), ("새 집 입주 전 상태 사진 (벽·바닥·설비)", "나중에 원상복구 다툼을 막습니다"), ("열쇠·카드키 수령, 도어락 비밀번호 변경", "")]),
    (14, "이사 후 14일 이내", [("전입신고", "이사 후 14일 이내. 정부24 온라인 또는 주민센터. 늦으면 과태료"), ("확정일자 받기", "전입신고와 같은 날 하세요. 이 둘이 있어야 보증금 우선변제권이 생깁니다"), ("전기·가스·수도 명의 변경", ""), ("월세 세액공제용 계좌이체 확인", "월세는 반드시 계좌이체로. <a href='rent-tax-credit.html'>세액공제 계산기</a>"), ("아파트 입주자 등록·주차 등록", "")]),
    (30, "이사 후 30일 이내", [("자동차 변경등록 (주소)", "30일 이내. 정부24나 차량등록사업소"), ("운전면허·여권 주소는 자동 반영", "주민등록 주소가 바뀌면 운전면허증 주소는 별도 변경이 필요 없습니다"), ("직장·학교·병원 주소 갱신", "")]),
]
def moving_page():
    faq = [
        ("전입신고를 늦게 하면 어떻게 되나요?", ["이사 후 14일 안에 하지 않으면 과태료가 부과될 수 있습니다. 더 중요한 것은 전입신고와 확정일자가 있어야 보증금을 지키는 대항력과 우선변제권이 생긴다는 점입니다. 잔금 당일에 하세요."]),
        ("확정일자는 어디서 받나요?", ["주민센터에서 전입신고와 함께 받거나, 인터넷등기소에서 온라인으로 받을 수 있습니다. 계약서 원본에 도장이 찍히는 방식이며 수수료는 소액입니다."]),
        ("장기수선충당금은 무엇인가요?", ["아파트 큰 수리를 위해 매달 관리비에 포함해 걷는 돈으로, 원래 집주인이 부담합니다. 세입자가 관리비로 냈다면 이사 나갈 때 집주인에게 돌려받습니다. 관리사무소에서 납부 내역서를 받아 청구하세요."]),
        ("체크 상태는 저장되나요?", ["'최근 계산 기억하기'를 켜면 이 기기의 브라우저에만 저장됩니다. 서버로 보내지 않습니다. 끄면 지워집니다."]),
    ]
    phases = ""
    n = 0
    for off, title, items in MOVING_PHASES:
        lis = ""
        for t, d in items:
            n += 1
            dd = f'<div class="d">{d}</div>' if d else ""
            lis += f'<li><label><input type="checkbox" id="m{n}"><div><div class="t">{t}</div>{dd}</div></label></li>'
        phases += f'''
            <section class="phase" data-offset="{off}">
              <h3>{title} <span class="phase-date muted"></span></h3>
              <div class="progress"><span></span></div>
              <ul class="check-list">{lis}</ul>
            </section>'''
    left = form_open([("m1", "한 달 뒤"), ("m2", "두 달 뒤"), ("clear", "지우기")]) + date("moveDate", "이사 날짜") + f'''
            <div class="progress" style="margin-top:4px"><span id="all-progress"></span></div>
            <p class="hint">완료 <span id="out-done">0 / 0</span></p>{phases}
''' + form_close("날짜 계산")
    right = result_hero("이사까지", "out-big", "", [("이사일", "out-move", ""), ("전입신고 기한", "out-report", ""), ("자동차 주소 변경", "out-car", "")]) + '''
        <section class="card">
          <h2>이사 당일 순서</h2>
          <ol class="prose" style="margin:0;padding-left:18px">
            <li>등기부등본 재확인 → 잔금 송금 (소유자 계좌)</li>
            <li>보증금 반환 확인 후 짐 반출</li>
            <li>계량기 사진 → 관리비 정산</li>
            <li>새 집 사진 → 짐 반입</li>
            <li>전입신고 + 확정일자 (당일)</li>
          </ol>
        </section>'''
    main = hero("Moving Checklist", "이사 체크리스트 · D-day 계산기", "이사 날짜 하나로 한 달 전부터 이사 후 30일까지 할 일을 날짜별로",
                "이사일을 넣으면 각 단계의 날짜가 계산되고, 항목을 체크하면 진행률이 보입니다. 전입신고 14일, 자동차 변경등록 30일 같은 법정 기한도 함께 나옵니다.") + \
        layout(left, right) + INLINE_AD + faq_section(faq) + related("moving.html")
    return main, head_for("moving.html", faq)

# ============================================================ 고정 vs 변동
def rate_compare_page():
    faq = [
        ("고정금리가 변동금리보다 높은데 왜 고르나요?", ["고정금리는 앞으로 금리가 오를 위험을 은행 대신 내가 지지 않는 대가로 처음부터 조금 더 냅니다. 금리가 예상보다 많이 오르면 고정이 유리하고, 그대로거나 내리면 변동이 유리합니다.", "이 계산기의 '손익분기 연 변동폭'이 그 갈림길입니다. 변동금리가 매년 그만큼 오르면 두 방식의 총 이자가 같아집니다."]),
        ("변동금리는 어떻게 바뀌나요?", ["보통 6개월마다 코픽스 같은 기준금리에 가산금리를 더해 다시 정합니다. 이 계산기는 6개월마다 입력한 연간 변동폭의 절반씩 바뀐다고 가정하고, 그때마다 남은 원금과 기간으로 월 상환액을 다시 계산합니다."]),
        ("혼합형(5년 고정 후 변동)은 어떻게 보나요?", ["처음 5년은 고정, 이후 변동인 상품입니다. 두 극단 사이의 절충이라 이 계산기로 정확히 나오지는 않지만, 5년 뒤 남을 원금 기준으로 변동 시나리오를 다시 돌려보면 감을 잡을 수 있습니다."]),
        ("중도상환수수료도 고려해야 하나요?", ["금리가 내려서 갈아타려면 중도상환수수료가 듭니다. 보통 3년 안에는 수수료가 있으니 <a href='prepayment.html'>중도상환수수료 계산기</a>로 갈아타기 비용을 같이 보세요."]),
    ]
    left = form_open([("up", "연 +0.5%p 상승"), ("flat", "금리 유지"), ("down", "연 −0.5%p 하락"), ("clear", "지우기")]) + \
        money("principal", "대출금액", "300,000,000") + num("years", "대출 기간", "30", "년", step="1", min_="1") + \
        num("fixedRate", "고정금리", "4.2", "%", step="0.01") + num("varRate", "변동금리 (현재)", "3.8", "%", step="0.01") + \
        num("varChange", "변동금리 연간 변동폭 가정", "0.5", "%p", step="0.1", min_="-5", help_="매년 이만큼 오른다(+) 또는 내린다(−)고 가정. 6개월마다 절반씩 반영") + \
        form_close("총 이자 비교")
    right = result_hero("총 이자 차이", "out-big", "원", [("고정 총 이자", "out-fixed-int", "원"), ("변동 총 이자", "out-var-int", "원"), ("손익분기 연 변동폭", "out-be", "")], kicker_id="out-kicker") + '''
        <section class="card">
          <h2>월 상환액</h2>
          <div class="table-wrap"><table class="tbl"><tbody>
            <tr><th scope="row">고정 월 상환액</th><td><span id="out-fixed-pay">0</span>원</td></tr>
            <tr><th scope="row">변동 첫 달</th><td><span id="out-var-first">0</span>원</td></tr>
            <tr><th scope="row">변동 최저 ~ 최고</th><td><span id="out-var-min">0</span> ~ <span id="out-var-max">0</span>원</td></tr>
          </tbody></table></div>
        </section>
        <section class="card">
          <h2>연차별 변동금리 경로</h2>
          <div class="table-wrap"><table class="tbl nowrap-head"><thead><tr><th scope="col">연차</th><th scope="col">변동금리</th><th scope="col">변동 월 상환</th><th scope="col">고정 월 상환</th></tr></thead><tbody id="year-body"></tbody></table></div>
          <p class="result-note">원리금균등 기준. 실제 금리 경로는 알 수 없으며 시나리오 비교용입니다.</p>
        </section>'''
    guide = prose_section("어떻게 고를까", [
        "<p>정답은 없습니다. 고정은 '보험료'를 내고 불확실성을 없애는 선택이고, 변동은 그 보험료를 아끼는 대신 위험을 지는 선택입니다. 판단 기준은 세 가지입니다.</p>",
        "<ul><li><strong>손익분기 변동폭</strong>이 작으면(예: 연 +0.2%p) 조금만 올라도 고정이 유리하니 고정 쪽으로 기웁니다.</li><li><strong>상환 여력</strong>이 빠듯하면 월 상환액이 튀지 않는 고정이 안전합니다.</li><li><strong>3년 안에 갚거나 갈아탈 계획</strong>이면 초기 금리가 낮은 변동이 대체로 유리합니다.</li></ul>",
        "<p>월 상환액 자체는 <a href='loan.html'>대출이자 계산기</a>에서, 대출 가능 금액은 <a href='dsr.html'>DSR·LTV 계산기</a>에서 확인하세요.</p>",
    ])
    main = hero("Fixed vs Variable", "고정금리 vs 변동금리 비교 계산기", "금리가 매년 얼마나 올라야 고정이 유리해지는지",
                "같은 대출을 고정금리와 변동금리로 받았을 때 총 이자와 월 상환액 변화를 비교합니다. 변동금리 상승 시나리오를 바꿔가며 손익분기점을 찾아보세요.") + \
        layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("rate-compare.html")
    return main, head_for("rate-compare.html", faq)

# ============================================================ 매매 vs 전세
def buy_vs_rent_page():
    faq = [
        ("자기자본 기회비용은 왜 넣나요?", ["집을 사거나 전세를 얻으면 내 돈이 묶입니다. 그 돈을 예금에 넣었으면 받았을 이자가 기회비용입니다. 매매와 전세 모두에 같은 이율로 적용해야 공정한 비교가 됩니다. 기본값 3%는 예금 금리 수준이며 바꿀 수 있습니다."]),
        ("가격 변동률은 어떻게 정하나요?", ["아무도 모릅니다. 그래서 이 계산기는 0%를 기본으로 두고 '손익분기 상승률'을 보여줍니다. 집값이 매년 그만큼 올라야 매매 총비용이 전세와 같아집니다. 그 숫자가 현실적인지 스스로 판단하세요."]),
        ("대출이자는 어떻게 계산하나요?", ["단순 비교를 위해 이자만 내는 기준(대출금 × 금리 × 년)으로 계산합니다. 원리금균등으로 갚으면 원금이 줄어 실제 이자는 이보다 적습니다. 정확한 이자는 <a href='loan.html'>대출이자 계산기</a>에서 확인하세요."]),
        ("전세 갱신 때 중개보수는요?", ["같은 집에서 갱신하면 보통 중개보수가 다시 들지 않아 한 번만 넣었습니다. 2년마다 이사한다면 그만큼 더해 보세요. 보증금 인상분에 대한 이자도 별도입니다."]),
    ]
    left = form_open([("flat", "8억 vs 5억 (상승 0%)"), ("up", "8억 vs 5억 (연 3%)"), ("clear", "지우기")]) + '''
            <fieldset><legend>매매</legend>''' + money("price", "매매가", "800,000,000") + money("loan", "주택담보대출", "400,000,000") + num("loanRate", "대출 금리", "4.0", "%") + \
        num("acqRate", "취득세 등 (매매가 대비)", "1.1", "%", help_="취득세+지방교육세. <a href='acquisition-tax.html'>취득세 계산기</a> 참고") + num("buyFee", "중개보수 (살 때·팔 때 각각)", "0.4", "%") + \
        num("propTax", "재산세 등 연 보유세 (매매가 대비)", "0.15", "%", step="0.01") + num("growth", "연 가격 변동률 가정", "0", "%", step="0.5", min_="-20") + '''
            </fieldset>
            <fieldset><legend>전세</legend>''' + money("jeonse", "전세 보증금", "500,000,000") + money("jLoan", "전세대출", "200,000,000") + num("jRate", "전세대출 금리", "3.5", "%") + num("jFee", "중개보수", "0.3", "%") + '''
            </fieldset>
            <fieldset><legend>공통</legend>''' + num("years", "보유(거주) 기간", "5", "년", step="1", min_="1") + num("opp", "자기자본 기회비용 (예금 금리)", "3.0", "%") + '''
            </fieldset>
''' + form_close("총비용 비교")
    right = result_hero("총비용 차이", "out-big", "원", [("매매 총비용", "out-buy-total", "원"), ("전세 총비용", "out-j-total", "원"), ("손익분기 연 상승률", "out-be", "")], kicker_id="out-kicker") + '''
        <section class="card">
          <h2>항목별 비교</h2>
          <div class="table-wrap"><table class="tbl nowrap-head"><thead><tr><th scope="col">항목</th><th scope="col">매매</th><th scope="col">전세</th></tr></thead><tbody id="detail-body"></tbody></table></div>
          <p class="result-note">월 환산: 매매 <span id="out-buy-month">0</span>원 · 전세 <span id="out-j-month">0</span>원. 참고용 단순 비교입니다.</p>
        </section>'''
    guide = prose_section("숫자 밖에서 봐야 할 것", [
        "<p>이 계산기는 돈만 비교합니다. 실제 결정에는 다음이 더 큽니다.</p>",
        "<ul><li><strong>가격 하락 위험</strong> — 상승률에 음수를 넣어보세요. −3%면 매매 총비용이 얼마나 커지는지 확인할 수 있습니다.</li><li><strong>전세금 반환 위험</strong> — 전세는 보증금을 돌려받지 못할 위험이 있습니다. <a href='jeonse-insurance.html'>보증보험 자가진단</a>과 <a href='jeonse-fraud-check.html'>위험 신호 체크</a>를 해보세요.</li><li><strong>거주 안정성</strong> — 전세는 2년(갱신 시 4년)마다 이사 가능성이 있고, 매매는 팔고 싶을 때 안 팔릴 수 있습니다.</li><li><strong>세금</strong> — 1세대 1주택 비과세 요건(2년 보유·거주)을 채우기 전에 팔면 양도세가 나옵니다. <a href='capital-gains-tax.html'>양도세 계산기</a>에서 확인하세요.</li></ul>",
        "<p>월세와 전세 비교는 <a href='guide-jeonse-vs-monthly.html'>전세 vs 월세 안내 글</a>과 <a href='rent.html'>월세 실부담 계산기</a>를 보세요.</p>",
    ])
    main = hero("Buy vs Jeonse", "매매 vs 전세 총비용 비교 계산기", "보유기간 동안 실제로 나가는 돈을 같은 기준으로",
                "대출이자, 자기자본 기회비용, 취득세, 중개보수, 보유세, 가격 변동까지 넣어 매매와 전세의 총비용을 비교합니다. 집값이 매년 몇 % 올라야 매매가 유리해지는지 손익분기 상승률도 계산합니다.") + \
        layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("buy-vs-rent.html")
    return main, head_for("buy-vs-rent.html", faq)

# ============================================================ 전세보증보험
def jeonse_insurance_page():
    faq = [
        ("전세보증금 반환보증이 뭔가요?", ["계약이 끝났는데 임대인이 보증금을 돌려주지 않으면 보증기관(HUG, SGI서울보증, HF)이 대신 돌려주고 임대인에게 청구하는 상품입니다. 보증료는 보증금의 연 0.1~0.15% 수준입니다.", "가입은 임차인이 하며 임대인 동의는 필요 없습니다."]),
        ("주택가격은 어떻게 정하나요?", ["아파트는 KB시세·부동산원 시세나 공시가격의 일정 비율(2024년부터 126%)을, 빌라·다가구는 공시가격 비율이나 감정평가액을 씁니다. 실제 심사에서 쓰는 가격이 시세보다 낮은 경우가 많으니 공시가격 기준으로도 넣어보세요."]),
        ("선순위채권이 뭔가요?", ["내 보증금보다 먼저 변제받는 권리입니다. 등기부 을구의 근저당 채권최고액, 다가구주택이면 나보다 먼저 들어온 세입자들의 보증금 합계가 여기 들어갑니다."]),
        ("언제 신청하나요?", ["신규 계약은 잔금·전입 후부터 계약기간의 절반이 지나기 전까지, 갱신 계약은 갱신 계약기간의 절반이 지나기 전까지입니다. 계약 전에 가입 가능 여부를 먼저 확인하고 안 되면 계약을 다시 생각하세요."]),
    ]
    left = form_open([("ok", "가입 가능 예시"), ("risky", "미충족 예시"), ("clear", "지우기")]) + \
        select("region", "지역", [("metro", "수도권 (서울·경기·인천)"), ("other", "그 외 지역")]) + \
        money("price", "주택가격 (시세 또는 공시가격 × 인정비율)", "500,000,000", help_="심사에 쓰는 가격은 시세보다 낮을 수 있습니다. 보수적으로 넣으세요") + \
        money("deposit", "전세 보증금", "350,000,000") + money("senior", "선순위 근저당 채권최고액", "0", help_="등기부 을구. 없으면 0") + money("multi", "다가구 선순위 보증금 합계", "0", help_="다가구·다중주택만. 아파트·빌라는 0") + \
        num("term", "계약기간", "24", "개월", step="1") + num("elapsed", "계약 시작 후 경과", "0", "개월", step="1") + \
        check("registered", "전입신고·확정일자 완료 (또는 잔금일에 할 예정)") + check("broker", "공인중개사 날인 계약서") + \
        check("seizure", "등기부에 압류·가압류·가처분·경매 있음") + check("owner", "임대인이 보증사고 이력·보증금지 대상") + form_close("가입 요건 확인")
    right = result_hero("가입 가능 여부 (참고)", "out-big", "", [("가능 보증금 상한", "out-max", "원"), ("미충족", "out-fail", "개"), ("확인 필요", "out-warn", "개")]) + '''
        <section class="card">
          <h2>요건별 판정</h2>
          <ul class="ref-list" id="judge-list"></ul>
          <p class="result-note"><span id="rules-date"></span>. 참고용 자가진단이며 실제 가입 여부는 보증기관 심사로 정해집니다.</p>
          <div class="cta-box"><p>정확한 가입 조건과 보증료는 보증기관에서 확인하세요.</p><a id="hug-link" class="btn btn-primary" href="https://www.khug.or.kr" target="_blank" rel="noopener">HUG 전세보증 안내 열기</a></div>
        </section>'''
    guide = prose_section("가입이 안 될 때", [
        "<ul><li><strong>보증금이 한도를 넘음</strong> — 보증금을 낮추고 일부를 월세로 돌리는 방법이 있습니다. <a href='conversion.html'>전월세 전환율 계산기</a>로 월세를 확인하세요.</li><li><strong>선순위 근저당이 큼</strong> — 잔금일에 임대인이 대출을 상환·말소하는 조건을 특약으로 넣으세요. <a href='form-special-terms.html'>특약 문구 모음</a>에 예시가 있습니다.</li><li><strong>다가구 선순위 확인 불가</strong> — 임대인에게 확정일자 부여 현황과 전입세대 열람을 요청하세요. 거부하면 계약을 다시 생각할 신호입니다.</li></ul>",
        "<p>위험 신호를 종합적으로 보려면 <a href='jeonse-fraud-check.html'>전세 사기 위험 신호 체크</a>를 이용하세요.</p>",
    ])
    main = hero("Deposit Guarantee", "전세보증보험 가입 가능 여부 자가진단", "보증금 한도, 담보인정비율 90%, 선순위채권, 신청 시기를 한 번에",
                "HUG 전세보증금반환보증의 주요 요건을 상수로 두고 입력값과 비교합니다. 가능 보증금 상한이 얼마인지, 어떤 요건이 걸리는지 계약 전에 확인하세요.") + \
        layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("jeonse-insurance.html")
    return main, head_for("jeonse-insurance.html", faq)

# ============================================================ 전세 사기 위험 신호
RISK_ITEMS = [
    (25, "등기부 을구에 근저당·가압류·가처분이 있다", "채권최고액이 크면 경매 시 내 보증금 순위가 밀립니다"),
    (20, "임대인이 법인이거나 신탁 등기가 되어 있다", "신탁 부동산은 수탁자(신탁회사) 동의 없는 계약이 무효일 수 있습니다"),
    (15, "계약 직전에 소유자가 바뀌었거나 잔금일에 바뀔 예정이다", "매매와 전세를 동시에 진행하는 '동시진행'은 대표적인 위험 신호입니다"),
    (15, "시세보다 눈에 띄게 싸거나 이자 지원·이사비 등 조건이 붙었다", "정상 매물은 웃돈을 주면서 세입자를 구하지 않습니다"),
    (15, "다가구·다중주택인데 선순위 보증금 총액을 확인하지 못했다", "확정일자 부여 현황·전입세대 확인서를 요구하세요"),
    (10, "공인중개사 등록 여부를 확인하지 않았다", "국가공간정보포털이나 지자체에서 등록번호 조회"),
    (10, "임대인의 국세·지방세 체납 여부를 확인하지 않았다", "계약 전 임대인 동의로 미납국세 열람 가능. 체납 세금은 보증금보다 먼저 변제됩니다"),
    (10, "신축 빌라·오피스텔이라 시세를 알기 어렵다", "주변 실거래가와 공시가격을 확인하고 전세가율을 보수적으로 보세요"),
    (10, "잔금 후 전입신고·확정일자를 미루라는 요구가 있다", "대항력을 늦추려는 요구는 거절하세요"),
    (10, "계약금·잔금을 소유자가 아닌 계좌로 보내라고 한다", "대리인 계약이면 위임장·인감증명서를 확인하고 소유자 계좌로 송금"),
]
def jeonse_fraud_check_page():
    faq = [
        ("전세가율이 뭔가요?", ["보증금(선순위채권 포함)을 집값으로 나눈 비율입니다. 80%를 넘으면 집값이 조금만 내려도 경매로 보증금을 다 회수하지 못할 수 있습니다. 보증보험도 90%가 상한이고 실제로는 그보다 낮게 봅니다."]),
        ("점수는 어떻게 매기나요?", ["항목마다 위험의 크기에 따라 가중치를 두고 합산합니다. 30점 이상 주의, 60점 이상 높음으로 표시합니다. 과학적 확률이 아니라 확인해야 할 것을 놓치지 않기 위한 참고 점수입니다."]),
        ("위험이 높으면 어떻게 하나요?", ["계약을 서두르지 마세요. 보증보험 가입 가능 여부를 먼저 확인하고, 특약으로 보완이 안 되면 다른 집을 찾는 것이 가장 안전합니다. 계약금을 넣기 전에 판단해야 합니다."]),
        ("이미 계약했는데 위험 신호가 보이면?", ["잔금 전이면 특약 추가나 보증보험 가입 조건부 계약을 요구할 수 있습니다. 잔금 후면 즉시 전입신고·확정일자를 하고, 임차권등기와 보증보험 가입 가능 여부를 확인하세요. 주택도시보증공사 전세피해지원센터에서 상담할 수 있습니다."]),
    ]
    items = "".join(f'''
              <div class="field risk-item">
                <label class="toggle"><input type="checkbox" id="r{i+1}" data-weight="{w}"><span class="knob" aria-hidden="true"></span><span class="t">{t}</span></label>
                <p class="field-help">{d}</p>
              </div>''' for i, (w, t, d) in enumerate(RISK_ITEMS))
    left = form_open([("safe", "전세가율 60%"), ("risky", "전세가율 100%"), ("clear", "지우기")]) + \
        money("price", "집 시세 (매매가)", "300,000,000", help_="실거래가나 KB시세. 신축 빌라는 주변 거래와 공시가격을 함께") + money("deposit", "전세 보증금", "180,000,000") + money("senior", "선순위 근저당 채권최고액", "0") + f'''
            <fieldset><legend>위험 신호</legend>{items}
            </fieldset>
''' + form_close("위험도 보기")
    right = result_hero("위험도 (참고)", "out-big", "", [("점수", "out-score", "점"), ("전세가율", "out-ratio", "%"), ("해당 신호", "out-count", "개")]) + '''
        <section class="card">
          <h2>해당하는 신호</h2>
          <ul class="ref-list" id="signal-list"></ul>
        </section>
        <section class="card">
          <h2>계약 전 반드시</h2>
          <ul class="ref-list">
            <li><p class="t">등기부등본 · 건축물대장</p><p class="d">인터넷등기소·정부24에서 직접 발급. 계약일과 잔금일 두 번.</p></li>
            <li><p class="t">보증보험 가입 가능 여부</p><p class="d"><a href="jeonse-insurance.html">전세보증보험 자가진단</a>으로 미리 확인.</p></li>
            <li><p class="t">특약</p><p class="d"><a href="form-special-terms.html">특약 문구 모음</a>에서 근저당 말소·보증보험 조건부 문구를 넣으세요.</p></li>
          </ul>
        </section>'''
    main = hero("Jeonse Risk Check", "전세 사기 위험 신호 체크", "전세가율과 열 가지 위험 신호로 계약 전 점검",
                "시세와 보증금으로 전세가율을 계산하고, 등기부·임대인·계약 조건에서 자주 나타나는 위험 신호를 체크하면 참고 위험도가 나옵니다. 계약금을 보내기 전에 해보세요.") + \
        layout(left, right) + INLINE_AD + faq_section(faq) + related("jeonse-fraud-check.html")
    return main, head_for("jeonse-fraud-check.html", faq)

# ============================================================ 연봉 실수령액
def salary_page():
    faq = [
        ("실수령액이 회사 급여명세서와 다른데요?", ["회사는 매달 '간이세액표'로 소득세를 떼고 연말정산에서 정산합니다. 이 계산기는 연 단위 결정세액을 12로 나눈 값이라 매달 원천징수액과 조금 다를 수 있습니다. 연말정산 후 1년 합계는 비슷해집니다.", "비과세 항목(식대, 자가운전보조금, 육아수당 등)과 부양가족 수에 따라서도 달라집니다."]),
        ("4대보험은 얼마나 떼나요?", ["2026년 기준 국민연금 4.75%(기준소득월액 상한 월 659만원), 건강보험 3.595%, 장기요양보험은 건강보험료의 13.14%, 고용보험 0.9%입니다. 회사가 같은 금액을 더 부담합니다. 요율은 매년 바뀌므로 기준일을 확인하세요."]),
        ("퇴직금 포함 연봉이면?", ["'퇴직금 포함'을 켜면 연봉의 13분의 1을 퇴직금으로 보고 12분의 13만큼만 급여로 계산합니다. 퇴직금 자체는 <a href='severance.html'>퇴직금 계산기</a>에서 확인하세요."]),
        ("부양가족 수는 어떻게 세나요?", ["본인을 포함해 기본공제 대상자 수입니다. 배우자와 부모는 연 소득 100만원 이하, 자녀는 만 20세 이하 등 요건이 있습니다. 8세 이상 20세 이하 자녀는 자녀세액공제도 별도로 받습니다."]),
    ]
    left = form_open([("s3000", "3,000만"), ("s5000", "5,000만"), ("s8000", "8,000만"), ("s1", "1억"), ("clear", "지우기")]) + \
        money("salary", "연봉 (세전)", "50,000,000") + money("exempt", "비과세 수당 (월)", "200,000", help_="식대 월 20만원까지 비과세. 자가운전보조금 등 있으면 더하세요") + \
        num("family", "부양가족 수 (본인 포함)", "1", "명", step="1", min_="1") + num("children", "자녀 수 (8세 이상 20세 이하)", "0", "명", step="1") + \
        check("includeSeverance", "퇴직금 포함 연봉", "연봉의 1/13을 퇴직금으로 보고 뺍니다") + form_close("실수령액 계산")
    right = result_hero("월 실수령액 (추정)", "out-net", "원", [("연 실수령", "out-net-year", "원"), ("월 공제 합계", "out-deduct", "원"), ("실수령 비율", "out-ratio", "%")]) + '''
        <section class="card">
          <h2>공제 내역</h2>
          <div class="table-wrap"><table class="tbl nowrap-head"><thead><tr><th scope="col">항목</th><th scope="col">월</th><th scope="col">연</th></tr></thead><tbody>
            <tr><th scope="row">월 세전 급여</th><td><span id="out-gross-month">0</span>원</td><td class="muted">—</td></tr>
            <tr><th scope="row">국민연금 (4.75%)</th><td><span id="out-pension">0</span>원</td><td><span id="out-pension-y">0</span>원</td></tr>
            <tr><th scope="row">건강보험 (3.595%)</th><td><span id="out-health">0</span>원</td><td><span id="out-health-y">0</span>원</td></tr>
            <tr><th scope="row">장기요양 (건보료의 13.14%)</th><td><span id="out-ltc">0</span>원</td><td><span id="out-ltc-y">0</span>원</td></tr>
            <tr><th scope="row">고용보험 (0.9%)</th><td><span id="out-employ">0</span>원</td><td><span id="out-employ-y">0</span>원</td></tr>
            <tr><th scope="row">소득세</th><td><span id="out-tax">0</span>원</td><td><span id="out-tax-y">0</span>원</td></tr>
            <tr><th scope="row">지방소득세 (소득세의 10%)</th><td><span id="out-local">0</span>원</td><td><span id="out-local-y">0</span>원</td></tr>
          </tbody></table></div>
          <details style="margin-top:10px"><summary class="details-summary">소득세 계산 과정</summary>
            <table class="tbl" style="margin-top:8px"><tbody>
              <tr><th scope="row">과세표준</th><td><span id="out-taxbase">0</span>원</td></tr>
              <tr><th scope="row">산출세액</th><td><span id="out-computed">0</span>원</td></tr>
              <tr><th scope="row">세액공제 (근로소득·자녀·표준)</th><td><span id="out-credit">0</span>원</td></tr>
              <tr><th scope="row">결정세액 (연)</th><td><span id="out-income-tax">0</span>원</td></tr>
            </tbody></table></details>
          <p class="result-note"><span id="rules-date"></span>. 참고용 추정입니다.</p>
        </section>
        <section class="card">
          <h2>연봉별 실수령액 표</h2>
          <p class="hint">위에 입력한 부양가족·비과세 기준으로 계산합니다.</p>
          <div class="table-wrap"><table class="tbl nowrap-head"><thead><tr><th scope="col">연봉</th><th scope="col">월 실수령</th><th scope="col">월 공제</th><th scope="col">연 실수령</th></tr></thead><tbody id="table-body"></tbody></table></div>
        </section>'''
    guide = prose_section("실수령액 읽는 법", [
        "<p>연봉 5,000만원이면 월 세전은 약 417만원이지만 손에 쥐는 돈은 350만원 안팎입니다. 차이는 4대보험 약 9%와 소득세·지방소득세입니다. 연봉이 오를수록 소득세 누진 구간이 올라가 실수령 비율은 조금씩 내려갑니다.</p>",
        "<h3>실수령액을 높이는 합법적 방법</h3><ul><li>식대 등 비과세 수당을 급여 구조에 포함</li><li>부양가족 등록 누락 확인</li><li>연금저축·IRP 세액공제, 월세 세액공제(<a href='rent-tax-credit.html'>계산기</a>) 등 연말정산 공제 챙기기</li></ul>",
        "<p>월 실수령액이 나왔으면 <a href='rent.html'>월세 실부담 계산기</a>와 <a href='dsr.html'>DSR 계산기</a>에서 주거비와 대출 한도를 이어서 확인할 수 있습니다.</p>",
    ])
    main = hero("Net Salary", "연봉 실수령액 계산기", "4대보험과 소득세를 뺀 월 실수령액, 연봉별 표까지",
                "연봉과 부양가족, 비과세 수당을 넣으면 국민연금·건강보험·장기요양·고용보험과 소득세·지방소득세를 뺀 월 실수령액을 추정합니다. 요율과 공제 기준은 상수로 두고 기준일을 표시합니다.") + \
        layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("salary.html")
    return main, head_for("salary.html", faq)

# ============================================================ 퇴직금
def severance_page():
    faq = [
        ("퇴직금은 누가 받나요?", ["한 사업장에서 1년 이상, 주 15시간 이상 일한 근로자는 정규직·계약직·아르바이트 구분 없이 받습니다. 5인 미만 사업장도 2010년 12월부터 전액 적용됩니다."]),
        ("평균임금과 통상임금은 뭐가 다른가요?", ["평균임금은 퇴직 전 3개월 동안 실제 받은 임금 총액을 그 기간 일수로 나눈 것으로 상여금·연차수당·야근수당이 들어갑니다. 통상임금은 정기적·일률적으로 정해진 임금입니다. 평균임금이 통상임금보다 적으면 통상임금으로 계산합니다."]),
        ("상여금과 연차수당은 어떻게 넣나요?", ["퇴직 전 1년간 받은 상여금과 연차수당의 3/12을 3개월 임금에 더합니다. 이 계산기의 '연간 상여'와 '연차수당' 칸이 그 역할을 합니다."]),
        ("퇴직소득세는 얼마나 되나요?", ["근속연수공제와 환산급여공제가 커서 일반 소득보다 세금이 적습니다. 10년 근속에 5,000만원이면 세금은 70만원 안팎입니다. IRP 계좌로 받으면 세금이 이연되고 연금으로 받을 때 30~40% 감면됩니다."]),
        ("DC형 퇴직연금이면요?", ["DC형은 회사가 매년 연봉의 1/12 이상을 내 계좌에 넣고 운용 결과에 따라 달라지므로 이 계산과 다릅니다. DB형은 이 계산과 같은 방식입니다."]),
    ]
    left = form_open([("y3", "3년 근속"), ("y5", "5년 근속"), ("y10", "10년 근속"), ("clear", "지우기")]) + \
        date("join", "입사일") + date("leave", "퇴직일 (마지막 근무일 다음 날)") + \
        money("monthly", "월 임금 (세전, 기본급+고정수당)", "3,500,000", help_="퇴직 전 3개월 실제 임금이 다르면 그 평균을 넣으세요") + \
        money("bonus", "연간 상여금 총액", "0") + money("leavePay", "연차수당 (전년도 지급분)", "0") + \
        money("ordinary", "월 통상임금 (선택)", "0", help_="평균임금보다 높으면 통상임금으로 계산합니다. 모르면 비워두세요") + form_close("퇴직금 계산")
    right = result_hero("예상 법정 퇴직금 (세전)", "out-sev", "원", [("재직일수", "out-days", ""), ("근속", "out-years", ""), ("1일 평균임금", "out-avg", "원")]) + '''
        <section class="card">
          <h2>계산 내역</h2>
          <div class="table-wrap"><table class="tbl"><tbody>
            <tr><th scope="row">3개월 임금 총액 (상여·연차 반영)</th><td><span id="out-wages3">0</span>원</td></tr>
            <tr><th scope="row">3개월 일수</th><td><span id="out-period3">0</span></td></tr>
            <tr><th scope="row">적용 임금</th><td><span id="out-avg-kind">평균임금</span></td></tr>
          </tbody></table></div>
        </section>
        <section class="card">
          <h2>예상 퇴직소득세</h2>
          <div class="table-wrap"><table class="tbl"><tbody>
            <tr><th scope="row">근속연수 (올림)</th><td><span id="out-service-years">0</span></td></tr>
            <tr><th scope="row">근속연수공제</th><td><span id="out-sd">0</span>원</td></tr>
            <tr><th scope="row">환산급여</th><td><span id="out-converted">0</span>원</td></tr>
            <tr><th scope="row">환산급여공제</th><td><span id="out-cd">0</span>원</td></tr>
            <tr><th scope="row">과세표준</th><td><span id="out-taxbase">0</span>원</td></tr>
            <tr><th scope="row">퇴직소득세</th><td><span id="out-tax">0</span>원</td></tr>
            <tr><th scope="row">지방소득세</th><td><span id="out-local">0</span>원</td></tr>
            <tr class="total"><th scope="row">세후 예상 수령액</th><td><span id="out-net">0</span>원</td></tr>
          </tbody></table></div>
          <p class="result-note"><span id="rules-date"></span>. 참고용 추정입니다.</p>
        </section>'''
    guide = prose_section("퇴직금 공식", [
        "<p><strong>퇴직금 = 1일 평균임금 × 30일 × (재직일수 ÷ 365)</strong></p>",
        "<p>1일 평균임금 = (퇴직 전 3개월 임금 총액 + 연간 상여 × 3/12 + 연차수당 × 3/12) ÷ 3개월 일수. 3개월 일수는 89~92일이라 어느 달에 퇴직하느냐에 따라 평균임금이 조금 달라집니다.</p>",
        "<h3>퇴직 전에 확인할 것</h3><ul><li>퇴직 전 3개월에 무급휴직·감봉이 있으면 평균임금이 줄어듭니다. 그 기간은 제외하고 계산해야 합니다.</li><li>퇴직금은 퇴직일부터 14일 이내 지급이 원칙입니다. 늦으면 지연이자를 청구할 수 있습니다.</li><li>회사가 퇴직연금에 가입했다면 IRP 계좌로 받습니다. 55세 전 일시금 수령 시 세금이 바로 나옵니다.</li></ul>",
        "<p>퇴직 후 월 생활비 계획은 <a href='salary.html'>연봉 실수령액 계산기</a>와 <a href='rent.html'>월세 실부담 계산기</a>로 이어서 잡을 수 있습니다.</p>",
    ])
    main = hero("Severance Pay", "퇴직금 계산기", "평균임금 기준 법정 퇴직금과 예상 퇴직소득세",
                "입사일·퇴직일과 월 임금, 상여, 연차수당을 넣으면 1일 평균임금과 법정 퇴직금, 근속연수공제·환산급여공제를 반영한 예상 퇴직소득세까지 계산합니다.") + \
        layout(left, right) + INLINE_AD + guide + faq_section(faq) + related("severance.html")
    return main, head_for("severance.html", faq)

TOOLS2_PAGES = {
    "renewal.html": (renewal_page, "js/renewal.js", "갱신 요구 마감"),
    "tax-calendar.html": (tax_calendar_page, "js/tax-calendar.js", "다음 기한"),
    "moving.html": (moving_page, "js/moving.js", "이사까지"),
    "rate-compare.html": (rate_compare_page, "js/rate-compare.js", "총 이자 차이"),
    "buy-vs-rent.html": (buy_vs_rent_page, "js/buy-vs-rent.js", "총비용 차이"),
    "jeonse-insurance.html": (jeonse_insurance_page, "js/jeonse-insurance.js", "가입 가능 여부"),
    "jeonse-fraud-check.html": (jeonse_fraud_check_page, "js/jeonse-fraud-check.js", "위험도"),
    "salary.html": (salary_page, "js/salary.js", "월 실수령액"),
    "severance.html": (severance_page, "js/severance.js", "예상 퇴직금"),
}
