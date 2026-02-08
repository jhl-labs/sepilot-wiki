/**
 * 자동화 관리 페이지
 * 스케줄 작업 + Issue 스크립트 + 실행 히스토리
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  FileText,
  History,
  Terminal,
  StopCircle,
} from 'lucide-react';

// ─── 타입 정의 ───

interface JobInfo {
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  lastRun?: JobExecution;
  nextRun?: string;
}

interface JobExecution {
  id: string;
  jobName: string;
  startedAt: string;
  completedAt: string;
  success: boolean;
  message: string;
  duration: number;
  error?: string;
}

interface ScriptInfo {
  name: string;
  path: string;
  description: string;
  requiredEnv: string[];
  available: boolean;
}

interface ScriptResult {
  scriptName: string;
  success: boolean;
  message: string;
  output?: string;
  error?: string;
  duration: number;
}

interface SchedulerStatus {
  status: string;
  isLeader: boolean;
  leaderId?: string;
  startedAt?: string;
  jobs: JobInfo[];
  error?: string;
  config?: {
    enabled: boolean;
    buildMode: string;
    redisEnabled: boolean;
  };
}

// ─── cron 표현식을 사람이 읽기 쉬운 형태로 변환 ───

function cronToHuman(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [minute, hour, day, month, dow] = parts;

  // 수동 전용 (실행 불가능한 스케줄)
  if (day === '31' && month === '2') return '수동 전용';

  // 매월 특정 일
  if (month === '*' && day !== '*' && dow === '*') {
    return `매월 ${day}일 ${hour}시`;
  }

  // 매주 특정 요일
  const dowMap: Record<string, string> = {
    '0': '일', '1': '월', '2': '화', '3': '수', '4': '목', '5': '금', '6': '토',
  };
  if (dow !== '*') return `매주 ${dowMap[dow] || dow}요일 ${hour}시`;

  // 매일 특정 시간
  if (day === '*' && month === '*' && dow === '*' && hour !== '*' && !minute.startsWith('*/')) {
    return `매일 ${hour}시 ${minute}분`;
  }

  // N분마다
  if (minute.startsWith('*/')) {
    const interval = minute.replace('*/', '');
    return `${interval}분마다`;
  }

  // 매시간
  if (hour === '*' && day === '*' && month === '*' && dow === '*') {
    return `매시간 ${minute}분`;
  }

  return cron;
}

// ─── 메인 컴포넌트 ───

export default function AutomationPage() {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [scripts, setScripts] = useState<ScriptInfo[]>([]);
  const [history, setHistory] = useState<JobExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 작업 실행 중 상태 추적
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [runningScripts, setRunningScripts] = useState<Set<string>>(new Set());

  // 스크립트 환경변수 입력
  const [scriptEnvs, setScriptEnvs] = useState<Record<string, Record<string, string>>>({});

  // 실행 결과 (Job + 스크립트 통합)
  const [scriptResults, setScriptResults] = useState<Record<string, ScriptResult>>({});
  const [jobResults, setJobResults] = useState<Record<string, { success: boolean; message: string; error?: string; output?: string; duration?: number }>>({});

  // DRY_RUN 토글
  const [dryRun, setDryRun] = useState(true);

  // AbortController 관리
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // 컴포넌트 마운트 상태 추적
  const mountedRef = useRef(true);

  // 컴포넌트 언마운트 시 모든 진행 중인 요청 중단
  useEffect(() => {
    const controllers = abortControllersRef.current;
    return () => {
      mountedRef.current = false;
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [schedulerRes, scriptsRes, historyRes] = await Promise.all([
        fetch('/api/scheduler').catch(() => null),
        fetch('/api/admin/scripts').catch(() => null),
        fetch('/api/scheduler/history?limit=50').catch(() => null),
      ]);

      const failedApis: string[] = [];

      if (schedulerRes?.ok) {
        const data = await schedulerRes.json();
        setSchedulerStatus(data);
      } else if (schedulerRes) {
        failedApis.push('스케줄러 상태');
      }

      if (scriptsRes?.ok) {
        const data = await scriptsRes.json();
        setScripts(data.scripts || []);
      } else if (scriptsRes) {
        failedApis.push('스크립트 목록');
      }

      if (historyRes?.ok) {
        const data = await historyRes.json();
        setHistory(data.history || []);
      } else if (historyRes) {
        failedApis.push('실행 이력');
      }

      if (failedApis.length > 0) {
        setError(`일부 데이터 로드 실패: ${failedApis.join(', ')}`);
      }
    } catch {
      setError('데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 스케줄 Job 수동 실행
  async function handleRunJob(jobName: string) {
    // 기존 요청이 있으면 중단
    abortControllersRef.current.get(`job-${jobName}`)?.abort();
    const controller = new AbortController();
    abortControllersRef.current.set(`job-${jobName}`, controller);

    setRunningJobs((prev) => new Set(prev).add(jobName));
    setJobResults((prev) => {
      const next = { ...prev };
      delete next[jobName];
      return next;
    });

    try {
      const res = await fetch(`/api/scheduler/jobs/${jobName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun }),
        signal: controller.signal,
      });

      let result;
      try {
        result = await res.json();
      } catch {
        setJobResults((prev) => ({
          ...prev,
          [jobName]: { success: false, message: `응답 파싱 실패 (${res.status})` },
        }));
        return;
      }

      // HTTP 에러 응답 처리 (409: 이미 실행 중, 429: 동시 실행 제한 등)
      if (!res.ok) {
        setJobResults((prev) => ({
          ...prev,
          [jobName]: {
            success: false,
            message: result.error || `요청 실패 (${res.status})`,
          },
        }));
        return;
      }

      setJobResults((prev) => ({
        ...prev,
        [jobName]: {
          success: result.success,
          message: result.message,
          error: result.error,
          output: result.data?.output || result.output,
          duration: result.duration,
        },
      }));

      // 히스토리 갱신 (백그라운드)
      refreshHistory();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setJobResults((prev) => ({
        ...prev,
        [jobName]: {
          success: false,
          message: '네트워크 요청 실패',
          error: err instanceof Error ? err.message : String(err),
        },
      }));
    } finally {
      abortControllersRef.current.delete(`job-${jobName}`);
      setRunningJobs((prev) => {
        const next = new Set(prev);
        next.delete(jobName);
        return next;
      });
    }
  }

  // Issue 스크립트 실행
  async function handleRunScript(scriptName: string) {
    // 기존 요청이 있으면 중단
    abortControllersRef.current.get(`script-${scriptName}`)?.abort();
    const controller = new AbortController();
    abortControllersRef.current.set(`script-${scriptName}`, controller);

    setRunningScripts((prev) => new Set(prev).add(scriptName));
    setScriptResults((prev) => {
      const next = { ...prev };
      delete next[scriptName];
      return next;
    });

    try {
      const envVars = scriptEnvs[scriptName] || {};
      const res = await fetch(`/api/admin/scripts/${scriptName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: envVars, dryRun }),
        signal: controller.signal,
      });

      let result;
      try {
        result = await res.json();
      } catch {
        setScriptResults((prev) => ({
          ...prev,
          [scriptName]: { scriptName, success: false, message: `응답 파싱 실패 (${res.status})`, duration: 0 },
        }));
        return;
      }

      // HTTP 에러 응답 처리 (409: 이미 실행 중, 429: 동시 실행 제한 등)
      if (!res.ok) {
        setScriptResults((prev) => ({
          ...prev,
          [scriptName]: {
            scriptName,
            success: false,
            message: result.error || `요청 실패 (${res.status})`,
            duration: 0,
          },
        }));
        return;
      }

      setScriptResults((prev) => ({ ...prev, [scriptName]: result }));

      // 히스토리 갱신 (백그라운드)
      refreshHistory();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setScriptResults((prev) => ({
        ...prev,
        [scriptName]: {
          scriptName,
          success: false,
          message: '네트워크 요청 실패',
          error: err instanceof Error ? err.message : String(err),
          duration: 0,
        },
      }));
    } finally {
      abortControllersRef.current.delete(`script-${scriptName}`);
      setRunningScripts((prev) => {
        const next = new Set(prev);
        next.delete(scriptName);
        return next;
      });
    }
  }

  // 히스토리 백그라운드 갱신 (언마운트 후 setState 방지)
  function refreshHistory() {
    fetch('/api/scheduler/history?limit=50')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (mountedRef.current && data?.history) setHistory(data.history); })
      .catch(() => {});
  }

  // 환경변수 값 검증 (서버 regex와 동일: 알파벳, 숫자, 하이픈, 점, 밑줄만 허용)
  const ENV_VALUE_REGEX = /^[a-zA-Z0-9._-]+$/;

  function isValidEnvValue(value: string): boolean {
    const trimmed = value.trim();
    return trimmed.length > 0 && ENV_VALUE_REGEX.test(trimmed);
  }

  // 환경변수 입력 핸들러
  function handleEnvChange(scriptName: string, key: string, value: string) {
    setScriptEnvs((prev) => ({
      ...prev,
      [scriptName]: { ...(prev[scriptName] || {}), [key]: value },
    }));
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="admin-dashboard">
      {/* 헤더 */}
      <div className="admin-header">
        <div>
          <h1>자동화 관리</h1>
          <p className="admin-header-subtitle">스케줄 작업 및 스크립트 실행 관리</p>
        </div>
        <div className="admin-header-actions">
          <label className="automation-dry-run-toggle" title="활성화하면 실제 변경 없이 시뮬레이션만 실행합니다">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              aria-label="DRY_RUN 모드 토글"
            />
            <span>DRY_RUN</span>
          </label>
          <button onClick={fetchData} className="btn btn-secondary" disabled={loading} aria-label="데이터 새로고침">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* 스케줄러 상태 요약 */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon docs">
              <Zap size={22} />
            </div>
          </div>
          <div className="admin-stat-value">
            {schedulerStatus?.status || '-'}
          </div>
          <div className="admin-stat-label">스케줄러 상태</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon folders">
              <Clock size={22} />
            </div>
          </div>
          <div className="admin-stat-value">
            {schedulerStatus?.jobs.length || 0}
          </div>
          <div className="admin-stat-label">등록된 작업</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon commits">
              <FileText size={22} />
            </div>
          </div>
          <div className="admin-stat-value">
            {scripts.length}
          </div>
          <div className="admin-stat-label">스크립트</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-header">
            <div className="admin-stat-icon prs">
              <History size={22} />
            </div>
          </div>
          <div className="admin-stat-value">
            {history.length}
          </div>
          <div className="admin-stat-label">실행 이력</div>
        </div>
      </div>

      {/* 스케줄 작업 섹션 */}
      <div className="admin-card" style={{ marginTop: 'var(--admin-space-6)' }}>
        <div className="admin-card-header">
          <Zap size={18} />
          <h3>스케줄 작업</h3>
        </div>
        <div className="admin-card-body">
          {loading ? (
            <div className="admin-loading">
              <RefreshCw size={16} className="spin" />
              로딩 중...
            </div>
          ) : !schedulerStatus || schedulerStatus.status === 'stopped' ? (
            <div className="empty-state">
              <StopCircle size={40} />
              <h3>스케줄러가 비활성 상태입니다</h3>
              <p>스케줄러가 실행 중이지 않아 작업 목록을 불러올 수 없습니다. standalone 모드로 실행하거나 SCHEDULER_ENABLED=true를 설정해주세요.</p>
            </div>
          ) : (schedulerStatus.jobs || []).length === 0 ? (
            <div className="empty-state">
              <Zap size={40} />
              <h3>등록된 작업이 없습니다</h3>
              <p>스케줄러에 등록된 작업이 없습니다.</p>
            </div>
          ) : (
            <div className="automation-job-grid">
              {(schedulerStatus.jobs).map((job) => (
                <div key={job.name} className="automation-job-card">
                  <div className="automation-job-header">
                    <div className="automation-job-info">
                      <h4>{job.name}</h4>
                      <p>{job.description}</p>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleRunJob(job.name)}
                      disabled={runningJobs.has(job.name)}
                      aria-label={`${job.name} 작업 실행`}
                    >
                      {runningJobs.has(job.name) ? (
                        <RefreshCw size={14} className="spin" />
                      ) : (
                        <Play size={14} />
                      )}
                      실행
                    </button>
                  </div>
                  <div className="automation-job-meta">
                    <span className="automation-schedule-badge">
                      <Clock size={12} />
                      {cronToHuman(job.schedule)}
                    </span>
                    {dryRun && (
                      <span className="automation-dry-run-badge">DRY_RUN</span>
                    )}
                    {!job.enabled && (
                      <span className="automation-status-badge error">비활성</span>
                    )}
                    {job.lastRun && (
                      <span className={`automation-status-badge ${job.lastRun.success ? 'success' : 'error'}`}>
                        {job.lastRun.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {formatDate(job.lastRun.completedAt)}
                        {job.lastRun.duration !== undefined && ` (${formatDuration(job.lastRun.duration)})`}
                      </span>
                    )}
                  </div>
                  {jobResults[job.name] && (
                    <div className={`automation-result ${jobResults[job.name].success ? 'success' : 'error'}`}>
                      <div className="automation-result-header">
                        {jobResults[job.name].success ? (
                          <CheckCircle size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}
                        <span>{jobResults[job.name].message}</span>
                        {jobResults[job.name].duration !== undefined && (
                          <span className="automation-result-duration">
                            {formatDuration(jobResults[job.name].duration!)}
                          </span>
                        )}
                      </div>
                      {(jobResults[job.name].output || jobResults[job.name].error) && (
                        <pre className="automation-result-log">
                          {jobResults[job.name].output || jobResults[job.name].error}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Issue 스크립트 섹션 */}
      <div className="admin-card" style={{ marginTop: 'var(--admin-space-6)' }}>
        <div className="admin-card-header">
          <Terminal size={18} />
          <h3>Issue 스크립트</h3>
        </div>
        <div className="admin-card-body">
          {scripts.length === 0 ? (
            <div className="empty-state">
              <Terminal size={40} />
              <h3>등록된 스크립트 없음</h3>
              <p>실행 가능한 스크립트가 없습니다.</p>
            </div>
          ) : (
          <div className="automation-job-grid">
            {scripts.map((script) => (
              <div key={script.name} className="automation-job-card">
                <div className="automation-job-header">
                  <div className="automation-job-info">
                    <h4>{script.name}</h4>
                    <p>{script.description}</p>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleRunScript(script.name)}
                    aria-label={`${script.name} 스크립트 실행`}
                    disabled={
                      runningScripts.has(script.name) ||
                      !script.available ||
                      script.requiredEnv.some((key) => !isValidEnvValue(scriptEnvs[script.name]?.[key] || ''))
                    }
                  >
                    {runningScripts.has(script.name) ? (
                      <RefreshCw size={14} className="spin" />
                    ) : (
                      <Play size={14} />
                    )}
                    실행
                  </button>
                </div>
                <div className="automation-script-params">
                  {script.requiredEnv.map((envKey) => {
                    const value = scriptEnvs[script.name]?.[envKey] || '';
                    const hasValue = value.trim().length > 0;
                    const valid = !hasValue || isValidEnvValue(value);
                    return (
                      <div key={envKey} className={`automation-env-input ${hasValue && !valid ? 'invalid' : ''}`}>
                        <label htmlFor={`env-${script.name}-${envKey}`}>{envKey}</label>
                        <input
                          id={`env-${script.name}-${envKey}`}
                          type="text"
                          placeholder={envKey === 'ISSUE_NUMBER' ? '예: 42' : '예: v1.0.0'}
                          value={value}
                          maxLength={100}
                          onChange={(e) => handleEnvChange(script.name, envKey, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !runningScripts.has(script.name) && script.available &&
                                script.requiredEnv.every((k) => isValidEnvValue(scriptEnvs[script.name]?.[k] || ''))) {
                              handleRunScript(script.name);
                            }
                          }}
                        />
                        {hasValue && !valid && (
                          <span className="automation-env-error">영문, 숫자, 하이픈, 점, 밑줄만 사용 가능</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {!script.available && (
                  <div className="automation-warning">
                    <AlertCircle size={12} />
                    스크립트 파일을 찾을 수 없음
                  </div>
                )}
                {scriptResults[script.name] && (
                  <div className={`automation-result ${scriptResults[script.name].success ? 'success' : 'error'}`}>
                    <div className="automation-result-header">
                      {scriptResults[script.name].success ? (
                        <CheckCircle size={14} />
                      ) : (
                        <XCircle size={14} />
                      )}
                      <span>{scriptResults[script.name].message}</span>
                      <span className="automation-result-duration">
                        {formatDuration(scriptResults[script.name].duration)}
                      </span>
                    </div>
                    {(scriptResults[script.name].output || scriptResults[script.name].error) && (
                      <pre className="automation-result-log">
                        {scriptResults[script.name].output || scriptResults[script.name].error}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* 실행 히스토리 섹션 */}
      <div className="admin-card" style={{ marginTop: 'var(--admin-space-6)' }}>
        <div className="admin-card-header">
          <History size={18} />
          <h3>실행 히스토리</h3>
        </div>
        <div className="admin-card-body">
          {history.length === 0 ? (
            <div className="empty-state">
              <History size={40} />
              <h3>실행 이력 없음</h3>
              <p>아직 실행된 작업이 없습니다.</p>
            </div>
          ) : (
            <div className="automation-history-table">
              <table>
                <thead>
                  <tr>
                    <th>시간</th>
                    <th>작업명</th>
                    <th>결과</th>
                    <th>소요시간</th>
                    <th>메시지</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 50).map((exec) => (
                    <tr key={exec.id}>
                      <td className="automation-history-time">
                        {formatDate(exec.completedAt)}
                      </td>
                      <td>
                        <code>{exec.jobName}</code>
                      </td>
                      <td>
                        <span className={`automation-status-badge ${exec.success ? 'success' : 'error'}`}>
                          {exec.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {exec.success ? '성공' : '실패'}
                        </span>
                      </td>
                      <td>{formatDuration(exec.duration)}</td>
                      <td className="automation-history-message">
                        {exec.message}
                        {exec.error && (
                          <span className="automation-history-error" title={exec.error}>
                            {exec.error.substring(0, 80)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
