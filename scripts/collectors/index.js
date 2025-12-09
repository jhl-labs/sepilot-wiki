/**
 * Collector 플러그인 레지스트리
 *
 * 새로운 Collector를 추가하려면:
 * 1. collectors/ 폴더에 새 파일 생성 (예: my-collector.js)
 * 2. BaseCollector를 상속하여 구현
 * 3. 여기에 import하고 collectors 배열에 추가
 */

import K8sNodesCollector from './k8s-nodes.js';

/**
 * 등록된 모든 Collector 클래스
 * 새로운 Collector는 여기에 추가
 */
export const collectors = [
  K8sNodesCollector,
  // 예시: 향후 추가될 Collector들
  // K8sPodsCollector,
  // K8sServicesCollector,
  // SystemMetricsCollector,
  // GitStatsCollector,
];

/**
 * 모든 Collector 인스턴스 생성
 */
export function createCollectors() {
  return collectors.map(CollectorClass => new CollectorClass());
}

/**
 * 특정 이름의 Collector만 실행
 */
export function getCollectorByName(name) {
  const CollectorClass = collectors.find(C => new C().name === name);
  return CollectorClass ? new CollectorClass() : null;
}

export default { collectors, createCollectors, getCollectorByName };
