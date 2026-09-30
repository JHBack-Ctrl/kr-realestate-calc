# 전국부동산계산기 사이트 빌더 — 공통 틀(헤더·메뉴·레일·푸터)과 페이지 등록부
import json, re, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
# 사이트 주소. 한글 도메인 전국부동산계산기.com 의 퓨니코드 표기.
# 기계가 읽는 곳(canonical, og:url, sitemap, JSON-LD)에는 퓨니코드가 안전하고,
# 사람이 보는 문구에는 js/common.js 의 SITE_HOST('전국부동산계산기.com')를 쓴다.
BASE = "https://xn--989anm2s84p8on6teba611m.com/"   # = https://전국부동산계산기.com/

# 검색엔진 소유확인
# 구글 서치 콘솔은 도메인 속성(가비아 TXT 레코드)으로 확인해 태그가 필요 없다.
# 네이버 서치어드바이저(searchadvisor.naver.com)는 HTML 태그 방식. 재발급받으면 이 값만 바꾸면 된다.
NAVER_VERIFY = "23a58d13ef990301f4ed06e8867ec8a3350cd4cb"

# 구글 애드센스 게시자 ID. 모든 페이지 <head>의 소유확인 메타 태그와 ads.txt가 이 값에서 나온다.
# 공개 값이다(광고가 붙으면 페이지 소스에 그대로 보임). 비밀번호가 아니다.
ADSENSE_PUB = "ca-pub-8294238973326626"
TODAY = "2026-09-21"

# ---------------- 페이지 등록부 ----------------
# (파일, 짧은 이름, 제목, description, 카테고리, 한 줄 설명)
TOOLS = [
    ("rent.html", "월세 실부담", "월세 실부담 계산기 — 관리비·보증금까지",
     "월세 실부담 계산기. 월세·관리비·기타 고정비에 보증금 기회비용까지 더해 진짜 매달 나가는 돈을 계산하고, 전세 월세 환산 비교표와 두 매물 비교를 확인하세요. 모든 계산은 브라우저에서만 처리되며 저장되지 않습니다.",
     "임대", "관리비와 보증금 기회비용까지 더한 진짜 월 지출"),
    ("conversion.html", "전월세 전환율", "전월세 전환율 계산기 — 법정 전환율로 전세·월세 환산",
     "전월세 전환율 계산기. 한국은행 기준금리에 2%p를 더한 법정 전환율로 전세를 월세로, 월세를 전세로 환산합니다. 시장 전환율과 나란히 비교하고 계약 갱신 시 상한을 확인하세요.",
     "임대", "법정 전환율로 전세를 월세로, 월세를 전세로"),
    ("rent-tax-credit.html", "월세 세액공제", "월세 세액공제 계산기 — 연말정산 환급액 추정",
     "월세 세액공제 계산기. 총급여와 월세를 넣으면 공제율 15% 또는 17%와 연 1,000만원 한도를 적용해 연말정산에서 돌려받을 수 있는 세액공제액을 추정합니다.",
     "임대", "연말정산에서 돌려받는 월세 세액공제액"),
    ("fee.html", "중개보수", "중개보수(복비) 계산기 — 법정 상한 기준",
     "부동산 중개보수(복비) 계산기. 주택·오피스텔·상가의 매매, 전세, 월세 거래금액을 넣으면 법정 상한 요율 기준 예상 최대 중개보수와 부가세를 계산합니다.",
     "임대", "법정 상한 요율 기준 예상 최대 중개보수"),
    ("loan.html", "대출이자", "대출이자 계산기 — 원리금균등·원금균등·만기일시",
     "대출이자 계산기. 대출금액·연금리·기간을 넣으면 원리금균등, 원금균등, 만기일시 상환 방식별 월 상환액과 총 이자, 회차별 상환표를 계산합니다.",
     "대출", "상환 방식별 월 상환액과 회차별 상환표"),
    ("dsr.html", "DSR·LTV 한도", "DSR·LTV 대출 한도 계산기 — 주택담보대출 가능 금액",
     "DSR·LTV 대출 한도 계산기. 연소득, 담보 시세, 기존 대출 상환액, 스트레스 금리를 넣으면 LTV 한도와 DSR 한도 중 낮은 값으로 주택담보대출 가능 금액을 추정합니다.",
     "대출", "연소득과 담보로 보는 대출 가능 금액"),
    ("prepayment.html", "중도상환수수료", "중도상환수수료 계산기 — 잔여일수 기준",
     "중도상환수수료 계산기. 상환금액, 수수료율, 대출 실행일과 상환일을 넣으면 잔여일수 비율로 중도상환수수료와 면제일을 계산합니다.",
     "대출", "잔여일수 비율로 계산한 수수료와 면제일"),
    ("acquisition-tax.html", "취득세", "취득세 계산기 — 주택·상가 취득세와 지방교육세·농특세",
     "취득세 계산기. 취득가액, 주택 수와 조정대상지역 여부, 전용면적을 넣으면 취득세와 지방교육세, 농어촌특별세를 합한 예상 세금을 참고용으로 추정합니다.",
     "매매·투자", "취득세·지방교육세·농특세 참고용 추정"),
    ("capital-gains-tax.html", "양도소득세", "양도소득세 계산기 — 1세대 1주택 비과세·장기보유특별공제·다주택 중과",
     "양도소득세 계산기. 주택·입주권·분양권·토지·상가·국외 부동산의 양도차익에 1세대 1주택 비과세, 고가주택 안분, 장기보유특별공제, 단기·다주택 중과, 이월과세, 부담부증여, 감면까지 반영해 양도세와 지방소득세를 참고용으로 추정합니다.",
     "매매·투자", "비과세·장특공제·중과까지 반영한 참고용 추정"),
    ("yield.html", "상가 수익률", "상가 수익률 계산기 — 공실·대출 반영",
     "상가 수익률 계산기. 매매가·보증금·월세·운영비·공실률·대출 조건을 넣으면 연 순영업수익, 총투자 수익률과 자기자본 수익률을 계산합니다.",
     "매매·투자", "공실과 대출을 반영한 총투자·자기자본 수익률"),
    ("subscription.html", "청약 가점", "청약 가점 계산기 — 무주택기간·부양가족·통장기간 84점",
     "청약 가점 계산기. 생년월일, 혼인일, 부양가족 수, 청약통장 가입일을 넣으면 무주택기간 32점, 부양가족 35점, 가입기간 17점을 합한 청약 가점을 계산합니다.",
     "매매·투자", "무주택기간·부양가족·통장기간 84점 만점"),
    ("area.html", "평수 변환", "평수 변환기 — 평 ㎡ 변환과 평당 가격",
     "평수 변환기. 평을 제곱미터로, 제곱미터를 평으로 바꾸고 총액과 면적으로 평당·㎡당 가격을 계산합니다. 전용면적과 공급면적 차이도 설명합니다.",
     "매매·투자", "평 ↔ ㎡ 변환과 평당 가격"),
    # ---- 2차 추가 ----
    ("renewal.html", "계약 갱신 청구권", "계약 갱신 청구권 계산기 — 갱신 요구 기간과 임대료 5% 상한",
     "계약 갱신 청구권 계산기. 계약 시작일과 기간을 넣으면 만기와 갱신 요구 가능 기간(만기 6~2개월 전), 오늘 기준 남은 날짜가 나옵니다. 보증금·월세 5% 인상 상한과 전환 시 환산보증금 기준 상한도 계산합니다.",
     "임대", "갱신 요구 기간 D-day와 5% 인상 상한"),
    ("jeonse-insurance.html", "전세보증보험 자가진단", "전세보증보험 가입 가능 여부 자가진단 — 보증금 한도·담보인정비율 90%",
     "전세보증금 반환보증 가입 자가진단. 지역별 보증금 한도, 담보인정비율 90%, 선순위채권 60%, 계약기간과 신청 시기, 전입신고·확정일자 등 HUG 요건을 입력값과 비교해 가능 보증금 상한과 미충족 항목을 보여줍니다.",
     "임대", "HUG 요건별 판정과 가능 보증금 상한"),
    ("jeonse-fraud-check.html", "전세 사기 위험 체크", "전세 사기 위험 신호 체크 — 전세가율과 10가지 위험 신호",
     "전세 사기 위험 신호 체크. 시세와 보증금으로 전세가율을 계산하고 근저당, 신탁, 동시진행, 시세 이하 조건, 다가구 선순위 미확인 등 위험 신호를 점수로 합산해 계약 전 참고 위험도를 보여줍니다.",
     "임대", "전세가율과 위험 신호 점수로 계약 전 점검"),
    ("moving.html", "이사 체크리스트", "이사 체크리스트 · D-day 계산기 — 한 달 전부터 이사 후 30일까지",
     "이사 체크리스트. 이사 날짜를 넣으면 한 달 전, 2주 전, 1주 전, 전날, 당일, 이사 후 14일·30일 할 일이 날짜별로 나오고 체크하면 진행률이 보입니다. 전입신고 14일, 자동차 변경등록 30일 기한 포함.",
     "임대", "이사일 기준 단계별 할 일과 법정 기한"),
    ("rate-compare.html", "고정 vs 변동금리", "고정금리 vs 변동금리 비교 계산기 — 총 이자와 손익분기 변동폭",
     "고정금리 vs 변동금리 비교 계산기. 대출금·기간·두 금리와 변동금리 연간 변동폭을 넣으면 총 이자와 월 상환액 변화를 비교하고, 변동금리가 매년 얼마나 올라야 고정이 유리해지는지 손익분기점을 계산합니다.",
     "대출", "금리가 얼마나 올라야 고정이 유리한지"),
    ("buy-vs-rent.html", "매매 vs 전세", "매매 vs 전세 총비용 비교 계산기 — 보유기간 기준 손익분기 상승률",
     "매매 vs 전세 총비용 비교 계산기. 대출이자, 자기자본 기회비용, 취득세, 중개보수, 보유세, 가격 변동을 넣어 보유기간 동안의 총비용을 비교하고 집값이 매년 몇 % 올라야 매매가 유리한지 손익분기 상승률을 계산합니다.",
     "매매·투자", "보유기간 총비용과 손익분기 집값 상승률"),
    ("tax-calendar.html", "세금 달력", "부동산 세금 달력 · 신고 납부 기한 계산기 — 취득세 60일, 양도세 예정신고, 재산세, 종부세",
     "부동산 세금 달력. 잔금일을 넣으면 취득세 60일, 소유권이전등기 60일, 양도세 예정신고 기한이 나오고 보유 항목을 켜면 재산세 7·9월, 종합부동산세 12월, 임대소득 신고 일정이 오늘 기준 D-day와 함께 정렬됩니다.",
     "매매·투자", "취득·양도·보유 세금 기한을 D-day로"),
    ("salary.html", "연봉 실수령액", "연봉 실수령액 계산기 — 4대보험·소득세 뺀 월 실수령액과 연봉별 표",
     "연봉 실수령액 계산기. 연봉과 부양가족, 비과세 수당을 넣으면 국민연금·건강보험·장기요양·고용보험과 소득세·지방소득세를 뺀 월 실수령액을 추정하고 연봉 2,400만~2억 실수령액 표를 보여줍니다. 요율은 기준일과 함께 상수로 관리합니다.",
     "생활", "4대보험·세금 뺀 월 실수령액"),
    ("severance.html", "퇴직금", "퇴직금 계산기 — 평균임금 기준 법정 퇴직금과 퇴직소득세",
     "퇴직금 계산기. 입사일·퇴직일과 월 임금, 상여금, 연차수당을 넣으면 1일 평균임금과 법정 퇴직금, 근속연수공제와 환산급여공제를 반영한 예상 퇴직소득세와 세후 수령액을 계산합니다.",
     "생활", "평균임금 × 30일 × 재직일수 ÷ 365와 세금"),
]
# 표·자료 페이지 (파일, 짧은 이름, 제목, description, 한 줄 설명)
TABLES = [
    ("table-acquisition-tax.html", "취득세율표", "취득세율표 2026 — 주택 수·조정대상지역·면적별 취득세, 지방교육세, 농특세",
     "2026년 기준 취득세율표. 1주택 1~3%, 조정대상지역 2주택 8%, 3주택 이상 12%, 주택 외 4%, 상속·증여·원시취득 세율과 지방교육세·농어촌특별세, 생애최초 감면을 한 표로 정리했습니다.", "주택 수·지역·면적별 세율 한 표"),
    ("table-capital-gains-tax.html", "양도세율표", "양도소득세율표 2026 — 누진세율, 단기 보유, 다주택 중과, 장기보유특별공제",
     "2026년 기준 양도소득세율표. 과세표준 8구간 누진세율과 누진공제, 주택·분양권·토지 단기 보유 세율, 조정대상지역 다주택 중과와 유예, 장기보유특별공제 표1·표2, 기본공제와 비과세 기준을 정리했습니다.", "누진세율·단기·중과·장특공제 한 표"),
    ("table-brokerage-fee.html", "중개보수 요율표", "부동산 중개보수 요율표 — 주택 매매·임대차, 오피스텔, 상가 상한 요율과 한도액",
     "부동산 중개보수(복비) 요율표. 주택 매매와 임대차의 거래금액 구간별 상한 요율과 한도액, 주거용 오피스텔, 상가·토지 협의 상한, 월세 거래금액 환산 방법을 정리했습니다.", "거래금액 구간별 상한 요율과 한도액"),
    ("table-subscription-points.html", "청약 가점표", "청약 가점표 — 무주택기간 32점, 부양가족 35점, 청약통장 가입기간 17점",
     "주택청약 가점표. 무주택기간 1년 미만 2점부터 15년 이상 32점, 부양가족 0명 5점부터 6명 이상 35점, 청약통장 가입기간 6개월 미만 1점부터 15년 이상 17점까지 84점 만점 배점표입니다.", "84점 만점 배점표"),
    ("base-rate-history.html", "기준금리 변동 이력", "한국은행 기준금리 변동 이력 — 2008년부터 현재까지 결정일과 금리",
     "한국은행 기준금리 변동 이력표. 2008년 금융위기 이후 인하, 2021~2023년 인상, 2024~2025년 인하, 2026년 인상까지 결정일별 금리와 변동폭을 정리하고 전월세 전환율과의 관계를 설명합니다.", "결정일별 금리와 변동폭"),
]
# 서식 페이지
FORMS = [
    ("form-rent-receipt.html", "월세 영수증 양식", "월세 영수증 양식 — 브라우저에서 작성하고 인쇄",
     "월세 영수증 양식. 임대인·임차인·주소·금액·해당 월을 입력하면 영수증이 완성되고 바로 인쇄할 수 있습니다. 월세 세액공제와 현금영수증 안내 포함. 입력값은 저장하지 않습니다.", "입력하면 완성되는 영수증, 바로 인쇄"),
    ("form-notice.html", "통지문 예시", "계약 갱신 요구·계약 종료 통지·보증금 반환 요청 문구 예시 — 문자·내용증명",
     "임대차 계약 갱신 요구, 계약 종료(갱신 거절) 통지, 보증금 반환 요청 내용증명 문구 예시. 복사해서 문자나 내용증명에 쓸 수 있고 보내는 시점과 방법을 설명합니다.", "갱신 요구·종료 통지·반환 요청 문구"),
    ("form-special-terms.html", "특약 문구 모음", "임대차·매매 계약서 특약 문구 모음 — 전세 보증금 보호, 월세, 매매",
     "전세·월세·매매 계약서에 넣을 특약 문구 모음. 근저당 말소 조건, 보증보험 가입 조건부 계약, 잔금 전 권리변동 금지, 원상복구 범위, 하자 처리 등 상황별 문구를 복사해 쓸 수 있습니다.", "상황별 특약 문구 복사"),
]
REFS = [
    ("checklist.html", "양도·취득 체크리스트", "양도·취득 체크리스트 — 확인 항목과 서류",
     "부동산 취득과 양도 전에 확인할 항목과 준비 서류 체크리스트. 세액 계산이나 법령 해석은 하지 않으며, 세무사·법무사 상담 전 정리용입니다.", "참고", "계약 전후 확인 항목과 준비 서류"),
    ("policy.html", "세제·정책 참고", "세제·정책 참고 — 공식 확인처 모음",
     "부동산 세금과 정책을 확인할 때 참고할 공식 기관과 확인 포인트 모음. 세율이나 법령을 해석하지 않으며 어디서 무엇을 확인해야 하는지 안내합니다.", "참고", "세금별 확인 포인트와 공식 기관 링크"),
    ("guides.html", "안내 글", "안내 글 — 부동산 숫자 읽는 법",
     "월세, 대출, 전월세 전환, 중개보수를 이해하는 데 필요한 개념을 설명하는 안내 글 모음입니다.", "참고", "개념 설명과 계산 방법"),
]
# 빠른 이동용 허브 페이지 (파일, 짧은 이름, 제목, description)
HUBS = [
    ("tables.html", "표·자료", "표·자료 — 취득세율표, 양도세율표, 중개보수 요율표, 청약 가점표, 기준금리 이력",
     "계산기에 들어 있는 세율표와 요율표를 표 하나로 정리한 자료 모음. 취득세율표, 양도소득세율표, 중개보수 요율표, 청약 가점표, 한국은행 기준금리 변동 이력. 기준일이 붙어 있습니다."),
    ("forms.html", "서식·용어", "서식·용어 — 월세 영수증, 통지문 예시, 특약 문구, 부동산 용어 사전",
     "계약할 때 바로 쓰는 서식과 용어 설명. 월세 영수증 양식, 갱신 요구·종료 통지·보증금 반환 요청 문구, 계약서 특약 문구 모음, 대항력·확정일자·근저당 등 부동산 용어 사전."),
    ("refs.html", "참고 자료", "참고 자료 — 양도·취득 체크리스트, 세제·정책 확인처, 안내 글",
     "계약과 세금 전에 확인할 것을 모은 참고 자료. 양도·취득 체크리스트, 세제·정책 공식 확인처, 부동산 숫자를 읽는 안내 글 16편."),
]
GUIDES = [
    ("guide-repayment.html", "원리금균등과 원금균등, 무엇이 다른가", "원리금균등과 원금균등 차이 — 어떤 상환 방식을 골라야 하나",
     "원리금균등, 원금균등, 만기일시 상환 방식의 차이를 숫자로 비교합니다. 총 이자와 월 부담이 어떻게 달라지는지, 어떤 상황에 어떤 방식이 맞는지 설명합니다."),
    ("guide-brokerage.html", "복비, 얼마까지 내야 하나", "복비(중개보수) 계산 방법 — 요율표 읽는 법과 협의 요령",
     "부동산 중개보수 요율표를 읽는 법, 월세 거래금액 환산, 한도액, 부가세, 협의 요령을 설명합니다."),
    ("guide-conversion.html", "전월세 전환율, 어디에 쓰는 숫자인가", "전월세 전환율이란 — 법정 전환율과 시장 전환율의 차이",
     "전월세 전환율의 뜻, 법정 전환율이 적용되는 경우와 아닌 경우, 시장 전환율과의 차이, 전세와 월세 중 무엇이 나은지 판단하는 기준을 설명합니다."),
    ("guide-jeonse-vs-monthly.html", "전세와 월세, 숫자로 비교하는 법", "전세 vs 월세 비교 — 보증금 기회비용으로 같은 기준 만들기",
     "전세와 월세를 같은 기준으로 비교하려면 보증금 기회비용을 넣어야 합니다. 계산 순서와 흔한 착각, 금액 외에 봐야 할 것을 정리합니다."),
    ("guide-acquisition-tax.html", "취득세, 주택 수에 따라 왜 이렇게 달라지나", "취득세율 1%에서 12%까지 — 주택 수와 조정대상지역이 만드는 차이",
     "같은 8억 집인데 취득세가 1,300만원일 수도, 1억원일 수도 있습니다. 주택 수, 조정대상지역, 전용면적이 취득세율을 어떻게 바꾸는지 예시 숫자로 설명하고 생애최초 감면과 신고 기한까지 정리합니다."),
    ("guide-cgt-exemption.html", "1세대 1주택 비과세 2년, 언제부터 세는 건가", "양도세 비과세 2년 보유·거주 요건 — 기산일과 흔한 함정",
     "1세대 1주택 양도소득세 비과세의 2년 보유 요건과 조정대상지역 2년 거주 요건을 설명합니다. 취득일을 언제로 보는지, 12억 초과분은 어떻게 과세되는지, 일시적 2주택은 어디까지 인정되는지 정리합니다."),
    ("guide-subscription-points.html", "청약 가점이 안 오르는 이유", "청약 가점 84점 구조 — 무주택기간이 0점인 이유와 오르는 속도",
     "청약 가점은 무주택기간 32점, 부양가족 35점, 청약통장 17점으로 84점 만점입니다. 만 30세 전 무주택기간이 0점인 이유, 부양가족 인정 기준, 통장 가입기간 계산법과 가점이 오르는 속도를 설명합니다."),
    ("guide-dsr-ltv.html", "DSR이 막으면 LTV는 소용없다", "DSR과 LTV 차이 — 대출 한도를 실제로 정하는 쪽은 어디인가",
     "LTV는 집값 기준, DSR은 소득 기준 대출 한도입니다. 둘 중 낮은 쪽이 실제 한도가 되는데 요즘은 대부분 DSR이 먼저 걸립니다. 스트레스 금리가 한도를 어떻게 줄이는지 예시 숫자로 설명합니다."),
    ("guide-salary-net.html", "연봉 5,000만원인데 왜 월 357만원인가", "연봉 실수령액 계산 구조 — 4대보험과 세금이 빠지는 순서",
     "연봉 5,000만원의 월 실수령액이 357만원이 되는 과정을 항목별로 풉니다. 국민연금, 건강보험, 장기요양, 고용보험, 소득세, 지방소득세가 각각 얼마이고 왜 그렇게 계산되는지 설명합니다."),
    ("guide-severance.html", "퇴직금은 언제부터 생기나", "퇴직금 발생 요건과 계산법 — 1년, 15시간, 평균임금",
     "퇴직금은 1년 이상 계속 근무하고 주 15시간 이상 일했을 때 생깁니다. 평균임금 계산법, 상여금과 연차수당이 들어가는 방식, 퇴직소득세와 IRP 지급까지 예시 숫자로 설명합니다."),
    ("guide-jeonse-registry.html", "전세 계약 전, 등기부에서 볼 세 가지", "등기부등본 보는 법 — 전세 계약 전 갑구·을구에서 확인할 것",
     "전세 계약 전에 등기부등본에서 소유자, 가압류·경매, 근저당 채권최고액을 확인하는 방법을 설명합니다. 전세가율 계산, 신탁등기, 계약일과 잔금일에 다시 확인해야 하는 이유까지 정리합니다."),
    ("guide-renewal-refusal.html", "계약갱신청구권, 거절당할 수 있는 경우", "계약갱신청구권 거절 사유 9가지 — 실거주 거절, 2기 연체, 묵시적 갱신과의 차이",
     "계약갱신청구권은 한 번 쓸 수 있지만 집주인이 거절할 수 있는 사유가 법에 9가지 있습니다. 실거주 거절의 요건과 사후 손해배상, 2기 차임 연체, 갱신 요구 기간(만기 6~2개월 전), 5% 상한, 묵시적 갱신과의 차이를 정리합니다."),
    ("guide-jeonse-insurance-fail.html", "전세보증보험, 가입이 안 되는 집", "전세보증보험 가입 조건 — 담보인정비율 90%, 선순위 60%, 신청 시기와 거절되는 경우",
     "HUG 전세보증금 반환보증에 가입이 안 되는 이유를 요건별로 설명합니다. 보증금 + 선순위 채권이 시세의 90%를 넘는 경우, 선순위가 60%를 넘는 경우, 계약 기간 절반이 지난 경우, 수도권 7억 한도, 빌라 시세 산정 방식까지 예시 숫자로 정리합니다."),
    ("guide-area-84.html", "84㎡가 34평이 아닌 이유", "전용면적 공급면적 계약면적 차이 — 84㎡ 25평과 34평, 평당 가격 계산",
     "84㎡는 25.4평인데 왜 34평형이라고 부르는지 전용면적, 공급면적, 계약면적의 차이로 설명합니다. 59㎡·84㎡의 평 환산, 발코니 확장 서비스 면적, 평당 가격을 어느 면적으로 나누느냐에 따라 달라지는 문제를 정리합니다."),
    ("guide-rent-tax-credit-who.html", "월세 세액공제, 누가 얼마 받나", "월세 세액공제 조건과 금액 — 총급여 8,000만원, 공제율 15·17%, 한도 1,000만원",
     "연말정산 월세 세액공제를 받을 수 있는 조건(총급여 8,000만원 이하, 무주택 세대주, 국민주택규모, 전입신고)과 공제율 15%·17%, 연 1,000만원 한도를 예시로 설명합니다. 집주인 동의가 필요 없는 이유, 준비 서류, 놓쳤을 때 경정청구까지 정리합니다."),
    ("guide-fixed-vs-variable.html", "고정금리와 변동금리, 어느 쪽이 유리한가", "고정금리 vs 변동금리 선택 기준 — 손익분기 금리 상승폭으로 비교",
     "고정금리와 변동금리 중 무엇을 고를지 총 이자로 비교합니다. 변동금리가 매년 몇 %p 올라야 고정이 유리해지는지 손익분기점을 예시 숫자로 보여주고, 대출 기간이 길수록 고정이 유리해지는 이유와 중도상환·대환이라는 탈출구를 정리합니다."),
    ("guide-loan-rate-structure.html", "대출금리는 어떻게 정해지나", "대출금리 구조 — 코픽스·금융채 지표금리, 가산금리, 우대금리",
     "같은 은행에서 같은 날 대출을 받아도 사람마다 금리가 다른 이유를 구조로 설명합니다. 지표금리(코픽스·금융채·한국은행 기준금리), 가산금리, 우대금리가 각각 무엇으로 정해지는지, 0.3%p 차이가 총 이자에 얼마가 되는지, 지금 금리는 어디서 확인하는지 정리합니다."),
    ("guide-officetel.html", "오피스텔은 주택인가", "오피스텔 주택 수 포함 여부 — 취득세·양도세·종부세·청약에서 갈리는 판정",
     "오피스텔이 주택으로 취급되는지는 세금마다 다릅니다. 취득세는 주택 외 4%인데 주택 수에는 들어가고, 양도세와 종부세는 주거용이면 주택으로 봅니다. 청약 무주택 판정, 중개보수 요율, 전용면적이 작게 나오는 이유까지 항목별로 정리합니다."),
    ("guide-property-tax.html", "재산세·종부세, 6월 1일이 가르는 것", "재산세·종합부동산세 납부 시기와 계산 구조 — 과세기준일 6월 1일",
     "재산세와 종합부동산세는 6월 1일 소유자에게 1년치가 부과됩니다. 잔금일 하루 차이로 부담자가 바뀌는 이유, 재산세 7월·9월 분납과 종부세 12월 납부 일정, 공시가격에서 세액이 나오는 구조, 1세대 1주택 공제와 확인처를 정리합니다."),
    ("guide-prepayment.html", "중도상환수수료, 3년이 기준인 이유", "중도상환수수료 계산법과 면제 시점 — 슬라이딩 방식과 3년 상한",
     "중도상환수수료는 남은 기간에 비례해 줄어듭니다. 3년이 기준이 된 법적 이유, 잔여일수로 계산하는 슬라이딩 방식, 1억원 예시로 본 경과 기간별 수수료, 갈아타기가 이득인지 판단하는 손익분기 개월 수를 정리합니다."),
    ("guide-moving-14days.html", "이사 후 14일, 늦으면 순위가 밀린다", "전입신고·확정일자 기한과 대항력이 생기는 시점 — 이사 후 14일",
     "전입신고는 이사 후 14일 이내가 법정 기한이지만, 보증금을 지키려면 잔금 당일에 해야 합니다. 대항력이 다음 날 0시에 생기는 구조, 확정일자를 같이 받아야 하는 이유, 30일 기한인 자동차 변경등록, 확정일자와 전세권의 차이를 정리합니다."),
    ("guide-yield-vacancy.html", "상가 수익률, 공실을 넣으면 달라지는 것", "상가 수익률 계산과 공실률 — 광고 수익률과 실제 수익률의 차이",
     "분양 광고의 상가 수익률에는 공실·운영비·부대비용이 빠져 있습니다. 5억원 상가 예시로 광고식 6.67%가 5.54%가 되는 과정, 공실률별 수익률 표, 대출이 공실의 영향을 키우는 구조, 대출 효과가 뒤집히는 공실률을 계산기로 확인합니다."),
    ("guide-buy-vs-rent.html", "매매와 전세, 집값이 몇 % 올라야 같아지나", "매매 vs 전세 비교 — 총비용과 손익분기 집값 상승률",
     "매매와 전세 중 어느 쪽이 덜 드는지는 앞으로의 집값에 달려 있습니다. 6억원 매매와 4억원 전세를 5년 기준으로 놓고, 사라지는 돈만 모아 비교한 총비용, 두 선택이 같아지는 연 집값 상승률, 기회비용과 보유기간에 따라 그 경계가 움직이는 폭을 계산기로 확인합니다."),
    ("guide-deposit-vs-rent.html", "보증금 올리고 월세 내리기, 언제 이득인가", "보증금 더 내고 월세 깎기 계산 — 월 실부담과 교환 금리",
     "보증금을 더 내고 월세를 줄이는 조건은 집주인에게 일정한 금리로 돈을 맡기는 것과 같습니다. 보증금 4,000만원에 월세 15만원을 깎는 예시로 그 금리(연 4.5%)를 구하고, 예금이자·대출이자에 따라 어느 쪽 월 실부담이 작은지, 월세 세액공제가 경계를 어떻게 바꾸는지 계산기로 확인합니다."),
]
DOCS = [
    ("about.html", "사이트 소개"), ("privacy.html", "개인정보처리방침"), ("terms.html", "이용약관"),
]
CATS = ["임대", "대출", "매매·투자", "생활", "참고"]
GLOSSARY_INDEX = ("glossary.html", "부동산 용어 사전", "부동산 용어 사전 — 계약·등기·세금·대출 용어 쉬운 설명",
                  "부동산 용어 사전. 근저당권, 확정일자, 대항력, 우선변제권, 전세가율, 조정대상지역, 장기보유특별공제, DSR, LTV 등 계약·등기·세금·대출 용어를 한 페이지에 하나씩 쉽게 설명하고 관련 계산기로 연결합니다.")

def desc_of(path):
    return [t for t in TOOLS if t[0] == path][0][3]

def tools_by_cat(cat):
    return [t for t in TOOLS + REFS if t[4] == cat]

def extra_groups():
    """메뉴·푸터에 붙는 표·자료, 서식·용어 묶음"""
    tables = [(f, n, "", "", "표·자료", d) for (f, n, _t, _d, d) in TABLES]
    forms = [(f, n, "", "", "서식·용어", d) for (f, n, _t, _d, d) in FORMS] + [(GLOSSARY_INDEX[0], GLOSSARY_INDEX[1], "", "", "서식·용어", "계약·등기·세금·대출 용어 설명")]
    return [("표·자료", tables), ("서식·용어", forms)]

# ---------------- 한국은행 기준금리 (단일 출처) ----------------
# 이력표 페이지, 전환율·갱신 계산기 기본값, js 상수(build.py가 주입)가 전부 여기서 나온다.
RATE_HISTORY_CHECKED = "2026년 9월"   # 이 날짜 이후 변동은 한국은행 공지로 확인 후 추가
RATE_HISTORY = [  # (결정일, 금리)
    ("2008-10-09", 5.00), ("2008-10-27", 4.25), ("2008-11-07", 4.00), ("2008-12-11", 3.00), ("2009-01-09", 2.50), ("2009-02-12", 2.00),
    ("2010-07-09", 2.25), ("2010-11-16", 2.50), ("2011-01-13", 2.75), ("2011-03-10", 3.00), ("2011-06-10", 3.25),
    ("2012-07-12", 3.00), ("2012-10-11", 2.75), ("2013-05-09", 2.50), ("2014-08-14", 2.25), ("2014-10-15", 2.00),
    ("2015-03-12", 1.75), ("2015-06-11", 1.50), ("2016-06-09", 1.25), ("2017-11-30", 1.50), ("2018-11-30", 1.75),
    ("2019-07-18", 1.50), ("2019-10-16", 1.25), ("2020-03-17", 0.75), ("2020-05-28", 0.50),
    ("2021-08-26", 0.75), ("2021-11-25", 1.00), ("2022-01-14", 1.25), ("2022-04-14", 1.50), ("2022-05-26", 1.75), ("2022-07-13", 2.25), ("2022-08-25", 2.50), ("2022-10-12", 3.00), ("2022-11-24", 3.25),
    ("2023-01-13", 3.50), ("2024-10-11", 3.25), ("2024-11-28", 3.00), ("2025-02-25", 2.75), ("2025-05-29", 2.50), ("2026-07-16", 2.75), ("2026-08-27", 3.00),
]
BASE_RATE = RATE_HISTORY[-1][1]                       # 현재 기준금리 %
BASE_RATE_DATE = RATE_HISTORY[-1][0]                  # 마지막 결정일
BASE_RATE_LABEL = BASE_RATE_DATE[:4] + '년 ' + str(int(BASE_RATE_DATE[5:7])) + '월 ' + str(int(BASE_RATE_DATE[8:10])) + '일 결정'

# ---------------- 공통 조각 ----------------
ICON_SUN = '<svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
ICON_MOON = '<svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
ICON_MENU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'

QUICK_NAV = [("index.html", "홈"), ("rent.html", "월세"), ("loan.html", "대출이자"), ("acquisition-tax.html", "취득세"), ("capital-gains-tax.html", "양도세"), ("salary.html", "연봉"), ("subscription.html", "청약"), ("tables.html", "표·자료"), ("forms.html", "서식·용어"), ("refs.html", "참고 자료"), ("guides.html", "안내 글")]

# 홈 타일 아이콘. 24×24 stroke 방식, 색은 CSS가 정한다.
_P = '<svg viewBox="0 0 24 24" aria-hidden="true">{}</svg>'
_DOC = '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>'
_CAL = '<path d="M4 6h16v14H4z"/><path d="M8 3v4M16 3v4M4 10h16"/>'
TILE_ICONS = {
    "rent.html": '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
    "conversion.html": '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    "rent-tax-credit.html": '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9.5 8h5M9.5 12h5"/>',
    "fee.html": '<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
    "renewal.html": _CAL + '<path d="M14 16.5a2.8 2.8 0 1 1-.9-2.1"/><path d="M13.6 12.4v2h-2"/>',
    "jeonse-insurance.html": '<path d="M12 3.5 19 6v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6z"/><path d="m9 12 2 2 4-4"/>',
    "jeonse-fraud-check.html": '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.1"/>',
    "moving.html": '<path d="M3.5 7.5 12 4l8.5 3.5v9L12 20l-8.5-3.5z"/><path d="M3.5 7.5 12 11l8.5-3.5M12 11v9"/>',
    "loan.html": '<path d="M4 19V9M9.5 19V5M15 19v-7M20.5 19v-4"/><path d="M3 21h18"/>',
    "dsr.html": '<path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 17 4.2-5"/><circle cx="12" cy="17" r="1.4"/>',
    "prepayment.html": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    "rate-compare.html": '<path d="M3 15h18"/><path d="M3 19c4-9 10 1 18-8"/>',
    "acquisition-tax.html": _DOC + '<path d="M9 13h6M9 17h4"/>',
    "capital-gains-tax.html": _DOC + '<path d="M12 17v-6M9.5 13.5 12 11l2.5 2.5"/>',
    "yield.html": '<path d="M4 20V9.5L12 5l8 4.5V20z"/><path d="M8.5 20v-5h7v5"/><path d="M4 20h16"/>',
    "subscription.html": '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    "area.html": '<path d="M4 4h16v16H4z"/><path d="M4 9h5V4M20 15h-5v5"/>',
    "buy-vs-rent.html": '<path d="M12 4v16"/><path d="M4 8h16"/><path d="M4 8 1.8 13.5h4.4zM20 8l-2.2 5.5h4.4z"/>',
    "tax-calendar.html": _CAL + '<path d="M8 14h3M8 17h3"/>',
    "salary.html": '<path d="M3 7.5h18v11H3z"/><path d="M3 11h18"/><path d="M16 15h2.5"/>',
    "severance.html": '<path d="M3.5 8h17v11h-17z"/><path d="M9 8V5.5h6V8"/><path d="M3.5 12.5h17"/>',
    # 표·서식·용어
    "table-acquisition-tax.html": '<path d="M4 5h16v14H4z"/><path d="M4 10h16M10 10v9"/>',
    "table-capital-gains-tax.html": '<path d="M4 5h16v14H4z"/><path d="M4 10h16M10 10v9"/>',
    "table-brokerage-fee.html": '<path d="M4 5h16v14H4z"/><path d="M4 10h16M10 10v9"/>',
    "table-subscription-points.html": '<path d="M4 5h16v14H4z"/><path d="M4 10h16M10 10v9"/>',
    "base-rate-history.html": '<path d="M3 18c4-2 5-9 9-9s6 5 9 3"/>',
    "form-rent-receipt.html": '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9.5 9h5M9.5 13h5"/>',
    "form-notice.html": '<path d="M3.5 7h17v12h-17z"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    "form-special-terms.html": '<path d="M5 4h10l4 4v12H5z"/><path d="M8.5 12h7M8.5 16h5"/>',
    "glossary.html": '<path d="M4 5.5C6.5 4 9.5 4 12 5.5c2.5-1.5 5.5-1.5 8 0V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0z"/><path d="M12 5.5V19"/>',
    # 안내·참고
    "checklist.html": '<path d="M5 4h14v16H5z"/><path d="m8.5 10 1.6 1.6L14 8"/><path d="M8.5 15.5h7"/>',
    "policy.html": '<path d="M12 3.5 19 6v6c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6z"/><path d="M12 9.5v4M12 16.2v.1"/>',
    "guides.html": '<path d="M4 5.5C6.5 4 9.5 4 12 5.5c2.5-1.5 5.5-1.5 8 0V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0z"/><path d="M12 5.5V19"/>',
}
_GUIDE_ICON = '<path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h3"/>'

def tile_icon(path):
    return '<span class="ico">' + _P.format(TILE_ICONS.get(path, _GUIDE_ICON)) + '</span>'

# 검색어 보강: 이름·설명에 없지만 사람들이 실제로 치는 말
TILE_KEYS = {
    "rent.html": "월세 실부담 관리비 보증금 기회비용 원룸",
    "conversion.html": "전월세 전환율 전세 월세 환산 법정",
    "rent-tax-credit.html": "월세 세액공제 연말정산 환급 소득공제",
    "fee.html": "중개보수 복비 수수료 부동산 요율",
    "renewal.html": "계약갱신청구권 갱신 재계약 5% 상한 묵시적",
    "jeonse-insurance.html": "전세보증보험 HUG 반환보증 SGI 보증보험",
    "jeonse-fraud-check.html": "전세사기 깡통전세 위험 전세가율 근저당",
    "moving.html": "이사 체크리스트 전입신고 확정일자 이사날짜",
    "loan.html": "대출이자 주담대 원리금균등 원금균등 상환표 이자계산",
    "dsr.html": "DSR LTV 대출한도 주택담보대출 가능금액 스트레스",
    "prepayment.html": "중도상환수수료 조기상환 면제",
    "rate-compare.html": "고정금리 변동금리 비교 금리",
    "acquisition-tax.html": "취득세 지방교육세 농특세 등록세 생애최초",
    "capital-gains-tax.html": "양도소득세 양도세 비과세 장기보유특별공제 중과",
    "yield.html": "상가 수익률 임대수익률 월세수익률 공실 레버리지",
    "subscription.html": "청약 가점 무주택 부양가족 청약통장 아파트",
    "area.html": "평수 변환 제곱미터 평당가 전용면적 공급면적",
    "buy-vs-rent.html": "매매 전세 비교 집사기 총비용",
    "tax-calendar.html": "세금 달력 재산세 종부세 신고기한 납부",
    "salary.html": "연봉 실수령액 월급 실수령 4대보험 세후",
    "severance.html": "퇴직금 퇴직소득세 평균임금 근속",
    "glossary.html": "용어 사전 대항력 확정일자 근저당 우선변제권",
    "base-rate-history.html": "기준금리 한국은행 금리 이력",
}

def menu_panel():
    groups = []
    for cat in CATS:
        items = "".join(f'<li><a href="{f}">{name}<small>{desc}</small></a></li>' for (f, name, _t, _d, _c, desc) in tools_by_cat(cat))
        groups.append(f'<div class="menu-group"><h3>{cat}</h3><ul>{items}</ul></div>')
    for cat, lst in extra_groups():
        items = "".join(f'<li><a href="{f}">{name}<small>{desc}</small></a></li>' for (f, name, _t, _d, _c, desc) in lst)
        groups.append(f'<div class="menu-group"><h3>{cat}</h3><ul>{items}</ul></div>')
    docs = "".join(f'<li><a href="{f}">{n}</a></li>' for f, n in DOCS)
    return f'''      <div id="menu-panel" class="menu-panel" hidden>
        <div class="container">
          <div class="menu-groups">
            {"".join(groups)}
          </div>
          <ul class="footer-links" style="margin:14px 0 0">{docs}</ul>
        </div>
      </div>'''

def header():
    quick = "".join(f'<li><a href="{f}">{n}</a></li>' for f, n in QUICK_NAV)
    return f'''  <header class="site-header">
    <div class="container">
      <div class="header-row">
        <a class="brand" href="./" aria-label="전국부동산계산기 홈"><span class="brand-mark" aria-hidden="true"></span>전국부동산계산기</a>
        <div class="header-actions">
          <button type="button" id="theme-toggle" class="icon-btn" aria-pressed="false" aria-label="어두운 화면으로 전환">{ICON_SUN}{ICON_MOON}</button>
          <button type="button" id="menu-toggle" class="icon-btn" aria-expanded="false" aria-controls="menu-panel">{ICON_MENU}<span class="btn-label">전체 계산기</span></button>
        </div>
      </div>
      <nav aria-label="빠른 메뉴">
        <ul class="tool-nav">{quick}</ul>
      </nav>
    </div>
{menu_panel()}
  </header>'''

# 광고 슬롯. 승인 전에는 빈 자리 상자를 보여주지 않는다 (미완성으로 보인다).
# 애드센스 코드를 받으면 여기와 INLINE_AD에 넣고, 슬롯에는 '광고' 라벨을 반드시 붙인다.
def rail():
    return '  <aside class="rail" aria-hidden="true"></aside>'

def footer(disclaimer="본 계산기는 참고용이며 금융·세무·법률 자문이 아닙니다.", privacy="입력값은 서버로 전송되거나 저장되지 않습니다. 최근 계산 기억 기능을 켜면 이 기기 브라우저에만 저장됩니다."):
    cols = []
    for cat in CATS[:4]:  # 계산기 카테고리만 열로
        items = "".join(f'<li><a href="{f}">{n}</a></li>' for (f, n, *_r) in tools_by_cat(cat))
        cols.append(f'<div class="menu-group"><h3>{cat}</h3><ul>{items}</ul></div>')
    # 표·서식·용어·참고는 한 줄 링크로
    extra = [("glossary.html", "용어 사전"), ("guides.html", "안내 글"), ("checklist.html", "체크리스트"), ("policy.html", "세제·정책")] + [(f, n) for (f, n, *_r) in TABLES] + [(f, n) for (f, n, *_r) in FORMS]
    extra_html = "".join(f'<li><a href="{f}">{n}</a></li>' for f, n in extra)
    docs = "".join(f'<li><a href="{f}">{n}</a></li>' for f, n in DOCS)
    return f'''  <footer class="site-footer">
    <div class="container">
      <div class="menu-groups" style="margin-bottom:14px">{"".join(cols)}</div>
      <ul class="footer-links footer-extra">{extra_html}</ul>
      <ul class="footer-links">{docs}</ul>
      <p class="disclaimer">{disclaimer}</p>
      <p class="privacy">{privacy}</p>
    </div>
  </footer>'''

def head(title, desc, path, extra="", noindex=False, og_type="website"):
    url = BASE + ("" if path == "index.html" else path)
    return f'''<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#f6f4ee">
  <meta name="naver-site-verification" content="{NAVER_VERIFY}">
  <meta name="google-adsense-account" content="{ADSENSE_PUB}">
{'  <meta name="robots" content="noindex, follow">' + chr(10) if noindex else ''}  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
  <link rel="stylesheet" href="css/site.css">
  <link rel="canonical" href="{url}">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <link rel="manifest" href="manifest.json">
  <meta property="og:type" content="{og_type}">
  <meta property="og:site_name" content="전국부동산계산기">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{BASE}og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{BASE}og.png">
{extra}</head>
<body>
  <a class="skip-link" href="#main">본문으로 건너뛰기</a>
'''

def page(title, desc, path, main_html, extra_head="", scripts=(), noindex=False, sticky=None, with_rails=True, disclaimer=None, og_type="website"):
    sc = "".join(f'\n  <script src="{s}"></script>' for s in scripts)
    sticky_html = f'''
  <div id="sticky-summary" class="sticky-summary" aria-hidden="true">
    <div><p class="k">{sticky}</p><p class="v"><span id="sticky-monthly">0</span></p></div>
    <a href="#result">결과 보기</a>
  </div>''' if sticky else ""
    shell_open = '<div class="page-shell">\n' + rail() + '\n' if with_rails else ''
    shell_close = '\n' + rail() + '\n</div>' if with_rails else ''
    foot = footer(disclaimer) if disclaimer else footer()
    return (head(title, desc, path, extra_head, noindex, og_type) + "\n" + header() + "\n\n" + shell_open
            + '  <main id="main" class="container">\n' + main_html + '\n  </main>' + shell_close + "\n\n" + foot + sticky_html
            + '\n\n  <div id="toast" class="toast" role="status" aria-live="polite"></div>\n  <script src="js/common.js"></script>\n  <script src="js/analytics.js"></script>' + sc + '\n</body>\n</html>\n')

def jsonld(data):
    return '  <script type="application/ld+json">\n' + json.dumps(data, ensure_ascii=False, indent=2) + "\n  </script>\n"

def app_ld(name, desc, path):
    return jsonld({"@context": "https://schema.org", "@type": "WebApplication", "name": name, "url": BASE + path, "description": desc,
                   "applicationCategory": "FinanceApplication", "operatingSystem": "All", "inLanguage": "ko-KR", "isAccessibleForFree": True,
                   "offers": {"@type": "Offer", "price": "0", "priceCurrency": "KRW"}, "publisher": {"@type": "Organization", "name": "전국부동산계산기", "url": BASE}})

def faq_ld(items):
    return jsonld({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": " ".join(re.sub(r"<[^>]+>", "", a) for a in ans)}} for q, ans in items]})

def article_ld(title, desc, path):
    return jsonld({"@context": "https://schema.org", "@type": "Article", "headline": title, "description": desc, "url": BASE + path,
                   "datePublished": TODAY, "dateModified": TODAY, "inLanguage": "ko-KR",
                   "author": {"@type": "Organization", "name": "전국부동산계산기"}, "publisher": {"@type": "Organization", "name": "전국부동산계산기", "url": BASE}})

def breadcrumb_ld(name, path):
    return jsonld({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "전국부동산계산기", "item": BASE},
        {"@type": "ListItem", "position": 2, "name": name, "item": BASE + path}]})

def faq_section(items, intro="자주 나오는 질문을 모았습니다."):
    parts = [f'''
    <section class="card" aria-labelledby="faq-title">
      <h2 id="faq-title">자주 묻는 질문</h2>
      <p class="hint">{intro}</p>
      <div class="faq">''']
    for q, answers in items:
        body = "\n".join(f"          <p>{a}</p>" for a in answers)
        parts.append(f'''        <details>
          <summary>{q}</summary>
          <div class="a">
{body}
          </div>
        </details>''')
    parts.append("      </div>\n    </section>")
    return "\n".join(parts)

def prose_section(title, blocks, sid="guide-title"):
    return f'''
    <section class="card" aria-labelledby="{sid}">
      <h2 id="{sid}">{title}</h2>
      <div class="prose">
{chr(10).join(blocks)}
      </div>
    </section>'''

INLINE_AD = ''  # 본문 광고 자리. rail() 주석 참고

def action_buttons(extra=""):
    return f'''            <div class="btn-row">
              <button type="button" id="native-share-btn" class="btn btn-ghost btn-sm"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 16V3M7 8l5-5 5 5"/></svg>공유하기</button>
              <button type="button" id="share-btn" class="btn btn-ghost btn-sm">링크 복사</button>
              <button type="button" id="image-btn" class="btn btn-ghost btn-sm"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>이미지 저장</button>{extra}
            </div>'''

REMEMBER_TOGGLE = '''            <div class="field" style="margin-top:14px">
              <label class="toggle"><input type="checkbox" id="remember-toggle"><span class="knob" aria-hidden="true"></span>최근 계산 기억하기</label>
              <p class="field-help">이 기기의 브라우저에만 저장되며 서버로 보내지 않습니다. 끄면 저장한 값을 지웁니다.</p>
            </div>
'''

def related(cur):
    me = [t for t in TOOLS if t[0] == cur]
    same = [t for t in TOOLS if t[0] != cur and me and t[4] == me[0][4]]
    others = [t for t in TOOLS if t[0] != cur and t not in same]
    items = (same + others)[:4]
    cards = "".join(f'<a class="tool-card" href="{f}"><p class="t">{n}</p><p class="d">{d}</p></a>' for (f, n, _t, _d, _c, d) in items)
    return f'''
    <section class="card related" aria-labelledby="rel-title">
      <h2 id="rel-title">함께 쓰는 계산기</h2>
      <div class="tool-grid">{cards}</div>
    </section>'''

def read(path): return open(os.path.join(ROOT, path), encoding="utf-8").read()
def write(path, s):
    open(os.path.join(ROOT, path), "w", encoding="utf-8").write(s); print("wrote", path)

def extract_main(html):
    m = re.search(r"<main[^>]*>(.*)</main>", html, re.S)
    # rstrip까지 해야 한다. 공백만 있는 줄을 남기면 다시 빌드할 때마다 빈 줄이 쌓인다.
    return m.group(1).lstrip("\n").rstrip()

def extract_ld(html):
    return "".join(re.findall(r"  <script type=\"application/ld\+json\">.*?</script>\n", html, re.S))

def patch_calc_main(main):
    """기존 계산기 본문에 액션 버튼·기억 토글·본문 광고를 넣는다. 여러 번 실행해도 중복되지 않는다."""
    if 'id="native-share-btn"' not in main:
        main = re.sub(r'            <div class="btn-row">.*?</div>', lambda m: action_buttons('\n              <button type="button" id="copy-btn" class="btn btn-ghost btn-sm">결과 텍스트 복사</button>' if 'copy-btn' in m.group(0) else ''), main, count=1, flags=re.S)
    if 'id="remember-toggle"' not in main:
        main = main.replace('            <button type="submit" class="btn btn-primary">', REMEMBER_TOGGLE + '            <button type="submit" class="btn btn-primary">', 1)
    if 'slot inline' not in main:
        main = main.replace('\n    <section class="card" aria-labelledby="faq-title">', INLINE_AD + '\n    <section class="card" aria-labelledby="faq-title">', 1)
    return main
