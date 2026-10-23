/**
 * 단계 기록기 — 알고리즘이 "의사코드 한 줄을 실행할 때마다 자료구조가 어떤 모습이었는지"를
 * 목록(frames)으로 남긴다. 화면은 이 목록을 앞뒤로 오가며 그리기만 한다(되감기가 쉬워진다).
 *
 * 8-퍼즐 사이트는 OPEN이 수천 개까지 자라 델타만 담았지만, 여기 예제 데이터는
 * 손으로 검산할 만큼 작다. 그래서 프레임마다 자료구조 전체 모습(ds)을 통째로 복사해 담는다.
 *
 * 한 프레임(frame)의 생김새
 *   {
 *     line      : 강조할 의사코드 줄 번호 (1부터)
 *     action    : 동작 이름 — 동작 카드의 아이콘·낱말을 정한다
 *     narration : 학생에게 보여 줄 한 문장 설명
 *     phase     : ①쪽 복습 카드의 몇 번째 절차인가 (0부터)
 *     iter      : 몇 번째 반복인가 — "⏭⏭ 다음 반복" 단추가 쓴다
 *     calc      : 계산 상자 { title, rows: [문자열] } 또는 null
 *     effects   : 이 줄이 바꾼 자료구조 [{ target, op }] — 그 상자가 빛나고 꼬리표가 붙는다
 *     ask       : 예측 퀴즈 { q, options, answer, why } — 이 프레임으로 넘어가기 "전에" 묻는다
 *     ds        : 이 시점의 자료구조 전체 모습 (알고리즘마다 모양이 다르다)
 *   }
 */

const clone = typeof structuredClone === 'function'
  ? structuredClone
  : (v) => JSON.parse(JSON.stringify(v));

export class Recorder {
  constructor() {
    this.frames = [];
  }

  frame({ line, action, narration, phase = 0, iter = 0, calc = null, effects = [], ask = null, ds }) {
    this.frames.push({ line, action, narration, phase, iter, calc, effects, ask, ds: clone(ds) });
  }
}

/** 다음 반복이 시작되는 프레임 번호 (없으면 마지막 프레임) */
export function nextIterIndex(frames, index) {
  const cur = frames[index]?.iter ?? 0;
  for (let i = index + 1; i < frames.length; i += 1) {
    if (frames[i].iter > cur) return i;
  }
  return frames.length - 1;
}
