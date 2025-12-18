#!/bin/bash

# SEPilot Wiki - 개발용 Docker 실행 스크립트
# 인증 없이 바로 실행 가능한 간단한 구성

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SEPilot Wiki - Docker 개발 환경${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 환경 변수 파일 확인
if [ -f "docker/.env" ]; then
    echo -e "${GREEN}✓ 환경 변수 파일 발견: docker/.env${NC}"
    export $(grep -v '^#' docker/.env | xargs)
else
    echo -e "${YELLOW}! 환경 변수 파일 없음 (기본값 사용)${NC}"
    echo -e "${YELLOW}  GitHub 기능을 사용하려면 docker/.env.docker를 docker/.env로 복사 후 설정하세요${NC}"
fi

echo ""

# 명령어 처리
case "${1:-up}" in
    up|start)
        echo -e "${GREEN}▶ Wiki 서비스 시작 중...${NC}"
        docker compose -f docker/docker-compose.dev.yml up --build -d

        echo ""
        echo -e "${GREEN}✓ 서비스 시작 완료!${NC}"
        echo ""
        echo -e "  ${BLUE}Wiki:${NC}  http://localhost:3001"
        echo -e "  ${BLUE}API:${NC}   http://localhost:3001/api/health"
        echo ""
        echo -e "  로그 보기: ${YELLOW}docker compose -f docker/docker-compose.dev.yml logs -f${NC}"
        echo -e "  중지하기:  ${YELLOW}./docker/run-dev.sh down${NC}"
        ;;

    down|stop)
        echo -e "${YELLOW}▶ 서비스 중지 중...${NC}"
        docker compose -f docker/docker-compose.dev.yml down
        echo -e "${GREEN}✓ 서비스 중지 완료${NC}"
        ;;

    restart)
        echo -e "${YELLOW}▶ 서비스 재시작 중...${NC}"
        docker compose -f docker/docker-compose.dev.yml restart
        echo -e "${GREEN}✓ 서비스 재시작 완료${NC}"
        ;;

    rebuild)
        echo -e "${YELLOW}▶ 이미지 재빌드 중...${NC}"
        docker compose -f docker/docker-compose.dev.yml build --no-cache
        docker compose -f docker/docker-compose.dev.yml up -d
        echo -e "${GREEN}✓ 재빌드 완료${NC}"
        ;;

    logs)
        docker compose -f docker/docker-compose.dev.yml logs -f
        ;;

    status)
        echo -e "${BLUE}▶ 서비스 상태:${NC}"
        docker compose -f docker/docker-compose.dev.yml ps
        ;;

    clean)
        echo -e "${RED}▶ 모든 데이터 삭제 중...${NC}"
        docker compose -f docker/docker-compose.dev.yml down -v
        echo -e "${GREEN}✓ 정리 완료${NC}"
        ;;

    *)
        echo "사용법: $0 {up|down|restart|rebuild|logs|status|clean}"
        echo ""
        echo "명령어:"
        echo "  up, start   - 서비스 시작 (기본값)"
        echo "  down, stop  - 서비스 중지"
        echo "  restart     - 서비스 재시작"
        echo "  rebuild     - 이미지 재빌드 후 시작"
        echo "  logs        - 로그 보기"
        echo "  status      - 서비스 상태 확인"
        echo "  clean       - 모든 데이터 삭제"
        exit 1
        ;;
esac
