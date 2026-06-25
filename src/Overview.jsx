import { useMemo } from 'react';
import { ArrowRight, BarChart3, Bot, Database, ExternalLink, FilePlus2, FileStack, Globe, Inbox, Radar, Settings, Sparkles } from 'lucide-react';
import { formatDate, formatNumber, classForStatus } from './constants';
import PageShell from './shared/PageShell';
import MetricTile from './shared/MetricTile';
import StatusBadge from './shared/StatusBadge';
import IconButton from './shared/IconButton';
import DonutChart from './shared/DonutChart';
import BarChart from './shared/BarChart';
import { buildHealthCockpit } from './shared/healthCockpit';

const TOOL_ICONS = {
  database: Database,
  applications: FileStack,
  assistant: Bot,
  models: Sparkles,
  mcp: Globe,
};

export default function Overview({ overview, setTab }) {
  const summary = overview.summary || {};
  const actions = useMemo(() => overview.actions || [], [overview.actions]);
  const cockpit = useMemo(() => buildHealthCockpit(overview), [overview]);
  const failedActions = actions.filter((action, index) => {
    if (!['FAIL', 'ERROR'].includes(action.status)) return false;
    const scope = `${action.type}|${action.sourceId || ''}|${action.kbNamespace || ''}|${action.draftId || ''}`;
    return !actions.slice(0, index).some((newer) => (
      ['FINISH', 'REMEDIATED', 'PUBLISHED', 'ROLLED_BACK'].includes(newer.status)
      && `${newer.type}|${newer.sourceId || ''}|${newer.kbNamespace || ''}|${newer.draftId || ''}` === scope
    ));
  });
  const failedSources = (overview.sources?.items || []).filter((source) => source.lastError);
  const automationExceptions = overview.automation?.exceptions?.length || 0;
  const discoveryPending = overview.discovery?.report?.totals?.pending
    ?? summary.discoveryPendingCandidates
    ?? 0;
  const discoveryAlerts = overview.discovery?.qualityAlerts?.length || 0;
  const supplementalAlerts = (overview.alerts || []).filter((alert) => !(
    /automation exception/i.test(alert.message)
    || /discovery run/i.test(alert.message)
    || /shadow decision/i.test(alert.message)
  ));
  const attention = [
    summary.pendingDrafts ? { label: `${formatNumber(summary.pendingDrafts)} draftów do zatwierdzenia`, tab: 'inbox', status: 'WARN' } : null,
    discoveryPending ? { label: `${formatNumber(discoveryPending)} kandydatów źródeł do oceny`, tab: 'sources', status: 'WARN' } : null,
    failedActions.length ? { label: `${formatNumber(failedActions.length)} nieudanych akcji`, tab: 'system', status: 'FAIL' } : null,
    failedSources.length ? { label: `${formatNumber(failedSources.length)} źródeł z błędem`, tab: 'sources', status: 'WARN' } : null,
    automationExceptions ? { label: `${formatNumber(automationExceptions)} wyjątków automatyzacji`, tab: 'automation', status: 'WARN' } : null,
    discoveryAlerts ? { label: `${formatNumber(discoveryAlerts)} alertów jakości wyszukiwania`, tab: 'sources', status: 'WARN' } : null,
    overview.overall?.quality !== 'PASS' ? { label: `Quality Gate: ${overview.overall?.quality || 'UNKNOWN'}`, tab: 'reports', status: overview.overall?.quality } : null,
  ].filter(Boolean);
  const healthHistory = useMemo(() => {
    const days = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i -= 1) {
      const dayStart = new Date(now - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const dayActions = actions.filter((a) => {
        const t = new Date(a.createdAt || a.startedAt).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      });
      const total = dayActions.length;
      const passed = dayActions.filter((a) => ['FINISH', 'REMEDIATED', 'PUBLISHED', 'ROLLED_BACK'].includes(a.status)).length;
      days.push({
        label: dayStart.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' }),
        total,
        passed,
        failed: total - passed,
      });
    }
    return days;
  }, [actions]);

  const actionTypes = useMemo(() => {
    const counts = {};
    actions.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [actions]);

  const quickActions = [
    { id: 'inbox', label: 'Przejrzyj inbox', hint: `${formatNumber(summary.pendingDrafts)} oczekujących`, icon: Inbox },
    { id: 'draft', label: 'Dodaj wiedzę', hint: 'Nowy draft lub plik', icon: FilePlus2 },
    { id: 'sources', label: 'Oceń źródła', hint: `${formatNumber(discoveryPending)} kandydatów`, icon: Radar },
    { id: 'automation', label: 'Automatyzacja', hint: `${formatNumber(automationExceptions)} wyjątków`, icon: Bot },
    { id: 'reports', label: 'Raporty jakości', hint: `${formatNumber(summary.reportProblemCount)} problemów`, icon: BarChart3 },
    { id: 'system', label: 'Stan systemu', hint: `${formatNumber(summary.runningActions)} aktywnych akcji`, icon: Settings },
  ];
  return (
    <div className="overviewGrid">
      <PageShell
        title="Status operacyjny"
        description={`Stan całego środowiska na ${formatDate(overview.generatedAt)}.`}
        actions={<IconButton icon={BarChart3} label="Raporty" variant="primary" showLabel onClick={() => setTab('reports')} />}
        className="overviewStatus"
      >
        <div className={`healthCockpit ${classForStatus(cockpit.overallStatus)}`}>
          <div className="healthCockpitHeader">
            <span className="healthCockpitEyebrow">Operational rail</span>
            <strong>Stan: <StatusBadge value={cockpit.overallStatus} /></strong>
          </div>
          <div className="healthSignalRail" aria-label="Sygnały operacyjne">
            {cockpit.signals.map((signal) => (
              <button
                type="button"
                key={signal.id}
                className={`healthSignal ${classForStatus(signal.status)}`}
                onClick={() => {
                  if (signal.id === 'inbox') setTab('inbox');
                  else if (signal.id === 'actions') setTab('system');
                  else if (signal.id === 'sources') setTab('sources');
                  else if (signal.id === 'automation') setTab('automation');
                  else if (signal.id === 'mcp') setTab('mcp');
                  else setTab('reports');
                }}
              >
                <span className="healthSignalDot" aria-hidden="true" />
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="metricsGrid">
          <MetricTile label="Quality" value={<StatusBadge value={overview.overall?.quality} />} status={overview.overall?.quality} />
          <MetricTile label="Freshness" value={<StatusBadge value={overview.overall?.freshness} />} status={overview.overall?.freshness} />
          <MetricTile label="Official delta" value={<StatusBadge value={overview.overall?.officialDelta} />} status={overview.overall?.officialDelta} />
          <MetricTile label="Do zatwierdzenia" value={formatNumber(summary.pendingDrafts)} status={summary.pendingDrafts ? 'WARN' : 'OK'} />
          <MetricTile label="Kandydaci źródeł" value={formatNumber(discoveryPending)} status={discoveryPending ? 'WARN' : 'OK'} />
          <MetricTile label="KB active" value={formatNumber(summary.kbCount)} hint={`${formatNumber(summary.discoveredKbCount)} detected outside registry`} />
          <MetricTile label="Rows" value={formatNumber(summary.totalRows)} hint={`${formatNumber(summary.totalChunks)} chunks`} />
          <MetricTile label="Cron" value={formatNumber(summary.cronEntries)} hint={`${formatNumber(summary.finishedJobs)} ostatnich buildów zakończonych`} status={summary.cronEntries ? 'OK' : 'WARN'} />
        </div>
      </PageShell>
      <PageShell
        title="Szybkie operacje"
        description="Najczęściej wykonywane zadania bez szukania ich w menu."
        className="overviewQuick"
      >
        <div className="quickActionGrid">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button type="button" className="quickAction" key={action.id} onClick={() => setTab(action.id)}>
                <span className="quickActionIcon"><Icon aria-hidden="true" /></span>
                <span className="quickActionCopy">
                  <strong>{action.label}</strong>
                  <small>{action.hint}</small>
                </span>
                <ArrowRight className="quickActionArrow" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </PageShell>
      <PageShell title="Health ostatnich 7 dni" description="Procent akcji zakończonych sukcesem." className="overviewHealth">
        {(() => {
          const W = 660, H = 120, PAD = 8;
          const maxPct = 100;
          const pts = healthHistory.map((d, i) => {
            const x = PAD + (i / (healthHistory.length - 1 || 1)) * (W - PAD * 2);
            const y = H - ((d.total ? (d.passed / d.total) * 100 : 100) / maxPct) * (H - PAD * 2) - PAD;
            return { x, y, ...d };
          });
          const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('');
          const fillD = `${lineD} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD} L${pts[0].x.toFixed(1)},${H - PAD} Z`;
          return (
            <div className="healthChartWrap">
              <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="healthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--ok)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--ok)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d={fillD} fill="url(#healthFill)" />
                <path d={lineD} fill="none" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p) => (
                  <g key={p.label}>
                    <circle cx={p.x} cy={p.y} r="3.5" fill="var(--ok)" stroke="var(--panel)" strokeWidth="2">
                      <title>{p.passed}/{p.total} passed ({p.total ? Math.round((p.passed / p.total) * 100) : 100}%)</title>
                    </circle>
                  </g>
                ))}
              </svg>
              <div className="healthChartLabels">
                {pts.map((p) => <span key={p.label}>{p.label}</span>)}
              </div>
            </div>
          );
        })()}
      </PageShell>
      <PageShell title="Akcje wg typu" description="Rozkład akcji dashboardu." className="overviewActions">
        {actionTypes.length ? (
          <div className="actionTypeGrid">
            {(() => {
              const maxCount = Math.max(...actionTypes.map((a) => a.count), 1);
              return actionTypes.slice(0, 8).map((a) => (
                <div className="actionTypeItem" key={a.type}>
                  <div className="actionTypeBar" style={{ width: `${(a.count / maxCount) * 100}%` }} />
                  <code>{a.type}</code>
                  <strong>{a.count}</strong>
                </div>
              ));
            })()}
          </div>
        ) : <div className="muted" style={{ padding: '12px' }}>Brak akcji do wyświetlenia.</div>}
      </PageShell>
      <PageShell title="Wymaga uwagi" description="Zebrane wyjątki i kolejki wymagające decyzji." className="overviewAttention">
        <div className="attentionList">
          {attention.length ? attention.map((item) => (
            <button type="button" key={item.label} onClick={() => setTab(item.tab)} className={`attentionItem ${classForStatus(item.status)}`}>
              <StatusBadge value={item.status} />
              <span>{item.label}</span>
              <ArrowRight className="attentionArrow" aria-hidden="true" />
            </button>
          )) : <div className="alert ok">Brak pilnych tematów operacyjnych.</div>}
          {supplementalAlerts.map((alert) => (
            <div className={`alert ${alert.level}`} key={alert.message}>{alert.message}</div>
          ))}
        </div>
      </PageShell>
      <PageShell
        title="Podstawowe narzędzia"
        description="Bezpośrednie wejścia do usług administracyjnych. Linki otwierają się w nowej karcie."
        className="overviewTools"
      >
        <div className="toolGrid">
          {(overview.tools || []).map((tool) => {
            const Icon = TOOL_ICONS[tool.icon] || Globe;
            return (
              <a className="toolCard" href={tool.url} target="_blank" rel="noreferrer" key={tool.id} data-tool-id={tool.id}>
                <span className="toolIcon"><Icon aria-hidden="true" /></span>
                <span className="toolCopy">
                  <span className="toolTitleRow">
                    <strong>{tool.title}</strong>
                    <StatusBadge value={tool.status} />
                  </span>
                  <span className="toolDescription">{tool.description}</span>
                  <code>{tool.url}</code>
                </span>
                <ExternalLink className="toolExternal" aria-hidden="true" />
              </a>
            );
          })}
        </div>
      </PageShell>
      <PageShell title="Inbox" className="overviewInbox">
        <DonutChart data={overview.charts?.inboxStatuses || []} />
      </PageShell>
      <PageShell title="Największe KB wg liczby rekordów" className="overviewKbChart">
        <BarChart data={overview.charts?.kbRows || []} valueKey="rows" labelKey="label" maxItems={8} />
      </PageShell>
      <PageShell title="Kategorie KB" className="overviewCategories">
        <BarChart data={overview.charts?.categoryRows || []} valueKey="rows" labelKey="label" />
      </PageShell>
      <PageShell title="Statusy raportów" className="overviewReports">
        <div className="reportStatusList">
          {(overview.charts?.reportStatuses || []).map((report) => (
            <div className="reportStatus" key={report.label}>
              <span>{report.label}</span>
              <StatusBadge value={report.status} />
            </div>
          ))}
        </div>
      </PageShell>
    </div>
  );
}
