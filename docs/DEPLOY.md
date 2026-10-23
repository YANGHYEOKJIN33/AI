# 배포 안내 — GitHub Pages

서버 없이 **GitHub Pages**로 게시한다(8-퍼즐 사이트와 같은 방식).
`main` 브랜치에 push(또는 병합)하면 `.github/workflows/deploy.yml`이 저장소 내용을 그대로 사이트로 올린다.

## 사이트 주소

```
https://yanghyeokjin33.github.io/Fundamentals-of-AI/
```

## 처음 한 번

1. 개발 브랜치를 `main`에 병합한다 (저장소에 `main`이 없다면 개발 브랜치에서 `main`을 만든다).
2. 워크플로의 `configure-pages` 단계에 `enablement: true`를 주었기 때문에 보통은 Pages가 자동으로 켜진다.
3. 아래 오류로 실패하면 저장소 소유자가 한 번만 직접 켠다.

   ```
   Error: Get Pages site failed. Please verify that the repository has Pages enabled ...
   ```

   GitHub 저장소 → **Settings** → **Pages** → **Build and deployment · Source**를 **GitHub Actions**로 →
   Actions 탭에서 실패한 워크플로를 **Re-run**.

## 수동으로 배포할 때

저장소 → **Actions** → **Deploy to GitHub Pages** → **Run workflow**

## 배포가 안 될 때

| 증상 | 확인 |
|---|---|
| Actions가 실패한다 | Settings → Pages의 Source가 **GitHub Actions**인지 |
| 화면이 하얗다 | 브라우저 개발자 도구 콘솔에서 모듈 경로 오류 확인 |
| CSS가 안 먹는다 | 경로가 `./src/...` 상대 경로인지 (절대 경로 `/src/...`는 저장소 이름 때문에 깨진다) |
| 파일이 안 올라간다 | 저장소 뿌리에 `.nojekyll`이 있는지 |

테스트(`.github/workflows/test.yml`)는 모든 브랜치 push와 PR에서 돈다.
