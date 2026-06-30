import { useCallback, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Bell, BookmarkPlus, Bot, Check, CheckCircle, Database, Edit3,
  Eye, FilePlus2, Gauge, Globe, History, ListFilter, LoaderCircle, Pause, Plus,
  Power, Radar, RefreshCw, Route, Rss, Save, ScanSearch, Search, Sparkles,
  Trash2, Undo2, X, XCircle,
} from 'lucide-react';
import { apiFetch, formatDate, formatNumber, shortLabel } from './constants';
import PageShell from './shared/PageShell';
import DataTable from './shared/DataTable';
import StatusBadge from './shared/StatusBadge';
import Modal from './shared/Modal';
import IconButton from './shared/IconButton';
import Tooltip from './shared/Tooltip';
import SafeExternalLink from './shared/SafeExternalLink';
import EmptyState from './shared/EmptyState';
import PageSkeleton from './shared/Skeleton';
import useApi from './shared/useApi';

function isReviewable(candidate) {
  return (
    !candidate.operatorDecision
    && (
      ['NEW', 'CANDIDATE_ONLY'].includes(candidate.status)
      || (candidate.status === 'REJECTED' && !candidate.rejectedBy)
    )
  );
}

export default function SourcesPage({ overview }) {
  const kbs = overview?.kbs || [];
  const isAdmin = overview?.service?.role === 'admin';
  const defaultKb = kbs.find((kb) => kb.namespace === 'TaxbellLegalReference')?.namespace || kbs[0]?.namespace || '';
  const { data: sourceData, loading: sourcesLoading, error: sourcesError, reload: reloadSources } = useApi('/api/source-list');
  const { data: discoveryData, loading: discoveryLoading, error: discoveryError, reload: reloadDiscovery } = useApi('/api/discovery');
  const sources = useMemo(() => sourceData?.sources || [], [sourceData?.sources]);
  const discovery = discoveryData?.discovery || {};
  const feedback = discovery.feedback || {};
  const discoveryLearning = discovery.learning || {};
  const sourceActions = useMemo(() => (overview?.actions || []).filter((action) => (
    ['scan_sources', 'scan_source', 'discovery_daily', 'discovery_weekly'].includes(action.type)
  )).slice(0, 12), [overview?.actions]);

  const [form, setForm] = useState({
    title: '',
    sourceType: 'url',
    url: '',
    query: '',
    kbNamespace: defaultKb,
    tags: '',
    authMode: 'none',
    username: '',
    password: '',
    token: '',
    maxItemsPerScan: 10,
    enabled: true,
  });
  const [editingId, setEditingId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [sourceTab, setSourceTab] = useState('candidates');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidateKb, setCandidateKb] = useState('all');
  const [candidateAction, setCandidateAction] = useState('all');
  const [candidateTier, setCandidateTier] = useState('all');
  const [candidateConfidence, setCandidateConfidence] = useState('all');
  const [candidatePriority, setCandidatePriority] = useState('all');
  const [candidateStatus, setCandidateStatus] = useState('pending');
  const [calibrationOnly, setCalibrationOnly] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState({});
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [triageNote, setTriageNote] = useState('');
  const [savedViews, setSavedViews] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('erp-kb-source-views') || '[]');
    } catch {
      return [];
    }
  });
  const [savedViewId, setSavedViewId] = useState('');
  const failedSources = useMemo(() => sources.filter((source) => source.lastError), [sources]);

  const confidenceMatches = useCallback((candidate) => {
    const confidence = Number(candidate.assessment?.confidence || 0);
    if (candidateConfidence === 'high') return confidence >= 0.95;
    if (candidateConfidence === 'medium') return confidence >= 0.85 && confidence < 0.95;
    if (candidateConfidence === 'low') return confidence < 0.85;
    return true;
  }, [candidateConfidence]);

  const discoveryCandidates = useMemo(() => {
    const ids = new Set(feedback.calibration?.candidateIds || []);
    return (discovery.candidates || [])
    .filter((candidate) => !calibrationOnly || ids.has(candidate.id))
    .filter((candidate) => candidateStatus === 'all'
      || (candidateStatus === 'pending' && isReviewable(candidate))
      || (candidateStatus === 'reviewed' && candidate.operatorDecision?.source === 'operator'))
    .filter((candidate) => candidateKb === 'all' || candidate.kbNamespace === candidateKb)
    .filter((candidate) => candidateAction === 'all' || candidate.action === candidateAction)
    .filter((candidate) => candidateTier === 'all' || candidate.sourceTier === candidateTier)
    .filter((candidate) => candidatePriority === 'all' || candidate.priority?.level === candidatePriority)
    .filter(confidenceMatches)
    .filter((candidate) => (
      `${candidate.title} ${candidate.canonicalUrl} ${candidate.query} ${candidate.kbNamespace}`
        .toLowerCase()
        .includes(candidateQuery.toLowerCase())
    ))
    .slice(0, 200);
  }, [discovery.candidates, feedback.calibration?.candidateIds, calibrationOnly, candidateStatus, candidateKb, candidateAction, candidateTier, candidatePriority, confidenceMatches, candidateQuery]);

  const selectedCandidateIds = useMemo(() => Object.keys(selectedCandidates)
    .filter((candidateId) => selectedCandidates[candidateId])
    .filter((candidateId) => (discovery.candidates || []).some((candidate) => (
      candidate.id === candidateId && isReviewable(candidate)
    ))), [selectedCandidates, discovery.candidates]);
  const selectedCandidateRows = useMemo(() => (discovery.candidates || []).filter((candidate) => (
    selectedCandidateIds.includes(candidate.id)
  )), [discovery.candidates, selectedCandidateIds]);
  const selectableCandidates = discoveryCandidates.filter(isReviewable);
  const allVisibleCandidatesSelected = selectableCandidates.length > 0
    && selectableCandidates.every((candidate) => selectedCandidates[candidate.id]);
  const discoveryQueries = discovery.queries || [];

  const sourceTabs = [
    { id: 'candidates', label: 'Znalezione', count: discovery.report?.totals?.candidates ?? discovery.candidates?.length ?? 0, icon: Radar },
    { id: 'queries', label: 'Zapytania', count: discoveryQueries.length, icon: Search },
    { id: 'monitors', label: 'Monitory', count: sources.length, icon: Rss },
    { id: 'history', label: 'Historia', count: sourceActions.length, icon: History },
    { id: 'briefing', label: 'Briefing', count: discovery.qualityAlerts?.length || 0, icon: Bell },
  ];

  function updateField(name, value) { setForm((current) => ({ ...current, [name]: value })); }

  function resetForm() {
    setEditingId('');
    setFormOpen(false);
    setForm({
      title: '', sourceType: 'url', url: '', query: '', kbNamespace: defaultKb,
      tags: '', authMode: 'none', username: '', password: '', token: '',
      maxItemsPerScan: 10, enabled: true,
      sourceRoot: '', basketRoot: '', filePatterns: '.md, .pdf, .txt',
    });
  }

  function editSource(source) {
    setEditingId(source.id);
    setFormOpen(true);
    setForm({
      title: source.title || '', sourceType: source.sourceType || 'url',
      url: source.url || '', query: source.query || '', kbNamespace: source.kbNamespace || defaultKb,
      tags: (source.tags || []).join(', '), authMode: source.authMode || 'none',
      username: '', password: '', token: '', maxItemsPerScan: source.maxItemsPerScan || 10,
      enabled: source.enabled !== false,
      sourceRoot: source.sourceRoot || '', basketRoot: source.basketRoot || '',
      filePatterns: (source.filePatterns || ['.md', '.pdf', '.txt']).join(', '),
    });
    setMessage(`Edycja źródła ${source.id}. Sekret nie jest pokazywany; wpisz nowy tylko jeśli chcesz go zmienić.`);
  }

  async function saveSource(event) {
    event.preventDefault();
    setBusy('save');
    setMessage(editingId ? 'Aktualizuję źródło...' : 'Dodaję źródło...');
    const payload = {
      ...form,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      maxItemsPerScan: Number(form.maxItemsPerScan || 10),
      filePatterns: form.sourceType === 'directory'
        ? form.filePatterns.split(',').map((p) => p.trim()).filter(Boolean)
        : undefined,
    };
    if (payload.sourceType !== 'directory') {
      payload.sourceRoot = undefined;
      payload.basketRoot = undefined;
      payload.filePatterns = undefined;
    }
    try {
      const response = await apiFetch(editingId ? `/api/source-list/${encodeURIComponent(editingId)}` : '/api/source-list', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Source save failed');
      setMessage(editingId ? `Zaktualizowano źródło ${editingId}.` : `Dodano źródło ${result.source.id}.`);
      resetForm();
      reloadSources();
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setBusy('');
    }
  }

  async function deleteExistingSource(sourceId) {
    if (!window.confirm(`Usunąć źródło ${sourceId}?`)) return;
    setBusy(sourceId);
    setMessage('Usuwam źródło...');
    try {
      const response = await apiFetch(`/api/source-list/${encodeURIComponent(sourceId)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Source delete failed');
      setMessage(`Usunięto źródło ${sourceId}.`);
      reloadSources();
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setBusy('');
    }
  }

  async function toggleSource(source) {
    setBusy(source.id);
    setMessage(source.enabled === false ? 'Włączam źródło...' : 'Wyłączam źródło...');
    try {
      const response = await apiFetch(`/api/source-list/${encodeURIComponent(source.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...source, enabled: source.enabled === false }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Source toggle failed');
      setMessage(source.enabled === false ? `Włączono źródło ${source.id}.` : `Wyłączono źródło ${source.id}.`);
      reloadSources();
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setBusy('');
    }
  }

  async function scan(sourceId = '') {
    setBusy(sourceId || 'scan-all');
    setMessage(sourceId ? `Uruchamiam skan ${sourceId}...` : 'Uruchamiam skan wszystkich źródeł...');
    try {
      const response = await apiFetch(sourceId ? `/api/source-list/${encodeURIComponent(sourceId)}/scan` : '/api/source-list/scan-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Source scan failed');
      setMessage(`Skan uruchomiony: ${result.actionId}. Log jest w System > Dashboard actions.`);
      reloadSources();
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setBusy('');
    }
  }

  async function runDiscovery(mode) {
    setBusy(`discovery-${mode}`);
    setMessage(mode === 'weekly' ? 'Uruchamiam tygodniowy planner zapytań...' : 'Uruchamiam dzienny discovery dry-run...');
    try {
      const response = await apiFetch('/api/discovery/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, createDrafts: false, limit: 3 }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Discovery run failed');
      setMessage(`Discovery uruchomione: ${result.actionId}. Tryb: ${result.dryRun ? 'dry-run' : 'drafty'}.`);
      reloadDiscovery();
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setBusy('');
    }
  }

  async function decideCandidate(candidateId, decision) {
    setBusy(candidateId);
    setMessage(`Zapisuję decyzję ${decision}...`);
    try {
      const response = await apiFetch(`/api/discovery/candidates/${encodeURIComponent(candidateId)}/${decision}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: triageNote }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Candidate update failed');
      setMessage(result.candidate?.status === 'DUPLICATE'
        ? `Źródło ${candidateId} już istnieje w korpusie lub inboxie; oznaczono jako duplikat.`
        : decision === 'draft'
          ? `Utworzono pending draft z ${candidateId}.`
          : `Kandydat ${candidateId}: ${decision}.`);
      setSelectedCandidate(null);
      reloadDiscovery();
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setBusy('');
    }
  }

  function toggleCandidateSelection(candidateId) {
    setSelectedCandidates((current) => {
      const next = { ...current };
      if (next[candidateId]) delete next[candidateId];
      else next[candidateId] = true;
      return next;
    });
  }

  function toggleAllVisibleCandidates() {
    setSelectedCandidates((current) => {
      const next = { ...current };
      for (const candidate of selectableCandidates) {
        if (allVisibleCandidatesSelected) delete next[candidate.id];
        else next[candidate.id] = true;
      }
      return next;
    });
  }

  async function bulkDecideCandidates(decision) {
    const eligible = selectedCandidateRows.filter((candidate) => (
      decision !== 'route' || candidate.action === 'ROUTE_TO_PIPELINE'
    )).filter((candidate) => (
      decision !== 'draft' || candidate.action !== 'ROUTE_TO_PIPELINE'
    ));
    if (!eligible.length) return;
    if (!window.confirm(`Zastosować decyzję "${decision}" do ${eligible.length} kandydatów?`)) return;
    setBusy(`bulk-${decision}`);
    setMessage(`Przetwarzam ${eligible.length} kandydatów...`);
    try {
      const response = await apiFetch('/api/discovery/candidates/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateIds: eligible.map((c) => c.id), decision, note: triageNote }),
      });
      const payload = await response.json();
      if ((!response.ok && response.status !== 207) || !payload.result) {
        throw new Error(payload.message || payload.error || 'Bulk candidate update failed');
      }
      setMessage(`Bulk ${decision}: ${payload.result.succeeded} OK, ${payload.result.failed} błędów.`);
      setSelectedCandidates({});
      reloadDiscovery();
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setBusy('');
    }
  }

  async function toggleDiscoveryQuery(query) {
    setBusy(query.id);
    setMessage(query.enabled === false ? 'Włączam zapytanie...' : 'Wyłączam zapytanie...');
    try {
      const response = await apiFetch(`/api/discovery/queries/${encodeURIComponent(query.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: query.enabled === false }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Query update failed');
      setMessage(`Zaktualizowano zapytanie ${query.id}.`);
      reloadDiscovery();
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setBusy('');
    }
  }

  function persistSavedViews(next) {
    setSavedViews(next);
    window.localStorage.setItem('erp-kb-source-views', JSON.stringify(next));
  }

  function saveCurrentView() {
    const name = window.prompt('Nazwa widoku filtrów:');
    if (!name?.trim()) return;
    const view = {
      id: `source-view-${Date.now()}`,
      name: name.trim().slice(0, 80),
      filters: { candidateQuery, candidateKb, candidateAction, candidateTier, candidateConfidence, candidatePriority, candidateStatus, calibrationOnly },
    };
    const next = [...savedViews, view].slice(-20);
    persistSavedViews(next);
    setSavedViewId(view.id);
    setMessage(`Zapisano widok „${view.name}”.`);
  }

  function applySavedView(viewId) {
    setSavedViewId(viewId);
    const view = savedViews.find((item) => item.id === viewId);
    if (!view) return;
    const filters = view.filters || {};
    setCandidateQuery(filters.candidateQuery || '');
    setCandidateKb(filters.candidateKb || 'all');
    setCandidateAction(filters.candidateAction || 'all');
    setCandidateTier(filters.candidateTier || 'all');
    setCandidateConfidence(filters.candidateConfidence || 'all');
    setCandidatePriority(filters.candidatePriority || 'all');
    setCandidateStatus(filters.candidateStatus || 'pending');
    setCalibrationOnly(filters.calibrationOnly !== false);
  }

  function deleteSavedView() {
    if (!savedViewId) return;
    persistSavedViews(savedViews.filter((view) => view.id !== savedViewId));
    setSavedViewId('');
    setMessage('Usunięto zapisany widok.');
  }

  async function undoCandidate(candidateId) {
    setBusy(candidateId);
    setMessage('Cofam decyzję...');
    try {
      const response = await apiFetch(`/api/discovery/candidates/${encodeURIComponent(candidateId)}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Undo failed');
      setSelectedCandidate(null);
      setMessage(`Cofnięto decyzję dla ${candidateId}.`);
      reloadDiscovery();
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setBusy('');
    }
  }

  async function updateDiscoveryPolicy(patch) {
    setBusy('policy');
    try {
      const response = await apiFetch('/api/discovery/policy', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Policy update failed');
      setMessage('Zaktualizowano politykę discovery.');
      reloadDiscovery();
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setBusy('');
    }
  }

  async function refreshBriefing() {
    setBusy('briefing');
    try {
      const response = await apiFetch('/api/discovery/briefing/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'Briefing refresh failed');
      setMessage('Briefing został odświeżony.');
      reloadDiscovery();
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setBusy('');
    }
  }

  if (sourcesLoading || discoveryLoading) return <PageShell title="Źródła i discovery" description="Ładowanie..."><PageSkeleton /></PageShell>;
  if (sourcesError) return <PageShell title="Źródła i discovery"><EmptyState title="Błąd ładowania źródeł" description={sourcesError} /></PageShell>;
  if (discoveryError) return <PageShell title="Źródła i discovery"><EmptyState title="Błąd ładowania discovery" description={discoveryError} /></PageShell>;

  return (
    <PageShell
      title="Źródła i discovery"
      description="Stałe monitory, automatyczne zapytania oraz znalezione strony oczekujące na decyzję."
      actions={(
        <>
          {sourceTab === 'monitors' ? (
            <>
              <IconButton icon={Plus} label="Dodaj stały monitor" onClick={() => setFormOpen(true)} />
              <IconButton icon={busy === 'scan-all' ? LoaderCircle : RefreshCw} className={busy === 'scan-all' ? 'isSpinning' : ''} label="Skanuj wszystkie monitory" variant="primary" onClick={() => scan('')} disabled={Boolean(busy)} />
            </>
          ) : null}
          {['candidates', 'queries'].includes(sourceTab) ? (
            <IconButton icon={busy === 'discovery-daily' ? LoaderCircle : ScanSearch} className={busy === 'discovery-daily' ? 'isSpinning' : ''} label="Uruchom discovery dry-run" variant="primary" onClick={() => runDiscovery('daily')} disabled={Boolean(busy)} />
          ) : null}
          {sourceTab === 'queries' && isAdmin ? (
            <IconButton icon={busy === 'discovery-weekly' ? LoaderCircle : Bot} className={busy === 'discovery-weekly' ? 'isSpinning' : ''} label="Uruchom planner tygodniowy" onClick={() => runDiscovery('weekly')} disabled={Boolean(busy)} />
          ) : null}
          {sourceTab === 'history' ? (
            <IconButton icon={RefreshCw} label="Odśwież historię" variant="primary" onClick={() => reloadSources()} disabled={Boolean(busy)} />
          ) : null}
          {sourceTab === 'briefing' ? (
            <IconButton icon={busy === 'briefing' ? LoaderCircle : Sparkles} className={busy === 'briefing' ? 'isSpinning' : ''} label="Odśwież briefing" variant="primary" onClick={refreshBriefing} disabled={Boolean(busy)} />
          ) : null}
        </>
      )}
    >
      <div className="sourceSummary">
        <div><span>Pokrycie discovery</span><strong>{formatNumber(discovery.coverage?.coveredKbs)} / {formatNumber(discovery.coverage?.configuredKbs)} KB</strong></div>
        <div><span>Tryb discovery</span><StatusBadge value={discovery.policy?.dryRun ? 'DRY_RUN' : 'DRAFT_ENABLED'} /></div>
        <div><span>Do oceny / duplikaty</span><strong>{formatNumber(discovery.report?.totals?.pending)} / {formatNumber(discovery.report?.totals?.duplicates)}</strong></div>
        <div><span>Próbka / błędy</span><strong>{formatNumber(feedback.calibration?.reviewed)} / {formatNumber(feedback.calibration?.target || 30)} · {formatNumber(failedSources.length)}</strong></div>
      </div>
      {message ? <div className="formMessage">{message}</div> : null}
      <div className="detailPanel">
        <strong>Samonauka discovery</strong>
        <div className="detailMeta">
          <span>Reviewed: {formatNumber(discoveryLearning.overall?.reviewed || 0)}</span>
          <span>Mocne domeny: {formatNumber((discoveryLearning.highlights?.strongestDomains || []).length)}</span>
          <span>Słabe query: {formatNumber((discoveryLearning.highlights?.weakestQueries || []).length)}</span>
        </div>
        <div className="reasonChips">{(discoveryLearning.highlights?.strongestDomains || []).slice(0, 4).map(([key, value]) => <span key={key}>{key}: {value.scoreDelta > 0 ? '+' : ''}{value.scoreDelta}</span>)}</div>
        <div className="reasonChips">{(discoveryLearning.highlights?.weakestQueries || []).slice(0, 4).map(([key, value]) => <span key={key}>{key}: {value.scoreDelta}</span>)}</div>
      </div>
      <div className="sourceTabs" role="tablist" aria-label="Sekcje źródeł">
        {sourceTabs.map(({ id, label, count, icon: TabIcon }) => (
          <button type="button" role="tab" aria-selected={sourceTab === id} aria-controls={`source-panel-${id}`} className={sourceTab === id ? 'active' : ''} key={id} onClick={() => setSourceTab(id)}>
            <TabIcon aria-hidden="true" />
            <span>{label}</span>
            <strong>{formatNumber(count)}</strong>
          </button>
        ))}
      </div>
      {sourceTab === 'candidates' ? <div className="sourceTabPanel" id="source-panel-candidates" role="tabpanel">
        <div className="sourcePanelHeader">
          <div>
            <h3>Znalezione źródła</h3>
            <p className="muted">
              Automat znalazł {formatNumber(discovery.report?.totals?.candidates ?? discovery.candidates?.length)} stron.
              Domyślnie tabela pokazuje próbkę {formatNumber(feedback.calibration?.size || 30)} z {formatNumber(discovery.report?.totals?.pending)} oczekujących.
              Wyłącz filtr próbki i wybierz status „Wszystkie”, aby zobaczyć cały rejestr wraz z duplikatami.
            </p>
          </div>
          <div className="sourcePanelStats">
            <span><strong>{formatNumber(discovery.report?.totals?.pending)}</strong> do oceny</span>
            <span><strong>{formatNumber(discovery.report?.totals?.duplicates)}</strong> duplikatów</span>
          </div>
        </div>
        <div className="savedViewsBar">
          <BookmarkPlus aria-hidden="true" />
          <select value={savedViewId} onChange={(event) => applySavedView(event.target.value)} aria-label="Zapisane widoki źródeł">
            <option value="">Zapisane widoki</option>
            {savedViews.map((view) => <option value={view.id} key={view.id}>{view.name}</option>)}
          </select>
          <IconButton icon={Save} label="Zapisz aktualny zestaw filtrów" onClick={saveCurrentView} />
          <IconButton icon={Trash2} label="Usuń wybrany zapisany widok" variant="danger" onClick={deleteSavedView} disabled={!savedViewId} />
        </div>
        <div className="inboxControls discoveryControls">
          <div className="inboxControlsRow">
            <div className="inboxFields discoveryFilterFields">
              <label className="iconField searchField">
                <Search className="fieldIcon" aria-hidden="true" />
                <input value={candidateQuery} onChange={(event) => setCandidateQuery(event.target.value)} placeholder="Szukaj kandydata, URL, query..." aria-label="Szukaj kandydatów discovery" />
              </label>
              <label className="iconField"><Database className="fieldIcon" aria-hidden="true" /><select value={candidateKb} onChange={(event) => setCandidateKb(event.target.value)} aria-label="Filtr KB discovery"><option value="all">Wszystkie KB</option>{kbs.map((kb) => <option key={kb.namespace} value={kb.namespace}>{kb.kbName}</option>)}</select></label>
              <label className="iconField"><ListFilter className="fieldIcon" aria-hidden="true" /><select value={candidateAction} onChange={(event) => setCandidateAction(event.target.value)} aria-label="Filtr rekomendacji"><option value="all">Wszystkie rekomendacje</option><option value="CREATE_DRAFT">CREATE_DRAFT</option><option value="CANDIDATE_ONLY">CANDIDATE_ONLY</option><option value="ROUTE_TO_PIPELINE">ROUTE_TO_PIPELINE</option><option value="REJECT">REJECT</option></select></label>
              <label className="iconField"><Globe className="fieldIcon" aria-hidden="true" /><select value={candidateTier} onChange={(event) => setCandidateTier(event.target.value)} aria-label="Filtr tier"><option value="all">Wszystkie źródła</option><option value="official">Official</option><option value="community">Community</option><option value="professional">Professional</option><option value="unknown">Unknown</option></select></label>
              <label className="iconField"><Activity className="fieldIcon" aria-hidden="true" /><select value={candidateConfidence} onChange={(event) => setCandidateConfidence(event.target.value)} aria-label="Filtr confidence"><option value="all">Każda pewność</option><option value="high">≥ 95%</option><option value="medium">85–94%</option><option value="low">&lt; 85%</option></select></label>
              <label className="iconField"><Gauge className="fieldIcon" aria-hidden="true" /><select value={candidatePriority} onChange={(event) => setCandidatePriority(event.target.value)} aria-label="Filtr priorytetu"><option value="all">Każdy priorytet</option><option value="HIGH">Wysoki</option><option value="MEDIUM">Średni</option><option value="LOW">Niski</option></select></label>
              <label className="iconField"><CheckCircle className="fieldIcon" aria-hidden="true" /><select value={candidateStatus} onChange={(event) => setCandidateStatus(event.target.value)} aria-label="Filtr decyzji"><option value="pending">Do oceny</option><option value="reviewed">Ocenione</option><option value="all">Wszystkie</option></select></label>
            </div>
          </div>
          <div className="inboxControlsRow bulkRow">
            <div className="selectionSummary">
              <label className="toggleControl compactToggle"><input type="checkbox" checked={calibrationOnly} onChange={(event) => setCalibrationOnly(event.target.checked)} /><span>Tylko próbka {formatNumber(feedback.calibration?.size || 30)}</span></label>
              <Check className="summaryIcon" aria-hidden="true" />
              <strong>{formatNumber(selectedCandidateIds.length)}</strong><span>zaznaczonych</span>
              <span className="muted">widoczne {formatNumber(discoveryCandidates.length)}</span>
            </div>
            <div className="bulkActions">
              <input value={triageNote} onChange={(event) => setTriageNote(event.target.value)} placeholder="Notatka do feedbacku (opcjonalna)" aria-label="Notatka decyzji discovery" />
              <IconButton icon={FilePlus2} label="Utwórz drafty dla zaznaczonych" variant="primary" onClick={() => bulkDecideCandidates('draft')} disabled={!selectedCandidateRows.some((candidate) => candidate.action !== 'ROUTE_TO_PIPELINE') || Boolean(busy)} />
              <IconButton icon={Route} label="Przekaż zaznaczone do pipeline partnera" onClick={() => bulkDecideCandidates('route')} disabled={!selectedCandidateRows.some((candidate) => candidate.action === 'ROUTE_TO_PIPELINE') || Boolean(busy)} />
              <IconButton icon={XCircle} label="Odrzuć zaznaczone źródła" variant="danger" onClick={() => bulkDecideCandidates('reject')} disabled={!selectedCandidateIds.length || Boolean(busy)} />
            </div>
          </div>
        </div>
        <DataTable
          className="discoveryTable"
          rows={discoveryCandidates}
          columns={[
            { key: 'select', label: (<input type="checkbox" checked={allVisibleCandidatesSelected} onChange={toggleAllVisibleCandidates} disabled={!selectableCandidates.length || Boolean(busy)} aria-label="Zaznacz wszystkich widocznych kandydatów" />), render: (candidate) => isReviewable(candidate) ? (<input type="checkbox" checked={Boolean(selectedCandidates[candidate.id])} onChange={() => toggleCandidateSelection(candidate.id)} aria-label={`Zaznacz ${candidate.title}`} />) : null },
            { key: 'priority', label: 'Priorytet', render: (candidate) => <><StatusBadge value={candidate.priority?.level || 'LOW'} /><br /><strong>{formatNumber(candidate.priority?.score)}</strong><span className="muted"> / 100</span></> },
            { key: 'action', label: 'Ocena', render: (candidate) => <><StatusBadge value={candidate.action} /><br /><span className="muted">{candidate.sourceTier} · {Math.round(Number(candidate.assessment?.confidence || 0) * 100)}%</span></> },
            { key: 'source', label: 'Kandydat', render: (candidate) => <><strong>{candidate.title}</strong><br /><SafeExternalLink value={candidate.canonicalUrl} limit={72} /><br /><span className="muted">{shortLabel(candidate.snippet, 120)}</span></> },
            { key: 'kb', label: 'KB', render: (candidate) => <><code>{candidate.kbNamespace}</code><br /><span className="muted">{shortLabel(candidate.query, 72)}</span></> },
            { key: 'created', label: 'Znaleziono / decyzja', render: (candidate) => <>{formatDate(candidate.createdAt)}{candidate.operatorDecision ? <><br /><StatusBadge value={candidate.operatorDecision.actualAction} /><br /><span className="muted">{candidate.operatorDecision.operator}</span></> : null}</> },
            { key: 'actions', label: 'Decyzja', render: (candidate) => (
              <div className="rowActions">
                <IconButton icon={Eye} label="Pokaż szczegóły źródła" onClick={() => setSelectedCandidate(candidate)} />
                {!isReviewable(candidate) ? <Tooltip text="Źródło zostało rozstrzygnięte"><span className="resolvedIcon"><CheckCircle aria-hidden="true" /></span></Tooltip> : candidate.action === 'ROUTE_TO_PIPELINE'
                  ? <IconButton icon={Route} label="Przekaż do pipeline partnera" variant="primary" onClick={() => decideCandidate(candidate.id, 'route')} disabled={Boolean(busy)} />
                  : <IconButton icon={FilePlus2} label="Utwórz pending draft" variant="primary" onClick={() => decideCandidate(candidate.id, 'draft')} disabled={Boolean(busy)} />}
                {isReviewable(candidate) ? <IconButton icon={XCircle} label="Odrzuć źródło" variant="danger" onClick={() => decideCandidate(candidate.id, 'reject')} disabled={Boolean(busy)} /> : null}
                {candidate.canUndo ? <IconButton icon={Undo2} label={`Cofnij decyzję do ${formatDate(candidate.undoExpiresAt)}`} onClick={() => undoCandidate(candidate.id)} disabled={Boolean(busy)} /> : null}
              </div>
            ) },
          ]}
        />
        {feedback.overall?.reviewed ? (
          <div className="subsection">
            <h3>Jakość rekomendacji według KB</h3>
            <DataTable
              rows={Object.entries(feedback.byKb || {}).filter(([, metrics]) => metrics.reviewed > 0).map(([id, metrics]) => ({ id, ...metrics }))}
              columns={[
                { key: 'kb', label: 'KB', render: (row) => <code>{row.id}</code> },
                { key: 'reviewed', label: 'Decyzje', render: (row) => formatNumber(row.reviewed) },
                { key: 'agreement', label: 'Zgodność', render: (row) => row.agreement == null ? 'N/A' : `${Math.round(row.agreement * 100)}%` },
                { key: 'accepted', label: 'Przyjęte / odrzucone', render: (row) => `${formatNumber(row.accepted)} / ${formatNumber(row.rejected)}` },
                { key: 'errors', label: 'FP / FN', render: (row) => `${formatNumber(row.falsePositives)} / ${formatNumber(row.falseNegatives)}` },
              ]}
            />
          </div>
        ) : null}
      </div> : null}
      {sourceTab === 'queries' ? <div className="sourceTabPanel" id="source-panel-queries" role="tabpanel">
        <h3>Automatyczne zapytania discovery</h3>
        <p className="muted">To definicje wyszukiwania uruchamiane przez harmonogram. Ich wyniki trafiają do tabeli „Znalezione źródła”, nie do listy stałych monitorów.</p>
        <DataTable rows={discoveryQueries} columns={[
          { key: 'status', label: 'Status', render: (query) => <StatusBadge value={query.enabled === false ? 'DISABLED' : 'ACTIVE'} /> },
          { key: 'query', label: 'Zapytanie', render: (query) => <><strong>{query.query}</strong><br /><code>{query.id}</code></> },
          { key: 'kb', label: 'KB', render: (query) => <code>{query.kbNamespace}</code> },
          { key: 'source', label: 'Typ', render: (query) => <>{query.source}<br /><span className="muted">{query.expiresAt ? `do ${formatDate(query.expiresAt)}` : 'stałe'}</span></> },
          { key: 'yield', label: 'Wynik / duplikaty', render: (query) => <>{formatNumber(query.lastResultCount)} / {formatNumber(query.lastCorpusDuplicateCount)}<br /><span className="muted">{formatDate(query.lastRunAt)}</span></> },
          { key: 'quality', label: 'Efektywność', render: (query) => <><strong>{formatNumber(query.analytics?.efficiencyScore)} / 100</strong><br /><StatusBadge value={query.analytics?.health || 'GOOD'} /></> },
          { key: 'decisions', label: 'Przyjęte / odrzucone', render: (query) => <>{formatNumber(query.analytics?.accepted)} / {formatNumber(query.analytics?.rejected)}<br /><span className="muted">{query.analytics?.recommendation}</span></> },
          { key: 'actions', label: 'Akcje', render: (query) => isAdmin ? <IconButton icon={query.enabled === false ? Power : Pause} label={query.enabled === false ? 'Włącz zapytanie' : 'Wyłącz zapytanie'} onClick={() => toggleDiscoveryQuery(query)} disabled={Boolean(busy)} /> : <span className="muted">admin</span> },
        ]} />
      </div> : null}
      {sourceTab === 'monitors' ? <div className="sourceTabPanel" id="source-panel-monitors" role="tabpanel">
        <h3>Stałe monitory źródeł</h3>
        <p className="muted">Ręcznie skonfigurowane źródła: URL-e, RSS-y, sitemapy, zapytania Exa i katalogi plików. Dla katalogów pliki po przeróbce trafiają do koszyka. Nie zawiera pojedynczych stron znalezionych przez discovery.</p>
        <DataTable rows={sources} columns={[
          { key: 'status', label: 'Status', render: (source) => <><StatusBadge value={source.enabled === false ? 'DISABLED' : source.lastError ? 'ERROR' : 'OK'} /><br />{source.hasCredential ? <span className="muted">auth zapisany</span> : <span className="muted">publiczne</span>}</> },
          { key: 'source', label: 'Monitor', render: (source) => <><strong>{source.title || source.url || source.query}</strong><br /><code>{source.id}</code><br /><span className="muted">{source.sourceType}</span></> },
          { key: 'target', label: 'KB', render: (source) => <><span>{source.kbName}</span><br /><code>{source.kbNamespace}</code></> },
          { key: 'lastScan', label: 'Ostatni skan', render: (source) => <>{formatDate(source.lastScanAt)}<br />{source.lastError ? <span className="badText">{shortLabel(source.lastError, 72)}</span> : <span className="muted">{formatNumber(source.lastItemsSeen)} pozycji, {formatNumber(source.lastDraftsCreated)} draftów</span>}</> },
          { key: 'actions', label: 'Akcje', render: (source) => (
            <div className="rowActions">
              <IconButton icon={busy === source.id ? LoaderCircle : RefreshCw} className={busy === source.id ? 'isSpinning' : ''} label="Skanuj źródło" variant="primary" onClick={() => scan(source.id)} disabled={Boolean(busy)} />
              <IconButton icon={Edit3} label="Edytuj źródło" onClick={() => editSource(source)} />
              <IconButton icon={Power} label={source.enabled === false ? 'Włącz źródło' : 'Wyłącz źródło'} onClick={() => toggleSource(source)} disabled={Boolean(busy)} />
              <IconButton icon={Trash2} label="Usuń źródło" variant="danger" onClick={() => deleteExistingSource(source.id)} disabled={Boolean(busy)} />
            </div>
          ) },
        ]} />
        <p className="muted sourceRegistryPath">Plik konfiguracji: <code>{sourceData?.listPath}</code></p>
      </div> : null}
      {sourceTab === 'history' ? <div className="sourceTabPanel" id="source-panel-history" role="tabpanel">
        <h3>Historia skanów</h3>
        <DataTable rows={sourceActions} columns={[
          { key: 'status', label: 'Status', render: (action) => <StatusBadge value={action.status} /> },
          { key: 'action', label: 'Operacja', render: (action) => <><strong>{action.type}</strong><br /><code>{action.id}</code></> },
          { key: 'time', label: 'Czas', render: (action) => <>{formatDate(action.createdAt)}<br />{action.finishedAt ? formatDate(action.finishedAt) : <span className="muted">w toku</span>}</> },
          { key: 'error', label: 'Błąd', render: (action) => action.error ? <span className="badText">{action.error}</span> : <span className="muted">brak</span> },
        ]} />
      </div> : null}
      {sourceTab === 'briefing' ? <div className="sourceTabPanel briefingPanel" id="source-panel-briefing" role="tabpanel">
        <div className="briefingGrid">
          <section className="briefingCard">
            <div className="sectionHeader compactHeader">
              <div><h3>Briefing dzienny</h3><p className="muted">Wygenerowano {formatDate(discovery.briefing?.generatedAt)}</p></div>
              <Sparkles aria-hidden="true" />
            </div>
            <div className="briefingMetrics">
              <span><strong>{formatNumber(discovery.briefing?.totals?.pending)}</strong> do oceny</span>
              <span><strong>{formatNumber(discovery.briefing?.totals?.alerts)}</strong> alertów</span>
              <span><strong>{formatNumber(discovery.briefing?.totals?.activeQueries)}</strong> aktywnych zapytań</span>
            </div>
            <h4>Najwyższy priorytet</h4>
            <div className="briefingList">{(discovery.briefing?.topCandidates || []).map((candidate) => (
              <button type="button" key={candidate.id} onClick={() => { const fullCandidate = (discovery.candidates || []).find((item) => item.id === candidate.id); setSelectedCandidate(fullCandidate || candidate); }}>
                <strong>{candidate.priority?.score}</strong><span>{candidate.title}</span><code>{candidate.kbNamespace}</code><Eye aria-hidden="true" />
              </button>
            ))}</div>
          </section>
          <section className="briefingCard">
            <div className="sectionHeader compactHeader">
              <div><h3>Alerty jakości źródeł</h3><p className="muted">Monitory, zapytania, domeny i duplikaty.</p></div>
              <Bell aria-hidden="true" />
            </div>
            <div className="qualityAlertList">
              {(discovery.qualityAlerts || []).length ? (discovery.qualityAlerts || []).map((alert, index) => (
                <div className={`qualityAlert ${alert.level}`} key={`${alert.type}-${alert.resourceId}-${index}`}>
                  <AlertTriangle aria-hidden="true" />
                  <div><strong>{alert.type.replaceAll('_', ' ')}</strong><p>{alert.message}</p></div>
                </div>
              )) : <EmptyState>Brak aktywnych alertów jakości źródeł.</EmptyState>}
            </div>
          </section>
        </div>
        <section className={`semiAutoPanel ${discovery.semiAuto?.active ? 'ready' : ''}`}>
          <div className="sectionHeader"><div><h3>Tryb półautomatyczny</h3><p>Tworzy wyłącznie pending drafty z oficjalnych domen. Nigdy nie publikuje i nie uruchamia buildów KB.</p></div><StatusBadge value={discovery.semiAuto?.active ? 'ACTIVE' : discovery.semiAuto?.eligible ? 'READY' : 'BLOCKED'} /></div>
          <div className="semiAutoMetrics">
            <div><span>Decyzje</span><strong>{formatNumber(discovery.semiAuto?.metrics?.reviewed)} / {formatNumber(discovery.policy?.semiAutoMinReviews)}</strong></div>
            <div><span>Zgodność</span><strong>{discovery.semiAuto?.metrics?.agreement == null ? 'N/A' : `${Math.round(discovery.semiAuto.metrics.agreement * 100)}%`}</strong></div>
            <div><span>False positive</span><strong>{discovery.semiAuto?.metrics?.falsePositiveRate == null ? 'N/A' : `${Math.round(discovery.semiAuto.metrics.falsePositiveRate * 100)}%`}</strong></div>
            <div><span>Obserwacja</span><strong>{discovery.semiAuto?.metrics?.observationDays || 0} / {discovery.policy?.semiAutoMinObservationDays} dni</strong></div>
          </div>
          {isAdmin ? <div className="semiAutoControls">
            <label className="toggleControl"><input type="checkbox" checked={Boolean(discovery.policy?.semiAutoEnabled)} onChange={(event) => updateDiscoveryPolicy({ semiAutoEnabled: event.target.checked })} disabled={Boolean(busy)} /> Włącz konfigurację półautomatu</label>
            <label>Minimalna pewność<input type="number" min="0.8" max="1" step="0.01" defaultValue={discovery.policy?.semiAutoMinConfidence} onBlur={(event) => updateDiscoveryPolicy({ semiAutoMinConfidence: Number(event.target.value) })} /></label>
            <label>Limit na przebieg<input type="number" min="0" max="50" defaultValue={discovery.policy?.semiAutoMaxPerRun} onBlur={(event) => updateDiscoveryPolicy({ semiAutoMaxPerRun: Number(event.target.value) })} /></label>
          </div> : null}
          <div className="gateBlockers">{(discovery.semiAuto?.blockers || []).map((blocker) => <span key={blocker}>{blocker}</span>)}</div>
         </section>
        {discovery.semiAuto?.perKb ? (
          <section className="autoDraftPanel">
            <div className="sectionHeader">
              <div><h3>Auto-Draft per KB</h3><p>Dynamiczny próg na podstawie Phase 3 learning.</p></div>
            </div>
            <table className="autoDraftTable">
              <thead>
                <tr>
                  <th>KB</th>
                  <th>Tuned Baseline</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>FP Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(discovery.semiAuto.perKb).map(([ns, state]) => (
                  <tr key={ns}>
                    <td><code>{ns}</code></td>
                    <td>{state.tunedBaseline != null ? state.tunedBaseline.toFixed(2) : '\u2014'}</td>
                    <td>{state.threshold != null ? state.threshold.toFixed(2) : '\u2014'}</td>
                    <td>
                      {state.blockedByFp
                        ? <span className="statusBadge blocked">FP BLOCKED</span>
                        : state.eligible
                          ? <span className="statusBadge active">ACTIVE</span>
                          : <span className="statusBadge inactive">INELIGIBLE</span>}
                    </td>
                    <td>{state.fpRate != null ? `${(state.fpRate * 100).toFixed(1)}%` : '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
        {discovery.queries?.length ? (
          <section className="queryHealthPanel">
            <div className="sectionHeader"><div><h3>Wydajność zapytań</h3><p>Statystyki i zdrowie zapytań discovery.</p></div></div>
            <DataTable
              rows={discovery.queries}
              columns={[
                { key: 'query', label: 'Zapytanie', render: (q) => <code>{q.query?.slice(0, 50)}{q.query?.length > 50 ? '…' : ''}</code> },
                { key: 'kb', label: 'KB', render: (q) => <code>{q.kbNamespace}</code> },
                { key: 'source', label: 'Źródło', render: (q) => <StatusBadge value={q.source} /> },
                { key: 'health', label: 'Health', render: (q) => <StatusBadge value={q.analytics?.health || 'UNKNOWN'} /> },
                { key: 'acceptance', label: 'Accept', render: (q) => q.analytics?.acceptanceRate != null ? `${(q.analytics.acceptanceRate * 100).toFixed(0)}%` : '\u2014' },
                { key: 'efficiency', label: 'Efficiency', render: (q) => <strong>{q.analytics?.efficiencyScore ?? '\u2014'}</strong> },
                { key: 'results', label: 'Ostatnie wyniki', render: (q) => String(q.analytics?.candidates ?? 0) },
                { key: 'status', label: 'Status', render: (q) => <StatusBadge value={q.enabled !== false ? 'ACTIVE' : 'DISABLED'} /> },
              ]}
            />
          </section>
        ) : null}
        {discovery.learning?.byDomain ? (() => {
          const domainEntries = Object.entries(discovery.learning.byDomain)
            .filter(([, d]) => (d.reviewed ?? 0) >= 3)
            .sort((a, b) => (a[1].noisePenalty ?? 0) - (b[1].noisePenalty ?? 0));
          if (!domainEntries.length) return null;
          const suggestAction = (d) => {
            if ((d.noisePenalty ?? 0) > 0.4) return { label: 'BLOCKLIST', cls: 'bad' };
            if ((d.acceptanceRate ?? 0) >= 0.8) return { label: 'ALLOWLIST', cls: 'ok' };
            return null;
          };
          return (
            <section className="queryHealthPanel">
              <div className="sectionHeader"><div><h3>Sugestie domen</h3><p>Automatyczne rekomendacje na podstawie noise penalty i acceptance rate.</p></div></div>
              <DataTable
                rows={domainEntries.map(([domain, d]) => ({ domain, ...d }))}
                columns={[
                  { key: 'domain', label: 'Domena', render: (r) => <code>{r.domain}</code> },
                  { key: 'reviewed', label: 'Reviewed', render: (r) => String(r.reviewed ?? 0) },
                  { key: 'acceptanceRate', label: 'Accept', render: (r) => r.acceptanceRate != null ? `${(r.acceptanceRate * 100).toFixed(0)}%` : '\u2014' },
                  { key: 'rejectRate', label: 'Reject', render: (r) => r.rejectRate != null ? `${(r.rejectRate * 100).toFixed(0)}%` : '\u2014' },
                  { key: 'noisePenalty', label: 'Noise', render: (r) => r.noisePenalty != null ? (r.noisePenalty * 100).toFixed(0) : '0' },
                  { key: 'suggestion', label: 'Sugestia', render: (r) => {
                    const s = suggestAction(r);
                    return s ? <span className={`badge ${s.cls}`} style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{s.label}</span> : '\u2014';
                  }},
                ]}
              />
            </section>
          );
        })() : null}
      </div> : null}
      {selectedCandidate ? (
        <Modal title="Szczegóły znalezionego źródła" onClose={() => setSelectedCandidate(null)} actions={(
          <>
            {selectedCandidate.canUndo ? <IconButton icon={Undo2} label="Cofnij ostatnią decyzję" showLabel onClick={() => undoCandidate(selectedCandidate.id)} disabled={Boolean(busy)} /> : null}
            {isReviewable(selectedCandidate) && selectedCandidate.action !== 'ROUTE_TO_PIPELINE' ? <IconButton icon={FilePlus2} label="Utwórz pending draft" variant="primary" showLabel onClick={() => decideCandidate(selectedCandidate.id, 'draft')} disabled={Boolean(busy)} /> : null}
            {isReviewable(selectedCandidate) && selectedCandidate.action === 'ROUTE_TO_PIPELINE' ? <IconButton icon={Route} label="Przekaż do pipeline" variant="primary" showLabel onClick={() => decideCandidate(selectedCandidate.id, 'route')} disabled={Boolean(busy)} /> : null}
            {isReviewable(selectedCandidate) ? <IconButton icon={XCircle} label="Odrzuć źródło" variant="danger" showLabel onClick={() => decideCandidate(selectedCandidate.id, 'reject')} disabled={Boolean(busy)} /> : null}
          </>
        )}>
          <div className="candidateDetail">
            <div className="candidateDetailHeader">
              <div><StatusBadge value={selectedCandidate.priority?.level || 'LOW'} /><StatusBadge value={selectedCandidate.action} /><StatusBadge value={selectedCandidate.status} /></div>
              <strong>{formatNumber(selectedCandidate.priority?.score)} / 100</strong>
            </div>
            <h3>{selectedCandidate.title}</h3>
            <SafeExternalLink value={selectedCandidate.canonicalUrl} limit={120} />
            <div className="candidateDetailGrid">
              <div><span>Docelowa KB</span><code>{selectedCandidate.kbNamespace}</code></div>
              <div><span>Źródło</span><strong>{selectedCandidate.sourceTier}</strong></div>
              <div><span>Pewność</span><strong>{Math.round(Number(selectedCandidate.assessment?.confidence || 0) * 100)}%</strong></div>
              <div><span>Znaleziono</span><strong>{formatDate(selectedCandidate.createdAt)}</strong></div>
              <div><span>Zapytanie</span><code>{selectedCandidate.queryId}</code></div>
              <div><span>Model</span><code>{selectedCandidate.assessment?.model || 'N/A'}</code></div>
            </div>
            <section><h4>Dlaczego ten priorytet</h4><div className="reasonChips">{(selectedCandidate.priority?.reasons || []).map((reason) => <span key={reason}>{reason}</span>)}</div></section>
            <section>
              <h4>Uzasadnienie oceny LLM</h4>
              <ul>{(selectedCandidate.assessment?.reasons || []).map((reason) => <li key={reason}>{reason}</li>)}</ul>
              <p className="muted">Novelty: {selectedCandidate.assessment?.novelty || 'N/A'} · duplicate risk: {selectedCandidate.assessment?.duplicateRisk || 'N/A'} · content risk: {selectedCandidate.assessment?.contentRisk || 'N/A'}</p>
            </section>
            {selectedCandidate.duplicateExplanation ? (
              <section className="duplicateExplanation">
                <h4>Wyjaśnienie duplikatu</h4>
                <p>{selectedCandidate.duplicateExplanation.label}</p>
                <div><span>Metoda</span><code>{selectedCandidate.duplicateExplanation.method}</code></div>
                {selectedCandidate.duplicateExplanation.registryPath ? <div><span>Rejestr</span><code>{selectedCandidate.duplicateExplanation.registryPath}</code></div> : null}
                {selectedCandidate.duplicateExplanation.draftId ? <div><span>Draft</span><code>{selectedCandidate.duplicateExplanation.draftId}</code></div> : null}
                {selectedCandidate.duplicateExplanation.sourceUrl ? <SafeExternalLink value={selectedCandidate.duplicateExplanation.sourceUrl} limit={40} label="Otwórz istniejące źródło" /> : null}
              </section>
            ) : null}
            {selectedCandidate.operatorDecision ? (
              <section><h4>Decyzja operatora</h4><p><strong>{selectedCandidate.operatorDecision.actualAction}</strong> · {selectedCandidate.operatorDecision.operator} · {formatDate(selectedCandidate.operatorDecision.decidedAt)}</p>{selectedCandidate.operatorDecision.note ? <p>{selectedCandidate.operatorDecision.note}</p> : null}</section>
            ) : null}
            <section><h4>Treść źródła</h4><pre className="candidateContent">{selectedCandidate.content || selectedCandidate.snippet || 'Brak treści.'}</pre></section>
          </div>
        </Modal>
      ) : null}
      {formOpen ? (
        <Modal title={editingId ? 'Edytuj źródło' : 'Dodaj źródło'} onClose={resetForm} actions={(
          <>
            <IconButton icon={X} label="Anuluj" showLabel onClick={resetForm} />
            <IconButton icon={busy === 'save' ? LoaderCircle : editingId ? Save : Plus} className={busy === 'save' ? 'isSpinning' : ''} label={editingId ? 'Zapisz zmiany' : 'Dodaj źródło'} variant="primary" showLabel type="submit" form="sourceForm" disabled={busy === 'save'} />
          </>
        )}>
          <form id="sourceForm" className="sourceForm inModal" onSubmit={saveSource}>
            <div className="formGrid">
              <label>Tytuł<input value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="np. Ministerstwo Finansów - aktualności VAT" /></label>
              <label>Typ<select value={form.sourceType} onChange={(event) => updateField('sourceType', event.target.value)}>
                <option value="url">URL</option>
                <option value="rss">RSS / Atom</option>
                <option value="sitemap">Sitemap XML</option>
                <option value="exa_query">Exa query</option>
                <option value="directory">Katalog (hot folder)</option>
              </select></label>
              {form.sourceType === 'directory' ? (<>
                <label className="spanAll">Katalog źródłowy<input value={form.sourceRoot} onChange={(event) => updateField('sourceRoot', event.target.value)} placeholder="downloads/inbox/new" required /></label>
                <label>Katalog koszyka<input value={form.basketRoot} onChange={(event) => updateField('basketRoot', event.target.value)} placeholder="domyślnie: {sourceRoot}_processed" /></label>
                <label>Rozszerzenia plików<input value={form.filePatterns} onChange={(event) => updateField('filePatterns', event.target.value)} placeholder=".md, .pdf, .txt" /></label>
              </>) : form.sourceType === 'exa_query' ? (
                <label className="spanAll">Zapytanie Exa<input value={form.query} onChange={(event) => updateField('query', event.target.value)} placeholder="np. nowe interpretacje podatkowe VAT 2026 site:gov.pl" required /></label>
              ) : (
                <label className="spanAll">URL<input value={form.url} onChange={(event) => updateField('url', event.target.value)} type="url" placeholder="https://..." required /></label>
              )}
              <label>KB<select value={form.kbNamespace} onChange={(event) => updateField('kbNamespace', event.target.value)} required>{kbs.map((kb) => <option value={kb.namespace} key={kb.namespace}>{kb.kbName}</option>)}</select></label>
              <label>Tagi<input value={form.tags} onChange={(event) => updateField('tags', event.target.value)} placeholder="vat, prawo, mf" /></label>
              <label>Auth<select value={form.authMode} onChange={(event) => updateField('authMode', event.target.value)}><option value="none">Brak</option><option value="basic">Basic login/hasło</option><option value="bearer">Bearer token</option></select></label>
              <label>Max pozycji/skan<input value={form.maxItemsPerScan} onChange={(event) => updateField('maxItemsPerScan', event.target.value)} type="number" min="1" max="50" /></label>
              {form.authMode === 'basic' ? (<><label>Login<input value={form.username} onChange={(event) => updateField('username', event.target.value)} autoComplete="off" /></label><label>Hasło<input value={form.password} onChange={(event) => updateField('password', event.target.value)} type="password" autoComplete="new-password" placeholder={editingId ? 'pozostaw puste bez zmiany' : ''} /></label></>) : null}
              {form.authMode === 'bearer' ? (<label className="spanAll">Token<input value={form.token} onChange={(event) => updateField('token', event.target.value)} type="password" autoComplete="new-password" placeholder={editingId ? 'pozostaw puste bez zmiany' : ''} /></label>) : null}
            </div>
          </form>
        </Modal>
      ) : null}
    </PageShell>
  );
}
