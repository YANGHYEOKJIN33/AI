import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from './helpers/fakeDom.js';
import { ALGORITHMS } from '../src/core/algorithms/index.js';

installFakeDom();
const { LESSONS, EXTRAS } = await import('../src/lessons/index.js');
const loaded = [];
for (const entry of [...LESSONS, ...EXTRAS].filter((l) => l.ready)) loaded.push({ entry, lesson: (await entry.load()).lesson });

for (const { entry, lesson } of loaded) {
  test(`${entry.id}: 장면 id가 겹치지 않고, 모든 박자가 오류 없이 그려진다`, () => {
    assert.equal(new Set(lesson.scenes.map((s) => s.id)).size, lesson.scenes.length);
    for (const sc of lesson.scenes) {
      assert.ok(sc.beats >= 1, sc.id);
      for (let b = 0; b < sc.beats; b += 1) {
        const out = sc.render(b);
        assert.ok(out.main, `${sc.id}.${b}: 가운데가 비었다`);
        if (out.line) assert.ok(out.line.code && out.line.no, `${sc.id}.${b}: 지금 줄`);
      }
    }
  });
  test(`${entry.id}: 장면마다 교사 노트(설명 · 시간)`, () => {
    for (const sc of lesson.scenes) {
      assert.ok(sc.note?.say?.length > 10, `${sc.id} 설명`);
      assert.ok(sc.note.min > 0, `${sc.id} 시간`);
    }
  });
}

const lessonsOnly = loaded.filter(({ entry }) => LESSONS.includes(entry));
for (const { entry, lesson } of lessonsOnly) {
  test(`${entry.id}: 차시의 얼개 — 표지 · 목표 · 정리 · 확인 문제 3개 · 활동지 · 50분 안팎`, () => {
    const kinds = lesson.scenes.map((s) => s.kind);
    assert.equal(kinds[0], 'cover');
    assert.ok(kinds.includes('summary'));
    assert.equal(kinds.filter((k) => k === 'check').length, 3);
    assert.equal(lesson.checks.length, 3);
    assert.ok(lesson.goals.length >= 2);
    assert.ok(lesson.sheet.sections.length >= 3);
    const min = lesson.scenes.reduce((s, x) => s + x.note.min, 0);
    assert.ok(min >= 44 && min <= 52, `수업 시간 ${min}분`);
    for (const c of lesson.checks) {
      assert.equal(new Set(c.opts).size, c.opts.length, c.q);
      assert.ok(c.answer >= 0 && c.answer < c.opts.length, c.q);
    }
  });
}

test('1차시: 화면 · 활동지 · 확인 문제의 수가 엔진 계산과 같다', async () => {
  const { facts, checks, sheet } = await import('../src/lessons/knn.js');
  const run = ALGORITHMS.knn.run(ALGORITHMS.knn.defaults);
  const ds = run.frames.at(-1).ds;
  assert.deepEqual(facts.sorted.map((d) => d.d2), [2, 5, 8, 10, 13, 17, 25, 34, 41]);
  assert.deepEqual(facts.order.map((d) => d.name), ['사과', '포도', '오렌지', '당근', '오이', '셀러리', '견과류', '생선', '치즈']);
  assert.equal(facts.result, ds.result);
  assert.equal(facts.k5.label, '단백질');
  assert.equal(checks[0].opts[checks[0].answer], '생선');
  assert.equal(checks[1].opts[checks[1].answer], '{ 과일: 2, 단백질: 3 }');
  assert.equal(checks[2].opts[checks[2].answer], '(25, 채소)');
  const dist = sheet.sections[0].rows;
  assert.equal(dist.length, 9);
  assert.equal(dist[3][7].answer, '17');   // 활동 ①: 당근
  assert.deepEqual(sheet.sections[1].boxes.map((b) => b.answer).slice(0, 3), ['(2, 과일)', '(5, 단백질)', '(8, 과일)']);
});

test('1차시: 박자마다 숨기지 않은 글자가 지나치게 많지 않다(무대 250자 안팎)', async () => {
  const { lesson } = await import('../src/lessons/knn.js');
  for (const sc of lesson.scenes) {
    for (let b = 0; b < sc.beats; b += 1) {
      const out = sc.render(b);
      const main = [out.main].flat(Infinity).filter(Boolean).map((n) => n.visibleText ?? '').join('');
      assert.ok(main.length <= 330, `${sc.id}.${b}: 가운데 글자 ${main.length}자`);
    }
  }
});

test('조사: 받침에 맞춰 은/는 · 이/가 · 을/를 · 으로/로', async () => {
  const { josa } = await import('../src/core/josa.js');
  assert.equal(josa('오렌지', '은'), '오렌지는');
  assert.equal(josa('사과', '이'), '사과가');
  assert.equal(josa('단백질', '으로'), '단백질로');
  assert.equal(josa('과일', '으로'), '과일로');
  assert.equal(josa('채소', '으로'), '채소로');
  assert.equal(josa('견과류', '을'), '견과류를');
  assert.equal(josa('생선', '을'), '생선을');
  assert.equal(josa('오렌지(2)', '이'), '오렌지(2)가');
  assert.equal(josa('(34, 과일)', '이'), '(34, 과일)이');
  assert.equal(josa('(13, 단백질)', '이'), '(13, 단백질)이');
  assert.equal(josa('34', '을'), '34를');
  assert.equal(josa('13', '이'), '13이');
});

test('1차시: 화면 글에 받침과 맞지 않는 조사가 없다', async () => {
  const { lesson } = await import('../src/lessons/knn.js');
  const bad = /(오렌지|사과|포도|오이|치즈|셀러리|견과류|토마토)(은|이|을|과)[ ,.?]|(과일|단백질)으로/;
  for (const sc of lesson.scenes) {
    const texts = [sc.title, sc.note?.say, sc.note?.ask, sc.note?.expect];
    for (let b = 0; b < sc.beats; b += 1) {
      const out = sc.render(b);
      texts.push([out.main, out.cap].flat(Infinity).filter(Boolean).map((n) => (typeof n === 'string' ? n : n.textContent ?? '')).join(' '));
    }
    for (const t of texts) assert.ok(!bad.test(t ?? ''), `${sc.id}: ${(t ?? '').match(bad)?.[0]}`);
  }
});

test('사이트 틀(v4) k-NN 탭: 쪽 10개, 모든 단계가 그려지고 교사 노트가 있다', async () => {
  const { tab } = await import('../src/site/knn.js');
  assert.equal(tab.pages.length, 10);
  assert.equal(new Set(tab.pages.map((p) => p.id)).size, 10);
  for (const pg of tab.pages) {
    assert.ok(pg.title && pg.sentence && pg.sentence.length <= 40, `${pg.id} 쪽 설명은 한 문장`);
    assert.ok(pg.steps.length >= 1);
    assert.ok(pg.steps[0].note?.say, `${pg.id} 교사 노트`);
    pg.steps.forEach((st, i) => {
      if (st.left) st.left(); if (st.right) st.right(); if (st.plot) st.plot();
      assert.ok(st.right, `${pg.id} ${i + 1}단계 오른쪽 칸`);
      if (pg.code && st.on !== null) assert.ok(st.on >= pg.code[0] && st.on <= pg.code[1], `${pg.id} ${i + 1}단계 지금 줄 ${st.on}`);
    });
  }
});
