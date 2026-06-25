import { useEffect, useRef, useState } from 'react';
import {
  Check, CheckCircle, Database, Eye, FileText, FileStack, LoaderCircle,
  Play, RotateCcw, Search, X, XCircle, Inbox,
} from 'lucide-react';
import { apiFetch, formatDate, formatNumber, INBOX_FILTERS } from './constants';
import PageShell from './shared/PageShell';
import DataTable from './shared/DataTable';
import StatusBadge from './shared/StatusBadge';
import Modal from './shared/Modal';
import IconButton from './shared/IconButton';
import Tooltip from './shared/Tooltip';
import SafeExternalLink from './shared/SafeExternalLink';
import PageSkeleton from './shared/Skeleton';
import EmptyState from './shared/EmptyState';
import useApi from './shared/useApi';
import { buildInboxUrl, deriveInboxPagination } from './shared/inboxPagination';
import { inboxRowControlState, isPendingDraft } from './shared/inboxRowControls';

const PAGE_SIZE = 50;

const INBOX_FILTER_ICONS = {
  pending: Inbox,
  all: FileStack,
  promoted: CheckCircle,
  withdrawn: RotateCcw,
  rejected: XCircle,
};

function readInboxParams() {
  const hash = window.location.hash;
  const qs = hash.includes('?') ? hash.slice(hash.indexOf('?')) : '';
  const params = new URLSearchParams(qs);
  return {
    filter: params.get('filter') || 'all',
    kbFilter: params.get('kb') || 'all',
    query: params.get('q') || '',
    page: Math.max(1, parseInt(params.get('page'), 10) || 1),
  };
}

function writeInboxParams(filter, kbFilter, query, page) {
  const params = new URLSearchParams();
  if (filter !== 'all') params.set('filter', filter);
  if (kbFilter !== 'all') params.set('kb', kbFilter);
  if (query) params.set('q', query);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  history.replaceState(null, '', `#inbox${qs ? '?' + qs : ''}`);
}

export default function InboxPage({ overview: _overview }) {
  const mountedRef = useRef(true);
  const pollControllerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pollControllerRef.current?.abort();
    };
  }, []);

  const inboxInit = readInboxParams();
  const [filter, setFilter] = useState(inboxInit.filter);
  const [kbFilter, setKbFilter] = useState(inboxInit.kbFilter);
  const [query, setQuery] = useState(inboxInit.query);
  const [selected, setSelected] = useState(null);
  const [checkedDrafts, setCheckedDrafts] = useState({});
  const [detail, setDetail] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(null);
  const [page, setPage] = useState(inboxInit.page);
  useEffect(() => { writeInboxParams(filter, kbFilter, query, page); }, [filter, kbFilter, query, page]);
  const inboxUrl = buildInboxUrl({ page, pageSize: PAGE_SIZE, status: filter, kbNamespace: kbFilter, query });
  const { data: inboxData, loading, error, reload } = useApi(inboxUrl);
  const { data: kbsData } = useApi('/api/kbs');
  const kbs = kbsData?.kbs || [];
  const rows = inboxData?.drafts || [];
  const selectableRows = rows.filter(isPendingDraft);
  const selectedPendingIds = Object.keys(checkedDrafts)
    .filter((draftId) => checkedDrafts[draftId])
    .filter((draftId) => (inboxData?.drafts || []).some((draft) => draft.id === draftId && isPendingDraft(draft)));
  const visibleSelectedCount = selectableRows.filter((draft) => checkedDrafts[draft.id]).length;
  const allVisibleSelected = selectableRows.length > 0 && visibleSelectedCount === selectableRows.length;
  const { totalRows, totalPages } = deriveInboxPagination({
    page,
    pageSize: PAGE_SIZE,
    total: inboxData?.total,
    rowCount: rows.length,
    hasMore: inboxData?.hasMore,
  });
  const pageRows = rows;

  useEffect(() => { setPage(1); }, [filter, kbFilter, query]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function loadDraftDetail(id) {
    if (!id) return;
    const payload = await apiFetch(`/api/drafts/${encodeURIComponent(id)}`)
      .then((response) => response.json())
      .catch((error) => ({ error: error.message }));
    setDetail(payload);
  }

  async function pollAction(actionId) {
    const controller = new AbortController();
    pollControllerRef.current = controller;
    const signal = controller.signal;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (signal.aborted || !mountedRef.current) return null;
      const action = await apiFetch(`/api/actions/${encodeURIComponent(actionId)}`, { signal })
        .then((response) => response.json())
        .catch((error) => ({ status: 'FAIL', error: error.message }));
      if (!mountedRef.current) return null;
      setActionMessage(`Akcja ${action.status || 'UNKNOWN'}${action.error ? `: ${action.error}` : ''}`);
      if (['FINISH', 'FAIL'].includes(action.status)) {
        reload();
        if (detail?.id) await loadDraftDetail(detail.id);
        return action;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (mountedRef.current) {
      setActionMessage('Akcja nadal działa w tle. Sprawdź zakładkę System i log akcji.');
    }
    return null;
  }

  async function rowApproveDraft(draftId, event) {
    event.stopPropagation();
    setActionBusy(true);
    setActionMessage('Zatwierdzanie draftu...');
    try {
      const response = await apiFetch(`/api/drafts/${encodeURIComponent(draftId)}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNote: 'Approved from inbox row' }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || payload.error || 'Promote failed');
      }
      reload();
      setActionMessage('Draft zatwierdzony.');
    } catch (error) {
      setActionMessage(`Błąd: ${error.message}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function rowRejectDraft(draftId, event) {
    event.stopPropagation();
    setActionBusy(true);
    setActionMessage('Odrzucanie draftu...');
    try {
      const response = await apiFetch(`/api/drafts/${encodeURIComponent(draftId)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNote: 'Rejected from inbox row' }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || payload.error || 'Reject failed');
      }
      reload();
      setActionMessage('Draft odrzucony.');
    } catch (error) {
      setActionMessage(`Błąd: ${error.message}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function rejectSelectedDraft() {
    if (!detail?.id) return;
    setActionBusy(true);
    setActionMessage('Odrzucanie draftu...');
    try {
      const response = await apiFetch(`/api/drafts/${encodeURIComponent(detail.id)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNote: 'Rejected from dashboard' }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || payload.error || 'Reject failed');
      }
      reload();
      setActionMessage('Draft odrzucony. Lista odświeżona.');
      closeDraftPreview();
    } catch (error) {
      setActionMessage(`Błąd: ${error.message}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function approveSelectedDraft() {
    if (!detail?.id) return;
    setActionBusy(true);
    setActionMessage('Uruchamianie zatwierdzenia, exportu i builda OpenSPG...');
    try {
      const response = await apiFetch(`/api/drafts/${encodeURIComponent(detail.id)}/promote-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNote: 'Approved and exported from dashboard' }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        const checks = payload.preflight?.checks
          ?.map((check) => `${check.name}: ${check.ok ? 'OK' : 'FAIL'} ${check.message}`)
          .join(' | ');
        throw new Error(`${payload.message || payload.error || 'Approve/build failed'}${checks ? ` | ${checks}` : ''}`);
      }
      setActionMessage(`Akcja uruchomiona: ${payload.actionId}`);
      const result = await pollAction(payload.actionId);
      if (result?.status === 'FINISH') {
        reload();
        setActionMessage('Draft zatwierdzony. Lista odświeżona.');
        closeDraftPreview();
      }
    } catch (error) {
      setActionMessage(`Błąd: ${error.message}`);
    } finally {
      setActionBusy(false);
    }
  }

  function toggleDraftSelection(draftId) {
    setCheckedDrafts((current) => {
      const next = { ...current };
      if (next[draftId]) delete next[draftId];
      else next[draftId] = true;
      return next;
    });
  }

  function selectAllVisible() {
    setCheckedDrafts((current) => {
      const next = { ...current };
      selectableRows.forEach((draft) => { next[draft.id] = true; });
      return next;
    });
  }

  function clearVisibleSelection() {
    setCheckedDrafts((current) => {
      const next = { ...current };
      selectableRows.forEach((draft) => { delete next[draft.id]; });
      return next;
    });
  }

  function toggleAllVisible() {
    if (allVisibleSelected) clearVisibleSelection();
    else selectAllVisible();
  }

  async function prepareBulkApproval() {
    if (!selectedPendingIds.length) return;
    setActionBusy(true);
    setActionMessage(`Sprawdzam preflight dla ${selectedPendingIds.length} draftów...`);
    try {
      const response = await apiFetch('/api/drafts/bulk-promote-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftIds: selectedPendingIds,
          dryRun: true,
          reviewNote: `Bulk approved ${selectedPendingIds.length} drafts from dashboard`,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        const checks = payload.preflightByNamespace
          ? Object.entries(payload.preflightByNamespace)
            .flatMap(([namespace, preflight]) => preflight.checks.filter((check) => !check.ok).map((check) => `${namespace}.${check.name}: ${check.message}`))
            .join(' | ')
          : '';
        throw new Error(`${payload.message || payload.error || 'Bulk preflight failed'}${checks ? ` | ${checks}` : ''}`);
      }
      setBulkConfirm(payload);
      setActionMessage('Preflight OK. Potwierdź uruchomienie bulk zatwierdzenia.');
    } catch (error) {
      setActionMessage(`Błąd: ${error.message}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function bulkRejectDrafts() {
    const ids = selectedPendingIds;
    if (!ids.length) return;
    setActionBusy(true);
    setActionMessage(`Odrzucanie ${ids.length} draftów...`);
    try {
      const results = await Promise.allSettled(ids.map((draftId) =>
        apiFetch(`/api/drafts/${encodeURIComponent(draftId)}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewNote: 'Bulk rejected from dashboard' }),
        }).then((r) => r.json())
      ));
      const ok = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
      const fail = results.filter((r) => r.status === 'rejected' || !r.value.ok).length;
      reload();
      setCheckedDrafts({});
      setActionMessage(`Odrzucono ${ok} draftów${fail ? ` (${fail} błędów)` : ''}. Lista odświeżona.`);
    } catch (error) {
      setActionMessage(`Błąd: ${error.message}`);
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmBulkApproval() {
    const draftIds = bulkConfirm?.draftIds || selectedPendingIds;
    if (!draftIds.length) return;
    setActionBusy(true);
    setActionMessage(`Uruchamianie bulk zatwierdzenia dla ${draftIds.length} draftów...`);
    try {
      const response = await apiFetch('/api/drafts/bulk-promote-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftIds,
          reviewNote: `Bulk approved ${draftIds.length} drafts from dashboard`,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        const checks = payload.preflightByNamespace
          ? Object.entries(payload.preflightByNamespace)
            .flatMap(([namespace, preflight]) => preflight.checks.map((check) => `${namespace}.${check.name}: ${check.ok ? 'OK' : 'FAIL'} ${check.message}`))
            .join(' | ')
          : '';
        throw new Error(`${payload.message || payload.error || 'Bulk approve/build failed'}${checks ? ` | ${checks}` : ''}`);
      }
      setActionMessage(`Akcja bulk uruchomiona: ${payload.actionId}`);
      setBulkConfirm(null);
      const result = await pollAction(payload.actionId);
      if (result?.status === 'FINISH') {
        reload();
        setActionMessage('Bulk zatwierdzenie zakończone. Lista odświeżona.');
      }
      setCheckedDrafts({});
    } catch (error) {
      setActionMessage(`Błąd: ${error.message}`);
    } finally {
      setActionBusy(false);
      reload();
    }
  }

  useEffect(() => {
    setActionMessage('');
    if (!selected) {
      setDetail(null);
      return;
    }
    loadDraftDetail(selected);
  }, [selected]);

  function closeDraftPreview() {
    setSelected(null);
    setDetail(null);
  }

  if (loading) return <PageSkeleton />;
  if (error) return <EmptyState title="Błąd ładowania" description={error} />;

  const detailModal = detail ? (
    <Modal title="Podgląd draftu" onClose={closeDraftPreview}>
      <div className="detailPanel draftPreviewModal">
        <strong>{detail.title}</strong>
        <div className="detailMeta"><StatusBadge value={detail.status} /> <code>{detail.id}</code></div>
        <div className="detailMeta"><span>KB</span><code>{detail.kbNamespace}</code></div>
        {detail.sourceUrl ? <div className="detailMeta"><span>Source</span><SafeExternalLink value={detail.sourceUrl} limit={96} /></div> : null}
        <div className="detailMeta"><span>JSON</span><code>{detail.rawJsonPath}</code></div>
        {detail.status === 'pending' ? (
          <div className="detailActions">
            <IconButton icon={actionBusy ? LoaderCircle : CheckCircle} className={actionBusy ? 'isSpinning' : ''} label={actionBusy ? 'Pracuję' : 'Zatwierdź'} variant="primary" showLabel onClick={approveSelectedDraft} disabled={actionBusy} />
            <IconButton icon={XCircle} label="Odrzuć" variant="danger" showLabel onClick={rejectSelectedDraft} disabled={actionBusy} />
            <span className="muted">Uruchamia pełny pipeline: export, build OpenSPG, quality gate, testpack i freshness.</span>
          </div>
        ) : null}
        {detail.status === 'promoted' ? <div className="formMessage">Zatwierdzony i uwzględniony w KB.</div> : null}
        {detail.status === 'withdrawn' ? <div className="formMessage">Wycofany z promoted.</div> : null}
        {detail.status === 'rejected' ? <div className="formMessage">Odrzucony.</div> : null}
        {actionMessage ? <div className="formMessage">{actionMessage}</div> : null}
        <pre>{detail.contentPreview || detail.error || ''}</pre>
      </div>
    </Modal>
  ) : null;

  return (
    <div className="inboxFullWidth">
      <PageShell
        title="Inbox"
        description="Przeglądaj, filtruj i zatwierdzaj drafty. Bulk zatwierdzenie zawsze pokazuje preflight przed buildem."
      >
        <div className="inboxControls">
          <div className="inboxControlsRow">
            <div className="iconSegmented" role="group" aria-label="Filtr statusu draftów">
              {INBOX_FILTERS.map(([value, label]) => {
                const Icon = INBOX_FILTER_ICONS[value] || FileText;
                return (
                  <Tooltip text={label} key={value}>
                    <button
                      className={`statusFilterButton ${filter === value ? 'active' : ''}`}
                      type="button"
                      onClick={() => setFilter(value)}
                      aria-label={label}
                      aria-pressed={filter === value}
                    >
                      <Icon className="buttonIcon" aria-hidden="true" />
                    </button>
                  </Tooltip>
                );
              })}
            </div>
            <div className="inboxFields">
              <label className="iconField">
                <Database className="fieldIcon" aria-hidden="true" />
                <select value={kbFilter} onChange={(event) => setKbFilter(event.target.value)} aria-label="Filtr KB">
                  <option value="all">Wszystkie KB</option>
                  {(kbs || []).map((kb) => <option key={kb.namespace} value={kb.namespace}>{kb.kbName}</option>)}
                </select>
              </label>
              <label className="iconField searchField">
                <Search className="fieldIcon" aria-hidden="true" />
                <input className="search" placeholder="Szukaj draftu, źródła, KB..." value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Szukaj draftu" />
              </label>
            </div>
          </div>
          <div className="inboxControlsRow bulkRow">
            <div className="selectionSummary">
              <Check className="summaryIcon" aria-hidden="true" />
              <strong>{formatNumber(selectedPendingIds.length)}</strong>
              <span>pending</span>
              <span className="muted">łącznie {formatNumber(totalRows)}</span>
              <span className="muted">widoczne {formatNumber(visibleSelectedCount)} / {formatNumber(selectableRows.length)}</span>
            </div>
            <div className="bulkActions">
              <IconButton icon={actionBusy ? LoaderCircle : CheckCircle} className={actionBusy ? 'isSpinning' : ''} label={actionBusy ? 'Pracuję' : 'Zatwierdź zaznaczone'} variant="primary" showLabel onClick={prepareBulkApproval} disabled={!selectedPendingIds.length || actionBusy} />
              <IconButton icon={XCircle} label="Odrzuć zaznaczone" variant="danger" showLabel onClick={bulkRejectDrafts} disabled={!selectedPendingIds.length || actionBusy} />
            </div>
          </div>
        </div>
        {actionMessage ? <div className="formMessage">{actionMessage}</div> : null}
        <DataTable
          className="inboxTable"
          rows={pageRows}
          page={page}
          totalPages={totalPages}
          setPage={setPage}
          columns={[
            { key: 'select', label: (
              <label className="selectAllHeader">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  disabled={!selectableRows.length || actionBusy}
                  aria-label="Zaznacz wszystkie widoczne pending drafty"
                />
              </label>
            ), render: (draft) => {
              const control = inboxRowControlState(draft);
              return (
                <input
                  type="checkbox"
                  checked={Boolean(checkedDrafts[draft.id]) && control.actionable}
                  onChange={() => { if (control.actionable) toggleDraftSelection(draft.id); }}
                  onClick={(event) => event.stopPropagation()}
                  disabled={!control.actionable || actionBusy}
                  title={control.disabledReason}
                  aria-label={`Zaznacz ${draft.title}`}
                />
              );
            } },
            { key: 'status', label: 'Status', render: (draft) => <StatusBadge value={draft.status} /> },
            { key: 'title', label: 'Draft', render: (draft) => <><strong>{draft.title}</strong><br /><code>{draft.id}</code></> },
            { key: 'kb', label: 'KB', render: (draft) => <><span>{draft.kbName}</span><br /><code>{draft.kbNamespace}</code></> },
            { key: 'source', label: 'Źródło', render: (draft) => draft.sourceUrl ? <SafeExternalLink value={draft.sourceUrl} limit={48} /> : <span className="muted">local/upload</span> },
            { key: 'createdAt', label: 'Data', render: (draft) => formatDate(draft.createdAt) },
            { key: 'actions', label: '', render: (draft) => (
              <div className="cellActions">
                {(() => {
                  const control = inboxRowControlState(draft);
                  return (
                    <>
                      <IconButton icon={CheckCircle} label="Zatwierdź" variant="primary" tooltip={control.disabledReason || 'Zatwierdź draft'} onClick={(event) => rowApproveDraft(draft.id, event)} disabled={!control.actionable || actionBusy} />
                      <IconButton icon={XCircle} label="Odrzuć" variant="danger" tooltip={control.disabledReason || 'Odrzuć draft'} onClick={(event) => rowRejectDraft(draft.id, event)} disabled={!control.actionable || actionBusy} />
                    </>
                  );
                })()}
                <IconButton icon={Eye} label="Podgląd draftu" onClick={() => setSelected(draft.id)} />
              </div>
            ) },
          ]}
        />
      </PageShell>
      {detailModal}
      {bulkConfirm ? (
        <Modal
          title="Potwierdź zatwierdzenie zaznaczonych draftów"
          onClose={() => setBulkConfirm(null)}
          actions={(
            <>
              <IconButton icon={X} label="Anuluj" showLabel onClick={() => setBulkConfirm(null)} disabled={actionBusy} />
              <IconButton icon={actionBusy ? LoaderCircle : Play} className={actionBusy ? 'isSpinning' : ''} label={actionBusy ? 'Pracuję' : 'Uruchom build'} variant="primary" showLabel onClick={confirmBulkApproval} disabled={actionBusy} />
            </>
          )}
        >
          <div className="confirmSummary">
            <div><span>Drafty</span><strong>{formatNumber(bulkConfirm.draftIds?.length)}</strong></div>
            <div><span>KB</span><strong>{(bulkConfirm.kbNamespaces || []).join(', ')}</strong></div>
          </div>
          <div className="preflightList">
            {Object.entries(bulkConfirm.preflightByNamespace || {}).map(([namespace, preflight]) => (
              <div key={namespace} className={`preflightItem ${preflight.ok ? 'ok' : 'bad'}`}>
                <StatusBadge value={preflight.ok ? 'OK' : 'FAIL'} />
                <strong>{namespace}</strong>
                <span>{preflight.checks?.length || 0} checks</span>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
