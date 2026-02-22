---
title: "AWS NAT Gateway 비용 함정 및 Terraform 해결법"
description: "S3와 NAT 게이트웨이 조합으로 발생하는 높은 데이터 전송 비용과 이를 방지하기 위한 VPC 엔드포인트 설정 방법을 Terraform 예제로 설명합니다."
category: "Guide"
tags: ["AWS", "NAT Gateway", "Cost Optimization", "Terraform", "VPC Endpoint"]
status: deleted
issueNumber: 0
createdAt: "2026-02-22T02:00:00Z"
updatedAt: "2026-02-22T02:00:00Z"
---

# AWS NAT Gateway 비용 함정 및 Terraform 해결법

## 개요
AWS에서 프라이빗 서브넷에 배치된 EC2 인스턴스가 인터넷에 접근할 때 일반적으로 **관리형 NAT Gateway** 를 사용합니다. NAT Gateway는 편리하지만, **S3와 같은 퍼블릭 서비스 엔드포인트** 로 트래픽이 나갈 경우 예상치 못한 비용이 발생할 수 있습니다. 이 문서는 해당 비용 함정을 설명하고, **VPC 엔드포인트** 를 활용한 비용 절감 방법을 Terraform 예제로 제공합니다.

## 문제 상황
- EC2 인스턴스는 퍼블릭 IP 없이 프라이빗 서브넷에 존재합니다.
- 아웃바운드 트래픽은 NAT Gateway 를 통해 인터넷으로 라우팅됩니다.
- 인스턴스가 **Amazon S3** 에서 데이터를 가져오면, 트래픽 흐름은:
  1. 프라이빗 서브넷 → NAT Gateway → 인터넷 게이트웨이 → 퍼블릭 S3 엔드포인트
  2. 다시 인터넷 게이트웨이 → NAT Gateway → 프라이빗 서브넷
- S3는 퍼블릭 서비스이므로 데이터가 **AWS 백본을 떠나 두 번** 측정됩니다. 예를 들어 하루에 **10 TB** 를 다운로드하는 파이프라인이라면 실제 청구는 **20 TB** 의 아웃바운드 트래픽이 됩니다.

## 비용 상세
- **NAT Gateway 시간당 가동 비용** (정확한 금액은 AWS 요금표를 참고) 
- **NAT Gateway 처리 수수료** – **GB당 $0.045**
- **표준 인터넷 아웃바운드 요금** (AWS 리전별 요금 적용)

> 위 비용은 euno.news 기사에 명시된 내용이며, 실제 금액은 사용 중인 리전 및 요금제에 따라 달라질 수 있습니다. 

## 해결책: S3용 VPC 게이트웨이 엔드포인트
VPC **Gateway Endpoint** 를 S3에 대해 생성하면 트래픽이 **완전히 AWS 백본 내**에 머무르게 됩니다. 이렇게 하면:
- NAT Gateway 를 우회하므로 NAT 비용이 사라집니다.
- 내부 전송 비용이 **$0.00** 으로 감소합니다.

### Terraform 예시
```hcl
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
}
```
위 코드는 현재 VPC에 S3 전용 **Gateway Endpoint** 를 생성합니다. 적용 후, 프라이빗 서브넷의 라우팅 테이블에 자동으로 엔드포인트가 추가되어 S3 트래픽이 NAT Gateway 를 통과하지 않게 됩니다.

## 왜 중요한가?
- **데이터 중력**(Data Gravity) 은 비용을 결정하는 핵심 요소이며, 라우팅 경로가 비용에 직접적인 영향을 미칩니다.
- 잘못된 라우팅 설계는 **수십만 달러** 규모의 불필요한 비용을 초래할 수 있습니다.
- VPC 엔드포인트를 활용하면 비용을 크게 절감하면서도 보안 및 성능을 유지할 수 있습니다.

## 참고 자료
- 원본 기사: [$100k AWS 라우팅 함정: S3 + NAT 게이트웨이와 Terraform 해결법](https://euno.news/posts/ko/the-100k-aws-routing-trap-s3-nat-gateways-and-how-307ce6) (euno.news)
- AWS 공식 문서: VPC 엔드포인트 – Gateway 타입 (AWS Documentation)

---
*이 문서는 자동 생성된 뉴스 인텔리전스 정보를 기반으로 작성되었습니다.*