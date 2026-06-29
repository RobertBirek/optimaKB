import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, setCsrfToken, formatNumber } from './constants';
import EmptyState from './shared/EmptyState';
import ErrorBoundary from './shared/ErrorBoundary';
import GlobalStatus from './shared/GlobalStatus';
import IconButton from './shared/IconButton';
import Modal from './shared/Modal';
import PageSkeleton from './shared/Skeleton';
import ThemeToggle from './shared/ThemeToggle';
import { canRenderTabWithoutOverview } from './shared/appContentGate';
import './styles.css';

const TABS = [
  ['overview', 'Dashboard', React.lazy(() => import('./Overview'))],
  ['kb', 'Bazy wiedzy', React.lazy(() => import('./KbPage'))],
  ['reports', 'Raporty', React.lazy(() => import('./ReportsPage'))],
  ['trends', 'Trendy', React.lazy(() => import('./TrendsPage'))],
  ['inbox', 'Inbox', React.lazy(() => import('./InboxPage'))],
  ['draft', 'Dodaj draft', React.lazy(() => import('./AddDraftPage'))],
  ['sources', 'Źródła', React.lazy(() => import('./SourcesPage'))],
  ['learning', 'Uczenie', React.lazy(() => import('./LearningPage'))],
  ['mcp', 'MCP / Klucze', React.lazy(() => import('./McpPage'))],
  ['automation', 'Automatyzacja', React.lazy(() => import('./AutomationPage'))],
  ['system', 'System', React.lazy(() => import('./SystemPage'))],
];

import { LayoutDashboard, Database, BarChart3, Inbox, FilePlus2, Globe, Bot, GraduationCap, KeyRound, Settings, RefreshCw, Play, Sparkles, Wrench, Shield, BookOpenText, AlertTriangle, HelpCircle, TrendingUp } from 'lucide-react';

const NAV_ICONS = {
  overview: LayoutDashboard,
  kb: Database,
  reports: BarChart3,
  trends: TrendingUp,
  inbox: Inbox,
  draft: FilePlus2,
  sources: Globe,
  automation: Bot,
  learning: GraduationCap,
  mcp: KeyRound,
  system: Settings,
};

const NAV_CATEGORIES = [
  { label: 'Operacje', icon: Sparkles, items: ['overview', 'kb', 'reports', 'trends', 'inbox'] },
  { label: 'Treść', icon: Wrench, items: ['draft', 'sources', 'learning', 'automation'] },
  { label: 'Administracja', icon: Shield, items: ['mcp', 'system'] },
];

function tabFromHash() {
  const hashTab = window.location.hash.slice(1);
  if (!hashTab) return null;
  if (TABS.some(([key]) => key === hashTab)) return hashTab;
  return '__notfound__';
}

function isValidTab(key) {
  return key && TABS.some(([k]) => k === key);
}

function tabLabel(key) {
  if (!isValidTab(key)) return 'Nie znaleziono';
  const found = TABS.find(([k]) => k === key);
  return found ? found[1] : key;
}

export default function App() {
  const [tab, setTabState] = useState(tabFromHash() || 'overview');
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const autoRef = useRef(null);

  const setTab = useCallback((newTab) => {
    setTabState(newTab);
    history.replaceState(null, '', `#${newTab}`);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hashTab = tabFromHash();
      if (hashTab) setTabState(hashTab);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      autoRef.current = setInterval(() => {
        apiFetch('/api/status').then((r) => {
          if (r.ok) return r.json();
          throw new Error();
        }).then((payload) => {
          setCsrfToken(payload.service?.csrfToken || '');
          setOverview(payload);
        }).catch(() => {});
      }, 15000);
    }
    return () => {
      if (autoRef.current) clearInterval(autoRef.current);
    };
  }, [autoRefresh]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.ctrlKey && event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const idx = parseInt(event.key, 10) - 1;
        if (TABS[idx]) setTab(TABS[idx][0]);
      }
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        event.preventDefault();
        const firstSearch = document.querySelector('.search');
        if (firstSearch) firstSearch.focus();
      }
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        event.preventDefault();
        setShowShortcuts((s) => !s);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setTab]);

  const loadOverview = useCallback(async () => {
    setError('');
    const response = await apiFetch('/api/status');
    if (!response.ok) throw new Error(`Status request failed: ${response.status}`);
    const payload = await response.json();
    setCsrfToken(payload.service?.csrfToken || '');
    setOverview(payload);
  }, []);

  useEffect(() => {
    loadOverview().catch((err) => setError(err.message));
  }, [loadOverview]);

  const tabBadges = useMemo(() => {
    if (!overview) return {};
    const badges = {};
    const inboxPending = overview.inbox?.counts?.pending || overview.overall?.pendingDrafts || 0;
    if (inboxPending) badges.inbox = inboxPending;
    return badges;
  }, [overview]);

  const content = useMemo(() => {
    if (!isValidTab(tab)) {
      return (
        <section className="pageSection">
          <div className="empty emptyFadeIn">
            <AlertTriangle className="emptyIcon" aria-hidden="true" size={40} />
            <span className="emptyTitle">404 — Nie znaleziono</span>
            <span>Strona <code>#{tab}</code> nie istnieje.</span>
            <button className="primary" onClick={() => setTab('overview')} style={{ marginTop: '12px' }}>Przejdź do Dashboardu</button>
          </div>
        </section>
      );
    }
    if (!overview && !canRenderTabWithoutOverview(tab)) {
      return <section><div className="pageFadeIn"><EmptyState icon={RefreshCw} title="Ładowanie danych..." description="Pobieranie statusu z serwera." /></div></section>;
    }
    const Page = TABS.find(([key]) => key === tab)?.[2];
    return (
      <ErrorBoundary key={tab}>
        <Page overview={overview || {}} setTab={setTab} />
      </ErrorBoundary>
    );
  }, [overview, setTab, tab]);

  const flatIndex = TABS.findIndex(([key]) => key === tab);
  const shortcutLabel = flatIndex >= 0 && flatIndex < 9 ? `Ctrl+${flatIndex + 1}` : '';

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark" aria-hidden="true">
            <BookOpenText className="brandMarkIcon" aria-hidden="true" />
          </div>
          <h1>TAXBELL</h1>
          <p>Knowledge Panel</p>
        </div>
        <nav className="tabs">
          {NAV_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <div key={cat.label} className="navCategory">
                <span className="navCategoryLabel"><CatIcon size={12} strokeWidth={2} aria-hidden="true" /> {cat.label}</span>
                {cat.items.map((key) => {
                  const Icon = NAV_ICONS[key];
                  const badge = tabBadges[key];
                  const idx = TABS.findIndex(([k]) => k === key);
                  return (
                    <button type="button" key={key} className={`navItem ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
                      <Icon className="navIcon" aria-hidden="true" />
                      <span>{tabLabel(key)}</span>
                      {idx >= 0 && idx < 9 ? <code className="navShortcut">{idx + 1}</code> : null}
                      {badge ? <span className="tabBadge">{formatNumber(badge)}</span> : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="workspace">
        <header>
          <div>
            <h1>{tabLabel(tab)}</h1>
            <p>{shortcutLabel ? <><code>{shortcutLabel}</code></> : null}</p>
          </div>
          <div className="headerActions">
            <ThemeToggle />
            <IconButton icon={HelpCircle} label="Skróty (?)" onClick={() => setShowShortcuts((s) => !s)} />
            <IconButton icon={Play} label={autoRefresh ? 'Zatrzymaj auto' : 'Auto 15s'} variant={autoRefresh ? 'primary' : 'secondary'} showLabel onClick={() => setAutoRefresh((a) => !a)} />
            <IconButton icon={RefreshCw} label="Odśwież status" variant="primary" showLabel onClick={() => loadOverview().catch((err) => setError(err.message))} />
          </div>
        </header>
        {overview ? <GlobalStatus data={overview} /> : null}
        {error ? <div className="topError">{error}</div> : null}
        <main>
          <Suspense fallback={<PageSkeleton />}>
            {content}
          </Suspense>
        </main>
      </div>

      {showShortcuts ? (
        <Modal title="Skróty klawiszowe" onClose={() => setShowShortcuts(false)}>
          <div className="shortcutsGrid">
            {TABS.map(([key, label], i) => i < 9 ? (
              <div key={key} className="shortcutRow">
                <code>Ctrl+{i + 1}</code>
                <span>{label}</span>
              </div>
            ) : null)}
            <div className="shortcutRow">
              <code>/</code>
              <span>Szukaj w bieżącej zakładce</span>
            </div>
            <div className="shortcutRow">
              <code>?</code>
              <span>Pokaż/ukryj skróty</span>
            </div>
            <div className="shortcutRow">
              <code>Esc</code>
              <span>Zamknij modal / panel</span>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
