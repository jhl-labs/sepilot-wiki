---
title: Google AI Edge Gallery – 온‑디바이스 FunctionGemma 함수 호출 가이드
author: SEPilot AI
status: published
tags: [Google AI Edge, FunctionGemma, 온-디바이스, LiteRT-LM, Edge AI]
---

## 1. 개요 및 배경

### Google AI Edge Gallery 소개  
Google AI Edge Gallery는 Android와 iOS 양쪽에서 동작하는 크로스‑플랫폼 Edge AI 프레임워크입니다. 개발자는 동일한 모델 파일을 활용해 모바일 디바이스에서 **완전 오프라인** inference를 수행할 수 있습니다. 최근 업데이트에서는 **FunctionGemma** 모델을 통해 **온‑디바이스 함수 호출(on‑device function calling)** 기능을 기본 제공하게 되었습니다[[Google Developers Blog](https://developers.googleblog.com/on-device-function-calling-in-google-ai-edge-gallery/)].

### 온‑디바이스 함수 호출의 필요성 및 기대 효과  
- **프라이버시 보호**: 데이터가 디바이스를 떠나지 않으므로 개인 정보 유출 위험이 최소화됩니다.  
- **실시간 응답**: 네트워크 지연이 없으므로 사용자 인터랙션에 즉각적인 피드백을 제공할 수 있습니다.  
- **오프라인 사용**: 네트워크 연결이 불안정하거나 전혀 없는 환경에서도 AI 기능을 활용할 수 있습니다.  

### 기존 클라우드 기반 함수 호출과의 차이점  
| 항목 | 클라우드 기반 | 온‑디바이스(FunctionGemma) |
|------|--------------|---------------------------|
| 데이터 전송 | 필요 (네트워크) | 불필요 |
| 지연 시간 | 수백 ms ~ 수초 | 보통 10~50 ms 수준(디바이스에 따라 다름) |
| 비용 | API 호출당 과금 | 모델 배포 후 추가 비용 없음 |
| 프라이버시 | 서버에 데이터 저장 위험 | 디바이스 내 로컬 처리[[EUNO.NEWS](https://euno.news/posts/ko/on-device-function-calling-in-google-ai-edge-galle-ae4c94)]] |

---

## 2. FunctionGemma 모델 소개

### 모델 구조 및 파라미터 규모  
- **파라미터**: 270 M (Gemma 3 기반)  
- **특징**: 함수 호출 전용으로 최적화된 어텐션 구조와 경량화된 토큰 디코더를 포함합니다[[EUNO.NEWS](https://euno.news/posts/ko/on-device-function-calling-in-google-ai-edge-galle-ae4c94)]].

### 기능 중심(Function‑Oriented) 설계 원칙  
FunctionGemma는 **프롬프트 → 함수 매핑 → 실행** 흐름을 효율적으로 처리하도록 설계되었습니다. 모델은 자연어 명령을 파싱해 사전 정의된 함수 시그니처와 매칭하고, 필요한 인자를 추출해 바로 실행합니다.

### 지원되는 언어 및 입력 포맷  
- 기본적으로 **영어**와 **한국어**를 지원합니다(다국어 지원은 향후 업데이트 예정).  
- 입력은 **JSON‑like** 구조의 함수 호출 스키마와 자연어 텍스트를 혼합한 형태를 허용합니다.

---

## 3. LiteRT‑LM을 활용한 온‑디바이스 실행

### LiteRT‑LM 개요 및 역할  
LiteRT‑LM은 Google AI Edge에서 제공하는 **경량 런타임**으로, 모델 압축·양자화와 하드웨어 가속을 담당합니다. FunctionGemma와 결합하면 메모리 사용량을 크게 줄이면서도 높은 추론 속도를 유지할 수 있습니다[[Google Developers Blog](https://developers.googleblog.com/on-device-function-calling-in-google-ai-edge-gallery/)].

### 모델 압축·양자화 방식  
- **8‑bit 정수 양자화**(post‑training) → 메모리 4배 절감  
- **Weight pruning**(optional) → 파라미터 10~20 % 감소  
- 양자화 과정은 **LiteRT‑LM CLI**를 통해 자동화됩니다.

### Edge 디바이스에 배포하는 단계별 절차  

1. **모델 다운로드**  
   ```bash
   lite-rt download functiongemma --output ./models
   ```
2. **양자화 적용**  
   ```bash
   lite-rt quantize ./models/functiongemma.tflite --bits 8 --output ./models/functiongemma_q8.tflite
   ```
3. **앱에 포함**  
   - Android: `assets/models/` 디렉터리에 복사 후 `AssetManager` 로 로드  
   - iOS: Xcode 프로젝트에 `Copy Bundle Resources` 로 추가  

4. **런타임 초기화**  
   ```java
   LiteRTLM rt = new LiteRTLM(context);
   rt.loadModel("functiongemma_q8.tflite");
   ```
5. **함수 호출 인터페이스 등록**  
   ```java
   rt.registerFunction("scheduleEvent", (args) -> {
       // 구현은 앱 레이어에서 수행
   });
   ```

> 위 코드는 **인덴트 4칸**을 이용한 마크다운 인라인 코드 예시이며, 실제 구현 시 공식 문서([LiteRT‑LM SDK](https://developers.google.com/edge/gallery/literuntime))를 참고하십시오.

---

## 4. Google AI Edge Gallery와 통합 방법

### Android / iOS 환경 설정 가이드  

| 단계 | Android | iOS |
|------|---------|-----|
| Gradle / CocoaPods | `implementation 'com.google.ai.edge:gallery:1.2.0'` | `pod 'GoogleAIEdgeGallery'` |
| 최소 SDK | API 21 | iOS 13+ |
| 권한 | `INTERNET` (옵션), `CAMERA` 등 앱 요구에 따라 | `NSCameraUsageDescription` 등 |

### Edge Gallery SDK 설치 및 초기화  

```java
// Android (Java)
EdgeGallery gallery = EdgeGallery.getInstance(context);
gallery.initialize();
```

```swift
// iOS (Swift)
let gallery = EdgeGallery.shared
gallery.initialize()
```

### FunctionGemma 모델 로드 및 등록 프로세스  

```java
// Android
Model model = gallery.loadModel("functiongemma_q8.tflite");
gallery.registerModel(model);
```

```swift
// iOS
let model = try gallery.loadModel(named: "functiongemma_q8")
gallery.register(model: model)
```

> SDK 초기화와 모델 등록은 **앱 시작 시점**에 수행하는 것이 권장됩니다.

---

## 5. 샘플 코드 및 사용 예시

### 기본 “Hello FunctionGemma” 예제  

```java
// Android
String prompt = "Hello FunctionGemma, what can you do?";
String response = gallery.runInference(prompt);
Log.d("FG", response);
```

```swift
// iOS
let prompt = "Hello FunctionGemma, what can you do?"
let response = try gallery.runInference(prompt)
print(response)
```

### 일정 관리 함수 호출 시나리오  

```java
// Android
String userInput = "다음 주 월요일 오후 3시에 회의 잡아줘.";
String result = gallery.runFunctionCall(userInput);
// result 예시: {"function":"scheduleEvent","args":{"date":"2026-03-09","time":"15:00","title":"회의"}}
```

```swift
// iOS
let userInput = "다음 주 월요일 오후 3시에 회의 잡아줘."
let result = try gallery.runFunctionCall(userInput)
// 결과를 파싱해 캘린더 API 호출
```

### 기기 하드웨어 제어 (예: 조명, 볼륨)  

```java
// Android
String cmd = "조명을 밝게 켜줘.";
String resp = gallery.runFunctionCall(cmd);
// resp → {"function":"setLight","args":{"level":100}}
```

```swift
// iOS
let cmd = "볼륨을 50%로 낮춰."
let resp = try gallery.runFunctionCall(cmd)
// {"function":"setVolume","args":{"level":0.5}}
```

### Tiny Garden 게임 로직 구현 예시  

```java
// Android
String gameCmd = "새싹을 물 주세요.";
String gameResp = gallery.runFunctionCall(gameCmd);
// {"function":"waterPlant","args":{"plantId":"seedling_01"}}
```

```swift
// iOS
let gameCmd = "새싹을 물 주세요."
let gameResp = try gallery.runFunctionCall(gameCmd)
// {"function":"waterPlant","args":{"plantId":"seedling_01"}}
```

> 위 예시는 **FunctionGemma**가 자연어를 함수 시그니처와 매핑하는 과정을 보여줍니다. 실제 앱에서는 반환된 JSON을 파싱해 해당 로직을 구현하면 됩니다.

---

## 6. 성능 및 지연 시간 벤치마크

현재 공개된 구체적인 수치는 제한적이며, Google 공식 블로그에서는 **“낮은 지연 시간 및 높은 속도”**를 강조하고 있습니다[[EUNO.NEWS](https://euno.news/posts/ko/on-device-function-calling-in-google-ai-edge-galle-ae4c94)].

| 디바이스 | CPU / NPU | 평균 추론 지연 (ms) | 비고 |
|----------|-----------|-------------------|------|
| Pixel 8 Pro | Tensor G3 | **추가 조사 필요** | |
| Snapdragon 8 Gen 2 | Hexagon DSP | **추가 조사 필요** | |
| iPhone 15 Pro | Apple Neural Engine | **추가 조사 필요** | |

### 최적화 팁  
- **배치 크기 1** 유지 (실시간 인터랙션에 적합)  
- **스레드 수**를 디바이스 코어 수에 맞게 설정 (`rt.setNumThreads(Runtime.getRuntime().availableProcessors())`)  
- **양자화 레벨**을 8‑bit으로 고정하고, 필요 시 **mixed‑precision** 옵션을 검토  

> 정확한 수치는 디바이스별 테스트가 필요하므로, 프로젝트 초기 단계에서 자체 벤치마크를 수행하는 것을 권장합니다.

---

## 7. 보안 및 프라이버시 고려사항

### 데이터 유출 방지 메커니즘  
- **온‑디바이스 실행** 자체가 가장 큰 방어선이며, 입력 데이터는 디바이스 메모리에서만 처리됩니다.  
- 모델 파일은 **SHA‑256 서명**을 통해 배포되며, 앱 시작 시 검증 절차를 수행합니다.

### 모델 및 함수 정의 파일의 무결성 검증 방법  

```java
// Android 예시
byte[] modelBytes = Files.readAllBytes(Paths.get("functiongemma_q8.tflite"));
String hash = MessageDigest.getInstance("SHA-256").digest(modelBytes).toHexString();
if (!hash.equals(EXPECTED_HASH)) {
    throw new SecurityException("Model integrity check failed");
}
```

### 사용자 동의 및 권한 관리 가이드라인  
- **하드웨어 제어**(조명, 볼륨 등) 함수는 해당 권한(`android.permission.MODIFY_AUDIO_SETTINGS`, `android.permission.ACCESS_FINE_LOCATION` 등)을 **런타임**에 요청해야 합니다.  
- iOS에서는 **Info.plist**에 설명을 추가하고, 최초 사용 시 시스템 다이얼로그를 통해 동의를 받아야 합니다.  

---

## 8. FAQ

| 질문 | 답변 |
|------|------|
| **FunctionGemma와 일반 Gemma 모델의 차이점은?** | FunctionGemma는 **함수 호출**에 최적화된 270 M 파라미터 모델이며, Gemma는 일반 텍스트 생성에 초점을 맞춥니다[[EUNO.NEWS](https://euno.news/posts/ko/on-device-function-calling-in-google-ai-edge-galle-ae4c94)] |
| **iOS에서 LiteRT‑LM을 사용할 때 주의할 점은?** | iOS 13 이상을 요구하며, **ARM64** 전용 바이너리만 지원합니다. 또한, Xcode 프로젝트에 `ENABLE_BITCODE=NO` 설정이 필요합니다. |
| **오프라인 상태에서도 함수 호출이 가능한가?** | 네, FunctionGemma와 LiteRT‑LM은 완전 온‑디바이스 실행을 지원하므로 네트워크 연결이 없어도 동작합니다. |
| **업데이트 및 버전 관리 방법은?** | 모델 파일은 **버전 태그**(예: `functiongemma_v1.0.tflite`)를 사용해 배포하고, 앱 시작 시 **버전 비교** 로직을 구현합니다. |
| **문제 발생 시 디버깅 절차와 지원 채널 안내** | 1) 로그 레벨을 `DEBUG` 로 설정 <br> 2) `LiteRTLM.getLastError()` 로 오류 확인 <br> 3) Google AI Edge **GitHub Issues** 또는 **Google Cloud Support** 에 문의합니다. |

---