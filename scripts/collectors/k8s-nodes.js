/**
 * Kubernetes 노드 정보 수집 Collector
 *
 * 환경변수:
 * - KUBECONFIG: kubeconfig 파일 경로 (선택)
 *
 * 출력: wiki/dashboard/nodes.md
 */

import { BaseCollector, execCommand, formatMemory, formatDateKR, createTable } from './base.js';

export class K8sNodesCollector extends BaseCollector {
  name = 'k8s-nodes';
  outputPath = 'dashboard/nodes.md';

  getFrontmatter() {
    return {
      title: 'Kubernetes 노드 현황',
      description: '클러스터 노드 상태 및 리소스 정보',
      category: 'Dashboard',
      tags: ['kubernetes', 'cluster', 'nodes', 'infrastructure'],
      status: 'published',
    };
  }

  async isEnabled() {
    // kubectl 존재 확인
    const kubectlExists = execCommand('which kubectl', { throwOnError: false });
    if (!kubectlExists) {
      console.log('   ⚠️ kubectl이 설치되어 있지 않음');
      return false;
    }

    // 클러스터 연결 테스트
    const clusterInfo = execCommand('kubectl cluster-info 2>&1 | head -1', { throwOnError: false });
    if (!clusterInfo || clusterInfo.includes('error') || clusterInfo.includes('Unable')) {
      console.log('   ⚠️ Kubernetes 클러스터에 연결할 수 없음');
      return false;
    }

    console.log(`   🔗 클러스터: ${clusterInfo}`);
    return true;
  }

  async collect() {
    // 노드 목록 (JSON)
    const nodesJson = execCommand('kubectl get nodes -o json', { throwOnError: false });
    if (!nodesJson) {
      return null;
    }

    const nodes = JSON.parse(nodesJson);
    const nodeList = [];

    for (const node of nodes.items) {
      const name = node.metadata.name;
      const labels = node.metadata.labels || {};
      const status = node.status;

      // 노드 상태 확인
      const conditions = status.conditions || [];
      const readyCondition = conditions.find(c => c.type === 'Ready');
      const isReady = readyCondition?.status === 'True';

      // 리소스 정보
      const capacity = status.capacity || {};
      const allocatable = status.allocatable || {};

      // 노드 정보
      const nodeInfo = status.nodeInfo || {};

      nodeList.push({
        name,
        status: isReady ? 'Ready' : 'NotReady',
        roles: Object.keys(labels)
          .filter(k => k.startsWith('node-role.kubernetes.io/'))
          .map(k => k.replace('node-role.kubernetes.io/', ''))
          .join(', ') || 'worker',
        version: nodeInfo.kubeletVersion || 'unknown',
        os: nodeInfo.osImage || 'unknown',
        arch: nodeInfo.architecture || 'unknown',
        cpu: capacity.cpu || '0',
        memory: formatMemory(capacity.memory),
        allocatableCpu: allocatable.cpu || '0',
        allocatableMemory: formatMemory(allocatable.memory),
        containerRuntime: nodeInfo.containerRuntimeVersion || 'unknown',
        internalIP: (status.addresses || []).find(a => a.type === 'InternalIP')?.address || 'unknown',
        createdAt: node.metadata.creationTimestamp,
      });
    }

    // 클러스터 정보
    const version = execCommand('kubectl version -o json 2>/dev/null', { throwOnError: false });
    let serverVersion = 'unknown';
    if (version) {
      try {
        const versionJson = JSON.parse(version);
        serverVersion = versionJson.serverVersion?.gitVersion || 'unknown';
      } catch {
        // ignore
      }
    }

    const context = execCommand('kubectl config current-context 2>/dev/null', { throwOnError: false }) || 'unknown';

    return {
      nodes: nodeList,
      cluster: { serverVersion, context },
      collectedAt: new Date().toISOString(),
    };
  }

  generateMarkdown(data) {
    const { nodes, cluster, collectedAt } = data;
    const readyCount = nodes.filter(n => n.status === 'Ready').length;
    const totalCpu = nodes.reduce((sum, n) => sum + parseInt(n.cpu || 0), 0);
    const totalMemory = nodes.reduce((sum, n) => {
      const mem = parseFloat(n.memory.replace('Gi', ''));
      return sum + (isNaN(mem) ? 0 : mem);
    }, 0);

    let md = `# Kubernetes 노드 현황

> 마지막 업데이트: ${formatDateKR(collectedAt)}

## 클러스터 요약

${createTable(
  ['항목', '값'],
  [
    ['컨텍스트', `\`${cluster.context}\``],
    ['서버 버전', cluster.serverVersion],
    ['전체 노드', `${nodes.length}개`],
    ['Ready 노드', `${readyCount}개`],
    ['전체 CPU', `${totalCpu} cores`],
    ['전체 메모리', `${totalMemory.toFixed(1)} Gi`],
  ]
)}

## 노드 목록

${createTable(
  ['노드명', '상태', '역할', '버전', 'CPU', '메모리', 'IP'],
  nodes.map(node => [
    node.name,
    node.status === 'Ready' ? '🟢 Ready' : '🔴 NotReady',
    node.roles,
    node.version,
    node.cpu,
    node.memory,
    node.internalIP,
  ])
)}

## 노드 상세 정보

`;

    for (const node of nodes) {
      md += `### ${node.name}

${createTable(
  ['항목', '값'],
  [
    ['상태', node.status === 'Ready' ? '🟢 Ready' : '🔴 NotReady'],
    ['역할', node.roles],
    ['Kubernetes 버전', node.version],
    ['OS', node.os],
    ['아키텍처', node.arch],
    ['컨테이너 런타임', node.containerRuntime],
    ['Internal IP', node.internalIP],
    ['CPU (용량/할당가능)', `${node.cpu} / ${node.allocatableCpu}`],
    ['메모리 (용량/할당가능)', `${node.memory} / ${node.allocatableMemory}`],
    ['생성일', formatDateKR(node.createdAt)],
  ]
)}

`;
    }

    return md;
  }
}

export default K8sNodesCollector;
