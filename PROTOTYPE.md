# SEPilot Wiki

- next.js + react + typescript + vite + bun 으로 프로젝트를 구성
- github와 결합. github api를 통해 wiki 를 관리
- github pages를 통해 wiki frontend 구성. astro 처럼 github actions로 gh pages 빌드할때 frontend 페이지 업데이트
- github의 wiki 수정 시 github actions로 trigger 하여 github pages 내용 업데이트
- github issue에 사용자가 label로 "request" 로 한 경우 사용자 요청에 맞게 글을 작성. 대신 AI가 작성했으며 검토가 안되었음을 표기
- 이후 maitainer가 수정할 부분을 해당 issue comment에 남기면 wiki 가 업데이트 됨
- issue가 close 되면 wiki에서 (초안) 이라고 표현된 부분은 제거됨
- 만약 사용자가 label로 "invalid" 라는 레이블을 달리고 maintainer가 문제로 인식하면 wiki에는 "잘못됨, 수정 필요" 라는 문구가 페이지 최상단에 도입됨
- wiki는 cron 스케쥴에 의해 특정 정보를 수집하는 workflow 를 통해 스스로 문서 업데이트가 가능. ex) k8s 의 node 상태, 주요 서비스들의 health 상태, 특정 서비스의 gitops 상태 등


## 프로젝트 목적
wiki 데이터는 github wiki를 활용하여 백엔드로 사용
github issue로 사용자와 소통하며 AI/Agent가 개입을 하여 wiki 문서를 생성 / 수정 / 유지보수를 진행
직접적인 수정도 가능하지만 AI 를 활용한 수정도 지원
ai agent를 통해 살아 있는 wiki, 스스로 정보를 조회하는 wiki가 되는게 목표

