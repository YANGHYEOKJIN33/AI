/**
 * 재생기 — 단계 기록(frames)을 한 장면씩 넘겨 보는 장치. (8-퍼즐 사이트의 player.js와 같은 역할)
 *
 *  처음으로 / 뒤로 / 재생·일시정지 / 한 단계 / 다음 반복 / 끝까지
 *  예측 퀴즈가 걸린 장면 앞에서는 자동 재생을 멈춰 학생이 먼저 맞혀 보게 한다.
 *
 * 화면 부품은 player.subscribe(fn)로 장면이 바뀔 때마다 view를 받아 자기 패널만 다시 그린다.
 */
import { getAlgorithm, normalizeParams } from '../core/algorithms/index.js';
import { nextIterIndex } from '../core/trace.js';
import { SPEEDS } from './state.js';

export function createPlayer(store) {
  let algoId = null;
  let run = null;       // { frames, data, result, params }
  let index = 0;
  let timer = null;
  let loadSeq = 0;      // 다시 실을 때마다 늘어 — 화면이 "새 실행"인지 알 수 있다
  let hold = () => false;
  let lo = 0;           // 이 쪽에서 재생할 장면 범위 [lo, hi]
  let hi = 0;
  const listeners = new Set();

  function view() {
    if (!run) return { empty: true };
    const frame = run.frames[index];
    return {
      empty: false,
      algoId,
      algo: getAlgorithm(algoId),
      frames: run.frames,
      frame,
      prev: index > 0 ? run.frames[index - 1] : null,
      next: index < hi ? run.frames[index + 1] : null,
      ds: frame.ds,
      data: run.data,
      result: run.result,
      params: run.params,
      index,
      total: run.frames.length,
      lo,
      hi,
      atStart: index <= lo,
      atEnd: index >= hi,
      playing: timer !== null,
      loadSeq,
    };
  }

  function emit() {
    const v = view();
    for (const fn of listeners) fn(v);
  }

  function goTo(target) {
    if (!run) return;
    index = Math.max(lo, Math.min(hi, target));
    emit();
  }

  function pause() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
      emit();
    }
  }

  function tick() {
    if (!run || index >= hi) { pause(); return; }
    // 다음 장면에 예측 퀴즈가 있고 아직 안 풀었으면 멈춰서 기다린다
    if (hold(index + 1)) { pause(); return; }
    index += 1;
    emit();
  }

  function play() {
    if (!run || timer !== null) return;
    if (index >= hi) index = lo;   // 끝에서 재생하면 이 쪽의 처음부터
    const speed = SPEEDS.find((s) => s.id === store.get().speedId) ?? SPEEDS[1];
    timer = setInterval(tick, speed.ms);
    emit();
  }

  return {
    /** 지금 store의 알고리즘·설정으로 다시 돌려 싣는다 */
    load(id = store.get().algoTab) {
      const wasPlaying = timer !== null;
      pause();
      algoId = id;
      const params = normalizeParams(id, store.get().params[id]);
      run = getAlgorithm(id).run(params);
      index = 0;
      lo = 0;
      hi = run.frames.length - 1;
      loadSeq += 1;
      emit();
      if (wasPlaying) play();
      return run;
    },

    /** 같은 설정이라면 지금 위치를 지킨 채 둔다(쪽만 바꿀 때) */
    ensure(id) {
      if (algoId !== id || !run) this.load(id);
    },

    /** 이 쪽에서 오갈 장면 범위를 정하고 그 처음으로 간다 */
    setWindow(a, b, { keep = false } = {}) {
      if (!run) return;
      pause();
      lo = Math.max(0, Math.min(a, run.frames.length - 1));
      hi = Math.max(lo, Math.min(b, run.frames.length - 1));
      index = keep ? Math.max(lo, Math.min(hi, index)) : lo;
      emit();
    },
    frames() { return run ? run.frames : []; },

    step(dir) { pause(); goTo(index + (dir < 0 ? -1 : 1)); },
    reset() { pause(); goTo(lo); },
    toEnd() { pause(); goTo(hi); },
    nextIter() { pause(); if (run) goTo(Math.min(hi, nextIterIndex(run.frames, index))); },
    goTo(i) { pause(); goTo(i); },
    play,
    pause,
    toggle() { if (timer !== null) pause(); else play(); },
    /** 속도를 바꾸면 재생 중인 타이머도 새 속도로 */
    restartTimer() { if (timer !== null) { clearInterval(timer); timer = null; play(); } },

    /** 예측 퀴즈가 자동 재생을 멈출지 정하는 함수를 단다 */
    setHold(fn) { hold = fn; },

    view,
    subscribe(fn) {
      listeners.add(fn);
      fn(view());
      return () => listeners.delete(fn);
    },
  };
}
