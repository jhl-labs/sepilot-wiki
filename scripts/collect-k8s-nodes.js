#!/usr/bin/env node

/**
 * Kubernetes 클러스터 노드 정보를 수집하여 wiki/dashboard/nodes.md 파일로 생성
 * GitHub Actions에서 KUBECONFIG secret을 사용하여 실행
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

const WIKI_DIR = join(process.cwd(), 'wiki', 'dashboard');
const OUTPUT_FILE = join(WIKI_DIR, 'nodes.md');

// kubectl 명령 실행
function kubectl(command) {
  try {
    return execSync(`kubectl ${command}`, {
      encoding: 'utf-8',
      timeout: 30000,
    }).trim();
  } catch (error) {
    console.error(`kubectl 명령 실패: ${command}`);
    console.error(error.message);
    return null;
  }
}

// 노드 정보 수집
function collectNodeInfo() {
  console.log('📊 Kubernetes 노드 정보 수집 중...');

  // 노드 목록 (JSON)
  const nodesJson = kubectl('get nodes -o json');
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
      os: `${nodeInfo.osImage || 'unknown'}`,
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

  return nodeList;
}

// 메모리 포맷팅 (Ki -> Gi)
function formatMemory(memory) {
  if (!memory) return '0Gi';
  const value = parseInt(memory.replace(/[^0-9]/g, ''));
  if (memory.includes('Ki')) {
    return `${(value / 1024 / 1024).toFixed(1)}Gi`;
  }
  if (memory.includes('Mi')) {
    return `${(value / 1024).toFixed(1)}Gi`;
  }
  if (memory.includes('Gi')) {
    return `${value}Gi`;
  }
  return memory;
}

// 클러스터 정보 수집
function collectClusterInfo() {
  const version = kubectl('version --short 2>/dev/null || kubectl version -o json');
  let serverVersion = 'unknown';

  if (version) {
    try {
      const versionJson = JSON.parse(version);
      serverVersion = versionJson.serverVersion?.gitVersion || 'unknown';
    } catch {
      // --short 형식 파싱
      const match = version.match(/Server Version:\s*(\S+)/);
      if (match) serverVersion = match[1];
    }
  }

  const context = kubectl('config current-context 2>/dev/null') || 'unknown';

  return {
    serverVersion,
    context,
  };
}

// 마크다운 생성
function generateMarkdown(nodes, clusterInfo, collectedAt) {
  const readyCount = nodes.filter(n => n.status === 'Ready').length;
  const totalCpu = nodes.reduce((sum, n) => sum + parseInt(n.cpu || 0), 0);
  const totalMemory = nodes.reduce((sum, n) => {
    const mem = parseFloat(n.memory.replace('Gi', ''));
    return sum + (isNaN(mem) ? 0 : mem);
  }, 0);

  let md = `---
title: "Kubernetes 노드 현황"
description: "클러스터 노드 상태 및 리소스 정보"
category: "Dashboard"
tags: ["kubernetes", "cluster", "nodes", "infrastructure"]
status: "published"
createdAt: "${collectedAt}"
updatedAt: "${collectedAt}"
---

# Kubernetes 노드 현황

> 마지막 업데이트: ${new Date(collectedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}

## 클러스터 요약

| 항목 | 값 |
|------|-----|
| 컨텍스트 | \`${clusterInfo.context}\` |
| 서버 버전 | ${clusterInfo.serverVersion} |
| 전체 노드 | ${nodes.length}개 |
| Ready 노드 | ${readyCount}개 |
| 전체 CPU | ${totalCpu} cores |
| 전체 메모리 | ${totalMemory.toFixed(1)} Gi |

## 노드 목록

| 노드명 | 상태 | 역할 | 버전 | CPU | 메모리 | IP |
|--------|------|------|------|-----|--------|-----|
`;

  for (const node of nodes) {
    const statusBadge = node.status === 'Ready' ? '🟢 Ready' : '🔴 NotReady';
    md += `| ${node.name} | ${statusBadge} | ${node.roles} | ${node.version} | ${node.cpu} | ${node.memory} | ${node.internalIP} |\n`;
  }

  md += `
## 노드 상세 정보

`;

  for (const node of nodes) {
    md += `### ${node.name}

| 항목 | 값 |
|------|-----|
| 상태 | ${node.status === 'Ready' ? '🟢 Ready' : '🔴 NotReady'} |
| 역할 | ${node.roles} |
| Kubernetes 버전 | ${node.version} |
| OS | ${node.os} |
| 아키텍처 | ${node.arch} |
| 컨테이너 런타임 | ${node.containerRuntime} |
| Internal IP | ${node.internalIP} |
| CPU (용량/할당가능) | ${node.cpu} / ${node.allocatableCpu} |
| 메모리 (용량/할당가능) | ${node.memory} / ${node.allocatableMemory} |
| 생성일 | ${new Date(node.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} |

`;
  }

  return md;
}

async function main() {
  console.log('🚀 Kubernetes 노드 정보 수집 시작...');

  // kubeconfig 확인
  if (!process.env.KUBECONFIG && !process.env.HOME) {
    console.log('⚠️ KUBECONFIG가 설정되지 않았습니다.');
  }

  // kubectl 연결 테스트
  const testResult = kubectl('cluster-info 2>&1 | head -1');
  if (!testResult) {
    console.error('❌ kubectl 클러스터 연결 실패');
    // 연결 실패 시 placeholder 페이지 생성
    await mkdir(WIKI_DIR, { recursive: true });
    const placeholderMd = `---
title: "Kubernetes 노드 현황"
description: "클러스터 노드 상태 및 리소스 정보"
category: "Dashboard"
tags: ["kubernetes", "cluster", "nodes"]
status: "draft"
---

# Kubernetes 노드 현황

> ⚠️ 클러스터 연결 실패

kubectl 연결에 실패했습니다. KUBECONFIG 설정을 확인해주세요.
`;
    await writeFile(OUTPUT_FILE, placeholderMd);
    console.log('📄 Placeholder 페이지 생성 완료');
    return;
  }

  console.log(`   클러스터: ${testResult}`);

  // 정보 수집
  const nodes = collectNodeInfo();
  if (!nodes || nodes.length === 0) {
    console.error('❌ 노드 정보를 가져올 수 없습니다.');
    process.exit(1);
  }

  const clusterInfo = collectClusterInfo();
  const collectedAt = new Date().toISOString();

  // 마크다운 생성
  const markdown = generateMarkdown(nodes, clusterInfo, collectedAt);

  // 파일 저장
  await mkdir(WIKI_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, markdown);

  console.log('✅ 노드 정보 수집 완료');
  console.log(`   노드 수: ${nodes.length}개`);
  console.log(`   출력: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('❌ 수집 실패:', err);
  process.exit(1);
});
