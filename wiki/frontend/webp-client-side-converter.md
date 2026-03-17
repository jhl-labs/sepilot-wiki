---
title: 클라이언트‑사이드 WebP 변환기 구현 가이드
author: SEPilot AI
status: published
tags: [WebP, 클라이언트‑사이드, 이미지 변환, Next.js, Vercel, Canvas, Web Worker]
redirect_from:
  - frontend-webp
---

## 1. 소개
이 문서는 **브라우저만을 이용해 이미지 파일을 WebP 포맷으로 변환**하는 방법을 단계별로 안내합니다.  
대상 독자는  
- 프론트엔드 개발자 (Next.js, Vercel 경험자)  
- 이미지 최적화·프라이버시를 중시하는 프로젝트 담당자  

### 왜 클라이언트‑사이드 WebP 변환기가 필요한가?
- **프라이버시**: 이미지가 로컬에 머무르며 외부 서버에 전송되지 않음 (“프라이버시: 이미지가 당신의 기기에 그대로 남습니다. 끝.” [euno.news](https://euno.news/posts/ko/i-built-a-100-client-side-webp-converter-because-i-f9c153))  
- **속도**: 업로드·다운로드 지연이 없고, 로컬 CPU 성능에 비례해 즉시 변환 가능 (동일 출처)  
- **비용 절감**: 서버 인프라·스토리지 비용이 사라짐 (동일 출처)  

---

## 2. 클라이언트‑사이드 변환이 왜 좋은가?
| 장점 | 설명 |
|------|------|
| 데이터 유출 방지 | 파일은 브라우저 메모리 내에서만 처리되므로 외부에 노출되지 않음 |
| 네트워크 부하 감소 | 업로드·다운로드 트래픽이 사라져 모바일 환경에서도 빠름 |
| 서버 비용 최소화 | 변환 로직이 클라이언트에 존재하므로 백엔드 비용이 0에 가깝다 |
| 오프라인·PWA 활용 | Service Worker와 결합해 네트워크 없이도 변환 가능 (추가 조사 필요) |

---

## 3. 사전 준비
| 항목 | 권장 사양 / 도구 |
|------|-------------------|
| 지원 브라우저 | Chrome ≥ 76, Edge ≥ 79, Firefox ≥ 68 (WebP 지원) [Google WebP Docs](https://developers.google.com/speed/webp/docs/using?hl=ko) |
| Node.js | LTS 버전 (예: 18.x) |
| 패키지 매니저 | npm 또는 yarn |
| Git | 버전 관리 |
| 선택적 | VS Code, ESLint, Prettier (코드 품질 관리) |
| 프로젝트 초기화 | `npx create-next-app@latest webp-converter` 로 Next.js 템플릿 생성 (euno.news에서 사용한 스택) |

---

## 4. 전체 아키텍처 개요
```
+-------------------+        +-------------------+        +-------------------+
| UI 레이어         |  <---> | 변환 엔진 (Canvas) |  <---> | 워커 레이어       |
| - 파일 입력      |        | - drawImage()    |        | - Web Worker     |
| - 옵션 UI        |        | - toBlob()/      |        | - OffscreenCanvas|
+-------------------+        |   convertToBlob()|        +-------------------+
                               +-------------------+
                                      |
                                      v
                               +-------------------+
                               | 결과 처리        |
                               | - Blob URL       |
                               | - 다운로드/클립보드 |
                               +-------------------+
```
- **UI 레이어**: 파일 선택·드래그·드롭·클립보드 입력 UI  
- **변환 엔진**: `<canvas>` 혹은 `OffscreenCanvas`에 이미지 그린 뒤 `toBlob` 으로 WebP 생성  
- **워커 레이어**: 메인 스레드 차단 방지를 위해 변환 로직을 Web Worker 안에서 실행  
- **결과 처리**: `URL.createObjectURL(blob)` 로 다운로드 링크 제공, 필요 시 클립보드 복사  

---

## 5. 핵심 변환 로직 구현
### 5.1 이미지 로드
```javascript
function loadFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}
```
- `URL.createObjectURL` 은 로컬 파일을 메모리 URL 로 변환해 CORS 문제를 회피함 (브라우저 기본 동작).

### 5.2 Canvas에 그리기·해상도 조정
```javascript
function drawToCanvas(img, maxWidth = 1920) {
  const scale = Math.min(1, maxWidth / img.width);
  const width = img.width * scale;
  const height = img.height * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}
```
- 필요 시 `maxWidth` 로 다운스케일을 적용해 메모리 사용량을 절감.

### 5.3 WebP Blob 생성
```javascript
function canvasToWebP(canvas, quality = 0.8, lossless = false) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/webp',
      quality
    );
  });
}
```
- `toBlob` 의 세 번째 인자는 **quality** (0~1)이며, `lossless` 옵션은 현재 표준 `toBlob` 에서는 지원되지 않음.  
- `OffscreenCanvas.convertToBlob()` 도 동일 방식으로 사용 가능 (지원 브라우저 확인 필요) [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/convertToBlob).

### 5.4 옵션 전달 (예: 압축 정도)
- SightStudio 블로그에 따르면 WebP 압축 정도는 `0~6` (cwebp 의 `-m` 옵션) [SightStudio](https://sightstudio.tistory.com/57).  
- 브라우저 API에서는 `quality` (0~1) 로 매핑해 사용할 수 있음.  

---

## 6. 사용자 입력 처리
| 입력 방식 | 구현 포인트 |
|-----------|-------------|
| 파일 선택 (`<input type="file">`) | `multiple` 속성으로 다중 선택 지원 |
| Drag‑&‑Drop | `dragover`·`drop` 이벤트에서 `event.dataTransfer.files` 사용 |
| 클립보드 붙여넣기 | `paste` 이벤트에서 `event.clipboardData.files` 확인 |
| 배치 변환 흐름 | 파일 리스트를 순차 혹은 병렬(Worker 풀)로 처리, 진행 상태 UI 제공 |

예시 UI 마크업 (코드 블록 없이):
```html
<label for="fileInput">이미지 선택</label>
<input id="fileInput" type="file" accept="image/*" multiple>
<div id="dropZone">여기에 파일을 끌어다 놓으세요</div>
<button id="convertAll">전체 변환</button>
<ul id="resultList"></ul>
```

---

## 7. 성능 최적화
### 7.1 Web Worker 활용
```javascript
// main.js
const worker = new Worker(new URL('./converterWorker.js', import.meta.url));
worker.postMessage({file, options});
worker.onmessage = (e) => {
  const {blob, fileName} = e.data;
  // 다운로드 링크 생성
};
```
```javascript
// converterWorker.js
self.onmessage = async (e) => {
  const {file, options} = e.data;
  const img = await loadFile(file);
  const canvas = drawToCanvas(img, options.maxWidth);
  const blob = await canvasToWebP(canvas, options.quality);
  self.postMessage({blob, fileName: file.name});
};
```
- 메인 스레드가 UI 응답성을 유지하면서 변환을 수행함.

### 7.2 OffscreenCanvas
- `OffscreenCanvas` 는 Worker 내부에서 직접 렌더링 가능해 메인 스레드와의 복사 비용을 감소시킴.  
- 현재 Chrome·Edge에서 지원, Safari는 아직 미지원 [MDN OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) → **Safari fallback 필요** (FAQ 참고).

### 7.3 메모리 관리
- `URL.revokeObjectURL` 으로 사용 후 Blob URL 해제  
- 변환이 끝난 `ImageBitmap`·`Canvas` 객체는 `null` 로 할당해 가비지 컬렉션 유도  

---

## 8. 브라우저 호환성 및 폴리필
### 8.1 WebP 지원 탐지
```javascript
function supportsWebP() {
  return HTMLCanvasElement.prototype.toBlob
    ? new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.toBlob((blob) => {
          resolve(blob && blob.type === 'image/webp');
        }, 'image/webp');
      })
    : Promise.resolve(false);
}
```
- 지원되지 않을 경우 JPEG/PNG 로 fallback (예: `canvas.toDataURL('image/png')`).

### 8.2 주요 폴리필
| 기능 | 폴리필 | 사용 방법 |
|------|--------|-----------|
| `canvas.toBlob` | `canvas-toBlob` (GitHub) | 스크립트 로드 후 기존 API 사용 가능 |
| `OffscreenCanvas` | `offscreen-canvas-polyfill` | Worker 내부에서 `new OffscreenCanvas(width, height)` 로 대체 |

---

## 9. 보안·프라이버시 고려사항
- **로컬 파일 접근**: `FileReader`·`URL.createObjectURL` 은 사용자가 직접 선택한 파일만 접근 가능하므로 보안 위험이 낮음.  
- **CORS**: 외부 URL 로부터 이미지를 로드할 경우 `crossOrigin="anonymous"` 를 설정하고, 서버가 `Access-Control-Allow-Origin:*` 헤더를 제공해야 함.  
- **데이터 유출 방지**: 변환 결과는 메모리 Blob 형태로만 제공하고, 서버 전송 로직을 구현하지 않음.  

---

## 10. 배포 및 운영
1. **Vercel에 배포**  
   ```bash
   git push vercel main
   ```  
   - Vercel은 Next.js 프로젝트를 자동으로 빌드·배포함 (euno.news에서 사용한 스택).  
2. **정적 파일·SSR·CSR 구분**  
   - 변환 로직은 **CSR**(Client‑Side Rendering) 로 구현해 서버 부하를 완전히 배제.  
3. **CDN 캐시·헤더**  
   - 정적 UI 파일에 `Cache-Control: public, max-age=31536000` 설정 권장 (Vercel 기본).  
   - 변환 API 엔드포인트가 없으므로 별도 헤더 설정은 필요 없음.  

---

## 11. 테스트·디버깅
| 테스트 종류 | 도구 | 포인트 |
|-------------|------|--------|
| 유닛 테스트 | Jest + jsdom | `loadFile`, `drawToCanvas`, `canvasToWebP` 함수 검증 |
| 브라우저 성능 | Chrome DevTools → Performance | 워커 실행 시간, 메인 스레드 차단 여부 확인 |
| E2E 테스트 | Cypress | 파일 선택 → 변환 → 다운로드 흐름 자동 검증 |

예시 Jest 테스트 (코드 블록 없이):
```javascript
test('drawToCanvas scales down large image', () => {
  const img = new Image();
  img.width = 4000;
  img.height = 3000;
  const canvas = drawToCanvas(img, 2000);
  expect(canvas.width).toBeLessThanOrEqual(2000);
});
```

---

## 12. 확장·커스터마이징
- **다중 포맷 지원**: `canvas.toBlob(..., 'image/avif')` 혹은 `image/jpeg` 로 확장 가능 (브라우저 지원 여부 확인).  
- **플러그인 구조**: 변환 옵션을 플러그인 형태로 등록해 `registerConverter('avif', fn)` 과 같이 사용.  
- **서버‑사이드 API 연동**: 필요 시 변환된 Blob을 `fetch` 로 전송해 백업 저장 혹은 추가 처리 가능 (추가 조사 필요).  

---

## 13. 접근성(Accessibility)
- **키보드**: `<input>` 과 버튼에 `tabindex` 기본 제공, 드래그·드롭 영역에도 `role="button"` 과 `aria-label="이미지 파일 드래그·드롭"` 부여.  
- **스크린리더**: 변환 진행 상태를 `aria-live="polite"` 로 알리며, 완료 시 `aria-live="assertive"` 로 성공 메시지 전달.  

---

## 14. FAQ
**Q1. 대용량 이미지가 느려요**  
A. 이미지 다운스케일(`maxWidth`)을 적용하고, 워커 풀을 사용해 병렬 처리한다. 메모리 부족 시 `URL.revokeObjectURL` 로 즉시 해제한다.

**Q2. Safari에서 WebP가 안 돼요**  
A. Safari는 아직 `OffscreenCanvas` 와 `canvas.toBlob('image/webp')` 를 완전 지원하지 않는다. `supportsWebP()` 결과가 `false` 일 때 PNG/JPEG fallback을 제공한다.

**Q3. Web Worker가 안 동작해요**  
A. 로컬 파일을 Worker 로 직접 전달하면 `File` 객체가 직렬화되지 않을 수 있다. `ArrayBuffer` 로 변환하거나, 메인 스레드에서 `loadFile` 후 `ImageBitmap` 을 `postMessage` 로 전달한다.

---

## 15. 참고 자료·링크
- **WebPit 프로젝트 소개** – euno.news 기사 [euno.news](https://euno.news/posts/ko/i-built-a-100-client-side-webp-converter-because-i-f9c153)  
- **Google WebP 공식 문서** [WebP 사용 가이드](https://developers.google.com/speed/webp/docs/using?hl=ko)  
- **MDN Canvas API** [CanvasRenderingContext2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)  
- **MDN OffscreenCanvas** [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)  
- **SightStudio 블로그 – WebP 압축 옵션** [sightstudio.tistory.com/57](https://sightstudio.tistory.com/57)  
- **Vercel 배포 가이드** [Next.js on Vercel](https://vercel.com/docs/concepts/deployments/overview)  

*본 가이드는 제공된 자료에 근거하여 작성되었으며, 최신 브라우저 API 변화에 따라 일부 내용은 추가 조사가 필요할 수 있습니다.*