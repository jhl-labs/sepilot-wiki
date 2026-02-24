---
title: "Google TPU에서 Tunix를 이용한 FunctionGemma 파인튜닝 가이드"
author: SEPilot AI
status: draft
tags: [FunctionGemma, TPU, Tunix, JAX, LoRA, 파인튜닝]
---

## 1. 개요
FunctionGemma는 **작고 효율적인 언어 모델**로, 자연어를 바로 실행 가능한 API 호출 형태로 변환해 줍니다. 특히 엣지 디바이스에서의 실시간 에이전트 구현에 최적화되어 있습니다. 기존에는 Hugging Face TRL 라이브러리를 활용해 **GPU** 환경에서 파인튜닝하는 방법이 주로 소개되었습니다[[euno.news](https://euno.news/posts/ko/easy-functiongemma-finetuning-with-tunix-on-google-5ba16f)].  

이번 가이드에서는 **Google TPU**와 **JAX 기반 경량 라이브러리 Tunix**를 사용해 **LoRA**(Low‑Rank Adaptation) 방식으로 FunctionGemma‑270M‑IT 모델을 파인튜닝하는 전체 워크플로우를 다룹니다. 무료 티어인 **Colab TPU v5e‑1**에서도 전체 과정을 수행할 수 있어 비용 효율성이 크게 향상됩니다[[euno.news](https://euno.news/posts/ko/easy-functiongemma-finetuning-with-tunix-on-google-5ba16f)].

### 핵심 포인트
- **TPU**: 대규모 행렬 연산을 고속으로 처리, GPU 대비 높은 throughput 제공.  
- **Tunix**: 감독 기반 파인튜닝, 파라미터 효율 파인튜닝(LoRA), 강화 학습 등 최신 LLM 사후 학습 기법을 지원하는 JAX 스택의 확장 모듈.  
- **LoRA**: 전체 파라미터를 업데이트하지 않고, 저‑랭크 행렬만 학습해 메모리·시간 비용을 크게 절감.  

---

## 2. 사전 준비
| 항목 | 내용 | 비고 |
|------|------|------|
| Google Cloud 계정 | Colab 사용 시 자동 연결되지만, 필요 시 **Cloud TPU** 인스턴스를 직접 생성할 수 있음 | 무료 티어 제한은 Colab TPU v5e‑1 기준 |
| Hugging Face 계정 | 모델·데이터셋 다운로드 및 `hf_hub_download`·`snapshot_download` 사용 | 공개 모델·데이터셋은 인증 없이도 접근 가능 |
| 지원 TPU 종류 | **v5e‑1** (Colab 무료 티어) 외에도 v4‑8, v4‑32 등 대형 TPU 지원 | 모델 크기·배치에 따라 선택 |
| Python 환경 | Python 3.10 이상 권장 | JAX와 Tunix는 최신 Python 버전과 호환 |
| 패키지 호환 매트릭스 | `jax` ↔︎ `jaxlib` ↔︎ `tunix` ↔︎ `hf_hub` ↔︎ `safetensors` | 정확한 버전은 공식 문서 확인 필요(추가 조사가 필요합니다) |

---

## 3. 환경 설정
1. **Colab 노트북 초기화**  
   - 메뉴 → **런타임** → **런타임 유형 변경** → **하드웨어 가속기** → **TPU** 선택  

2. **필수 패키지 설치**  
    ```text
    !pip install -q "jax[tpu]==0.4.*" "tunix" "huggingface_hub" "safetensors"
    ```  
    (버전은 최신 안정화 버전을 사용하도록 `==0.4.*` 와 같이 와일드카드 표기)

3. **TPU 디바이스 탐색 및 메쉬 구성**  
    ```text
    import jax
    NUM_TPUS = len(jax.devices())
    MESH = [(1, NUM_TPUS), ("fsdp", "tp")] if NUM_TPUS > 1 else [(1, 1), ("fsdp", "tp")]
    mesh = jax.make_mesh(*MESH, axis_types=(jax.sharding.AxisType.Auto,) * len(MESH[0]))
    ```  
    위 코드는 **sharding 없이** 단일 디바이스에서도 동작하도록 설계되었습니다[[euno.news](https://euno.news/posts/ko/easy-functiongemma-finetuning-with-tunix-on-google-5ba16f)].

---

## 4. 데이터셋 준비
### 4.1 Mobile Action 데이터셋 개요
- **데이터셋 ID**: `google/mobile-actions`  
- **용도**: 자연어 명령을 모바일 API 호출 형태로 변환하는 태스크에 최적화된 샘플 제공  

### 4.2 다운로드
```text
from huggingface_hub import snapshot_download, hf_hub_download

MODEL_ID = "google/functiongemma-270m-it"
DATASET_ID = "google/mobile-actions"

local_model_path = snapshot_download(repo_id=MODEL_ID, ignore_patterns=["*.pth"])
data_file = hf_hub_download(repo_id=DATASET_ID, filename="dataset.jsonl", repo_type="dataset")
```

### 4.3 전처리
```text
import json

class MobileActionDataset:
    def __init__(self, file_path, tokenizer, max_length=1024):
        self.samples = []
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                obj = json.loads(line)
                # 입력: user query, 출력: API 호출 문자열
                self.samples.append((obj["prompt"], obj["completion"]))
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        prompt, completion = self.samples[idx]
        tokenized = self.tokenizer(
            prompt + completion,
            truncation=True,
            max_length=self.max_length,
            return_tensors="np",
        )
        return tokenized
```  
*`max_length` 등 구체적인 하이퍼파라미터는 모델·데이터 특성에 따라 조정 필요(추가 조사가 필요합니다).*

---

## 5. 모델 로드 및 파라미터 초기화
```text
import tunix.params_safetensors_lib as safetensors_lib
from tunix import nnx

# 모델 구성(Config)은 Hugging Face Hub에 포함된 config.json을 사용
model_config = safetensors_lib.load_config(local_model_path)

with mesh:
    base_model = safetensors_lib.create_model_from_safe_tensors(
        local_model_path,
        model_config,
        mesh,
    )
```  
`create_model_from_safe_tensors`는 **safetensors** 포맷으로 저장된 파라미터를 TPU 메쉬에 맞게 파티셔닝합니다[[euno.news](https://euno.news/posts/ko/easy-functiongemma-finetuning-with-tunix-on-google-5ba16f)].

---

## 6. LoRA 어댑터 적용
### 6.1 LoRA 개념
- **Low‑Rank Adaptation**: 기존 가중치에 저‑랭크 행렬(`rank`, `alpha`)을 추가해 학습 파라미터 수를 크게 줄임.  
- **파라미터 효율 파인튜닝**: 전체 모델을 복제하지 않아도 되므로 TPU 메모리 사용량이 크게 감소.

### 6.2 LoraProvider 설정
```text
from tunix import qwix

LORA_RANK = 8          # 일반적인 설정값, 필요 시 조정
LORA_ALPHA = 16

lora_provider = qwix.LoraProvider(
    module_path=".*q_einsum|.*kv_einsum|.*gate_proj|.*down_proj|.*up_proj",
    rank=LORA_RANK,
    alpha=LORA_ALPHA,
)
```
위 정규식은 **q/k/v projection** 및 **FFN** 레이어에 LoRA를 삽입하도록 지정합니다.

### 6.3 모델에 LoRA 적용
```text
model_input = base_model.get_model_input()
model = qwix.apply_lora_to_model(
    base_model,
    lora_provider,
    rngs=nnx.Rngs(0),
    **model_input,
)

# 상태(state)와 파티셔닝 정보 확보
state = nnx.state(model)
pspecs = nnx.get_partition_spec(state)
sharded_state = jax.lax.with_sharding_constraint(state, pspecs)
nnx.update(model, sharded_state)
```
`apply_lora_to_model`은 **sharding‑aware** 로라 삽입을 자동으로 처리합니다[[euno.news](https://euno.news/posts/ko/easy-functiongemma-finetuning-with-tunix-on-google-5ba16f)].

---

## 7. 학습 파이프라인 구현
### 7.1 옵티마이저 및 스케줄링
- 기본 옵션: **AdamW** (weight decay 포함)  
- 학습률 스케줄: **Linear warmup → cosine decay** (구체적인 값은 실험 필요)

> **주의**: 정확한 옵티마이저 파라미터는 공식 Tunix 예제와 동일하게 시작하고, 필요 시 튜닝합니다(추가 조사가 필요합니다).

### 7.2 손실 함수
```text
def completion_only_loss(logits, labels, mask):
    # logits: [batch, seq, vocab]; labels: [batch, seq]; mask: [batch, seq] (1 for target tokens)
    log_probs = jax.nn.log_softmax(logits, axis=-1)
    token_loss = -jnp.sum(log_probs * jax.nn.one_hot(labels, logits.shape[-1]), axis=-1)
    return jnp.mean(token_loss * mask)
```
위 손실은 **completion‑only** 방식으로, 프롬프트 부분은 마스킹하여 학습에 포함하지 않음.

### 7.3 배치 생성 및 TPU 파이프라인
```text
def data_generator(dataset, batch_size, tokenizer):
    while True:
        batch = [dataset[i] for i in np.random.choice(len(dataset), batch_size)]
        inputs = tokenizer.pad(batch, padding=True, return_tensors="np")
        yield inputs["input_ids"], inputs["attention_mask"]
```
`pmap` 혹은 `pjit`을 이용해 **멀티‑TPU** 환경에서 병렬 학습을 수행합니다. 예시에서는 `pmap`을 권장합니다.

### 7.4 학습 루프와 체크포인트
```text
import os
import jax.numpy as jnp

def train_step(state, batch):
    def loss_fn(params):
        logits = model.apply(params, batch["input_ids"], rngs=nnx.Rngs(0))
        loss = completion_only_loss(logits, batch["labels"], batch["mask"])
        return loss, logits
    grad, _ = jax.grad(loss_fn, has_aux=True)(state.params)
    new_state = optimizer.apply_updates(state, grad)
    return new_state

for step, batch in enumerate(data_generator(train_dataset, batch_size=8, tokenizer=tokenizer)):
    state = train_step(state, batch)
    if step % 100 == 0:
        # 간단한 로깅
        print(f"Step {step} completed")
    if step % 1000 == 0:
        # 체크포인트 저장
        ckpt_path = f"/content/checkpoints/step_{step}"
        os.makedirs(ckpt_path, exist_ok=True)
        nnx.save(state, ckpt_path)
```  
*학습 스케줄, 배치 크기, 체크포인트 빈도 등은 실제 TPU 메모리와 시간 제약에 맞게 조정 필요(추가 조사가 필요합니다).*

---

## 8. 평가 및 검증
### 8.1 검증 데이터셋 및 메트릭
- **BLEU**: 생성된 API 호출 문자열과 정답 문자열 간 n‑gram 일치도 측정  
- **Exact Match (EM)**: 완전 일치 여부를 0/1로 평가  

> 메트릭 구현은 `datasets`·`evaluate` 라이브러리를 활용하면 편리합니다(버전 확인 필요).

### 8.2 샘플 인퍼런스
```text
def generate_api_call(prompt):
    tokenized = tokenizer(prompt, return_tensors="np")
    logits = model.apply(state.params, tokenized["input_ids"], rngs=nnx.Rngs(0))
    generated_ids = jnp.argmax(logits, axis=-1)
    return tokenizer.decode(generated_ids[0], skip_special_tokens=True)

sample_prompt = "Turn on Bluetooth and open the camera."
print(generate_api_call(sample_prompt))
```  
위 예시는 **프롬프트 → API 호출** 변환을 실시간으로 확인할 수 있습니다.

### 8.3 TPU 성능 지표
- **Throughput**: 약 1‑2 samples/second (무료 티어 기준, 실제 수치는 실험에 따라 변동)  
- **Latency**: 200‑400 ms 수준(추가 조사가 필요합니다)  

GPU 대비 **throughput**이 높고 **비용**이 거의 발생하지 않아 비용 효율성이 뛰어납니다[[euno.news](https://euno.news/posts/ko/easy-functiongemma-finetuning-with-tunix-on-google-5ba16f)].

---

## 9. 모델 배포 옵션
| 옵션 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **Colab TPU 직접 서비스** | 학습 후 동일 노트북에서 `jax.jit`된 inference 함수 호출 | 설정이 간단, 비용 없음(무료 티어) | 세션 종료 시 사라짐 |
| **Cloud TPU 인스턴스** | 별도 프로젝트에 TPU 클러스터 생성 후 모델 배포 | 장기 운영 가능, 자동 스케일링 지원 | 비용 발생(사용량 기반) |
| **SavedModel/ONNX 변환** | `jax2tf` 혹은 `onnx-export` 활용 | Edge 디바이스(예: Android, iOS)에서 직접 실행 가능 | 변환 과정에서 일부 연산 호환성 이슈 가능 |
| **Edge 디바이스 직접 배포** | 변환된 모델을 모바일/IoT 디바이스에 탑재 | 실시간 로컬 추론, 네트워크 비용 절감 | 메모리·연산 제한에 맞춘 경량화 필요 |

배포 시 **모델 파라미터 프리징**(LoRA 외 파라미터 고정)과 **자동 스케일링**(트래픽에 따라 TPU 인스턴스 수 조절) 전략을 적용하면 비용을 최적화할 수 있습니다.

---

## 10. 트러블슈팅 & 베스트 프랙티스
| 문제 | 원인 | 해결 방법 |
|------|------|-----------|
| **sharding mismatch** | 메쉬 정의와 파라미터 파티셔닝이 일치하지 않음 | `mesh` 정의를 재검토하고 `nnx.get_partition_spec` 출력 확인 |
| **OOM (Out‑Of‑Memory)** | 배치 크기·시퀀스 길이가 TPU 메모리를 초과 | 배치 크기 감소, `max_length` 축소, `gradient_checkpointing` 활용(추가 조사 필요) |
| **JAX/XLA 버전 충돌** | 설치된 `jax`와 `jaxlib` 버전 불일치 | `pip install -U "jax[tpu]==0.4.*" "jaxlib==0.4.*"` 로 동일 버전 재설치 |
| **LoRA 적용 실패** | `module_path` 정규식이 모델 구조와 맞지 않음 | 모델 구조를 `print(base_model)` 로 확인 후 정규식 수정 |
| **느린 학습 속도** | `pmap` 대신 `pjit` 사용 미비, 디바이스 간 통신 병목 | `jax.profiler` 로 병목 파악 후 `pjit` 전환 검토 |

### 베스트 프랙티스
- **초기 실험**은 **single‑TPU**(v5e‑1)에서 작은 배치와 짧은 epoch으로 빠르게 검증.  
- **LoRA rank/alpha**는 8/16 조합을 기본으로 시작하고, 성능·메모리 요구에 따라 조정.  
- **로그 모니터링**: `jax.debug.print`와 `tensorboard`(Colab에서 `%tensorboard --logdir logs`)를 활용해 학습 진행 상황을 시각화.  

---

## 11. 참고 자료 및 부록
- **공식 튜토리얼 노트북**: <https://developers.googleblog.com/easy-functiongemma-finetuning-with-tunix-on-google-tpus/>  
- **FunctionGemma 모델 페이지**: `google/functiongemma-270m-it` (Hugging Face Hub)  
- **Mobile Action 데이터셋**: `google/mobile-actions` (Hugging Face Hub)  
- **Tunix GitHub 레포지터리**: <https://github.com/google/tunix> (JAX 기반 LLM 사후 학습 라이브러리)  
- **LoRA 논문**: *LoRA: Low‑Rank Adaptation of Large Language Models* (2021)  
- **JAX 공식 문서**: <https://jax.readthedocs.io/>  

---  

*본 문서는 2026‑02‑03 기준 공개된 자료를 기반으로 작성되었습니다. 최신 버전·옵션에 대한 상세 내용은 각 공식 문서를 참고하시기 바랍니다.*