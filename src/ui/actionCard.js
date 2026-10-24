/**
 * 동작 카드 — 지금 컴퓨터가 무엇을 하는지 아이콘 + 정확한 용어 + 쉬운 한 문장으로 알려 준다.
 * 오른쪽에는 예측 퀴즈(coach)가 붙는다.
 */
import { el, fill } from './dom.js';

/** 동작 → 아이콘 · 낱말 · 영어 · 쉬운 말 */
export const ACTION_VIS = {
  new:       { icon: '🆕', word: '만들기',     term: 'create',     plain: '빈 자료구조를 하나 만들어요.' },
  loop:      { icon: '🔁', word: '반복',       term: 'loop',       plain: '같은 일을 데이터마다(또는 정해진 횟수만큼) 되풀이해요.' },
  measure:   { icon: '📏', word: '거리 재기',   term: 'distance',   plain: '두 점 사이의 거리를 계산해요.' },
  append:    { icon: '📥', word: '추가',       term: 'append',     plain: '리스트 맨 뒤에 한 칸을 붙여요.' },
  sort:      { icon: '🔃', word: '정렬',       term: 'sort',       plain: '작은 값이 앞으로 오도록 순서를 다시 세워요.' },
  slice:     { icon: '✂', word: '자르기',     term: 'slice [:k]', plain: '리스트의 앞에서 k개만 잘라 와요.' },
  count:     { icon: '🗳', word: '세기',       term: 'count',      plain: '딕셔너리의 그 레이블 칸에 1을 더해요.' },
  result:    { icon: '🏆', word: '결과',       term: 'return',     plain: '알고리즘이 답을 돌려줘요.' },
  init:      { icon: '🚩', word: '시작값',     term: 'initialize', plain: '처음 값을 정하고 출발해요.' },
  reset:     { icon: '🧺', word: '묶음 비우기', term: 'reset',      plain: '묶음을 비워 점들을 대기 줄로 돌려보내요.' },
  nearest:   { icon: '🧭', word: '가장 가까운 중심', term: 'nearest', plain: '중심마다 거리를 재서 가장 가까운 것을 골라요.' },
  assign:    { icon: '📦', word: '할당',       term: 'assign',     plain: '점을 그 묶음 리스트에 넣어요.' },
  mean:      { icon: '➗', word: '평균',       term: 'mean',       plain: '묶음마다 점들의 평균을 내요.' },
  check:     { icon: '⚖', word: '비교',       term: 'compare',    plain: '새 값과 지금 값이 같은지 비교해요.' },
  converged: { icon: '✅', word: '수렴',       term: 'converged',  plain: '더 바뀌지 않아요. 여기서 멈춰요!' },
  update:    { icon: '🔁', word: '갱신',       term: 'update',     plain: '변수를 새 값으로 바꿔요.' },
  predict:   { icon: '📈', word: '예측',       term: 'predict',    plain: '지금 직선으로 예측값을 계산해요.' },
  error:     { icon: '↕', word: '오차',       term: 'error',      plain: '예측과 실제의 차이를 구해요.' },
  loss:      { icon: '🎯', word: '손실',       term: 'loss · MSE', plain: '오차를 제곱해 평균 내요 — 얼마나 틀렸는지를 한 숫자로.' },
  gradient:  { icon: '⛰', word: '기울기',     term: 'gradient',   plain: '손실을 줄이려면 w·b를 어느 쪽으로 옮길지 구해요.' },
  record:    { icon: '📝', word: '기록',       term: 'append',     plain: '손실을 기록 리스트에 붙여요.' },
  diverge:   { icon: '💥', word: '발산',       term: 'diverge',    plain: '손실이 점점 커져요 — 학습률이 너무 커요.' },
  call:      { icon: '📞', word: '함수 호출',   term: 'call · push', plain: '함수를 부르면 호출 스택에 한 칸이 쌓여요.' },
  leaf:      { icon: '🍃', word: '잎 노드',    term: 'leaf',       plain: '더 나누지 않고 답(레이블)을 정해요.' },
  split:     { icon: '✂', word: '나누기',     term: 'split',      plain: '특징의 값에 따라 데이터를 묶음으로 나눠요.' },
  score:     { icon: '🧮', word: '불순도 점수', term: 'impurity',   plain: '나눈 묶음들이 얼마나 섞였는지 재요.' },
  choose:    { icon: '🏅', word: '가장 좋은 질문', term: 'argmin',  plain: '점수가 가장 작은 특징을 골라요.' },
  node:      { icon: '🌳', word: '질문 노드',  term: 'node',       plain: '트리에 질문 노드를 달아요.' },
  branch:    { icon: '↘', word: '가지',       term: 'branch',     plain: '값마다 가지를 뻗어 다시 트리를 만들러 가요.' },
  return:    { icon: '↩', word: '돌려주기',    term: 'return · pop', plain: '함수가 끝나 호출 스택에서 한 칸 빠져요.' },
};

export function mountActionCard(root, store, player, coach) {
  const card = el('div.action-slot');
  fill(root, card, coach);

  function draw() {
    const v = player.view();
    if (v.empty) {
      fill(card, el('div.action-card.action-card--intro', {},
        el('div.action-card__icon', { 'aria-hidden': 'true' }, '🔎'),
        el('div.action-card__body', {},
          el('div.action-card__plain', {}, '⏭ 한 단계를 누르면 무슨 일이 생기는지 여기에 알려 줄게요.'))));
      return;
    }
    // 한 줄로 — 무엇을 했나(낱말) + 이 장면에서 실제로 일어난 일. 일반 설명은 마우스를 올리면 보인다.
    const vis = ACTION_VIS[v.frame.action] ?? { icon: '•', word: '진행', plain: '' };
    fill(card, el('div.action-card', { 'data-action': v.frame.action, title: vis.plain },
      el('div.action-card__icon', { 'aria-hidden': 'true' }, vis.icon),
      el('div.action-card__body', {},
        el('span.action-card__word', {}, vis.word),
        el('span.action-card__detail', {}, v.frame.narration))));
  }
  player.subscribe(draw);
}
