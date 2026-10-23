/**
 * ✅ 정리·확인 — 한 장 정리표, 이해 확인 문제.
 */
import { el, fill } from '../dom.js';
import { ALGO_ICON } from '../topbar.js';
import { ALGO_ORDER, getAlgorithm } from '../../core/algorithms/index.js';
import { infoTerm } from '../infoTip.js';
import { DATA_FLOW } from './mapRoom.js';
import { QUIZ } from '../../app/quiz.js';

const SUMMARY = {
  knn: {
    ds: '표 · 리스트(튜플) · 딕셔너리',
    core: 'neighbors = distances[:k]',
    care: 'k가 결과를 바꾼다 · 예측할 때마다 모든 데이터와 거리 계산',
  },
  kmeans: {
    ds: '리스트의 리스트(묶음) · 중심 리스트',
    core: 'centroids = points[:k]',
    care: '시작 중심에 따라 지역 최적 · k는 사람이 정함',
  },
  linreg: {
    ds: '리스트(열) · 변수 · 기록 리스트',
    core: 'w = w - lr * dw',
    care: '학습률이 크면 발산, 작으면 느림 · 손실 기록으로 확인',
  },
  dtree: {
    ds: '딕셔너리(세기·점수) · 묶음 리스트 · 호출 스택',
    core: 'score[A] = weighted(groups, gini)',
    care: '불순도는 작을수록 좋음 · 너무 깊으면 과대적합',
  },
};

const KEYWORDS = ['지도학습', '비지도학습', '분류', '회귀', '군집', '리스트', '딕셔너리', '스택', '유클리드 거리', '평균',
  '다수결', '중심', '수렴', '경사하강법', '학습률', '손실', '불순도', '정보 이득', '재귀', '과대적합'];

export function createSummaryRoom({ store, onGlossary }) {
  const root = el('div.troom');
  function render() {
    fill(root,
      el('div.troom__head', {},
        el('span.troom__icon', { 'aria-hidden': 'true' }, '🗂'),
        el('div.troom__titles', {}, el('h3.troom__title', {}, '네 알고리즘 한 장 정리'),
          el('p.troom__rule', {}, '표의 줄을 누르면 그 알고리즘의 ①쪽으로 돌아가요.'))),
      el('div.matrixwrap', {},
        el('table.matrix.matrix--summary', {},
          el('thead', {}, el('tr', {},
            ['알고리즘', '문제 · 학습', '핵심 자료구조', '데이터 이동', '🔑 핵심 한 줄', '⚠ 주의할 점'].map((h) => el('th', {}, h)))),
          el('tbody', {}, ALGO_ORDER.map((id) => {
            const m = getAlgorithm(id).meta;
            const s = SUMMARY[id];
            return el('tr.matrix__row', { onclick: () => store.set({ mode: 'algo', algoTab: id, algoStep: 0 }), title: `${m.name} 다시 보기` },
              el('th', {}, `${ALGO_ICON[id]} ${m.name}`),
              el('td', {}, `${m.task} · ${m.learning}`),
              el('td', {}, s.ds),
              el('td.matrix__flow', {}, DATA_FLOW[id]),
              el('td', {}, el('code', {}, s.core)),
              el('td', {}, s.care));
          })))),
      el('h3.troom__subtitle', {}, '📌 오늘 다시 본 낱말 — 누르면 뜻이 나와요'),
      el('div.keywords', {}, KEYWORDS.map((t) => infoTerm(t, { strong: true }))),
      el('h3.troom__subtitle', {}, '👉 더 해 볼 것'),
      el('div.troom__controls', {},
        el('button.pill.ctrl--primary', { type: 'button', onclick: () => store.set({ wrapStep: 1 }) }, '✅ 이해 확인 문제 풀기 →'),
        el('button.pill', { type: 'button', onclick: () => onGlossary() }, '📖 용어 사전'),
        el('button.pill', { type: 'button', onclick: () => store.set({ mode: 'tools', toolsStep: 0 }) }, '📦 도구 복습 지도'),
        el('a.pill.pill--link', { href: 'https://yanghyeokjin33.github.io/8puzzle/' }, '🧩 8-퍼즐 탐색 사이트(스택·큐 복습)')),
    );
  }
  return { node: root, render };
}

/** 정답 자리가 한쪽으로 쏠리지 않게 보기 순서를 정해진 규칙으로 돌린다 */
function arranged(q, i) {
  const n = q.options.length;
  const r = (i * 3) % n;
  const options = q.options.map((_, j) => q.options[(j + r) % n]);
  return { ...q, options, answer: (q.answer - r + n) % n };
}

export function createQuizRoom({ store }) {
  const root = el('div.troom');
  const chosen = {};
  const questions = QUIZ.map(arranged);

  function render() {
    const answered = Object.keys(chosen).length;
    const correct = questions.reduce((s, q, i) => s + (chosen[i] === q.answer ? 1 : 0), 0);
    fill(root,
      el('div.troom__head', {},
        el('span.troom__icon', { 'aria-hidden': 'true' }, '✅'),
        el('div.troom__titles', {}, el('h3.troom__title', {}, '이해 확인'),
          el('p.troom__rule', {}, `푼 문제 ${answered} / ${questions.length} · 맞힌 개수 ${correct}`)),
        el('span.topbar__spacer'),
        el('button.pill', { type: 'button', onclick: () => { for (const k of Object.keys(chosen)) delete chosen[k]; render(); } }, '↺ 다시 풀기')),
      el('div.quizlist', {}, questions.map((q, i) => {
        const pick = chosen[i];
        const done = pick !== undefined;
        return el('div.quiz__item', {},
          el('div.quiz__q', {}, `${i + 1}. ${q.q}`),
          el('div.quiz__opts', {}, q.options.map((o, j) => {
            const cls = done ? (j === q.answer ? '.quiz__opt--ok' : (j === pick ? '.quiz__opt--no' : '')) : '';
            return el(`button.pill.quiz__opt${cls}`, { type: 'button', disabled: done, onclick: () => { chosen[i] = j; render(); } }, o);
          })),
          done ? el('div.quiz__why', {},
            (pick === q.answer ? '✓ 맞았어요! ' : '✗ 다시 볼까요 — ') + q.why,
            q.algo && pick !== q.answer ? el('button.linkbtn', { type: 'button', onclick: () => store.set({ mode: 'algo', algoTab: q.algo, algoStep: 1 }) },
              ` → ${getAlgorithm(q.algo).meta.name} 다시 밟아 보기`) : null) : null);
      })),
      answered === questions.length ? el('div.troom__msg.troom__msg--ok', {},
        correct === questions.length ? `🎉 ${correct}문제 모두 맞혔어요! 네 알고리즘을 자료구조로 설명할 수 있어요.`
          : `${questions.length}문제 중 ${correct}개 맞혔어요. 틀린 문제의 "다시 밟아 보기"로 그 장면을 확인해 보세요.`) : null,
    );
  }
  return { node: root, render };
}
