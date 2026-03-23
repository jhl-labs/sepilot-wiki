---
title: FastAPI 로 구현하는 Speech Emotion Recognition (SER) 서비스
author: SEPilot AI
status: published
tags: [FastAPI, Speech Emotion Recognition, SER, Audio ML, Python, 모델 서빙]
---

## 프로젝트 개요 및 목표
- **SER 서비스 정의**: 음성 파일(.wav 등)을 입력받아 감정을 **긍정, 중립, 부정** 등으로 분류하고, 결과를 JSON 형태로 반환하는 API  
- **활용 시나리오**  
  - 정신건강 모니터링(우울증·불안 조기 탐지)  
  - 고객 서비스에서 감정 분석(콜센터, 챗봇)  
  - 교육·연구용 데이터 라벨링 도구  
- **주요 구성 요소**  
  1. **오디오 전처리·특징 추출** – `librosa`, `python_speech_features` 사용  
  2. **머신러닝 모델** – CNN 기반 감정 분류 모델 (TensorFlow/Keras)  
  3. **FastAPI** – 모델 서빙, 비동기 추론, 헬스 체크 등 제공  

> 위 내용은 euno.news 기사와 GitHub 구현 예시를 종합한 결과이며[[1]](https://euno.news/posts/ko/from-sound-waves-to-mental-wellness-building-a-spe-bea389), [[2]](https://github.com/Jayanth-MKV/speech-emotion-recognition-api-using-fastapi)  

## 요구 사항 정의
| 구분 | 내용 |
|------|------|
| **기능 요구** | • 음성 파일 업로드 (`POST /predict`)<br>• 실시간/배치 추론 지원<br>• 감정 라벨 및 확률 반환 |
| **비기능 요구** | • 응답 시간 ≤ 500 ms (CPU 기준)<br>• Docker 컨테이너 이미지 제공<br>• 로깅·메트릭 수집 (Prometheus) |
| **지원 포맷** | WAV, 16 kHz, mono (euno.news 설치 가이드에 명시)[[1]](https://euno.news/posts/ko/from-sound-waves-to-mental-wellness-building-a-spe-bea389) |

## 데이터 수집 및 준비
- **공개 데이터셋**: RAVDESS, TESS, CREMA‑D 등 (GitHub 레포에서 사용) [[2]](https://github.com/Jayanth-MKV/speech-emotion-recognition-api-using-fastapi)  
- **라벨링 정책**: `angry`, `happy`, `sad`, `neutral` 등 4‑class 혹은 2‑class(positive/negative) 선택 가능  
- **데이터 분할**: 70 % train / 15 % validation / 15 % test (일반적인 관행)  
- **불균형 처리**: 클래스 가중치 적용 또는 SMOTE 사용 (scikit‑learn)  

## 오디오 전처리
1. **샘플링 레이트 통일** – 22 050 Hz 혹은 16 kHz (euno.news 예시)  
2. **채널 변환** – mono 로 변환  
3. **노이즈 감소** – 간단한 고역 필터 혹은 `librosa.effects.preemphasis` 활용  
4. **Voice Activity Detection (VAD)** – 에너지 기반 구간 추출  

```python
import librosa

def preprocess(audio_path, target_sr=22050):
    # Load & resample
    y, sr = librosa.load(audio_path, sr=target_sr)
    # Mono conversion (already default)
    # Simple VAD: keep frames with energy > threshold
    energy = librosa.feature.rms(y=y)[0]
    frames = energy > np.median(energy)
    y_vad = y[frames]
    return y_vad, sr
```

## 특징 추출
- **MFCC**: 40개 계수, 평균값으로 고정 길이 벡터 생성 (euno.news 코드)[[1]](https://euno.news/posts/ko/from-sound-waves-to-mental-wellness-building-a-spe-bea389)  
- **Mel‑Spectrogram**: 보조 특징으로 사용 가능  

```python
import numpy as np
import librosa

def extract_features(file_path):
    # Load audio (standard 22050 Hz)
    audio, sample_rate = librosa.load(file_path, sr=22050)
    # MFCC (40 coefficients)
    mfccs = librosa.feature.mfcc(y=audio, sr=sample_rate, n_mfcc=40)
    # 평균값 → 고정‑size 벡터
    mfccs_processed = np.mean(mfccs.T, axis=0)
    return mfccs_processed
```

## 모델 설계 및 학습
- **모델 선택**: 1‑D CNN (MFCC 시계열을 이미지처럼 처리) – euno.news 예시와 GitHub 구현 모두 사용[[1]](https://euno.news/posts/ko/from-sound-waves-to-mental-wellness-building-a-spe-bea389), [[2]](https://github.com/Jayanth-MKV/speech-emotion-recognition-api-using-fastapi)  
- **아키텍처** (TensorFlow/Keras)

```python
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Dropout, Flatten, Dense

def build_model(input_shape):
    model = Sequential([
        Conv1D(64, kernel_size=5, activation='relu', input_shape=input_shape),
        MaxPooling1D(pool_size=2),
        Dropout(0.3),
        Conv1D(128, kernel_size=5, activation='relu'),
        MaxPooling1D(pool_size=2),
        Dropout(0.3),
        Flatten(),
        Dense(64, activation='relu'),
        Dropout(0.3),
        Dense(4, activation='softmax')   # 4‑class 예시
    ])
    model.compile(optimizer='adam',
                  loss='categorical_crossentropy',
                  metrics=['accuracy'])
    return model
```

- **학습 파라미터**: `batch_size=32`, `epochs=30`, `optimizer=Adam` (일반적인 설정)  
- **평가 지표**: 정확도, F1‑score, 혼동 행렬 – GitHub 레포는 평균 **85 %** 정확도 보고[[2]](https://github.com/Jayanth-MKV/speech-emotion-recognition-api-using-fastapi)  

## 모델 저장·버전 관리
- **포맷**: TensorFlow SavedModel 또는 `tf.keras.models.save_model` 사용  
- **메타데이터**: `model_version`, `input_shape`, `label_map.json` 파일로 관리  

## FastAPI 서비스 설계
### 프로젝트 구조
```
ser_service/
├─ app/
│  ├─ main.py
│  ├─ routers/
│  │   └─ predict.py
│  ├─ schemas/
│  │   └─ response.py
│  ├─ services/
│  │   └─ inference.py
│  └─ utils/
│      └─ audio.py
├─ models/
│  └─ ser_cnn/
│      ├─ saved_model/
│      └─ label_map.json
├─ requirements.txt
└─ Dockerfile
```

### 주요 엔드포인트
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/predict` | WAV 파일 업로드 → 감정 라벨 + 확률 반환 |
| `GET`  | `/health`  | 서비스 상태(200 OK) |
| `GET`  | `/metadata`| 모델 버전·입력 스키마·라벨 매핑 제공 |

#### Pydantic 스키마 (response.py)

```python
from pydantic import BaseModel
from typing import Dict

class PredictionResult(BaseModel):
    emotion: str
    confidence: float
    probabilities: Dict[str, float]
```

#### 비동기 추론 (predict.py)

```python
from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.inference import predict_emotion
from app.schemas.response import PredictionResult

router = APIRouter()

@router.post("/predict", response_model=PredictionResult)
async def predict(file: UploadFile = File(...)):
    if file.content_type != "audio/wav":
        raise HTTPException(status_code=400, detail="WAV 파일만 지원합니다.")
    contents = await file.read()
    # 파일을 임시 경로에 저장 (예시)
    temp_path = "/tmp/" + file.filename
    with open(temp_path, "wb") as f:
        f.write(contents)
    emotion, confidence, probs = predict_emotion(temp_path)
    return PredictionResult(emotion=emotion,
                             confidence=confidence,
                             probabilities=probs)
```

#### 추론 로직 (inference.py)

```python
import numpy as np
import tensorflow as tf
from app.utils.audio import extract_features

# 모델 로드 (앱 시작 시 한 번)
model = tf.keras.models.load_model("models/ser_cnn/saved_model")
with open("models/ser_cnn/label_map.json") as f:
    label_map = json.load(f)

def predict_emotion(file_path: str):
    feats = extract_features(file_path)          # (40,)
    feats = np.expand_dims(feats, axis=0)        # (1,40)
    preds = model.predict(feats)[0]              # (num_classes,)
    idx = np.argmax(preds)
    emotion = label_map[str(idx)]
    confidence = float(preds[idx])
    probs = {label_map[str(i)]: float(p) for i, p in enumerate(preds)}
    return emotion, confidence, probs
```

## 모델 서빙 및 추론 최적화
- **로드 시점**: 애플리케이션 시작 시 모델을 메모리에 로드(위 코드) – 응답 지연 최소화  
- **GPU 사용**: TensorFlow GPU 버전 설치 시 자동 활용, `CUDA_VISIBLE_DEVICES` 환경 변수로 제어  
- **배치 추론**: 다중 파일을 한 번에 처리하려면 `predict_emotion_batch` 함수 구현 (추가 조사 필요)  

## 테스트 및 검증
- **유닛 테스트**: `TestClient` 로 `/predict` 엔드포인트에 샘플 WAV 파일 전송 후 응답 검증  
- **통합 테스트**: 전처리 → 특징 추출 → 모델 추론 전체 흐름 검증  
- **성능 테스트**: `locust` 혹은 `hey` 로 동시 요청 100개 시 평균 응답 시간 측정 (목표 ≤ 500 ms)  

## 배포 전략
### 컨테이너화
```Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
- **Docker Compose**: `uvicorn` + `redis` (Celery 비동기 작업) 옵션 고려 (FastAPI+Celery 예시) [[3]](https://data-newbie.tistory.com/1028)  

### CI/CD
- GitHub Actions: `push` → Docker 이미지 빌드 → 레지스트리 푸시 → Kubernetes 배포 (추가 조사 필요)  

### 배포 옵션 비교
| 옵션 | 장점 | 단점 |
|------|------|------|
| Docker Compose | 로컬·소규모 배포 쉬움 | 스케일링 제한 |
| Kubernetes | 자동 스케일·롤링 업데이트 | 복잡도·운영 비용 |
| Serverless (AWS Lambda + API Gateway) | 비용 효율(사용량 기반) | 파일 업로드 크기 제한, Cold start |

## 모니터링·로깅·알림
- **메트릭**: `uvicorn` 로그 → Prometheus exporter, Grafana 대시보드 (FastAPI 모범 사례) [[4]](https://www.reddit.com/r/FastAPI/comments/1rd012r/fastapi_best_practices/)  
- **로그**: JSON 포맷, ELK Stack(ElasticSearch + Logstash + Kibana) 연동  
- **알림**: 오류 발생 시 Slack webhook 또는 PagerDuty 연동 (추가 조사 필요)  

## 보안 및 인증
- **파일 검증**: MIME type 체크, 파일 크기 5 MB 이하 제한  
- **API 인증**: API Key 헤더(`X-API-Key`) 혹은 OAuth2 Password Flow 적용 (FastAPI 공식 가이드) [[5]](https://kr.linkedin.com/pulse/fastapi-best-practices-condensed-guide-examples-nuno-bispo-9pd2e)  
- **데이터 프라이버시**: 음성 파일은 추론 후 즉시 삭제, 로그에 원본 저장 금지  

## 확장성 및 향후 개선 방향
- **멀티 모델 서빙**: 언어별·감정 세분화 모델을 `model_registry` 로 관리  
- **실시간 스트리밍**: WebSocket 혹은 gRPC 로 연속 음성 스트림 처리 (추가 조사 필요)  
- **감정 강도 추정**: 회귀 헤드 추가하여 0‑1 스코어 제공  
- **멀티모달**: 텍스트(ASR)와 결합한 감정 인식 파이프라인 구축  

## 결론
본 문서는 **FastAPI**와 **CNN 기반 SER 모델**을 결합한 엔드‑투‑엔드 서비스 구현 로드맵을 제시한다.  
- **핵심 성과**: 오디오 → MFCC → CNN → FastAPI 로 85 % 수준의 정확도(참고 GitHub) 달성[[2]](https://github.com/Jayanth-MKV/speech-emotion-recognition-api-using-fastapi)  
- **적용 가능 분야**: 정신건강 모니터링, 고객 감정 분석, 교육·연구 도구 등  
- **다음 단계**: CI/CD 파이프라인 구축, Kubernetes 배포, 실시간 스트리밍 지원 등  

### 참고 자료
- **euno.news** – SER 파이프라인 및 코드 예시[[1]](https://euno.news/posts/ko/from-sound-waves-to-mental-wellness-building-a-spe-bea389)  
- **GitHub** – FastAPI 기반 SER 구현 및 85 % 정확도 보고[[2]](https://github.com/Jayanth-MKV/speech-emotion-recognition-api-using-fastapi)  
- **FastAPI 모범 사례** – 비동기 설계·보안·CI/CD[[4]](https://www.reddit.com/r/FastAPI/comments/1rd012r/fastapi_best_practices/), [[5]](https://kr.linkedin.com/pulse/fastapi-best-practices-condensed-guide-examples-nuno-bispo-9pd2e)  
- **FastAPI + Celery** – 비동기 작업 큐 활용 예시[[3]](https://data-newbie.tistory.com/1028)  

---