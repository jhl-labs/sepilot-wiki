/**
 * Kubernetes 클러스터 O11y 대시보드 Collector
 *
 * 수집 정보:
 * - 노드 상태 및 리소스 (capacity/allocatable)
 * - 실시간 리소스 사용량 (kubectl top)
 * - 위험 이벤트 (Warning events)
 * - Pod 상태 요약
 *
 * 환경변수:
 * - KUBECONFIG: kubeconfig 파일 경로 (선택)
 * - DEBUG: "true"로 설정 시 상세 로그 출력
 *
 * 출력: wiki/dashboard/k8s-overview.md
 */

import { BaseCollector, execCommand, formatDateKR } from './base.js';

const DEBUG = process.env.DEBUG === 'true';

function debug(message) {
  if (DEBUG) {
    console.log(`   [DEBUG] ${message}`);
  }
}

// 색상 팔레트
const COLORS = {
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  orange: '#f97316',
  gray: '#6b7280',
};

export class K8sNodesCollector extends BaseCollector {
  name = 'k8s-nodes';
  outputPath = 'dashboard/k8s-overview.md';

  getFrontmatter() {
    return {
      title: 'Kubernetes 클러스터 대시보드',
      description: '멀티 클러스터 O11y 현황 - 리소스 사용량, 이벤트, Pod 상태',
      category: 'Dashboard',
      tags: ['kubernetes', 'o11y', 'monitoring', 'infrastructure'],
      status: 'published',
    };
  }

  async isEnabled() {
    debug('kubectl 확인 중...');
    const kubectlExists = execCommand('which kubectl', { throwOnError: false });
    if (!kubectlExists) {
      console.log('   ⚠️ kubectl이 설치되어 있지 않음');
      return false;
    }
    debug(`kubectl 경로: ${kubectlExists}`);

    const kubeconfigPath = process.env.KUBECONFIG || '~/.kube/config';
    debug(`KUBECONFIG: ${kubeconfigPath}`);

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
      const useContext = execCommand(`kubectl config use-context ${context} 2>&1`, { throwOnError: false });
      if (!useContext || useContext.includes('error')) {
        debug(`컨텍스트 전환 실패: ${useContext}`);
        return null;
      }

      const clusterInfo = execCommand('kubectl cluster-info 2>&1 | head -1', { throwOnError: false });
      if (!clusterInfo || clusterInfo.includes('Unable') || clusterInfo.includes('error')) {
        debug(`클러스터 연결 실패 (${context}): ${clusterInfo}`);
        return { name: context, status: 'unreachable', error: clusterInfo || 'Connection failed' };
      }

      // 1. 노드 정보 수집
      const nodes = await this.collectNodes();

      // 2. 노드별 리소스 사용량 (kubectl top)
      const nodeMetrics = await this.collectNodeMetrics();

      // 3. Pod 상태 요약
      const podSummary = await this.collectPodSummary();

      // 4. Warning 이벤트 수집
      const events = await this.collectEvents(context);

      // 5. 클러스터 버전
      const version = execCommand('kubectl version -o json 2>/dev/null', { throwOnError: false });
      let serverVersion = 'unknown';
      if (version) {
        try {
          const versionJson = JSON.parse(version);
          serverVersion = versionJson.serverVersion?.gitVersion || 'unknown';
        } catch { /* ignore */ }
      }

      // 노드와 메트릭 병합
      const mergedNodes = this.mergeNodeMetrics(nodes, nodeMetrics);

      console.log(`   ✅ ${context}: ${nodes.length}개 노드, ${podSummary.total}개 Pod, ${events.length}개 이벤트`);

      return {
        name: context,
        status: 'connected',
        serverVersion,
        nodes: mergedNodes,
        podSummary,
        events,
      };
    } catch (error) {
      debug(`클러스터 수집 예외 (${context}): ${error.message}`);
      return { name: context, status: 'error', error: error.message };
    }
  }

  async collectNodes() {
    const nodesJson = execCommand('kubectl get nodes -o json 2>&1', { throwOnError: false });
    if (!nodesJson || nodesJson.includes('error')) return [];

    try {
      const nodes = JSON.parse(nodesJson);
      return nodes.items.map(node => {
        const name = node.metadata.name;
        const labels = node.metadata.labels || {};
        const status = node.status;
        const conditions = status.conditions || [];

        const readyCondition = conditions.find(c => c.type === 'Ready');
        const isReady = readyCondition?.status === 'True';

        const issues = conditions
          .filter(c => c.type !== 'Ready' && c.status === 'True')
          .map(c => c.type);

        const capacity = status.capacity || {};
        const allocatable = status.allocatable || {};
        const nodeInfo = status.nodeInfo || {};

        return {
          name,
          status: isReady ? 'Ready' : 'NotReady',
          issues,
          roles: Object.keys(labels)
            .filter(k => k.startsWith('node-role.kubernetes.io/'))
            .map(k => k.replace('node-role.kubernetes.io/', ''))
            .join(', ') || 'worker',
          version: nodeInfo.kubeletVersion || 'unknown',
          os: nodeInfo.osImage || 'unknown',
          arch: nodeInfo.architecture || 'unknown',
          cpuCapacity: parseInt(capacity.cpu || '0'),
          cpuAllocatable: parseInt(allocatable.cpu || '0'),
          memoryCapacity: this.parseMemoryToGi(capacity.memory),
          memoryAllocatable: this.parseMemoryToGi(allocatable.memory),
          podsCapacity: parseInt(capacity.pods || '110'),
          containerRuntime: nodeInfo.containerRuntimeVersion || 'unknown',
          internalIP: (status.addresses || []).find(a => a.type === 'InternalIP')?.address || 'unknown',
          createdAt: node.metadata.creationTimestamp,
          cpuUsage: null,
          memoryUsage: null,
          cpuPercent: null,
          memoryPercent: null,
        };
      });
    } catch (e) {
      debug(`노드 파싱 실패: ${e.message}`);
      return [];
    }
  }

  async collectNodeMetrics() {
    const topOutput = execCommand('kubectl top nodes --no-headers 2>/dev/null', { throwOnError: false });
    if (!topOutput) return [];

    return topOutput.split('\n').filter(l => l.trim()).map(line => {
      const parts = line.trim().split(/\s+/);
      const [name, cpuCores, cpuPercent, memBytes, memPercent] = parts;
      return {
        name,
        cpuUsage: this.parseCpuCores(cpuCores),
        cpuPercent: parseInt(cpuPercent?.replace('%', '') || '0'),
        memoryUsage: this.parseMemoryToGi(memBytes),
        memoryPercent: parseInt(memPercent?.replace('%', '') || '0'),
      };
    });
  }

  mergeNodeMetrics(nodes, metrics) {
    const metricsMap = new Map(metrics.map(m => [m.name, m]));
    return nodes.map(node => {
      const metric = metricsMap.get(node.name);
      if (metric) {
        return {
          ...node,
          cpuUsage: metric.cpuUsage,
          memoryUsage: metric.memoryUsage,
          cpuPercent: metric.cpuPercent,
          memoryPercent: metric.memoryPercent,
        };
      }
      return node;
    });
  }

  async collectPodSummary() {
    const podsJson = execCommand('kubectl get pods -A -o json 2>/dev/null', { throwOnError: false });
    const defaultSummary = { total: 0, running: 0, pending: 0, failed: 0, succeeded: 0, unknown: 0, byNamespace: {} };

    if (!podsJson) {
      debug('Pod 조회 실패: 출력 없음');
      return defaultSummary;
    }

    try {
      const pods = JSON.parse(podsJson);
      const summary = { ...defaultSummary };

      for (const pod of (pods.items || [])) {
        summary.total++;
        const phase = pod.status?.phase || 'Unknown';
        const ns = pod.metadata?.namespace || 'default';

        if (!summary.byNamespace[ns]) {
          summary.byNamespace[ns] = { total: 0, running: 0, pending: 0, failed: 0 };
        }
        summary.byNamespace[ns].total++;

        switch (phase) {
          case 'Running':
            summary.running++;
            summary.byNamespace[ns].running++;
            break;
          case 'Pending':
            summary.pending++;
            summary.byNamespace[ns].pending++;
            break;
          case 'Failed':
            summary.failed++;
            summary.byNamespace[ns].failed++;
            break;
          case 'Succeeded':
            summary.succeeded++;
            break;
          default:
            summary.unknown++;
        }
      }

      debug(`Pod 수집 완료: ${summary.total}개`);
      return summary;
    } catch (e) {
      debug(`Pod 파싱 실패: ${e.message}`);
      return defaultSummary;
    }
  }

  async collectEvents(clusterName) {
    const eventsJson = execCommand(
      'kubectl get events -A --field-selector type=Warning -o json 2>/dev/null',
      { throwOnError: false }
    );
    if (!eventsJson) return [];

    try {
      const events = JSON.parse(eventsJson);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      return (events.items || [])
        .filter(e => {
          const eventTime = new Date(e.lastTimestamp || e.eventTime || e.metadata.creationTimestamp).getTime();
          return eventTime > oneHourAgo;
        })
        .map(e => ({
          cluster: clusterName,
          namespace: e.metadata.namespace,
          name: e.involvedObject?.name || 'unknown',
          kind: e.involvedObject?.kind || 'unknown',
          reason: e.reason,
          message: e.message,
          count: e.count || 1,
          lastSeen: e.lastTimestamp || e.eventTime || e.metadata.creationTimestamp,
        }))
        .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
        .slice(0, 20);
    } catch (e) {
      debug(`이벤트 파싱 실패: ${e.message}`);
      return [];
    }
  }

  parseCpuCores(cpu) {
    if (!cpu) return 0;
    if (cpu.includes('m')) {
      return parseFloat((parseInt(cpu.replace('m', '')) / 1000).toFixed(2));
    }
    return parseFloat(cpu);
  }

  parseMemoryToGi(memory) {
    if (!memory) return 0;
    const value = parseInt(memory.replace(/[^0-9]/g, ''));
    if (memory.includes('Ki')) return parseFloat((value / 1024 / 1024).toFixed(1));
    if (memory.includes('Mi')) return parseFloat((value / 1024).toFixed(1));
    if (memory.includes('Gi')) return value;
    if (memory.includes('Ti')) return value * 1024;
    return 0;
  }

  generateMarkdown(data) {
    const { clusters, collectedAt } = data;
    const connectedClusters = clusters.filter(c => c.status === 'connected');
    const allNodes = connectedClusters.flatMap(c => c.nodes || []);
    const allEvents = connectedClusters.flatMap(c => c.events || []);
    const readyNodes = allNodes.filter(n => n.status === 'Ready');
    const totalCpu = allNodes.reduce((sum, n) => sum + n.cpuCapacity, 0);
    const totalMemory = allNodes.reduce((sum, n) => sum + n.memoryCapacity, 0);
    const totalPods = connectedClusters.reduce((sum, c) => sum + (c.podSummary?.total || 0), 0);
    const runningPods = connectedClusters.reduce((sum, c) => sum + (c.podSummary?.running || 0), 0);

    // 전체 리소스 사용량 계산
    const nodesWithMetrics = allNodes.filter(n => n.cpuUsage !== null);
    const totalCpuUsage = nodesWithMetrics.reduce((sum, n) => sum + n.cpuUsage, 0);
    const totalMemUsage = nodesWithMetrics.reduce((sum, n) => sum + n.memoryUsage, 0);
    const avgCpuPercent = nodesWithMetrics.length > 0
      ? Math.round(nodesWithMetrics.reduce((sum, n) => sum + n.cpuPercent, 0) / nodesWithMetrics.length)
      : null;
    const avgMemPercent = nodesWithMetrics.length > 0
      ? Math.round(nodesWithMetrics.reduce((sum, n) => sum + n.memoryPercent, 0) / nodesWithMetrics.length)
      : null;

    let md = `# Kubernetes 클러스터 대시보드

> 마지막 업데이트: ${formatDateKR(collectedAt)}

`;

    // 클러스터 Summary 표
    md += this.generateClusterSummaryTable(connectedClusters, {
      totalCpu, totalMemory, totalCpuUsage, totalMemUsage, avgCpuPercent, avgMemPercent,
      totalPods, runningPods, warningEvents: allEvents.length, readyNodes: readyNodes.length, totalNodes: allNodes.length
    });

    // Warning 이벤트 (클러스터명 포함)
    if (allEvents.length > 0) {
      md += this.generateEventAlerts(allEvents);
    }

    // 리소스 사용량 섹션 - 클러스터별 히트맵
    if (nodesWithMetrics.length > 0) {
      md += this.generateResourceUsageSection(connectedClusters);
    }

    // 클러스터 개요 - 사용량/총량 비율
    if (connectedClusters.length > 0) {
      md += this.generateClusterOverview(connectedClusters);
    }

    // Pod 상태 섹션
    if (totalPods > 0) {
      md += this.generatePodStatusSection(connectedClusters);
    }

    // 클러스터별 상세 정보 (폴딩)
    md += `## 📋 클러스터별 상세 정보\n\n`;
    for (const cluster of clusters) {
      md += this.generateClusterDetail(cluster);
    }

    return md;
  }

  generateClusterSummaryTable(clusters, stats) {
    const cpuStatus = stats.avgCpuPercent === null ? '⚪' :
      stats.avgCpuPercent > 80 ? '🔴' : stats.avgCpuPercent > 60 ? '🟡' : '🟢';
    const memStatus = stats.avgMemPercent === null ? '⚪' :
      stats.avgMemPercent > 80 ? '🔴' : stats.avgMemPercent > 60 ? '🟡' : '🟢';
    const nodeHealth = stats.readyNodes === stats.totalNodes ? '🟢' : '🔴';
    const eventStatus = stats.warningEvents === 0 ? '🟢' : stats.warningEvents > 5 ? '🔴' : '🟡';

    return `## 📊 클러스터 요약

<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">

<div style="background: var(--bg-secondary); border-radius: 12px; padding: 20px;">

| 구분 | 현황 | 상태 |
|:-----|-----:|:----:|
| **클러스터** | ${clusters.length}개 | 🟢 |
| **노드** | ${stats.readyNodes} / ${stats.totalNodes} | ${nodeHealth} |
| **Pods** | ${stats.runningPods.toLocaleString()} / ${stats.totalPods.toLocaleString()} | ${stats.runningPods === stats.totalPods ? '🟢' : '🟡'} |
| **Warning Events** | ${stats.warningEvents}개 | ${eventStatus} |

</div>

<div style="background: var(--bg-secondary); border-radius: 12px; padding: 20px;">

| 리소스 | 사용량 | 총량 | 사용률 |
|:-------|-------:|-----:|-------:|
| **CPU** | ${stats.totalCpuUsage?.toFixed(1) || 'N/A'} cores | ${stats.totalCpu} cores | ${cpuStatus} ${stats.avgCpuPercent !== null ? stats.avgCpuPercent + '%' : 'N/A'} |
| **Memory** | ${stats.totalMemUsage?.toFixed(1) || 'N/A'} Gi | ${stats.totalMemory.toFixed(0)} Gi | ${memStatus} ${stats.avgMemPercent !== null ? stats.avgMemPercent + '%' : 'N/A'} |

</div>

</div>

`;
  }

  generateEventAlerts(events) {
    if (events.length === 0) return '';

    let md = `## ⚠️ 주의 이벤트 (최근 1시간)

<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid ${COLORS.red}; border-radius: 8px; padding: 16px; margin-bottom: 24px;">

| 클러스터 | 시간 | 네임스페이스 | 종류 | 대상 | 원인 | 횟수 |
|:---------|:-----|:-------------|:-----|:-----|:-----|-----:|
`;

    for (const e of events.slice(0, 10)) {
      const time = new Date(e.lastSeen).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' });
      md += `| **${e.cluster}** | ${time} | ${e.namespace} | ${e.kind} | ${e.name} | ${e.reason} | ${e.count} |\n`;
    }

    md += `\n</div>\n\n`;
    return md;
  }

  generateResourceUsageSection(clusters) {
    let md = `## 📈 리소스 사용량\n\n`;

    // 클러스터별 Gauge 차트 (2단)
    const cpuGauges = {
      data: clusters.map((cluster, idx) => {
        const nodes = (cluster.nodes || []).filter(n => n.cpuPercent !== null);
        const avgCpu = nodes.length > 0
          ? Math.round(nodes.reduce((sum, n) => sum + n.cpuPercent, 0) / nodes.length)
          : 0;
        return {
          type: 'indicator',
          mode: 'gauge+number',
          value: avgCpu,
          title: { text: cluster.name, font: { size: 12 } },
          domain: { row: 0, column: idx },
          gauge: {
            axis: { range: [0, 100], tickwidth: 1 },
            bar: { color: avgCpu > 80 ? COLORS.red : avgCpu > 60 ? COLORS.yellow : COLORS.green },
            bgcolor: 'transparent',
            borderwidth: 0,
            steps: [
              { range: [0, 60], color: 'rgba(16, 185, 129, 0.1)' },
              { range: [60, 80], color: 'rgba(245, 158, 11, 0.1)' },
              { range: [80, 100], color: 'rgba(239, 68, 68, 0.1)' },
            ],
          },
        };
      }),
      layout: {
        title: { text: 'CPU 사용률 (%)', font: { size: 14 } },
        height: 200,
        grid: { rows: 1, columns: clusters.length, pattern: 'independent' },
        margin: { t: 40, b: 20, l: 30, r: 30 },
      },
    };

    const memGauges = {
      data: clusters.map((cluster, idx) => {
        const nodes = (cluster.nodes || []).filter(n => n.memoryPercent !== null);
        const avgMem = nodes.length > 0
          ? Math.round(nodes.reduce((sum, n) => sum + n.memoryPercent, 0) / nodes.length)
          : 0;
        return {
          type: 'indicator',
          mode: 'gauge+number',
          value: avgMem,
          title: { text: cluster.name, font: { size: 12 } },
          domain: { row: 0, column: idx },
          gauge: {
            axis: { range: [0, 100], tickwidth: 1 },
            bar: { color: avgMem > 80 ? COLORS.red : avgMem > 60 ? COLORS.yellow : COLORS.green },
            bgcolor: 'transparent',
            borderwidth: 0,
            steps: [
              { range: [0, 60], color: 'rgba(16, 185, 129, 0.1)' },
              { range: [60, 80], color: 'rgba(245, 158, 11, 0.1)' },
              { range: [80, 100], color: 'rgba(239, 68, 68, 0.1)' },
            ],
          },
        };
      }),
      layout: {
        title: { text: 'Memory 사용률 (%)', font: { size: 14 } },
        height: 200,
        grid: { rows: 1, columns: clusters.length, pattern: 'independent' },
        margin: { t: 40, b: 20, l: 30, r: 30 },
      },
    };

    md += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">

\`\`\`plotly
${JSON.stringify(cpuGauges)}
\`\`\`

\`\`\`plotly
${JSON.stringify(memGauges)}
\`\`\`

</div>

### 노드별 리소스 사용률

`;

    // 클러스터별 히트맵 (분리)
    for (const cluster of clusters) {
      const nodes = (cluster.nodes || []).filter(n => n.cpuPercent !== null);
      if (nodes.length === 0) continue;

      const heatmapData = {
        data: [{
          type: 'heatmap',
          z: [nodes.map(n => n.cpuPercent || 0), nodes.map(n => n.memoryPercent || 0)],
          x: nodes.map(n => n.name),
          y: ['CPU %', 'Memory %'],
          colorscale: [
            [0, COLORS.green],
            [0.6, COLORS.yellow],
            [1, COLORS.red],
          ],
          zmin: 0,
          zmax: 100,
          hovertemplate: '%{x}<br>%{y}: %{z}%<extra></extra>',
          showscale: true,
          colorbar: { title: '%', len: 0.8 },
        }],
        layout: {
          title: { text: `${cluster.name}`, font: { size: 14 } },
          height: 160,
          margin: { t: 40, b: 50, l: 80, r: 60 },
          xaxis: { tickangle: -45, tickfont: { size: 10 } },
        },
      };

      md += `\`\`\`plotly
${JSON.stringify(heatmapData)}
\`\`\`

`;
    }

    return md;
  }

  generateClusterOverview(clusters) {
    // 클러스터별 리소스 사용량 vs 총량 Stacked Bar
    const cpuData = {
      data: [
        {
          type: 'bar',
          name: 'CPU 사용량',
          x: clusters.map(c => c.name),
          y: clusters.map(c => {
            const nodes = (c.nodes || []).filter(n => n.cpuUsage !== null);
            return nodes.reduce((sum, n) => sum + n.cpuUsage, 0);
          }),
          marker: { color: COLORS.blue },
          text: clusters.map(c => {
            const nodes = (c.nodes || []).filter(n => n.cpuUsage !== null);
            const used = nodes.reduce((sum, n) => sum + n.cpuUsage, 0);
            return `${used.toFixed(1)} cores`;
          }),
          textposition: 'inside',
          hovertemplate: '%{x}<br>사용: %{y:.1f} cores<extra></extra>',
        },
        {
          type: 'bar',
          name: 'CPU 여유',
          x: clusters.map(c => c.name),
          y: clusters.map(c => {
            const total = (c.nodes || []).reduce((sum, n) => sum + n.cpuCapacity, 0);
            const nodes = (c.nodes || []).filter(n => n.cpuUsage !== null);
            const used = nodes.reduce((sum, n) => sum + n.cpuUsage, 0);
            return Math.max(0, total - used);
          }),
          marker: { color: 'rgba(59, 130, 246, 0.2)' },
          hovertemplate: '%{x}<br>여유: %{y:.1f} cores<extra></extra>',
        },
      ],
      layout: {
        title: { text: 'CPU 사용량 / 총량', font: { size: 14 } },
        barmode: 'stack',
        height: 280,
        margin: { t: 40, b: 40, l: 50, r: 20 },
        legend: { orientation: 'h', y: -0.15 },
        yaxis: { title: 'cores' },
      },
    };

    const memData = {
      data: [
        {
          type: 'bar',
          name: 'Memory 사용량',
          x: clusters.map(c => c.name),
          y: clusters.map(c => {
            const nodes = (c.nodes || []).filter(n => n.memoryUsage !== null);
            return nodes.reduce((sum, n) => sum + n.memoryUsage, 0);
          }),
          marker: { color: COLORS.cyan },
          text: clusters.map(c => {
            const nodes = (c.nodes || []).filter(n => n.memoryUsage !== null);
            const used = nodes.reduce((sum, n) => sum + n.memoryUsage, 0);
            return `${used.toFixed(0)} Gi`;
          }),
          textposition: 'inside',
          hovertemplate: '%{x}<br>사용: %{y:.1f} Gi<extra></extra>',
        },
        {
          type: 'bar',
          name: 'Memory 여유',
          x: clusters.map(c => c.name),
          y: clusters.map(c => {
            const total = (c.nodes || []).reduce((sum, n) => sum + n.memoryCapacity, 0);
            const nodes = (c.nodes || []).filter(n => n.memoryUsage !== null);
            const used = nodes.reduce((sum, n) => sum + n.memoryUsage, 0);
            return Math.max(0, total - used);
          }),
          marker: { color: 'rgba(6, 182, 212, 0.2)' },
          hovertemplate: '%{x}<br>여유: %{y:.1f} Gi<extra></extra>',
        },
      ],
      layout: {
        title: { text: 'Memory 사용량 / 총량', font: { size: 14 } },
        barmode: 'stack',
        height: 280,
        margin: { t: 40, b: 40, l: 50, r: 20 },
        legend: { orientation: 'h', y: -0.15 },
        yaxis: { title: 'Gi' },
      },
    };

    return `## 🏗️ 클러스터 리소스 현황

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">

\`\`\`plotly
${JSON.stringify(cpuData)}
\`\`\`

\`\`\`plotly
${JSON.stringify(memData)}
\`\`\`

</div>

`;
  }

  generatePodStatusSection(clusters) {
    const totalPods = { running: 0, pending: 0, failed: 0, succeeded: 0, total: 0 };
    clusters.forEach(c => {
      if (c.podSummary) {
        totalPods.running += c.podSummary.running;
        totalPods.pending += c.podSummary.pending;
        totalPods.failed += c.podSummary.failed;
        totalPods.succeeded += c.podSummary.succeeded;
        totalPods.total += c.podSummary.total;
      }
    });

    if (totalPods.total === 0) return '';

    const podPie = {
      data: [{
        type: 'pie',
        labels: ['Running', 'Pending', 'Failed', 'Succeeded'],
        values: [totalPods.running, totalPods.pending, totalPods.failed, totalPods.succeeded],
        hole: 0.5,
        marker: { colors: [COLORS.green, COLORS.yellow, COLORS.red, COLORS.gray] },
        textinfo: 'label+value',
        hovertemplate: '%{label}: %{value}개 (%{percent})<extra></extra>',
      }],
      layout: {
        title: { text: 'Pod 상태 분포', font: { size: 14 } },
        height: 280,
        margin: { t: 40, b: 20, l: 20, r: 20 },
        annotations: [{ text: `${totalPods.total}`, showarrow: false, font: { size: 20 } }],
      },
    };

    const podBar = {
      data: [
        {
          type: 'bar',
          name: 'Running',
          x: clusters.map(c => c.name),
          y: clusters.map(c => c.podSummary?.running || 0),
          marker: { color: COLORS.green },
        },
        {
          type: 'bar',
          name: 'Pending',
          x: clusters.map(c => c.name),
          y: clusters.map(c => c.podSummary?.pending || 0),
          marker: { color: COLORS.yellow },
        },
        {
          type: 'bar',
          name: 'Failed',
          x: clusters.map(c => c.name),
          y: clusters.map(c => c.podSummary?.failed || 0),
          marker: { color: COLORS.red },
        },
      ],
      layout: {
        title: { text: '클러스터별 Pod 상태', font: { size: 14 } },
        barmode: 'stack',
        height: 280,
        margin: { t: 40, b: 40, l: 50, r: 20 },
        legend: { orientation: 'h', y: -0.15 },
        yaxis: { title: 'Pods' },
      },
    };

    return `## 🚀 Pod 상태

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">

\`\`\`plotly
${JSON.stringify(podPie)}
\`\`\`

\`\`\`plotly
${JSON.stringify(podBar)}
\`\`\`

</div>

`;
  }

  generateClusterDetail(cluster) {
    let md = `### ${cluster.name}\n\n`;

    if (cluster.status !== 'connected') {
      md += `> ⚠️ **상태**: ${cluster.status}\n> ${cluster.error || '연결할 수 없습니다.'}\n\n`;
      return md;
    }

    const nodes = cluster.nodes || [];
    const readyCount = nodes.filter(n => n.status === 'Ready').length;
    const totalCpu = nodes.reduce((sum, n) => sum + n.cpuCapacity, 0);
    const totalMemory = nodes.reduce((sum, n) => sum + n.memoryCapacity, 0);
    const usedCpu = nodes.filter(n => n.cpuUsage !== null).reduce((sum, n) => sum + n.cpuUsage, 0);
    const usedMem = nodes.filter(n => n.memoryUsage !== null).reduce((sum, n) => sum + n.memoryUsage, 0);

    // 폴딩(collapsible) 처리
    md += `<details>
<summary><strong>클러스터 상세 정보 보기</strong></summary>

| 항목 | 값 |
|:-----|---:|
| 버전 | ${cluster.serverVersion} |
| 노드 | ${nodes.length}개 (Ready: ${readyCount}개) |
| CPU | ${usedCpu.toFixed(1)} / ${totalCpu} cores |
| Memory | ${usedMem.toFixed(1)} / ${totalMemory.toFixed(1)} Gi |
| Pods | ${cluster.podSummary?.running || 0} running / ${cluster.podSummary?.total || 0} total |

</details>

`;

    // 노드 테이블
    if (nodes.length > 0) {
      md += `#### 노드 목록

| 노드 | 상태 | 역할 | CPU | Memory | CPU% | Mem% |
|:-----|:----:|:-----|----:|-------:|-----:|-----:|
`;

      for (const node of nodes) {
        const statusIcon = node.status === 'Ready' ? '🟢' : '🔴';
        const cpuIcon = node.cpuPercent === null ? '' :
          node.cpuPercent > 80 ? '🔴' : node.cpuPercent > 60 ? '🟡' : '🟢';
        const memIcon = node.memoryPercent === null ? '' :
          node.memoryPercent > 80 ? '🔴' : node.memoryPercent > 60 ? '🟡' : '🟢';

        md += `| ${node.name} | ${statusIcon} | ${node.roles} | ${node.cpuCapacity} | ${node.memoryCapacity}Gi | `;
        md += `${node.cpuPercent !== null ? cpuIcon + ' ' + node.cpuPercent + '%' : 'N/A'} | `;
        md += `${node.memoryPercent !== null ? memIcon + ' ' + node.memoryPercent + '%' : 'N/A'} |\n`;
      }

      md += '\n';
    }

    return md;
  }
}

export default K8sNodesCollector;
