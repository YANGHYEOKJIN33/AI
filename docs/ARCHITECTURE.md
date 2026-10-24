# 구조 안내 (개발자용)

빌드 도구·프레임워크 없이 **브라우저가 바로 읽는 HTML + CSS + ES 모듈**로 만든다(8-퍼즐 사이트와 같다).
`index.html`을 정적 서버로 열면 그대로 동작하고, GitHub Pages에 올리는 것만으로 게시된다.

## 폴더

```
index.html                 화면 뼈대 — 빈 패널만 두고 내용은 JS가 채운다
.nojekyll                  GitHub Pages가 파일을 그대로 올리도록
src/
  core/                    순수 로직 — 화면을 전혀 모른다 (node에서 테스트)
    math.js                거리 · 평균 · 지니 · 엔트로피 · 수 표시(fmt)
    trace.js               단계 기록기(Recorder) — 프레임 목록을 만든다
    datasets.js            예제 데이터 (음식 · 집 · 공부 시간 · 축구 기록)
    algorithms/
      knn.js kmeans.js linreg.js dtree.js
                           알고리즘마다 meta · defaults · knobs · normalize() · pseudo() · notes · run()
      index.js             알고리즘 목록 · 설정값 정리(normalizeParams) · withKnob · conditionText
    exam.js                시험 대비: 추적표(traceTables) · 문제 생성(makeExam, makeMockExam) — 정답은 실행 결과 프레임에서
  app/
    main.js                진입점 — 부품을 붙이고 상태 ↔ 재생기를 잇는다
    state.js               상태 저장소(구독 방식 + 로컬 저장) · 재생 속도
    lesson.js              큰 탭 셋의 쪽 구성 · 알고리즘 쪽(문제 보기 → 단계 쪽 → 추적표 → 시험 대비) · 단계 쪽의 장면 범위(window)
    player.js              재생기 — 처음/뒤로/재생/한 단계/다음 반복/끝까지, 예측 퀴즈 앞 대기, 쪽 범위 [lo, hi] 안에서만
    glossary.js            용어 사전 자료
    quiz.js                ✅ 이해 확인 문제
  ui/
    dom.js flip.js infoTip.js        작은 도우미 (FLIP은 이동 + 복사 이동)
    topbar.js lessonBar.js controls.js actionCard.js coach.js
    glossaryPanel.js onboarding.js
    plot.js                SVG 산점도 — 같은 key의 모양은 좌표를 보간해 움직인다
    structures.js          자료구조 상자(sbox) · 칩 · 변수 상자 · 모양 기호
    codePanel.js           왼쪽: 문제 보기 카드 / 단계 쪽의 의사코드(다른 쪽 줄은 흐리게)
    stagePanel.js          오른쪽 위: 그림 + 범례 + 계산 상자
    dataPanel.js           오른쪽 아래: 자료구조 흐름 — 단계 쪽의 boxes만 (다시 그린 뒤 FLIP)
    algoRooms.js           📝 추적표 쪽 · 🎯 시험 대비 연습 · ✅ 종합 모의시험 (한 문제씩 풀기 + 그 장면 보기)
    views/                 알고리즘마다 "어떻게 그릴까" 한 파일
      knn.js kmeans.js linreg.js dtree.js
    room.js                📦 도구 · 추적표 · 시험 · ✅ 정리 쪽을 갈아 끼우는 곳
    tools/                 방 하나 = 파일 하나 (guide · table · distance · sort · dict · group · update · wrapRooms)
      mission.js           🎯 미션(단계 순서·다음 단추 깜빡임·🎓 배운 것·완료 저장)
      connections.js       🔗 알고리즘 속에서는 — 도구가 쓰이는 알고리즘·쪽·장면(action) 카드
  styles/
    tokens.css             색·간격·글꼴 (8-퍼즐과 같은 의미 색 + 레이블 구분 색)
    base.css layout.css components.css viz.css rooms.css
test/                      node:test — 의존성 없음
scripts/smoke.mjs          (선택) 브라우저로 모든 쪽을 훑는 점검 — playwright 필요
```

## 흐름

```
  [ 학생 조작 ] ── store.set(...) ──▶ state ──구독──▶ 패널들이 다시 그림
                                         │
                       algoTab·params가 바뀌면 player.load()
                                         ▼
                 core/algorithms/*.run(params) → { frames, data, result, params }
                                         │
                      player가 frames[index]를 view로 내준다 (구독)
                                         ▼
      codePanel(줄 강조)   stagePanel(views/*.shapes → plot.update)   dataPanel(views/*.data → FLIP)
```

핵심 규칙: **`src/core/`는 화면을 모른다.** 알고리즘은 "의사코드 한 줄을 실행할 때마다 자료구조가
어떤 모습이었는지"를 프레임 목록으로만 남기고, 그 목록을 앞뒤로 오가며 그리는 일은 `src/ui/`가 맡는다.

## 프레임(한 장면)의 모양

```js
{
  line: 4,                    // 강조할 의사코드 줄 (1부터)
  action: 'append',           // 동작 카드의 아이콘·낱말 (ui/actionCard.js의 ACTION_VIS)
  narration: '(1.41, 과일) 한 쌍을 …',
  phase: 0,                   // 절차의 몇 번째 단계인가 (단계 쪽 범위를 나눌 때 쓴다)
  iter: 0,                    // ⏭⏭ 다음 반복 단추가 쓰는 반복 번호 (줄어들지 않는다)
  calc: { title, rows },      // 계산 상자 (없으면 바로 앞 줄의 계산을 흐리게 보여 준다)
  effects: [{ target: 'distances', op: 'append' }],   // 이 줄이 바꾼 상자 → 빛남 + 꼬리표
  ask: { q, options, answer, why },                   // 이 장면으로 넘어가기 전에 묻는 예측 퀴즈
  ds: { … },                  // 이 시점 자료구조 전체 모습 (데이터가 작아 통째로 복사)
}
```

## 데이터 이동 그리기 규칙 (FLIP)

자료구조 패널은 장면마다 통째로 다시 그려진다. `ui/flip.js`가 직전 장면의 위치를 기억했다가 움직임을 만든다.

| 속성 | 뜻 | 예 |
|---|---|---|
| `data-flip="id"` | 같은 id는 같은 데이터 — 다른 자리에 나타나면 **미끄러져 이동** | k-평균 집 칩: 대기 줄 ↔ 묶음 |
| `data-from="원본 id"` | 처음 나타나는 항목이 원본 자리에서 **복사되어 날아옴** | k-NN 표의 행 → `distances`의 튜플 |
| `data-force="1"` | 이미 있던 항목도 원본에서 다시 날아옴(값 교체) | 새 중심 → `centroids`, 평균 → `loss` |
| `data-enter="left\|right\|up\|down"` | 원본 없이 새로 생긴 항목이 들어오는 방향 | 호출 스택 칸 |

## 알고리즘을 추가할 때

1. `src/core/algorithms/<id>.js` — `meta`, `defaults`, `knobs`, `knobValue`, `normalize(params)`,
   `pseudo(params)`, `notes`, `run(params)`를 내보낸다.
2. `src/core/algorithms/index.js`의 `ALGORITHMS`·`ALGO_ORDER`에 한 줄.
3. `src/ui/views/<id>.js` — `stageTitle`, `intro`, `introBoxes`, `createPlot()`, `shapes(v)`, `legend()`,
   `extra(v)`, `data(v, { boxes })`, `targetName(t)`.
4. `src/app/lesson.js`의 `ALGO_PAGES`에 단계 쪽(`lines`, `window(f, i, frames)`, `boxes`)을 적는다.
   단계 쪽의 범위는 이어져야 하고 모두 합쳐 모든 프레임을 덮어야 한다(`lesson.test.js`가 검사).
5. `src/core/exam.js`의 `traceTables`·문제 생성기에 그 알고리즘 분을 더한다.
6. `src/app/main.js`의 `VIEWS`, `src/ui/topbar.js`의 `ALGO_ICON`에 한 줄씩.

`test/frames.test.js`가 새 알고리즘의 프레임 형식을 자동으로 검사한다.

## 테스트

```bash
npm test     # node --test test/*.test.js
```

| 파일 | 확인하는 것 |
|---|---|
| `knn.test.js` | 토마토 분류(k=1·3 과일, 5·7 단백질), d²이 모두 다른 정수, 연습용 질문점 동점 없음, distances·votes 흐름 |
| `kmeans.test.js` | 기본 시작 3회차 수렴(2회차에 집1 이동), 모든 시작 조건 수렴·동점 없음, 점이 한 곳에만 있음 |
| `linreg.test.js` | 최소제곱 참값, 학습률 0.05 수렴·0.01 단조 감소·0.1 발산, 기울기 = 수치 미분 |
| `dtree.test.js` | 뿌리 점수(지니 0.343 …), 지니·엔트로피 같은 트리, 깊이 1 트리, 스택 push/pop 짝 |
| `frames.test.js` | 모든 알고리즘·설정의 프레임 형식, 반복 번호 |
| `lesson.test.js` | 쪽 구성(문제 보기 → 단계 → 추적표 → 시험), 단계 쪽 범위가 빈틈없이 이어짐, 파이썬 없음, 탭 잇기 |
| `exam.test.js` | 모든 조건의 문제: 보기 중복 없음 · 정답 장면이 쪽 범위 안 · 파이썬 없음, 기본 조건 정답 = 손 계산, 추적표 모양, 모의시험 |
| `glossary.test.js` | 화면의 ⓘ 용어가 모두 사전에 있음 |
