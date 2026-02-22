---
title: "$100K AWS 라우팅 비용 함정: S3 + NAT 게이트웨이와 Terraform 해결법"
description: "AWS NAT 게이트웨이를 통한 S3 트래픽의 숨은 비용과 VPC 게이트웨이 엔드포인트를 활용한 해결 방법"
category: "cloud"
tags: ["AWS", "NAT Gateway", "S3", "Terraform", "비용 최적화", "VPC"]
status: "published"
issueNumber: 212
createdAt: "2026-02-22T10:00:00Z"
updatedAt: "2026-02-22T10:00:00Z"
order: 1
---

# $100K AWS 라우팅 비용 함정: S3 + NAT 게이트웨이

> "기본적으로 보안" AWS 아키텍처가 의도치 않게 비용을 폭발시킬 수 있습니다. 클라우드 비용 급증의 주요 원인은 과다 프로비저닝된 EC2가 아니라 **의도하지 않은 데이터 전송 경로**입니다.

---

## 문제: NAT 게이트웨이의 숨은 비용

### 일반적인 "보안" 아키텍처
```
Private Subnet (EC2)
    ↓ S3 요청
NAT Gateway
    ↓ 퍼블릭 S3 엔드포인트로 전송
Internet Gateway
    ↓ AWS 백본을 벗어남
S3 (퍼블릭 서비스)
```

### 왜 비용이 두 배가 되는가

1. 컴퓨트 인스턴스는 퍼블릭 IP 없이 **프라이빗 서브넷**에 배치됩니다
2. 아웃바운드 트래픽은 **관리형 NAT 게이트웨이**를 통해 라우팅됩니다
3. S3는 퍼블릭 서비스 엔드포인트이므로, 데이터가 AWS 백본을 벗어나 **두 번** 측정됩니다

하루에 10 TB를 다운로드하는 파이프라인이라면 실제로는 **20 TB의 아웃바운드**에 대해 청구됩니다.

### 청구되는 비용 항목

| 항목 | 요금 |
|------|------|
| NAT 게이트웨이 시간당 가동 비용 | ~$0.045/hr |
| NAT 게이트웨이 처리 수수료 | $0.045/GB |
| 표준 인터넷 아웃바운드 요금 | ~$0.09/GB (첫 10TB) |

> **예시**: 월 300 TB S3 다운로드 시 NAT 처리 수수료만 **$13,500/월** ($162,000/년)

---

## 해결책: S3용 VPC 게이트웨이 엔드포인트

VPC 게이트웨이 엔드포인트를 생성하면 S3 트래픽이 **AWS 백본 내부**에 머무르게 됩니다. NAT 게이트웨이를 우회하고, 내부 전송 비용이 **$0.00**으로 감소합니다.

### 변경 후 아키텍처
```
Private Subnet (EC2)
    ↓ S3 요청
VPC Gateway Endpoint
    ↓ AWS 내부 네트워크
S3 (직접 접근)
```

### Terraform 구현

```hcl
# VPC 게이트웨이 엔드포인트 생성
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
}

# 프라이빗 서브넷 라우트 테이블에 연결
resource "aws_vpc_endpoint_route_table_association" "s3" {
  route_table_id  = aws_route_table.private.id
  vpc_endpoint_id = aws_vpc_endpoint.s3.id
}
```

### 적용 확인
```bash
# 엔드포인트 상태 확인
aws ec2 describe-vpc-endpoints \
  --filters "Name=service-name,Values=com.amazonaws.ap-northeast-2.s3" \
  --query "VpcEndpoints[].State"

# S3 트래픽이 NAT를 우회하는지 확인
aws ec2 describe-route-tables \
  --route-table-ids rtb-xxxxx \
  --query "RouteTables[].Routes[?DestinationPrefixListId]"
```

---

## 추가 비용 절감 포인트

### 1. DynamoDB 게이트웨이 엔드포인트
S3와 동일하게 DynamoDB도 게이트웨이 엔드포인트를 지원합니다.

```hcl
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.region}.dynamodb"
  vpc_endpoint_type = "Gateway"
}
```

### 2. 인터페이스 엔드포인트 (PrivateLink)
ECR, CloudWatch, SSM 등 다른 AWS 서비스는 **인터페이스 엔드포인트**를 사용합니다. 시간당 비용($0.01/hr)이 있지만, NAT 처리 수수료보다 저렴할 수 있습니다.

### 3. NAT 게이트웨이 모니터링
```bash
# NAT 게이트웨이를 통한 바이트 수 확인 (CloudWatch)
aws cloudwatch get-metric-statistics \
  --namespace AWS/NATGateway \
  --metric-name BytesOutToDestination \
  --dimensions Name=NatGatewayId,Value=nat-xxxxx \
  --start-time 2026-02-01T00:00:00Z \
  --end-time 2026-02-22T00:00:00Z \
  --period 86400 \
  --statistics Sum
```

---

## 핵심 원칙

> **데이터 중력**이 기본 비용을 결정하고, **라우팅**이 그 비용에 곱해지는 배수를 결정합니다.

1. **VPC 엔드포인트를 기본으로** – S3, DynamoDB는 게이트웨이 엔드포인트를 항상 생성
2. **NAT 트래픽을 모니터링** – CloudWatch 메트릭으로 예상치 못한 데이터 전송 감지
3. **Terraform 모듈화** – VPC 모듈에 엔드포인트를 기본 포함시켜 누락 방지

---

## 참고 자료

- [원본 기사: $100k AWS 라우팅 함정 (euno.news)](https://euno.news/posts/ko/the-100k-aws-routing-trap-s3-nat-gateways-and-how-307ce6)
- [AWS VPC 엔드포인트 공식 문서](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html)
- [Terraform aws_vpc_endpoint 리소스](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint)

---

*이 문서는 Issue #212를 기반으로 작성되었습니다.*
