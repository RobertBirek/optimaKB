import { useState } from 'react';
import {
  Activity, AlertTriangle, Bot, Check, CheckCircle, Eye, LoaderCircle, Pause, Play, RefreshCw,
} from 'lucide-react';
import { apiFetch, formatDate, formatNumber, shortLabel } from './constants';
import PageShell from './shared/PageShell';
import DataTable from './shared/DataTable';
import StatusBadge from './shared/StatusBadge';
import IconButton from './shared/IconButton';
import Modal from './shared/Modal';
import PageSkeleton from './shared/Skeleton';
import EmptyState from './shared/EmptyState';
import useApi from './shared/useApi';

export default function AutomationPage({ overview }) {
  const { data: automationData, loading, error, reload } = useApi('/api/automation');
  const automation = automationData?.automation || {};
  const config = automation.config || {};
  const jobs = automation.jobs || [];
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const namespaces = [...new Set([
    ...(overview?.kbs || []).map((kb) => kb.namespace),
    ...(overview?.diagnosedKbs || []).map((kb) => kb.namespace),
    ...(config.allowedNamespaces || []),
  ].filter(Boolean))].sort();

  async function updateConfig(patch) {
    setBusy('config');
    setMessage('Aktualizuję konfigurację automatyzacji...');
    try {
      const response = await apiFetch('/api/automation/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Automation config failed');
      setMessage('Konfiguracja automatyzacji została zapisana.');
      await reload();
    } catch (e) { setMessage(`Błąd: ${e.message}`); } finally { setBusy(''); }
  }

  async function runPending() {
    setBusy('run');
    setMessage('Uruchamiam recenzję oczekujących draftów...');
    try {
      const response = await apiFetch('/api/automation/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Automation start failed');
      setMessage('Worker automatyzacji został uruchomiony.');
      await reload();
    } catch (e) { setMessage(`Błąd: ${e.message}`); } finally { setBusy(''); }
  }

  async function runShadowBenchmark() {
    setBusy('shadow');
    setMessage('Uruchamiam historyczny benchmark shadow...');
    try {
      const response = await apiFetch('/api/automation/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shadowHistory: true, namespace: config.allowedNamespaces?.[0] || 'ComarchCommunityNews', limit: 100 }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Shadow benchmark failed');
      setMessage('Benchmark shadow został uruchomiony.');
      await reload();
    } catch (e) { setMessage(`Błąd: ${e.message}`); } finally { setBusy(''); }
  }

  async function retryJob(jobId) {
    setBusy(jobId);
    setMessage(`Ponawiam ${jobId}...`);
    try {
      const response = await apiFetch(`/api/automation/jobs/${encodeURIComponent(jobId)}/retry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Automation retry failed');
      setMessage(`Retry ${jobId} został uruchomiony.`);
      await reload();
    } catch (e) { setMessage(`Błąd: ${e.message}`); } finally { setBusy(''); }
  }

  async function runLlmHealth() {
    setBusy('health');
    setMessage('Uruchamiam kontrolny probe LLM...');
    try {
      const response = await apiFetch('/api/automation/llm-health/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'LLM health check failed');
      setMessage('Probe LLM został uruchomiony. Status odświeży się po jego zakończeniu.');
    } catch (e) { setMessage(`Błąd: ${e.message}`); } finally { setBusy(''); }
  }

  async function approvePublication() {
    setBusy('promotion');
    setMessage('Zatwierdzam przejście canary do trybu publikacji...');
    try {
      const response = await apiFetch('/api/automation/promotion/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Publication approval failed');
      setMessage('Administrator zatwierdził gate publikacji.');
      await reload();
    } catch (e) { setMessage(`Błąd: ${e.message}`); } finally { setBusy(''); }
  }

  async function adjudicateJob(jobId, expectedAction) {
    setBusy(`adjudicate-${jobId}`);
    setMessage(`Zapisuję ocenę operatora dla ${jobId}...`);
    try {
      const response = await apiFetch(`/api/automation/jobs/${encodeURIComponent(jobId)}/adjudicate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedAction }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Adjudication failed');
      setMessage('Ocena operatora została zapisana.');
      setSelected(null);
      await reload();
    } catch (e) { setMessage(`Błąd: ${e.message}`); } finally { setBusy(''); }
  }

  async function applyReroute(jobId) {
    setBusy(`reroute-${jobId}`);
    setMessage(`Stosuję zatwierdzony reroute dla ${jobId}...`);
    try {
      const response = await apiFetch(`/api/automation/jobs/${encodeURIComponent(jobId)}/reroute/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Reroute apply failed');
      setMessage('Draft został przekierowany. Uruchomiono nową recenzję shadow.');
      setSelected(null);
      await reload();
    } catch (e) { setMessage(`Błąd: ${e.message}`); } finally { setBusy(''); }
  }

  const gate = automation.promotionGate || {};
  const health = automation.llmHealth || {};
  const canaryQueue = automation.canaryQueue || [];

  if (loading) {
    return (
      <PageShell
        title="Automatyzacja"
        description="Shadow review, ograniczony canary, publikacja po walidacji regresji i automatyczny rollback."
      >
        <PageSkeleton />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell
        title="Automatyzacja"
        description="Shadow review, ograniczony canary, publikacja po walidacji regresji i automatyczny rollback."
      >
        <EmptyState icon={AlertTriangle} title="Błąd pobierania danych" description={error} />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Automatyzacja"
      description="Shadow review, ograniczony canary, publikacja po walidacji regresji i automatyczny rollback."
      actions={(
        <>
          <IconButton icon={Bot} label="Benchmark shadow" showLabel onClick={runShadowBenchmark} disabled={Boolean(busy) || !automation.llm?.configured} />
          <IconButton icon={Activity} label="Sprawdź LLM" showLabel onClick={runLlmHealth} disabled={Boolean(busy) || !automation.llm?.configured} />
          <IconButton icon={Check} label="Zatwierdź publikację" showLabel onClick={approvePublication} disabled={Boolean(busy) || !gate.eligible || gate.approved || overview?.service?.role !== 'admin'} />
          <IconButton icon={config.paused ? Play : Pause} label={config.paused ? 'Wznów automat' : 'Wstrzymaj automat'} showLabel onClick={() => updateConfig({ paused: !config.paused })} disabled={Boolean(busy) || !config.enabled} />
          <IconButton icon={Play} label="Uruchom pending" variant="primary" showLabel onClick={runPending} disabled={Boolean(busy) || !config.enabled || config.paused} />
        </>
      )}
    >
      <div className="infoGrid automationInfo">
        <div><span>Status</span><StatusBadge value={!config.enabled ? 'DISABLED' : config.paused ? 'PAUSED' : 'RUNNING'} /></div>
        <div><span>Tryb</span><StatusBadge value={config.shadowOnly ? 'SHADOW' : 'PUBLISH'} /></div>
        <div><span>LLM</span><StatusBadge value={automation.llm?.configured ? 'OK' : 'MISSING'} /><br /><code>{automation.llm?.model || automation.llm?.endpoint}</code></div>
        <div><span>Health LLM</span><StatusBadge value={health.healthy ? 'PASS' : health.status || 'UNKNOWN'} /><br /><span className="muted">{health.checkedAt ? formatDate(health.checkedAt) : 'brak pomiaru'}</span></div>
        <div><span>Próg confidence</span><strong>{formatNumber(Number(config.minimumConfidence || 0) * 100)}%</strong></div>
        <div><span>Aktywne</span><strong>{formatNumber(automation.active?.length)}</strong></div>
        <div><span>Wyjątki</span><strong>{formatNumber(automation.exceptions?.length)}</strong></div>
        <div><span>Reroute</span><strong>{formatNumber(automation.reroutes?.length)}</strong></div>
        <div><span>Auto rollback</span><StatusBadge value={config.autoRollback ? 'OK' : 'DISABLED'} /></div>
      </div>
      <div className="automationControls">
        <label className="toggleControl"><input type="checkbox" checked={Boolean(config.enabled)} onChange={(event) => updateConfig({ enabled: event.target.checked })} disabled={Boolean(busy)} /> Automatyczna recenzja nowych draftów</label>
        <label className="toggleControl"><input type="checkbox" checked={Boolean(config.shadowOnly)} onChange={(event) => updateConfig({ shadowOnly: event.target.checked })} disabled={Boolean(busy) || (config.shadowOnly && (!gate.approved || config.shadowOnlyForced))} /> Tylko shadow, bez publikacji{config.shadowOnlyForced ? ' (wymuszone przez usługę)' : ''}</label>
        <label>Canary namespace<select value={config.allowedNamespaces?.[0] || ''} onChange={(event) => updateConfig({ allowedNamespaces: event.target.value ? [event.target.value] : [] })} disabled={Boolean(busy)}><option value="">Wszystkie</option>{namespaces.map((namespace) => <option value={namespace} key={namespace}>{namespace}</option>)}</select></label>
        <label>Minimalne confidence<select value={String(config.minimumConfidence ?? 0.85)} onChange={(event) => updateConfig({ minimumConfidence: Number(event.target.value) })} disabled={Boolean(busy)}><option value="0.7">70%</option><option value="0.8">80%</option><option value="0.85">85%</option><option value="0.9">90%</option><option value="0.95">95%</option></select></label>
      </div>
      {message ? <div className="formMessage" aria-live="polite">{message}</div> : null}
      <div className={`detailPanel promotionGate ${gate.eligible ? 'gateReady' : 'gateBlocked'}`}>
        <strong>Gate publikacji canary</strong>
        <div className="detailMeta">
          <span>próbki {gate.metrics?.samples || 0}/{gate.requirements?.minimumSamples || 20}</span>
          <span>decyzje {gate.metrics?.decisions || 0}</span>
          <span>trafność {Math.round(Number(gate.metrics?.accuracy || 0) * 100)}%/{Math.round(Number(gate.requirements?.minimumAccuracy || 0.95) * 100)}%</span>
          <span>false positive {gate.metrics?.falsePositives || 0}/{gate.requirements?.maximumFalsePositives ?? 0}</span>
          <StatusBadge value={gate.approved ? 'APPROVED' : gate.eligible ? 'READY' : 'BLOCKED'} />
        </div>
        {gate.blockers?.length ? <div className="gateBlockers">{gate.blockers.join(' ')}</div> : null}
      </div>
      <div className="detailPanel canaryQueuePanel">
        <div className="sectionHeader compactHeader">
          <div><strong>Kolejka adjudykacji canary</strong><div className="detailMeta"><span>oczekuje {canaryQueue.length}</span><span>priorytet: reroute, ryzyko, niska pewność, wiek</span></div></div>
          <IconButton icon={Eye} label="Oceń następny" showLabel onClick={() => setSelected(canaryQueue[0])} disabled={Boolean(busy) || !canaryQueue.length} />
        </div>
        {canaryQueue.length ? (
          <div className="canaryQueueItems">{canaryQueue.slice(0, 5).map((job) => (
            <button type="button" key={job.id} onClick={() => setSelected(job)}>
              <StatusBadge value={job.status} /><span>{shortLabel(job.title, 58)}</span><code>{job.recommendedAction}</code><strong>P{job.canaryPriority}</strong>
            </button>
          ))}</div>
        ) : <span className="muted">Brak nowych decyzji shadow do oceny.</span>}
      </div>
      {automation.shadowReport ? (
        <div className="detailPanel shadowReport">
          <strong>Ostatni benchmark shadow</strong>
          <div className="detailMeta"><span>{formatDate(automation.shadowReport.generatedAt)}</span><span>match {automation.shadowReport.summary?.matches || 0}/{automation.shadowReport.summary?.complete || 0}</span><span>exceptions {automation.shadowReport.summary?.exceptions || 0}</span><span>próg {automation.shadowReport.calibration?.recommended?.threshold ?? 'brak'}</span></div>
        </div>
      ) : null}
      <DataTable rows={jobs} onRowClick={setSelected} columns={[
        { key: 'status', label: 'Status', render: (job) => <><StatusBadge value={job.status} /><br /><span className="muted">{job.mode || 'publish'} · {job.stage}</span></> },
        { key: 'draft', label: 'Draft', render: (job) => <><strong>{shortLabel(job.title, 54)}</strong><br /><code>{job.draftId}</code></> },
        { key: 'kb', label: 'KB', render: (job) => <code>{job.kbNamespace}</code> },
        { key: 'review', label: 'LLM', render: (job) => job.review ? <><strong>{job.review.decision}</strong> · {Math.round(job.review.confidence * 100)}%<br /><span className="muted">{shortLabel(job.review.reasons?.join(' | '), 80)}</span></> : <span className="muted">brak werdyktu</span> },
        { key: 'updated', label: 'Aktualizacja', render: (job) => formatDate(job.updatedAt) },
        { key: 'actions', label: 'Akcje', render: (job) => ['EXCEPTION', 'ROLLBACK_FAILED'].includes(job.status) ? (
          <IconButton icon={busy === job.id ? LoaderCircle : RefreshCw} className={busy === job.id ? 'isSpinning' : ''} label="Ponów job" onClick={(event) => { event.stopPropagation(); retryJob(job.id); }} disabled={Boolean(busy)} />
        ) : null },
      ]} />
      {selected ? (
        <Modal title="Szczegóły automatyzacji" onClose={() => setSelected(null)}>
          <div className="confirmSummary">
            <div><span>Status</span><StatusBadge value={selected.status} /></div>
            <div><span>Job</span><code>{selected.id}</code></div>
            <div><span>Draft</span><code>{selected.draftId}</code></div>
            <div><span>KB</span><code>{selected.kbNamespace}</code></div>
          </div>
          {selected.review ? (<div className="detailPanel"><strong>Werdykt LLM: {selected.review.decision} ({Math.round(selected.review.confidence * 100)}%)</strong><pre>{JSON.stringify(selected.review, null, 2)}</pre></div>) : null}
          {selected.reroute ? (<div className="detailPanel reroutePanel"><strong>Proponowane przekierowanie</strong><div className="detailMeta"><code>{selected.reroute.sourceKb}</code><span>→</span><code>{selected.reroute.targetKb}</code><span>{Math.round(Number(selected.reroute.confidence || 0) * 100)}%</span></div></div>) : null}
          {selected.adjudication ? (<div className="detailPanel"><strong>Ocena operatora</strong><pre>{JSON.stringify(selected.adjudication, null, 2)}</pre></div>) : null}
          {selected.origin === 'live' && !selected.adjudication && ['SHADOW_COMPLETE', 'REROUTE_PROPOSED'].includes(selected.status) ? (
            <div className="detailPanel"><strong>Jaka powinna być prawidłowa akcja?</strong><div className="pageActions adjudicationActions">
              <IconButton icon={CheckCircle} label="Publikuj" showLabel onClick={() => adjudicateJob(selected.id, 'publish')} disabled={Boolean(busy)} />
              <IconButton icon={Pause} label="Wstrzymaj" showLabel onClick={() => adjudicateJob(selected.id, 'hold')} disabled={Boolean(busy)} />
              <IconButton icon={RefreshCw} label="Przekieruj" showLabel onClick={() => adjudicateJob(selected.id, 'reroute')} disabled={Boolean(busy)} />
            </div></div>
          ) : null}
          {selected.status === 'REROUTE_PROPOSED' && selected.adjudication?.correct && selected.adjudication?.expectedAction === 'reroute' ? (
            <div className="detailPanel reroutePanel">
              <strong>Zatwierdzony reroute jest gotowy do zastosowania</strong>
              <p className="muted">Zmieni routing wyłącznie pending draftu i uruchomi nową recenzję shadow. Nie publikuje ani nie buduje KB.</p>
              <IconButton icon={RefreshCw} label="Zastosuj reroute i sprawdź" showLabel variant="primary" onClick={() => applyReroute(selected.id)} disabled={Boolean(busy)} />
            </div>
          ) : null}
          {selected.error ? <div className="formMessage badMessage">{selected.error}</div> : null}
          <div className="detailPanel actionLog"><strong>Historia stanów</strong><pre>{(selected.transitions || []).map((item) => `${formatDate(item.at)} ${item.stage} ${item.status} ${item.message || ''}`).join('\n')}</pre></div>
          {selected.rollback ? (<div className="detailPanel actionLog"><strong>Rollback</strong><pre>{JSON.stringify(selected.rollback, null, 2)}</pre></div>) : null}
        </Modal>
      ) : null}
    </PageShell>
  );
}
