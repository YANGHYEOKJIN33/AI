/**
 * 수업 화면의 진행 — 장면(scene)과 박자(beat)를 앞뒤로 넘긴다. 화면을 모르는 순수 로직(테스트 대상).
 *
 *   장면 = 화면 한 장. 박자 = 그 장면 안에서 →를 한 번 누를 때마다 일어나는 변화 하나.
 *   "한 번 누르면 한 가지만 바뀐다"를 지키려고, 의사코드 한 줄도 줄 → 계산 → 이동으로 박자를 나눈다.
 */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const beatsOf = (scene) => Math.max(1, scene?.beats ?? 1);

/** 박자를 모두 이은 번호(0부터)와 전체 박자 수 — 진행 막대가 쓴다 */
export function flatIndex(scenes, pos) {
  let n = 0;
  for (let i = 0; i < pos.scene; i += 1) n += beatsOf(scenes[i]);
  return n + pos.beat;
}
export const totalBeats = (scenes) => scenes.reduce((s, sc) => s + beatsOf(sc), 0);

/** 주소 뒤에 붙는 위치: #12 = 12번째 장면의 처음, #12.3 = 12번째 장면의 세 번째 박자 */
export function toHash(pos) {
  return `#${pos.scene + 1}${pos.beat > 0 ? `.${pos.beat + 1}` : ''}`;
}
export function fromHash(hash, scenes) {
  const m = /^#?(\d+)(?:\.(\d+))?$/.exec(hash ?? '');
  if (!m) return null;
  const scene = Number(m[1]) - 1;
  if (scene < 0 || scene >= scenes.length) return null;
  const beat = clamp((Number(m[2] ?? 1) || 1) - 1, 0, beatsOf(scenes[scene]) - 1);
  return { scene, beat };
}

export function createDeck(scenes, start = null) {
  if (!scenes.length) throw new Error('장면이 없습니다');
  let scene = clamp(start?.scene ?? 0, 0, scenes.length - 1);
  let beat = clamp(start?.beat ?? 0, 0, beatsOf(scenes[scene]) - 1);
  const listeners = new Set();

  const pos = () => ({
    scene, beat, id: scenes[scene].id, beats: beatsOf(scenes[scene]),
    atStart: scene === 0 && beat === 0,
    atEnd: scene === scenes.length - 1 && beat === beatsOf(scenes[scene]) - 1,
  });

  function set(nextScene, nextBeat, how) {
    const before = pos();
    scene = clamp(nextScene, 0, scenes.length - 1);
    beat = clamp(nextBeat, 0, beatsOf(scenes[scene]) - 1);
    const now = pos();
    if (now.scene === before.scene && now.beat === before.beat && how !== 'replay') return now;
    for (const fn of listeners) fn(now, before, how);
    return now;
  }

  return {
    scenes,
    pos,
    /** 한 박자 앞으로 — 장면의 마지막 박자였으면 다음 장면의 처음으로 */
    next() {
      if (beat < beatsOf(scenes[scene]) - 1) return set(scene, beat + 1, 'next');
      return scene < scenes.length - 1 ? set(scene + 1, 0, 'next') : pos();   // 마지막 박자에서는 그대로
    },
    /** 한 박자 뒤로 — 장면의 처음이었으면 앞 장면의 마지막 모습으로 */
    prev() { return beat > 0 ? set(scene, beat - 1, 'prev') : (scene > 0 ? set(scene - 1, beatsOf(scenes[scene - 1]) - 1, 'prev') : pos()); },
    /** 장면 단위로 건너뛴다 */
    nextScene() { return scene < scenes.length - 1 ? set(scene + 1, 0, 'jump') : pos(); },
    prevScene() { return beat > 0 ? set(scene, 0, 'jump') : set(scene - 1, 0, 'jump'); },
    /** 장면 번호(0부터)로 간다. beat: 숫자 또는 'last' */
    goTo(s, b = 0) {
      const target = clamp(s, 0, scenes.length - 1);
      return set(target, b === 'last' ? beatsOf(scenes[target]) - 1 : b, 'jump');
    },
    first() { return set(0, 0, 'jump'); },
    last() { return set(scenes.length - 1, beatsOf(scenes[scenes.length - 1]) - 1, 'jump'); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
