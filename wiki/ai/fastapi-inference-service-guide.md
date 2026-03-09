---
title: FastAPI 기반 AI 추론 서비스 구현 가이드
author: SEPilot AI
status: draft
tags: [FastAPI, AI, Inference, API, Python, 머신러닝]
redirect_from:
  - 377
---

## 1. 문서 개요
### 목적
FastAPI를 활용해 머신러닝 모델을 추론 API 형태로 제공하는 방법을 단계별로 안내합니다.  
### 대상 독자
- Python 기반 머신러닝 워크플로를 보유한 개발자  
- 기존 모델을 서비스화하고자 하는 데이터 사이언티스트  
- DevOps·CI/CD 파이프라인에 AI API를 통합하려는 엔지니어  

FastAPI가 제공하는 고성능·경량·자동 문서화 기능은 AI 추론 서비스를 빠르게 구축하고 운영하기에 최적화되어 있습니다 [출처](https://euno.news/posts/ko/building-an-ai-prediction-api-with-fastapi-lessons-1d86f8).

## 2. FastAPI 소개
- **고성능**: Starlette와 Pydantic을 기반으로 비동기 처리와 타입 검증을 기본 제공한다.  
- **경량**: 최소 의존성으로 빠른 시작이 가능하며, Docker 이미지 크기도 작다.  
- **자동 문서화**: OpenAPI 스키마를 자동 생성해 Swagger UI와 ReDoc을 즉시 제공한다.  

Python으로 작성된 기존 머신러닝 파이프라인을 그대로 재사용하면서, API 레이어만 추가하면 서비스화가 가능하다는 점이 큰 장점입니다 [출처](https://euno.news/posts/ko/building-an-ai-prediction-api-with-fastapi-lessons-1d86f8).

## 3. AI 예측 API 기본 아키텍처
```
User → API Request → Input Validation → Model Load/Inference → Structured Response → User
```
### 핵심 컴포넌트
| 컴포넌트 | 역할 |
|----------|------|
| **Router** | HTTP 엔드포인트 정의 (`/predict` 등) |
| **Service Layer** | 비즈니스 로직, 모델 호출, 결과 가공 |
| **Model Module** | 모델 로드·추론 함수만 담당 |
| **Pydantic Schema** | 요청·응답 데이터 구조와 검증 정의 |

## 4. 개발 환경 설정
- **Python**: 3.9 이상 권장  
- **가상환경**: `venv` 또는 `conda` 사용  
- **필수 패키지**  
  - `fastapi`  
  - `uvicorn[standard]` (ASGI 서버)  
  - `pydantic` (데이터 검증)  
  - 모델 프레임워크에 따라 `scikit-learn`, `torch`, `tensorflow`, `joblib` 등  

### 프로젝트 구조 예시
```
my_ai_api/
├─ app/
│  ├─ __init__.py
│  ├─ main.py          # FastAPI 인스턴스
│  ├─ routers/
│  │   └─ predict.py   # /predict 엔드포인트
│  ├─ services/
│  │   └─ inference.py # 모델 로드·추론 로직
│  └─ models/
│      └─ model.pkl     # 저장된 모델 파일
├─ tests/
│  └─ test_predict.py
├─ requirements.txt
└─ Dockerfile
```

## 5. 핵심 구현 단계
### 5.1 입력 검증
- **Pydantic 모델**을 사용해 스키마 정의  
```python
from pydantic import BaseModel, Field

class PredictRequest(BaseModel):
    feature1: float = Field(..., gt=0, description="첫 번째 특성, 양수값이어야 함")
    feature2: int = Field(..., ge=0, le=10, description="두 번째 특성, 0~10 사이 정수")
```
- 타입·범위·필수값을 선언적으로 검증하면, 모델에 도달하기 전 오류를 크게 줄일 수 있습니다 [출처](https://euno.news/posts/ko/building-an-ai-prediction-api-with-fastapi-lessons-1d86f8).

### 5.2 모델 로드 및 관리
- **초기 로드**: 애플리케이션 시작 시 한 번 로드해 메모리에 유지 (싱글톤) → 응답 지연 최소화.  
- **요청당 로드**: 메모리 제약이 있거나 모델 교체가 빈번할 때 사용.  

**싱글톤 패턴 예시**  
```python
class ModelSingleton:
    _instance = None

    def __new__(cls, path: str):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.model = joblib.load(path)  # 예: scikit-learn 모델
        return cls._instance
```
FastAPI의 **Dependency Injection**을 활용하면 라우터에서 `Depends(ModelSingleton)` 형태로 주입할 수 있습니다.

### 5.3 예측 로직 구현
- 서비스 레이어에 **추론 함수** 정의  
```python
def predict(data: PredictRequest, model) -> dict:
    # 전처리
    X = [[data.feature1, data.feature2]]
    # 추론
    pred = model.predict(X)[0]
    return {"prediction": pred}
```
- **배치 처리**가 필요하면 리스트 형태 입력을 받아 한 번에 예측하도록 확장 가능.  
- 비동기 처리(`async def`)는 I/O 바운드(예: 외부 모델 서버 호출) 상황에 유리합니다.

### 5.4 구조화된 응답 반환
- **표준 응답 포맷** 정의 (status, data, metadata)  
```python
class PredictResponse(BaseModel):
    status: str = "success"
    data: dict
    metadata: dict = {}
```
- **예외 매핑**: `HTTPException`을 사용해 400/422/500 등 적절한 HTTP 코드를 반환하고, 오류 메시지를 일관되게 제공한다.

## 6. 최소 예시 코드
`app/main.py`
```python
from fastapi import FastAPI, Depends, HTTPException
from app.routers.predict import router as predict_router

app = FastAPI(
    title="AI Prediction API",
    description="FastAPI 기반 AI 추론 서비스 예시",
    version="0.1.0"
)

app.include_router(predict_router, prefix="/api")
```

`app/routers/predict.py`
```python
from fastapi import APIRouter, Depends
from app.models.predict_request import PredictRequest, PredictResponse
from app.services.inference import get_model, predict

router = APIRouter()

@router.post("/predict", response_model=PredictResponse)
def predict_endpoint(request: PredictRequest, model=Depends(get_model)):
    try:
        result = predict(request, model)
        return PredictResponse(status="success", data=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

위 예시는 **입력 검증 → 모델 로드 → 추론 → 구조화된 응답** 흐름을 모두 포함합니다 [출처](https://euno.news/posts/ko/building-an-ai-prediction-api-with-fastapi-lessons-1d86f8).

## 7. 베스트 프랙티스
| 영역 | 권장 방법 |
|------|-----------|
| **코드 구조** | API와 모델 로직을 서비스·레포지토리 패턴으로 분리 |
| **포맷팅** | `black` 자동 포맷팅 적용 (`black .`) |
| **정적 분석** | `flake8`, `mypy`로 타입·스타일 검사 |
| **테스트** | `pytest`와 `fastapi.testclient`로 엔드포인트 단위 테스트 |
| **CI/CD** | GitHub Actions 또는 GitLab CI에 `lint`, `test`, `docker build` 단계 포함 |
| **버전 관리** | 모델 파일은 별도 버전 레포(예: DVC)와 연동, API는 모델 버전 메타데이터 반환 |

## 8. 자동 문서화 및 인터랙티브 UI
FastAPI는 `/docs`(Swagger UI)와 `/redoc`(ReDoc)를 자동 제공한다.  
Pydantic 모델에 `description`, `example` 등을 추가하면 UI에 상세 설명과 샘플 요청/응답이 표시된다.

```python
class PredictRequest(BaseModel):
    feature1: float = Field(..., example=1.23, description="첫 번째 특성")
    feature2: int = Field(..., example=5, description="두 번째 특성")
```

## 9. 배포 전략
### 로컬 개발
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
### 컨테이너화
`Dockerfile` (예시)
```
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "80"]
```
### 클라우드 배포 옵션
- **AWS ECS/Fargate**: Docker 이미지 푸시 후 서비스 정의  
- **GCP Cloud Run**: 서버리스 컨테이너 실행, 자동 스케일링 지원  
- **Azure App Service**: Linux 컨테이너 배포 옵션 활용  

각 클라우드 제공자는 **HTTPS 자동 적용**과 **로드밸런싱**을 기본 제공한다.

## 10. 운영 및 모니터링
- **로깅**: `logging` 모듈과 `uvicorn` 로그를 파일·콘솔에 동시에 출력.  
- **트레이싱**: OpenTelemetry와 연동해 요청 흐름을 추적.  
- **성능 모니터링**: Prometheus 메트릭 (`uvicorn` + `fastapi-prometheus`)을 수집하고 Grafana 대시보드에 시각화.  
- **모델 버전 관리**: 모델 파일명에 버전 태그(`model_v1.pkl`)를 포함하고, API 응답 `metadata`에 현재 버전 정보를 반환. 롤백이 필요하면 파일 교체만으로 즉시 적용 가능.

## 11. 결론
FastAPI는 **속도**, **경량**, **자동 문서화**라는 세 가지 핵심 장점을 통해 AI 모델을 손쉽게 서비스화할 수 있게 해줍니다. 입력 검증·모델 로드·응답 포맷을 명확히 분리하고, 코드 품질 도구와 CI/CD 파이프라인을 적용하면 운영 안정성을 크게 향상시킬 수 있습니다 [출처](https://euno.news/posts/ko/building-an-ai-prediction-api-with-fastapi-lessons-1d86f8).

### 향후 확장 가능성
- **배치 작업**: 대량 입력을 한 번에 처리하는 별도 엔드포인트 구현  
- **스트리밍**: WebSocket을 이용한 실시간 추론 서비스  
- **멀티 모델**: 라우터 파라미터에 따라 서로 다른 모델을 선택적으로 로드  

---

## 부록
### 참고 자료
- FastAPI 공식 문서: https://fastapi.tiangolo.com/  
- Pydantic 모델링 가이드: https://pydantic-docs.helpmanual.io/  
- Docker 공식 가이드: https://docs.docker.com/engine/reference/builder/  

### FAQ
**Q1. 모델을 매 요청마다 로드하면 성능이 크게 저하되나요?**  
A1. 네. 모델 로드는 I/O와 메모리 비용이 크므로, 가능하면 애플리케이션 시작 시 싱글톤으로 로드하는 것이 권장됩니다.

**Q2. 비동기 엔드포인트가 반드시 필요할까요?**  
A2. 모델 추론이 CPU 바운드라면 `async`가 큰 이점을 주지 않지만, 외부 서비스 호출이나 GPU 비동기 API와 연동할 경우 유용합니다.

### Glossary
- **API**: Application Programming Interface, 외부 시스템과 통신하기 위한 규격.  
- **Inference**: 학습된 모델을 이용해 새로운 데이터에 대한 예측을 수행하는 과정.  
- **Pydantic**: FastAPI에서 데이터 검증·직렬화를 담당하는 라이브러리.  

---