import { memo } from 'react';
import { formatNumber, shortLabel, classForStatus } from '../constants';
import StatusBadge from './StatusBadge';
import Tooltip from './Tooltip';
import { Shield, RefreshCw, Inbox, Activity, CheckCircle, Database, Clock } from 'lucide-react';

function kbSyncTooltip(kbSync) {
  if (!kbSync) return null;
  if (kbSync.status === 'PASS') return 'Wszystkie aktywne KB podpięte w registry, bundle i routingu.';
  return (
    <div>
      <div>Registry - routing: {kbSync.registryMissingFromRouting?.length ? kbSync.registryMissingFromRouting.join(', ') : 'brak braków'}</div>
      <div>Bundle - routing: {kbSync.bundleMissingFromRouting?.length ? kbSync.bundleMissingFromRouting.join(', ') : 'brak braków'}</div>
      <div>Detected only: {kbSync.discoveredOnly?.length ? kbSync.discoveredOnly.join(', ') : 'brak'}</div>
    </div>
  );
}

const GlobalStatus = memo(function GlobalStatus({ data }) {
  const runningActions = (data.actions || []).filter((action) => action.status === 'RUNNING').length
    + (data.automation?.active?.length || 0);
  const lastAction = (data.actions || [])[0];
  const qualityStatus = classForStatus(data.overall?.quality);
  const qualityLabel = data.overall?.quality || 'UNKNOWN';
  const kbSyncText = kbSyncTooltip(data.kbSync);
  return (
    <div className="globalStatus">
      <div className={`qualityGate gate${qualityStatus.charAt(0).toUpperCase() + qualityStatus.slice(1)}`}>
        <Shield size={20} strokeWidth={1.5} className="qualityGateValue" />
        <div>
          <div className="qualityGateLabel">Quality Gate</div>
          <div className="qualityGateValue">{qualityLabel}</div>
        </div>
      </div>
      <div>
        <Clock size={14} strokeWidth={1.5} className="gsLabel" />
        <span className="gsLabel">Freshness</span>
        <span className="gsValue"><StatusBadge value={data.overall?.freshness} /></span>
      </div>
      <div>
        <Inbox size={14} strokeWidth={1.5} className="gsLabel" />
        <span className="gsLabel">Pending</span>
        <span className="gsValue">{formatNumber(data.inbox?.counts?.pending)}</span>
      </div>
      <div>
        <Activity size={14} strokeWidth={1.5} className="gsLabel" />
        <span className="gsLabel">Running</span>
        <span className="gsValue">{formatNumber(runningActions)}</span>
      </div>
      <div>
        <CheckCircle size={14} strokeWidth={1.5} className="gsLabel" />
        <span className="gsLabel">KB sync</span>
        <span className="gsValue"><Tooltip text={kbSyncText}><StatusBadge value={data.kbSync?.status} /></Tooltip></span>
      </div>
      <div>
        <Database size={14} strokeWidth={1.5} className="gsLabel" />
        <span className="gsLabel">KB set</span>
        <span className="gsValue" style={{ fontSize: '12px' }}>{data.kbSync?.label || '—'}</span>
      </div>
      <div>
        <RefreshCw size={14} strokeWidth={1.5} className="gsLabel" />
        <span className="gsLabel">Last action</span>
        <span className="gsValue" style={{ fontSize: '12px' }}>{lastAction ? shortLabel(`${lastAction.type} · ${lastAction.status}`, 22) : '—'}</span>
      </div>
    </div>
  );
});

export default GlobalStatus;
