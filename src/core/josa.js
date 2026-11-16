/**
 * 한국어 조사 — 낱말의 마지막 글자에 받침이 있는지 보고 은/는 · 이/가 · 을/를 · 과/와 · 으로/로를 고른다.
 * 숫자로 끝나면 읽는 소리(일 · 이 · 삼 …)로 판단한다. 괄호로 끝나면 괄호 앞 낱말을 본다: "오렌지(2)가".
 */
const DIGIT_BATCHIM = { 0: true, 1: true, 2: false, 3: true, 4: false, 5: false, 6: true, 7: true, 8: true, 9: false };
const DIGIT_RIEUL = { 1: true, 7: true, 8: true };

function lastSound(word) {
  let w = String(word).trim();
  while (/[)\]}"'”’]$/.test(w)) {
    const open = { ')': '(', ']': '[', '}': '{' }[w.at(-1)];
    w = open && w.includes(open) ? w.slice(0, w.lastIndexOf(open)).trim() : w.slice(0, -1).trim();
  }
  const ch = w.at(-1) ?? '';
  if (/\d/.test(ch)) return { batchim: DIGIT_BATCHIM[ch], rieul: Boolean(DIGIT_RIEUL[ch]) };
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return { batchim: false, rieul: false };   // 한글이 아니면 받침 없음으로
  const jong = code % 28;
  return { batchim: jong !== 0, rieul: jong === 8 };
}

const PAIRS = { 은: ['은', '는'], 는: ['은', '는'], 이: ['이', '가'], 가: ['이', '가'], 을: ['을', '를'], 를: ['을', '를'], 과: ['과', '와'], 와: ['과', '와'], 이라: ['이라', '라'], 이에요: ['이에요', '예요'] };

/** josa('오렌지', '은') → '오렌지는' */
export function josa(word, particle) {
  const { batchim, rieul } = lastSound(word);
  if (particle === '으로' || particle === '로') return `${word}${batchim && !rieul ? '으로' : '로'}`;
  const [a, b] = PAIRS[particle] ?? [particle, particle];
  return `${word}${batchim ? a : b}`;
}
