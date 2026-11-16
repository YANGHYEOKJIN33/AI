/**
 * 게시 정보 — 공개 주소에 올라간 버전과 날짜를 화면 아래에 보여 준다.
 * version.json은 게시할 때(.github/workflows/deploy.yml) 만들어진다. 내 컴퓨터에서 열면 없으므로 "개발 중"으로 보인다.
 */
const slot = document.getElementById('site-version');
const local = ['localhost', '127.0.0.1', ''].includes(location.hostname);
if (slot && local) slot.textContent = '· 개발 중(게시 전)';
else if (slot) {
  fetch('./version.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((v) => { slot.textContent = v ? `· 게시 ${v.date} (${v.commit})` : '· 개발 중(게시 전)'; })
    .catch(() => { slot.textContent = '· 개발 중(게시 전)'; });
}
