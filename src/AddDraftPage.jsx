import { useState, useRef } from 'react';
import { CheckCircle, FileText, Globe, LoaderCircle, RotateCcw, Save, Search, Upload } from 'lucide-react';
import { apiFetch, UPLOAD_ACCEPT } from './constants';
import IconButton from './shared/IconButton';
import ButtonIcon from './shared/ButtonIcon';
import DraftAnalyzeBadge from './shared/DraftAnalyzeBadge';

export default function AddDraftPage({ overview, setTab }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sourceType, setSourceType] = useState('url');
  const [sourceUrl, setSourceUrl] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [savedDraft, setSavedDraft] = useState(null);
  const [draft, setDraft] = useState({
    kbNamespace: '',
    title: '',
    tags: '',
    content: '',
    metadata: null,
    warnings: [],
    providers: null,
  });
  const fileInputRef = useRef(null);
  const targets = overview?.kbRegistry?.entries || [];
  const activeKbNamespace = draft.kbNamespace || targets[0]?.namespace || '';
  const wizardStep = savedDraft ? 3 : draft.content ? 2 : 1;

  function setSelectedFile(nextFile) {
    setFile(nextFile || null);
    setMessage('');
  }

  async function analyzeDraft(event) {
    event.preventDefault();
    setAnalyzing(true);
    setSavedDraft(null);
    setMessage('Analizuję źródło i generuję metadane...');
    try {
      const form = new FormData();
      form.append('sourceType', sourceType);
      form.append('sourceUrl', sourceUrl);
      form.append('content', manualContent);
      form.append('title', draft.title);
      if (file) form.append('file', file);
      const response = await apiFetch('/api/drafts/analyze', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || payload.error || 'Draft analyze failed');
      setDraft({
        kbNamespace: payload.kbNamespace || targets[0]?.namespace || '',
        title: payload.title || '',
        tags: (payload.tags || []).join(', '),
        content: payload.content || '',
        metadata: payload.metadata || null,
        warnings: payload.warnings || [],
        providers: payload.providers || null,
      });
      setSourceUrl(payload.sourceUrl || sourceUrl);
      setMessage(`Analiza gotowa: ${payload.kbName || payload.kbNamespace}`);
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('Zapisywanie draftu...');
    try {
      const form = new FormData();
      form.append('kbNamespace', activeKbNamespace);
      form.append('title', draft.title);
      form.append('sourceUrl', sourceUrl);
      form.append('tags', draft.tags);
      form.append('content', draft.content);
      if (draft.metadata) form.append('metadataJson', JSON.stringify(draft.metadata));
      const response = await apiFetch('/api/drafts', { method: 'POST', body: form });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || payload.error || 'Draft save failed');
      setDraft({ kbNamespace: '', title: '', tags: '', content: '', metadata: null, warnings: [], providers: null });
      setManualContent('');
      setSourceUrl('');
      setFile(null);
      setSavedDraft({ id: payload.draftId, warning: payload.warning || '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage(`Zapisano draft: ${payload.draftId}${payload.warning ? ` | ${payload.warning}` : ''}`);
    } catch (error) {
      setMessage(`Błąd: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="sectionHeader">
        <div>
          <h2>Dodaj draft</h2>
          <p>Podaj URL, wklej treść albo wrzuć plik. Panel pobierze treść i wygeneruje KB, tytuł oraz tagi przed zapisem.</p>
        </div>
        <div className="draftProviderStatus">
          <DraftAnalyzeBadge label="Exa" enabled={overview?.service?.draftAnalyze?.exaConfigured} fallbackLabel="HTTP" />
          <DraftAnalyzeBadge label="Auto meta" enabled={overview?.service?.draftAnalyze?.openSpgLlmConfigured} fallbackLabel="Heurystyka" />
        </div>
      </div>
      <form className="draftForm enhancedDraftForm" onSubmit={draft.content ? onSubmit : analyzeDraft}>
        <div className="ingestionWizard" aria-label="Kroki dodawania źródła">
          {[
            [1, 'Źródło', 'URL, tekst albo plik'],
            [2, 'KB i treść', 'Sprawdź klasyfikację'],
            [3, 'Draft', 'Zapisany w inboxie'],
          ].map(([step, label, hint]) => (
            <div key={step} className={`ingestionStep ${wizardStep === step ? 'active' : ''} ${wizardStep > step ? 'done' : ''}`}>
              <span>{wizardStep > step ? <CheckCircle size={14} aria-hidden="true" /> : step}</span>
              <strong>{label}</strong>
              <small>{hint}</small>
            </div>
          ))}
        </div>
        {savedDraft ? (
          <div className="draftSavedPanel">
            <CheckCircle aria-hidden="true" />
            <div>
              <strong>Draft zapisany</strong>
              <p>ID: <code>{savedDraft.id}</code>{savedDraft.warning ? ` · ${savedDraft.warning}` : ''}</p>
            </div>
            <button type="button" className="secondary" onClick={() => setTab?.('inbox')}>Przejdź do Inbox</button>
          </div>
        ) : null}
        <div className="segmented sourceTypeTabs">
          {[
            ['url', 'URL', Globe],
            ['text', 'Tekst', FileText],
            ['file', 'Plik', Upload],
          ].map(([value, label, Icon]) => (
            <button className={sourceType === value ? 'active' : ''} type="button" key={value} onClick={() => setSourceType(value)}>
              <ButtonIcon icon={Icon} />
              {label}
            </button>
          ))}
        </div>
        {sourceType === 'url' ? (
          <label>URL źródła
            <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} type="url" placeholder="https://pomoc.comarchbetterfly.pl/..." required />
          </label>
        ) : null}
        {sourceType === 'text' ? (
          <>
            <label>Opcjonalny URL źródła
              <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} type="url" placeholder="https://..." />
            </label>
            <label>Treść do analizy
              <textarea value={manualContent} onChange={(event) => setManualContent(event.target.value)} placeholder="Wklej instrukcję, opis procedury albo notatkę..." required />
            </label>
          </>
        ) : null}
        {sourceType === 'file' ? (
          <div
            className={`dropZone ${dragActive ? 'active' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              setSelectedFile(event.dataTransfer.files?.[0]);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={UPLOAD_ACCEPT}
              onChange={(event) => setSelectedFile(event.target.files?.[0])}
            />
            <strong>{file ? file.name : 'Przeciągnij plik albo kliknij, aby wybrać'}</strong>
            <span className="muted">Obsługiwane: Markdown, TXT, PDF oraz przykłady kodu XML, JSON, VB/VBS/BAS, SQL, XPT, JS, TS, CS, PS1 i pliki konfiguracyjne.</span>
          </div>
        ) : null}
        <div className="draftActions">
          <IconButton
            icon={busy || analyzing ? LoaderCircle : draft.content ? Save : Search}
            className={busy || analyzing ? 'isSpinning' : ''}
            label={draft.content ? (busy ? 'Zapisywanie' : 'Zapisz draft') : (analyzing ? 'Analizuję' : 'Analizuj')}
            variant="primary"
            showLabel
            type="submit"
            disabled={busy || analyzing}
          />
          {draft.content ? (
            <IconButton
              icon={RotateCcw}
              label="Wyczyść analizę"
              showLabel
              onClick={() => setDraft({ kbNamespace: '', title: '', tags: '', content: '', metadata: null, warnings: [], providers: null })}
              disabled={busy || analyzing}
            />
          ) : null}
        </div>
        {message ? <div className="formMessage">{message}</div> : null}
        {draft.warnings?.length ? (
          <div className="warningList">
            {draft.warnings.map((warning) => <div key={warning}>{warning}</div>)}
          </div>
        ) : null}
        {draft.content ? (
          <div className="analysisGrid">
            <label>KB
              <select value={activeKbNamespace} onChange={(event) => setDraft((current) => ({ ...current, kbNamespace: event.target.value }))} required>
                {targets.map((target) => <option key={target.namespace} value={target.namespace}>{target.kbName}</option>)}
              </select>
            </label>
            <label>Tytuł
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength="200" required />
            </label>
            <label>Tagi
              <input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="tag1, tag2" />
            </label>
            <label>URL źródła
              <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} type="url" placeholder="https://..." />
            </label>
            <label className="spanAll">Treść draftu
              <textarea value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} required />
            </label>
            {draft.providers ? (
              <div className="analysisMeta spanAll">
                <span>Treść: <code>{draft.providers.content}</code></span>
                <span>Metadane: <code>{draft.providers.metadata}</code></span>
                {draft.metadata?.analysisConfidence ? <span>Pewność: <code>{draft.metadata.analysisConfidence}</code></span> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </form>
    </section>
  );
}
