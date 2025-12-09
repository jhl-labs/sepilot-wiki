/**
 * Kubernetes 노드 정보 수집 Collector (멀티 클러스터 + Plotly 시각화)
 *
 * 환경변수:
 * - KUBECONFIG: kubeconfig 파일 경로 (선택)
 * - DEBUG: "true"로 설정 시 상세 로그 출력
 *
 * 출력: wiki/dashboard/nodes.md
 */

import { BaseCollector, execCommand, formatMemory, formatDateKR } from './base.js';

const DEBUG = process.env.DEBUG === 'true';

function debug(message) {
  if (DEBUG) {
    console.log(`   [DEBUG] ${message}`);
  }
}

export class K8sNodesCollector extends BaseCollector {
  name = 'k8s-nodes';
  outputPath = 'dashboard/nodes.md';

  getFrontmatter() {
    return {
      title: 'Kubernetes 클러스터 대시보드',
      description: '멀티 클러스터 노드 상태 및 리소스 현황',
      category: 'Dashboard',
      tags: ['kubernetes', 'cluster', 'nodes', 'infrastructure', 'monitoring'],
      status: 'published',
    };
  }

  async isEnabled() {
    // kubectl 존재 확인
    debug('kubectl 확인 중...');
    const kubectlExists = execCommand('which kubectl', { throwOnError: false });
    if (!kubectlExists) {
      console.log('   ⚠️ kubectl이 설치되어 있지 않음');
      return false;
    }
    debug(`kubectl 경로: ${kubectlExists}`);

    // kubeconfig 파일 확인
    const kubeconfigPath = process.env.KUBECONFIG || '~/.kube/config';
    debug(`KUBECONFIG: ${kubeconfigPath}`);

    // 클러스터 연결 테스트
    const contexts = execCommand('kubectl config get-contexts -o name 2>&1', { throwOnError: false });
    if (!contexts || contexts.includes('error')) {
      console.log('   ⚠️ kubeconfig를 읽을 수 없음');
      debug(`상세 오류: ${contexts}`);
      return false;
    }

    const contextList = contexts.split('\n').filter(c => c.trim());
    console.log(`   🔗 발견된 클러스터: ${contextList.length}개`);
    debug(`컨텍스트 목록: ${contextList.join(', ')}`);

    return contextList.length > 0;
  }

  async collect() {
    // 모든 컨텍스트 가져오기
    const contextsOutput = execCommand('kubectl config get-contexts -o name', { throwOnError: false });
    if (!contextsOutput) {
      console.log('   ❌ 컨텍스트 목록을 가져올 수 없음');
      return null;
    }

    const contexts = contextsOutput.split('\n').filter(c => c.trim());
    const clusters = [];

    for (const context of contexts) {
      debug(`클러스터 조회 중: ${context}`);
      const clusterData = await this.collectCluster(context);
      if (clusterData) {
        clusters.push(clusterData);
      }
    }

    if (clusters.length === 0) {
      console.log('   ⚠️ 조회 가능한 클러스터가 없음');
      return null;
    }

    return {
      clusters,
      collectedAt: new Date().toISOString(),
    };
  }

  async collectCluster(context) {
    try {
      // 컨텍스트 전환
      const useContext = execCommand(`kubectl config use-context ${context} 2>&1`, { throwOnError: false });
      if (!useContext || useContext.includes('error')) {
        debug(`컨텍스트 전환 실패: ${useContext}`);
        return null;
      }

      // 클러스터 연결 테스트
      const clusterInfo = execCommand('kubectl cluster-info 2>&1 | head -1', { throwOnError: false });
      if (!clusterInfo || clusterInfo.includes('Unable') || clusterInfo.includes('error')) {
        debug(`클러스터 연결 실패 (${context}): ${clusterInfo}`);
        return {
          name: context,
          status: 'unreachable',
          error: clusterInfo || 'Connection failed',
          nodes: [],
        };
      }

      // 노드 목록 (JSON)
      const nodesJson = execCommand('kubectl get nodes -o json 2>&1', { throwOnError: false });
      if (!nodesJson || nodesJson.includes('error')) {
        debug(`노드 조회 실패 (${context}): ${nodesJson}`);
        return {
          name: context,
          status: 'error',
          error: nodesJson || 'Failed to get nodes',
          nodes: [],
        };
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

        // 메모리를 숫자로 파싱 (Gi 단위)
        const memoryGi = this.parseMemoryToGi(capacity.memory);
        const allocatableMemoryGi = this.parseMemoryToGi(allocatable.memory);

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
          cpu: parseInt(capacity.cpu || '0'),
          memory: memoryGi,
          allocatableCpu: parseInt(allocatable.cpu || '0'),
          allocatableMemory: allocatableMemoryGi,
          containerRuntime: nodeInfo.containerRuntimeVersion || 'unknown',
          internalIP: (status.addresses || []).find(a => a.type === 'InternalIP')?.address || 'unknown',
          createdAt: node.metadata.creationTimestamp,
        });
      }

      // 클러스터 버전 정보
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

      console.log(`   ✅ ${context}: ${nodeList.length}개 노드`);

      return {
        name: context,
        status: 'connected',
        serverVersion,
        nodes: nodeList,
      };
    } catch (error) {
      debug(`클러스터 수집 예외 (${context}): ${error.message}`);
      return {
        name: context,
        status: 'error',
        error: error.message,
        nodes: [],
      };
    }
  }

  parseMemoryToGi(memory) {
    if (!memory) return 0;
    const value = parseInt(memory.replace(/[^0-9]/g, ''));
    if (memory.includes('Ki')) {
      return parseFloat((value / 1024 / 1024).toFixed(1));
    }
    if (memory.includes('Mi')) {
      return parseFloat((value / 1024).toFixed(1));
    }
    if (memory.includes('Gi')) {
      return value;
    }
    return 0;
  }

  generateMarkdown(data) {
    const { clusters, collectedAt } = data;

    // 전체 통계 계산
    const connectedClusters = clusters.filter(c => c.status === 'connected');
    const allNodes = connectedClusters.flatMap(c => c.nodes);
    const readyNodes = allNodes.filter(n => n.status === 'Ready');
    const totalCpu = allNodes.reduce((sum, n) => sum + n.cpu, 0);
    const totalMemory = allNodes.reduce((sum, n) => sum + n.memory, 0);

    let md = `# Kubernetes 클러스터 대시보드

> 마지막 업데이트: ${formatDateKR(collectedAt)}

## 전체 요약

| 항목 | 값 |
|------|------|
| 클러스터 | ${connectedClusters.length}개 연결 / ${clusters.length}개 등록 |
| 전체 노드 | ${allNodes.length}개 (Ready: ${readyNodes.length}개) |
| 전체 CPU | ${totalCpu} cores |
| 전체 메모리 | ${totalMemory.toFixed(1)} Gi |

`;

    // 클러스터별 리소스 비교 차트 (Pie + Bar)
    if (connectedClusters.length > 0) {
      md += this.generateClusterOverviewCharts(connectedClusters);
    }

    // 노드 상태 분포 차트
    if (allNodes.length > 0) {
      md += this.generateNodeStatusChart(connectedClusters);
    }

    // 리소스 사용량 차트 (클러스터별 CPU/Memory)
    if (connectedClusters.length > 0) {
      md += this.generateResourceCharts(connectedClusters);
    }

    // 클러스터별 상세 정보
    md += `## 클러스터별 상세 정보

`;

    for (const cluster of clusters) {
      md += this.generateClusterSection(cluster);
    }

    return md;
  }

  generateClusterOverviewCharts(clusters) {
    // 클러스터별 노드 수 Pie 차트
    const nodeCountPie = {
      data: [{
        type: 'pie',
        labels: clusters.map(c => c.name),
        values: clusters.map(c => c.nodes.length),
        hole: 0.4,
        textinfo: 'label+value',
        marker: {
          colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
        },
      }],
      layout: {
        title: { text: '클러스터별 노드 수', font: { size: 14 } },
        showlegend: true,
        legend: { orientation: 'h', y: -0.1 },
        height: 350,
      },
    };

    // 클러스터별 CPU/Memory Bar 차트
    const resourceBar = {
      data: [
        {
          type: 'bar',
          name: 'CPU (cores)',
          x: clusters.map(c => c.name),
          y: clusters.map(c => c.nodes.reduce((sum, n) => sum + n.cpu, 0)),
          marker: { color: '#3b82f6' },
        },
        {
          type: 'bar',
          name: 'Memory (Gi)',
          x: clusters.map(c => c.name),
          y: clusters.map(c => c.nodes.reduce((sum, n) => sum + n.memory, 0)),
          marker: { color: '#10b981' },
        },
      ],
      layout: {
        title: { text: '클러스터별 리소스 총량', font: { size: 14 } },
        barmode: 'group',
        height: 350,
        xaxis: { title: '' },
        yaxis: { title: '' },
      },
    };

    return `## 클러스터 개요

\`\`\`plotly
${JSON.stringify(nodeCountPie)}
\`\`\`

\`\`\`plotly
${JSON.stringify(resourceBar)}
\`\`\`

`;
  }

  generateNodeStatusChart(clusters) {
    // 클러스터별 노드 상태 Stacked Bar
    const statusData = {
      data: [
        {
          type: 'bar',
          name: 'Ready',
          x: clusters.map(c => c.name),
          y: clusters.map(c => c.nodes.filter(n => n.status === 'Ready').length),
          marker: { color: '#10b981' },
        },
        {
          type: 'bar',
          name: 'NotReady',
          x: clusters.map(c => c.name),
          y: clusters.map(c => c.nodes.filter(n => n.status !== 'Ready').length),
          marker: { color: '#ef4444' },
        },
      ],
      layout: {
        title: { text: '클러스터별 노드 상태', font: { size: 14 } },
        barmode: 'stack',
        height: 300,
        xaxis: { title: '' },
        yaxis: { title: '노드 수' },
      },
    };

    return `## 노드 상태 분포

\`\`\`plotly
${JSON.stringify(statusData)}
\`\`\`

`;
  }

  generateResourceCharts(clusters) {
    // 모든 노드의 CPU/Memory 분포 (Scatter)
    const allNodes = clusters.flatMap(c => c.nodes.map(n => ({ ...n, cluster: c.name })));

    const scatterData = {
      data: clusters.map((cluster, idx) => ({
        type: 'scatter',
        mode: 'markers',
        name: cluster.name,
        x: cluster.nodes.map(n => n.cpu),
        y: cluster.nodes.map(n => n.memory),
        text: cluster.nodes.map(n => n.name),
        marker: {
          size: 12,
          color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][idx % 6],
        },
        hovertemplate: '<b>%{text}</b><br>CPU: %{x} cores<br>Memory: %{y} Gi<extra></extra>',
      })),
      layout: {
        title: { text: '노드별 리소스 분포', font: { size: 14 } },
        height: 400,
        xaxis: { title: 'CPU (cores)' },
        yaxis: { title: 'Memory (Gi)' },
        showlegend: true,
      },
    };

    // 노드별 CPU 히스토그램
    const cpuHistogram = {
      data: [{
        type: 'histogram',
        x: allNodes.map(n => n.cpu),
        marker: { color: '#3b82f6' },
        nbinsx: 10,
      }],
      layout: {
        title: { text: 'CPU 분포 (cores)', font: { size: 14 } },
        height: 300,
        xaxis: { title: 'CPU (cores)' },
        yaxis: { title: '노드 수' },
        bargap: 0.1,
      },
    };

    // 노드별 Memory 히스토그램
    const memHistogram = {
      data: [{
        type: 'histogram',
        x: allNodes.map(n => n.memory),
        marker: { color: '#10b981' },
        nbinsx: 10,
      }],
      layout: {
        title: { text: 'Memory 분포 (Gi)', font: { size: 14 } },
        height: 300,
        xaxis: { title: 'Memory (Gi)' },
        yaxis: { title: '노드 수' },
        bargap: 0.1,
      },
    };

    return `## 리소스 분석

\`\`\`plotly
${JSON.stringify(scatterData)}
\`\`\`

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">

\`\`\`plotly
${JSON.stringify(cpuHistogram)}
\`\`\`

\`\`\`plotly
${JSON.stringify(memHistogram)}
\`\`\`

</div>

`;
  }

  generateClusterSection(cluster) {
    let md = `### ${cluster.name}

`;

    if (cluster.status !== 'connected') {
      md += `> ⚠️ **상태**: ${cluster.status}
> ${cluster.error || '연결할 수 없습니다.'}

`;
      return md;
    }

    const readyCount = cluster.nodes.filter(n => n.status === 'Ready').length;
    const totalCpu = cluster.nodes.reduce((sum, n) => sum + n.cpu, 0);
    const totalMemory = cluster.nodes.reduce((sum, n) => sum + n.memory, 0);

    md += `| 항목 | 값 |
|------|------|
| 버전 | ${cluster.serverVersion} |
| 노드 | ${cluster.nodes.length}개 (Ready: ${readyCount}개) |
| CPU | ${totalCpu} cores |
| Memory | ${totalMemory.toFixed(1)} Gi |

`;

    // 노드 테이블
    if (cluster.nodes.length > 0) {
      md += `#### 노드 목록

| 노드명 | 상태 | 역할 | CPU | Memory | IP |
|--------|------|------|-----|--------|-----|
`;

      for (const node of cluster.nodes) {
        const statusIcon = node.status === 'Ready' ? '🟢' : '🔴';
        md += `| ${node.name} | ${statusIcon} ${node.status} | ${node.roles} | ${node.cpu} | ${node.memory}Gi | ${node.internalIP} |
`;
      }

      md += '\n';
    }

    return md;
  }
}

export default K8sNodesCollector;
