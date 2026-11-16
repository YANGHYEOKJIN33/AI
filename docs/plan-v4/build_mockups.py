# 계획용 화면 시안(사이트 형태)을 만든다: python3 build_mockups.py → mockups.html
# (사이트 코드가 아니다. PLAN-v4.md에 넣는 그림의 원본)
css = open('../plan-v3/mockups.html').read()
css = css[css.index('<style>'):css.index('</style>') + len('</style>')]
extra = '''<style>
  /* 사이트 형태: 탭 줄 + 쪽 줄 + 작업대(의사코드 | 자료구조) + 아래 띠(바뀐 것 · 실행 단추) */
  .tabs { flex:0 0 60px; display:flex; align-items:center; gap:14px; padding:0 32px; background:#fff; border-bottom:2px solid var(--soft); font-size:24px; white-space:nowrap; }
  .tabs .site { font-weight:800; margin-right:10px; }
  .tab { padding:5px 18px; border-radius:999px; border:2px solid var(--line); color:var(--muted); }
  .tab.on { background:var(--blue); border-color:var(--blue); color:#fff; font-weight:700; }
  .tabs .sep { color:var(--line); }
  .sub { padding:5px 14px; border-radius:10px; color:var(--muted); }
  .sub.on { background:var(--blue-bg); color:var(--blue); font-weight:700; border:2px solid var(--blue); }
  .pagebar { flex:0 0 76px; display:flex; align-items:center; gap:20px; padding:0 32px; background:#fff; border-bottom:2px solid var(--soft); white-space:nowrap; }
  .dots { display:flex; gap:6px; } .dots span { width:34px; height:34px; border-radius:50%; border:2px solid var(--line); display:grid; place-items:center; font:700 22px var(--code); color:var(--muted); }
  .dots .done { background:var(--green-bg); border-color:var(--green); color:var(--green); } .dots .on { background:var(--blue); border-color:var(--blue); color:#fff; }
  .pagebar h2 { font-size:32px; } .pagebar p { font-size:24px; margin:0; color:var(--text); }
  .navbtn { margin-left:auto; display:flex; gap:10px; } .navbtn span { border:2px solid var(--line); border-radius:999px; padding:6px 22px; font-size:24px; } .navbtn .go { background:var(--blue); border-color:var(--blue); color:#fff; font-weight:700; }
  .work { flex:1 1 auto; display:flex; gap:18px; padding:16px 32px 10px; min-height:0; background:#f7f8fa; }
  .panel { background:#fff; border:2px solid var(--line); border-radius:18px; display:flex; flex-direction:column; min-height:0; }
  .panel > h4 { margin:0; padding:10px 20px; font-size:24px; border-bottom:2px solid var(--soft); display:flex; gap:12px; align-items:center; color:var(--muted); font-weight:400; }
  .panel > h4 b { color:var(--text); }
  .panel .body { flex:1 1 auto; padding:16px 20px; display:flex; flex-direction:column; gap:14px; justify-content:center; }
  .ptab { margin-left:auto; display:flex; gap:6px; } .ptab span { padding:2px 14px; border-radius:999px; border:2px solid var(--line); font-size:22px; } .ptab .on { background:var(--text); color:#fff; border-color:var(--text); }
  .code { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
  .code li { display:flex; gap:16px; align-items:baseline; padding:10px 16px; border-radius:12px; border:3px solid transparent; font:700 26px var(--code); white-space:pre; }
  .code li .no { font-size:22px; color:var(--muted); min-width:26px; text-align:right; }
  .code li.on { background:var(--blue-bg); border-color:var(--blue); color:var(--blue); }
  .bottom { flex:0 0 88px; display:flex; align-items:center; gap:18px; padding:0 32px; background:var(--orange-bg); border-top:4px solid var(--orange); font-size:30px; white-space:nowrap; }
  .bottom .k { font-weight:800; color:var(--orange); } .bottom .old { color:var(--muted); text-decoration:line-through; }
  .bottom.wait { background:#fff; border-top-color:var(--soft); color:var(--muted); }
  .ctrl { margin-left:auto; display:flex; gap:10px; align-items:center; }
  .ctrl span { border:2px solid var(--line); border-radius:12px; padding:8px 20px; font-size:24px; background:#fff; color:var(--text); }
  .ctrl .main { background:var(--blue); border-color:var(--blue); color:#fff; font-weight:800; padding:8px 30px; }
  .ctrl small { font:700 22px var(--code); color:var(--muted); }
  .sc { border:4px solid currentColor; border-radius:16px; background:#fff; text-align:center; font:800 38px var(--code); }
  .sc small { display:block; font:700 22px var(--ui); color:var(--muted); margin-top:2px; white-space:nowrap; }
  .sc.first { box-shadow:0 0 0 8px var(--blue-bg); border-color:var(--blue); }
  .ds.dense .cell { padding:4px 16px; margin-top:6px; } .ds.dense .cell .v { font-size:28px; } .ds.dense .cell .nm, .ds.dense .cell .ix { font-size:24px; }
</style>'''


def chrome(dots_on, title, sentence, n=10):
    dots = ''.join('<span class="%s">%d</span>' % ('on' if i == dots_on else 'done' if i < dots_on else '', i) for i in range(1, n + 1))
    return '''<div class="tabs"><span class="site">자료구조로 배우는 머신러닝</span><span class="tab">📦 도구</span><span class="tab on">🤖 알고리즘</span><span class="tab">✅ 정리</span><span class="sep">|</span><span class="sub on">📍 k-NN</span><span class="sub">🎯 k-평균</span><span class="sub">📈 선형회귀</span><span class="sub">🌳 결정트리</span></div>
  <div class="pagebar"><div class="dots">%s</div><h2>%s</h2><p>%s</p><div class="navbtn"><span>← 이전</span><span class="go">다음 →</span></div></div>''' % (dots, title, sentence)


def ctrl(pos):
    return '<div class="ctrl"><small>%s</small><span>⏮ 처음</span><span>◀ 뒤로</span><span class="main">▶ 한 단계</span></div>' % pos


FOODS = [('사과', 9, 9, '과일', 'c1', '●'), ('포도', 8, 6, '과일', 'c1', '●'), ('오렌지', 7, 3, '과일', 'c1', '●'), ('당근', 7, 8, '채소', 'c2', '▲'), ('오이', 2, 7, '채소', 'c2', '▲')]


def table(cur):
    n, x, y, l, c, sh = FOODS[cur]
    return '<div class="ds dense" style="align-self:stretch;"><h3><code>학습 데이터</code><small>표의 %d번째 줄</small></h3><div class="cell cur"><span class="v" style="font-family:var(--ui);">%s</span><span class="v">단맛 %d · 아삭함 %d</span><span class="v %s" style="margin-left:auto; font-family:var(--ui);">%s %s</span></div></div>' % (cur + 1, n, x, y, c, sh, l)


def dist(n, fresh):
    items = [('34', '과일', '사과'), ('8', '과일', '포도'), ('2', '과일', '오렌지')][:n]
    cells = ''
    for i, (d, l, nm) in enumerate(items):
        new = fresh and i == n - 1
        cells += '<div class="cell%s"><span class="ix">[%d]</span><span class="v">(%s, <span class="c1">● %s</span>)</span><span class="nm">%s</span>%s</div>' % (' new' if new else '', i, d, l, nm, '<span class="tagnew">방금 추가</span>' if new else '')
    return '<div class="ds dense%s" style="align-self:stretch;"><h3><code>distances</code><small>리스트 · %d칸</small></h3>%s<div class="cell ghost"><span class="ix">[%d]</span><span class="v">다음 칸</span></div></div>' % (' hot' if fresh else '', n, cells, n)


arrow = '<svg width="70" height="48" viewBox="0 0 110 70" style="transform:rotate(90deg); align-self:center;"><path d="M4 35h78" stroke="#1857c4" stroke-width="14" stroke-linecap="round"/><path d="M66 10l34 25-34 25" fill="none" stroke="#1857c4" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>'


def code(on, calc=''):
    L = ['distances ← 빈 리스트', '각 학습 데이터에 대해 반복:', '    d² ← 거리 제곱(질문점, x)', '    distances에 (d², 레이블)을 추가']
    lis = ''.join('<li class="%s"><span class="no">%d</span>%s</li>' % ('on' if i + 1 == on else '', i + 1, t) for i, t in enumerate(L))
    return '<div class="panel" style="flex:0 0 640px;"><h4><b>의사코드</b> 이 쪽의 줄만 <span class="ptab"><span>전체 보기</span></span></h4><div class="body" style="justify-content:flex-start;"><ol class="code">%s</ol>%s</div></div>' % (lis, calc)


calc = '<div class="calc" style="font-size:26px;">토마토 (6, 4) ↔ 오렌지 (7, 3)<br>d² = (6−7)² + (4−3)² = <span class="res">2</span></div>'


def right(inner):
    return '<div class="panel" style="flex:1 1 auto;"><h4><b>자료구조</b> 이 줄이 바꾸는 상자만 <span class="ptab"><span class="on">자료구조</span><span>그림</span></span></h4><div class="body" style="gap:10px; padding:16px 60px;">%s</div></div>' % inner


s1 = '<section class="slide" id="v4-01-step-a">%s<div class="work">%s%s</div><div class="bottom wait"><span>계산만 했어요 — 자료구조는 아직 그대로입니다.</span>%s</div></section>' % (
    chrome(3, '3. ① 거리 재기', '표의 위에서부터 d²을 재서 distances 뒤에 붙여요.'), code(3, calc), right(table(2) + arrow + dist(2, False)), ctrl('9 / 38'))
s2 = '<section class="slide" id="v4-02-step-b">%s<div class="work">%s%s</div><div class="bottom"><span class="k">바뀐 것</span><span><code style="font:700 30px var(--code)">distances</code> <span class="old">2칸</span> → <b>3칸</b> · 맨 뒤 [2]에 (2, 과일)</span>%s</div></section>' % (
    chrome(3, '3. ① 거리 재기', '표의 위에서부터 d²을 재서 distances 뒤에 붙여요.'), code(4, calc), right(table(2) + arrow + dist(3, True)), ctrl('10 / 38'))


def sort_cells(arr, first=False, dim=False):
    return ''.join('<div class="sc %s%s" style="font-size:38px; padding:8px 0 4px;%s">%s<small style="font-size:22px;">%s</small></div>' % (c, ' first' if first and i == 0 else '', ' opacity:.45;' if dim else '', d, n) for i, (d, n, c) in enumerate(arr))


before = [('34', '사과', 'c1'), ('8', '포도', 'c1'), ('2', '오렌지', 'c1'), ('17', '당근', 'c2'), ('25', '오이', 'c2'), ('41', '셀러리', 'c2'), ('5', '견과류', 'c3'), ('10', '생선', 'c3'), ('13', '치즈', 'c3')]
after = [('2', '오렌지', 'c1'), ('5', '견과류', 'c3'), ('8', '포도', 'c1'), ('10', '생선', 'c3'), ('13', '치즈', 'c3'), ('17', '당근', 'c2'), ('25', '오이', 'c2'), ('34', '사과', 'c1'), ('41', '셀러리', 'c2')]
grid = 'display:grid; grid-template-columns:repeat(9, 1fr); gap:8px; width:100%;'
code5 = '<div class="panel" style="flex:0 0 470px;"><h4><b>의사코드</b> 이 쪽의 줄만 <span class="ptab"><span>전체 보기</span></span></h4><div class="body" style="justify-content:flex-start;"><ol class="code"><li class="on" style="white-space:normal;"><span class="no">5</span>distances를 d²이 작은 순서로 정렬</li></ol></div></div>'
idx = ''.join('<span>[%d]</span>' % i for i in range(9))
s3 = '''<section class="slide" id="v4-03-sort">%s<div class="work">%s<div class="panel" style="flex:1 1 auto;"><h4><b>자료구조</b> distances · 리스트 9칸 <span class="ptab"><span class="on">자료구조</span><span>그림</span></span></h4><div class="body" style="gap:8px;">
    <div class="small" style="font-weight:700;">정렬 전</div><div style="%s">%s</div>
    <div style="text-align:center; font-size:40px; color:var(--blue); line-height:1;">⬇</div>
    <div class="small" style="font-weight:700; color:var(--blue);">정렬 후</div><div style="%s">%s</div>
    <div style="%s font:700 22px var(--code); color:var(--muted); text-align:center;">%s</div></div></div></div>
  <div class="bottom"><span class="k">바뀐 것</span><span><b>순서만</b> 바뀌었다 (9칸 그대로) · <b>오렌지(2)</b>가 [0]으로</span>%s</div></section>''' % (
    chrome(4, '4. ② 정렬하기', 'distances를 d²이 작은 순서로 다시 세워요.'), code5, grid, sort_cells(before, dim=True), grid, sort_cells(after, first=True), grid, idx, ctrl('2 / 2'))

s4 = '''<section class="slide" id="v4-04-concept">%s<div class="work"><div class="panel" style="flex:0 0 760px;"><h4><b>개념</b> 한 번 누를 때마다 한 줄씩</h4><div class="body" style="padding:24px 34px; gap:22px;">
    <h2 style="font-size:40px;">토마토 (6, 4) ↔ 오렌지 (7, 3)</h2>
    <div class="calc" style="font-size:30px;">① 차이&nbsp;&nbsp;&nbsp; 6 − 7 = −1,&nbsp; 4 − 3 = 1<br>② 제곱&nbsp;&nbsp;&nbsp; (−1)² = 1,&nbsp; 1² = 1<br><span class="res">③ 더하기&nbsp; d² = 1 + 1 = 2</span></div>
    <p class="lead" style="font-size:28px; color:var(--muted);">가까운 순서만 알면 되므로<br>√는 하지 않고 d²으로 비교해요.</p></div></div>
    <div class="panel" style="flex:1 1 auto;"><h4><b>그림</b> 두 점 사이 <span class="ptab"><span>자료구조</span><span class="on">그림</span></span></h4><div class="body" style="align-items:center;">
      <svg width="520" height="470" viewBox="0 0 520 470" font-family="sans-serif">
        <g stroke="#e3e7ee" stroke-width="2"><path d="M60 30V410M160 30V410M260 30V410M360 30V410M460 30V410M60 30H460M60 125H460M60 220H460M60 315H460M60 410H460"/></g>
        <g stroke="#8a94a3" stroke-width="3" fill="none"><path d="M60 30V410H460"/></g>
        <text x="260" y="455" font-size="24" fill="#5a6472" text-anchor="middle" font-weight="700">단맛 →</text>
        <path d="M260 220H360" stroke="#1857c4" stroke-width="5" stroke-dasharray="10 8"/><path d="M360 220V315" stroke="#1857c4" stroke-width="5" stroke-dasharray="10 8"/>
        <path d="M260 220L360 315" stroke="#a75300" stroke-width="6"/>
        <text x="310" y="205" font-size="24" fill="#1857c4" text-anchor="middle" font-weight="700">차이 1</text><text x="408" y="275" font-size="24" fill="#1857c4" text-anchor="middle" font-weight="700">차이 1</text>
        <path d="M260 196l7 15 16 2-12 12 3 16-14-8-14 8 3-16-12-12 16-2z" fill="#a75300"/><text x="170" y="228" font-size="26" fill="#a75300" font-weight="800" text-anchor="middle">토마토</text>
        <circle cx="360" cy="315" r="14" fill="#c2255c"/><text x="360" y="360" font-size="26" fill="#c2255c" font-weight="700" text-anchor="middle">오렌지</text>
      </svg></div></div></div>
  <div class="bottom wait"><span>다음: ✏️ 활동지 ①번 — 토마토 ↔ 당근의 d²</span>%s</div></section>''' % (chrome(2, '2. 가깝다를 수로 — d²', '차이를 구하고, 제곱해서, 더해요.'), ctrl('3 / 4'))

html = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>화면 시안 (PLAN-v4) — 사이트 형태, 계획용 그림</title>%s%s</head><body>%s%s%s%s</body></html>' % (css, extra, s1, s2, s3, s4)
open('mockups.html', 'w').write(html)
print('written', len(html))
