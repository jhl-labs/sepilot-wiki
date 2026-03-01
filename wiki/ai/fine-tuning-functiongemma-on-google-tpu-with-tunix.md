---
title: "Google TPU에서 Tunix를 이용한 FunctionGemma 파인튜닝 가이드"
description: "TPU와 JAX 기반 경량 라이브러리 Tunix를 사용해 FunctionGemma‑270M‑IT 모델을 LoRA 방식으로 파인튜닝하는 단계별 가이드"
category: "Guide"
tags: ["FunctionGemma", "TPU", "Tunix", "JAX", "LoRA", "파인튜닝"]
status: published
issueNumber: 450
createdAt: "2026-02-25T02:30:00Z"
updatedAt: "2026-02-25T02:30:00Z"
quality_score: 84
---

## 1. 개요
FunctionGemma는 **작고 효율적인 언어 모델**로, 자연어를 바로 실행 가능한 API 호출 형태로 변환합니다. 기존에는 Hugging Face TRL을 활용해 **GPU** 환경에서 파인튜닝하는 방법이 주로 소개되었습니다[[euno.news](https://euno.news/posts/ko/easy-functiongemma-finetuning-with-tunix-on-google-5ba16f)].

이번 가이드에서는 **Google TPU**와 **JAX 기반 경량 라이브러리 Tunix**를 사용해 **LoRA**(Low‑Rank Adaptation) 방식으로 **FunctionGemma‑270M‑IT** 모델을 파인튜닝하는 전체 워크플로우를 다룹니다. 무료 티어인 **Colab TPU v5e‑1**에서도 전체 과정을 수행할 수 있어 비용 효율성이 크게 향상됩니다[[euno.news](https://euno.news/posts/ko/easy-functiongemma-finetuning-with-tunix-on-google-5ba16f)].

## 2. 사전 준비
| 항목 | 내용 | 비고 |
|------|------|------|
| Google Cloud 계정 | Colab 사용 시 자동 연결되지만, 필요 시 **Cloud TPU** 인스턴스를 직접 생성할 수 있음 | 무료 티어는 Colab TPU v5e‑1 기준 |
| Hugging Face 계정 | 모델·데이터셋 다운로드 및 `hf_hub_download`·`snapshot_download` 사용 | 공개 모델·데이터셋은 인증 없이 접근 가능 |
| Python 환경 | Python 3.10 이상 권장 | JAX·Tunix는 최신 Python과 호환 |
| 지원 TPU 종류 | **v5e‑1** (Colab 무료 티어) 외 v4‑8, v4‑32 등 | 모델·배치 크기에 따라 선택 |

## 3. 패키지 호환 매트릭스
> **주의**: 아래 버전은 2026‑02‑03 기준 최신 안정화 버전이며, 실제 환경에서는 `pip install -U` 로 최신 패키지를 확인하세요.

| 패키지 | 권장 버전 |
|--------|------------|
| `jax[tpu]` | `0.4.*` |
| `jaxlib` | `0.4.*` (TPU 지원) |
| `tunix` | 최신 (>=0.1) |
| `huggingface_hub` | 최신 |
| `safetensors` | 최신 |
| `optax` | 최신 |
| `datasets` / `evaluate` | 최신 |

## 4. 환경 설정 (Colab)
1. **런타임** → **런타임 유형 변경** → **하드웨어 가속기** → **TPU** 선택
2. **필수 패키지 설치**
```python
!pip install -q "jax[tpu]==0.4.*" "jaxlib==0.4.*" tunix huggingface_hub safetensors optax datasets evaluate"
```
3. **TPU 초기화 및 설정**
```python
import jax
# TPU 디바이스 확인
print("TPU devices:", jax.devices())
# XLA 플래그 (필요 시) – 예시
import os
os.environ["XLA_PYTHON_CLIENT_PREALLOCATE"] = "false"
# JAX 플랫폼 명시 (명시적 설정)
jax.config.update('jax_platform_name', 'tpu')
```
4. **에러 대응 팁**
   - `ImportError` 발생 시 `pip install -U jax[tpu] jaxlib` 로 버전 일치
   - 메모리 부족(OOM) 시 `batch_size` 감소 또는 `max_length` 축소
   - `jax.devices()` 가 빈 리스트이면 런타임이 TPU가 아닌 CPU로 실행 중임을 의미하므로 런타임 설정을 재검토

## 5. 데이터셋 준비
```python
from huggingface_hub import snapshot_download, hf_hub_download
import json

MODEL_ID = "google/functiongemma-270m-it"
DATASET_ID = "google/mobile-actions"

# 모델 가중치 다운로드
local_model_path = snapshot_download(repo_id=MODEL_ID, ignore_patterns=["*.pth"])
# 데이터셋 다운로드 (JSONL 형식)
data_file = hf_hub_download(repo_id=DATASET_ID, filename="dataset.jsonl", repo_type="dataset")
```
### 5.1 전처리 및 토크나이저
```python
from transformers import AutoTokenizer
import numpy as np

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)

class MobileActionDataset:
    def __init__(self, file_path, tokenizer, max_length=1024):
        self.samples = []
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                obj = json.loads(line)
                # prompt: 사용자 질의, completion: API 호출 문자열
                self.samples.append((obj["prompt"], obj["completion"]))
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        prompt, completion = self.samples[idx]
        # 전체 텍스트를 하나의 시퀀스로 토크나이징 (프롬프트+완료)
        tokenized = self.tokenizer(
            prompt + completion,
            truncation=True,
            max_length=self.max_length,
            return_tensors="np",
        )
        return tokenized
```

## 6. 모델 로드 및 LoRA 적용
```python
import tunix.params_safetensors_lib as safetensors_lib
from tunix import nnx, qwix
import jax

# 모델 구성 로드 (config.json 포함)
model_config = safetensors_lib.load_config(local_model_path)

# TPU 메쉬 정의 (sharding 지원)
NUM_TPUS = len(jax.devices())
MESH = [(1, NUM_TPUS), ("fsdp", "tp")] if NUM_TPUS > 1 else [(1, 1), ("fsdp", "tp")]
mesh = jax.make_mesh(*MESH, axis_types=(jax.sharding.AxisType.Auto,) * len(MESH[0]))

with mesh:
    base_model = safetensors_lib.create_model_from_safe_tensors(
        local_model_path,
        model_config,
        mesh,
    )

# LoRA 하이퍼파라미터 (기본값) – 필요 시 조정
LORA_RANK = 8
LORA_ALPHA = 16

lora_provider = qwix.LoraProvider(
    module_path=".*q_einsum|.*kv_einsum|.*gate_proj|.*down_proj|.*up_proj",
    rank=LORA_RANK,
    alpha=LORA_ALPHA,
)

model_input = base_model.get_model_input()
model = qwix.apply_lora_to_model(
    base_model,
    lora_provider,
    rngs=nnx.Rngs(0),
    **model_input,
)

# 상태와 파티셔닝 정보 확보
state = nnx.state(model)
pspecs = nnx.get_partition_spec(state)
sharded_state = jax.lax.with_sharding_constraint(state, pspecs)
nnx.update(model, sharded_state)
```

## 7. 학습 파이프라인
### 7.1 하이퍼파라미터 기본값
| 파라미터 | 기본값 |
|----------|--------|
| `batch_size` | 8 |
| `learning_rate` | 5e-4 |
| `num_epochs` | 3 |
| `warmup_steps` | 100 |
| `lora_rank` | 8 |
| `lora_alpha` | 16 |
| `max_length` | 1024 |

### 7.2 옵티마이저 & 스케줄
```python
import optax

# Linear warmup + cosine decay
schedule = optax.warmup_cosine_decay_schedule(
    init_value=0.0,
    peak_value=5e-4,
    warmup_steps=100,
    decay_steps=1000,  # 전체 스텝 수에 맞게 조정
)
optimizer = optax.adamw(schedule, weight_decay=0.01)
opt_state = optimizer.init(state.params)
```
### 7.3 손실 함수 (completion‑only)
```python
import jax.numpy as jnp

def completion_only_loss(logits, labels, mask):
    log_probs = jax.nn.log_softmax(logits, axis=-1)
    token_loss = -jnp.sum(log_probs * jax.nn.one_hot(labels, logits.shape[-1]), axis=-1)
    return jnp.mean(token_loss * mask)
```
### 7.4 배치 생성기
```python
import numpy as np

def data_generator(dataset, batch_size, tokenizer):
    while True:
        idxs = np.random.choice(len(dataset), batch_size, replace=False)
        batch = [dataset[i] for i in idxs]
        # 각 샘플은 이미 tokenized dict 형태
        input_ids = np.stack([b["input_ids"] for b in batch])
        attention_mask = np.stack([b["attention_mask"] for b in batch])
        # 라벨은 입력과 동일 (completion‑only 마스크는 아래에서 생성)
        yield {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
        }
```
### 7.5 학습 스텝
```python
import os

def train_step(state, opt_state, batch):
    def loss_fn(params):
        logits = model.apply(params, batch["input_ids"], rngs=nnx.Rngs(0))
        # 마스크: 프롬프트 부분을 0, completion 부분을 1 로 가정 (예시)
        mask = batch["attention_mask"]  # 실제로는 프롬프트 마스크를 조정 필요
        loss = completion_only_loss(logits, batch["input_ids"], mask)
        return loss, logits
    (loss, _), grads = jax.value_and_grad(loss_fn, has_aux=True)(state.params)
    updates, new_opt_state = optimizer.update(grads, opt_state, state.params)
    new_params = optax.apply_updates(state.params, updates)
    new_state = state.replace(params=new_params)
    return new_state, new_opt_state, loss
```
### 7.6 전체 학습 루프 (예시)
```python
train_dataset = MobileActionDataset(data_file, tokenizer)
train_gen = data_generator(train_dataset, batch_size=8, tokenizer=tokenizer)

num_steps = 1000  # 예시, 실제는 `num_epochs * len(train_dataset) // batch_size`
for step in range(1, num_steps + 1):
    batch = next(train_gen)
    state, opt_state, loss = train_step(state, opt_state, batch)
    if step % 100 == 0:
        print(f"Step {step}/{num_steps} – loss: {loss:.4f}")
    if step % 500 == 0:
        ckpt_dir = f"/content/checkpoints/step_{step}"
        os.makedirs(ckpt_dir, exist_ok=True)
        nnx.save(state, ckpt_dir)
        print(f"Checkpoint saved at {ckpt_dir}")
```

## 8. 평가 및 검증
### 8.1 평가 메트릭
```python
from datasets import load_metric
bleu = load_metric("bleu")
exact_match = load_metric("accuracy")
```
### 8.2 검증 루프 (간단 예시)
```python
def evaluate(state, dataset, tokenizer, batch_size=8):
    gen = data_generator(dataset, batch_size, tokenizer)
    total_bleu, total_em, count = 0.0, 0.0, 0
    for _ in range(100):  # 샘플 수 제한 (예시)
        batch = next(gen)
        logits = model.apply(state.params, batch["input_ids"], rngs=nnx.Rngs(0))
        pred_ids = jnp.argmax(logits, axis=-1)
        preds = tokenizer.batch_decode(pred_ids, skip_special_tokens=True)
        refs = tokenizer.batch_decode(batch["input_ids"], skip_special_tokens=True)
        total_bleu += bleu.compute(predictions=preds, references=[[r] for r in refs])["bleu"]
        total_em += exact_match.compute(predictions=preds, references=refs)["accuracy"]
        count += 1
    print(f"BLEU: {total_bleu/count:.4f}, Exact Match: {total_em/count:.4f}")
```
### 8.3 샘플 인퍼런스
```python
def generate_api_call(prompt: str):
    tokenized = tokenizer(prompt, return_tensors="np")
    logits = model.apply(state.params, tokenized["input_ids"], rngs=nnx.Rngs(0))
    generated_ids = jnp.argmax(logits, axis=-1)
    return tokenizer.decode(generated_ids[0], skip_special_tokens=True)

sample_prompt = "Turn on Bluetooth and open the camera."
print("Generated API call:", generate_api_call(sample_prompt))
```

## 9. TPU 성능 지표 (참고)
- **Throughput**: 약 1‑2 samples/second (무료 티어 기준, 실제는 배치·시퀀스 길이에 따라 변동) 
- **Latency**: 200‑400 ms 수준 (실험에 따라 차이) 
> 정확한 수치는 실행 환경에 따라 달라지므로, `jax.profiler` 로 프로파일링을 권장합니다.

## 10. 모델 배포 옵션
| 옵션 | 설명 | 장점 | 단점 |
|------|------|------|------|
| Colab TPU 직접 서비스 | 학습 후 동일 노트북에서 `jax.jit` 기반 inference | 설정 간단, 비용 없음 | 세션 종료 시 사라짐 |
| Cloud TPU 인스턴스 | 별도 프로젝트에 TPU 클러스터 생성 후 장기 운영 | 자동 스케일링, 지속성 | 사용량 기반 비용 발생 |
| SavedModel / JAX‑to‑TF 변환 | `jax2tf` 로 TensorFlow SavedModel 생성 | Edge 디바이스(Android, iOS) 배포 가능 | 변환 시 일부 연산 호환성 이슈 가능 |
| Edge 디바이스 직접 배포 | 변환된 모델을 모바일·IoT에 탑재 | 로컬 추론, 네트워크 비용 절감 | 메모리·연산 제한에 맞춘 경량화 필요 |

## 11. 트러블슈팅 & 베스트 프랙티스
| 문제 | 원인 | 해결 방법 |
|------|------|-----------|
| **sharding mismatch** | 메쉬 정의와 파라미터 파티셔닝 불일치 | `mesh` 정의 재검토, `nnx.get_partition_spec` 출력 확인 |
| **OOM** | 배치·시퀀스 길이가 TPU 메모리 초과 | 배치 크기 감소, `max_length` 축소, `gradient_checkpointing` 활용 |
| **JAX/XLA 버전 충돌** | `jax`와 `jaxlib` 버전 불일치 | `pip install -U "jax[tpu]==0.4.*" "jaxlib==0.4.*"` 로 동일 버전 재설치 |
| **LoRA 적용 실패** | `module_path` 정규식이 모델 구조와 맞지 않음 | `print(base_model)` 로 레이어 이름 확인 후 정규식 수정 |
| **학습 속도 저하** | `pmap` 대신 `pjit` 미사용, 디바이스 간 통신 병목 | `jax.profiler` 로 병목 파악 후 `pjit` 전환 검토 |

### 베스트 프랙티스 요약
- **단일 TPU(v5e‑1)에서 작은 배치·짧은 epoch** 으로 빠르게 검증
- **LoRA rank/alpha** 기본값 8/16 사용, 필요 시 메모리·성능에 맞게 조정
- **로그 모니터링**: `jax.debug.print` 와 TensorBoard (`%tensorboard --logdir logs`) 활용
- **체크포인트**: 500 스텝마다 저장, `nnx.save` 로 전체 파라미터와 옵티마이저 상태 보존

## 12. 라이선스 및 참고 문헌
- **FunctionGemma 모델**: Hugging Face Hub 에서 제공되는 모델 라이선스는 해당 페이지에 명시된 **Apache‑2.0** 또는 **MIT** 등 공개 라이선스를 따릅니다. 사용 전 반드시 모델 페이지의 `LICENSE` 파일을 확인하세요.
- **Mobile‑Action 데이터셋**: 데이터셋 페이지에 명시된 **Creative Commons Attribution 4.0 (CC‑BY‑4.0)** 라이선스를 따릅니다.
- **Tunix**: Google Open Source 라이선스 (Apache‑2.0) 적용 – 자세한 내용은 GitHub 레포지터리 `LICENSE` 파일 참고.

### 참고 문헌
1. Euno News, “Google TPU에서 Tunix를 활용한 Easy FunctionGemma 파인튜닝”, 2026‑02‑03, <https://euno.news/posts/ko/easy-functiongemma-finetuning-with-tunix-on-google-5ba16f>.
2. Google Developers Blog, “Easy FunctionGemma fine‑tuning with Tunix on Google TPUs”, 2026, <https://developers.googleblog.com/easy-functiongemma-finetuning-with-tunix-on-google-tpus/>.
3. LoRA 논문, *Low‑Rank Adaptation of Large Language Models*, 2021.
4. JAX 공식 문서, <https://jax.readthedocs.io/>.
5. Optax 최적화 라이브러리, <https://optax.readthedocs.io/>.
6. Hugging Face Hub, FunctionGemma‑270M‑IT 모델 페이지, <https://huggingface.co/google/functiongemma-270m-it>.
7. Hugging Face Hub, Mobile‑Action 데이터셋 페이지, <https://huggingface.co/datasets/google/mobile-actions>.

---
*본 문서는 2026‑02‑03 기준 공개된 자료를 기반으로 작성되었습니다. 최신 버전·옵션에 대한 상세 내용은 각 공식 문서를 참고하시기 바랍니다.*