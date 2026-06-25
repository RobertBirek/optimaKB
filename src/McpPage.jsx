import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from './constants';
import DataTable from './shared/DataTable';
import StatusBadge from './shared/StatusBadge';
import Modal from './shared/Modal';
import EmptyState from './shared/EmptyState';
import IconButton from './shared/IconButton';
import {
  Plug, Info, Square, RefreshCw, Trash2, Plus,
  KeyRound, Server, Users as UsersIcon, Copy as CopyIcon,
  RotateCcw, Edit, Check,
} from 'lucide-react';
import ServerHealthBadge from './shared/mcp/ServerHealthBadge';
import SnippetBlock from './shared/mcp/SnippetBlock';
import AddMcpKbSection from './shared/mcp/AddMcpKbSection';
import McpAccessSection from './shared/mcp/McpAccessSection';
import { ALL_KB_NAMESPACES, kbGroup } from './shared/mcp/kbConstants';

export default function McpPage() {
  const [servers, setServers] = useState([]);
  const [users, setUsers] = useState([]);
  const [health, setHealth] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(null);
  const [newKey, setNewKey] = useState(null);
  const [userInfo, setUserInfo] = useState({ name: '', email: '' });
  const [userMCPs, setUserMCPs] = useState([]);
  const [editUserId, setEditUserId] = useState(null);
  const [error, setError] = useState('');
  const [connModal, setConnModal] = useState(null);
  const [connKey, setConnKey] = useState('TWÓJ_KLUCZ_API');
  const [showMcpModal, setShowMcpModal] = useState(false);
  const [mcpForm, setMcpForm] = useState({ name: '', port: '', kbFilter: [] });
  const [mcpCreating, setMcpCreating] = useState(false);
  const [mcpResult, setMcpResult] = useState(null);
  const [detailServer, setDetailServer] = useState(null);
  const [copied, setCopied] = useState(false);
  const [serverBusy, setServerBusy] = useState({});
  const [healthChecking, setHealthChecking] = useState(false);
  const [healthCheckedAt, setHealthCheckedAt] = useState('');
  const [copiedText, setCopiedText] = useState('');

  const load = useCallback(async () => {
    try {
      const [sRes, uRes] = await Promise.all([apiFetch('/api/mcp/servers'), apiFetch('/api/mcp/users')]);
      if (sRes.ok) { const d = await sRes.json(); setServers(d.servers || []); }
      if (uRes.ok) { const d = await uRes.json(); setUsers(d.users || []); }
    } catch {
      setError('Nie udało się załadować danych MCP.');
    }
  }, []);

  const checkHealth = useCallback(async () => {
    setHealthChecking(true);
    try {
      const res = await apiFetch('/api/mcp/servers/health');
      if (res.ok) {
        const d = await res.json();
        setHealth(d.results || []);
        setHealthCheckedAt(new Date().toLocaleTimeString('pl-PL'));
      }
    } catch {
      console.error('MCP health check failed');
    } finally {
      setHealthChecking(false);
    }
  }, []);

  useEffect(() => { load(); checkHealth(); }, [load, checkHealth]);

  const handleCreateUser = async () => {
    if (!userInfo.name.trim()) return;
    setError('');
    try {
      const res = await apiFetch('/api/mcp/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userInfo.name, email: userInfo.email, mcpAssignments: userMCPs }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.message || d.error || 'Nie udało się utworzyć użytkownika'); return; }
      setShowUserModal(false);
      setUserInfo({ name: '', email: '' });
      setUserMCPs([]);
      load();
    } catch { setError('Błąd sieci'); }
  };

  const handleUpdateUser = async () => {
    if (!editUserId || !userInfo.name.trim()) return;
    setError('');
    try {
      const res = await apiFetch(`/api/mcp/users/${encodeURIComponent(editUserId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userInfo.name, email: userInfo.email, mcpAssignments: userMCPs }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.message || d.error || 'Nie udało się zaktualizować użytkownika'); return; }
      setShowUserModal(false);
      setEditUserId(null);
      setUserInfo({ name: '', email: '' });
      setUserMCPs([]);
      load();
    } catch { setError('Błąd sieci'); }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Usunąć użytkownika?')) return;
    try {
      await apiFetch(`/api/mcp/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      load();
    } catch {
      setError('Nie udało się usunąć użytkownika.');
    }
  };

  const handleGenerateKey = async (userId) => {
    setNewKey(null);
    setCopied(false);
    try {
      const res = await apiFetch(`/api/mcp/users/${encodeURIComponent(userId)}/keys`, { method: 'POST' });
      if (!res.ok) return;
      const d = await res.json();
      setNewKey({ userId, keyRaw: d.keyRaw, keyPrefix: d.keyPrefix });
      setShowKeyModal(userId);
    } catch {
      setError('Nie udało się wygenerować klucza.');
    }
  };

  const handleRevokeKey = async (userId, keyId) => {
    if (!confirm('Zablokować klucz API?')) return;
    try {
      await apiFetch(`/api/mcp/users/${encodeURIComponent(userId)}/keys/${encodeURIComponent(keyId)}`, { method: 'DELETE' });
      load();
    } catch {
      setError('Nie udało się zablokować klucza.');
    }
  };

  const handleRotateKey = async (userId, keyId) => {
    if (!confirm('Rotacja klucza – stary zostanie zablokowany?')) return;
    setNewKey(null);
    setCopied(false);
    try {
      const res = await apiFetch(`/api/mcp/users/${encodeURIComponent(userId)}/keys/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      });
      if (!res.ok) return;
      const d = await res.json();
      setNewKey({ userId, keyRaw: d.keyRaw, keyPrefix: d.keyPrefix });
      setShowKeyModal(userId);
      load();
    } catch {
      setError('Nie udało się zrotować klucza.');
    }
  };

  const copyKey = () => {
    if (newKey?.keyRaw) {
      navigator.clipboard.writeText(newKey.keyRaw).then(() => setCopied(true)).catch(() => {});
    }
  };

  const copyText = (id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(id);
      setTimeout(() => setCopiedText(''), 1800);
    }).catch(() => {});
  };

  const openEditUser = (user) => {
    setEditUserId(user.id);
    setUserInfo({ name: user.name, email: user.email });
    setUserMCPs([...user.mcpAssignments]);
    setShowUserModal(true);
  };

  const toggleAssignment = useCallback((serverId) => {
    setUserMCPs((prev) =>
      prev.includes(serverId) ? prev.filter((s) => s !== serverId) : [...prev, serverId],
    );
  }, []);

  const handleMcpCreate = async () => {
    if (!mcpForm.name.trim()) return;
    setMcpCreating(true);
    setMcpResult(null);
    try {
      const res = await apiFetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mcpForm.name.trim(),
          port: Number(mcpForm.port) || 0,
          kbFilter: mcpForm.kbFilter,
        }),
      });
      const d = await res.json();
      if (!res.ok) { setMcpResult({ error: d.message || d.error || 'Failed' }); return; }
      setMcpResult({ server: d.server, message: d.message });
      setShowMcpModal(false);
      setMcpForm({ name: '', port: '', kbFilter: [] });
      load();
    } catch (e) { setMcpResult({ error: e.message }); }
    setMcpCreating(false);
  };

  const runServerAction = async (id, action, errorMessage) => {
    setServerBusy((current) => ({ ...current, [id]: action }));
    try {
      const res = await apiFetch(`/api/mcp/servers/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTimeout(() => { load(); checkHealth(); }, 2000);
    } catch {
      setError(errorMessage);
    } finally {
      setServerBusy((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  };

  const handleMcpStop = async (id) => {
    runServerAction(id, 'stop', 'Nie udało się zatrzymać MCP.');
  };

  const handleMcpRestart = async (id) => {
    runServerAction(id, 'restart', 'Nie udało się zrestartować MCP.');
  };

  const handleMcpDelete = async (id) => {
    if (!confirm(`Usunąć MCP ${id}?`)) return;
    setServerBusy((current) => ({ ...current, [id]: 'delete' }));
    try {
      const res = await apiFetch(`/api/mcp/servers/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || d.error || 'Delete failed');
      }
      load();
    } catch (e) {
      setError(`Nie udało się usunąć MCP: ${e.message}`);
    } finally {
      setServerBusy((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
  };

  const toggleMcpKb = useCallback((ns) => {
    setMcpForm((p) => ({
      ...p,
      kbFilter: p.kbFilter.includes(ns) ? p.kbFilter.filter((n) => n !== ns) : [...p.kbFilter, ns],
    }));
  }, []);

  const setAllMcpKb = useCallback((selected) => {
    setMcpForm((p) => ({
      ...p,
      kbFilter: selected ? [...ALL_KB_NAMESPACES] : [],
    }));
  }, []);

  const setGroupMcpKb = useCallback((groupItems, selected) => {
    setMcpForm((p) => ({
      ...p,
      kbFilter: selected
        ? [...new Set([...p.kbFilter, ...groupItems])]
        : p.kbFilter.filter((ns) => !groupItems.includes(ns)),
    }));
  }, []);

  const openConnModal = (server) => {
    setConnKey('TWÓJ_KLUCZ_API');
    setConnModal(server);
  };

  const activeKeysCount = (user) => user.apiKeys.filter((k) => k.status === 'active').length;
  const healthMap = {};
  for (const h of health) healthMap[h.id] = h.status;
  const userKeyOptions = users.flatMap((u) =>
    u.apiKeys.filter((k) => k.status === 'active').map((k) => ({ userId: u.id, userName: u.name, ...k }))
  );

  return (
    <section>
      <div className="mcpPageTitle">
        <Server size={22} strokeWidth={1.5} />
        <h2>MCP / Klucze API</h2>
      </div>

      <div className="pageSection mcpPageSection">
        <div className="sectionHeader">
          <h3 className="mcpSectionTitle"><Server size={18} strokeWidth={1.5} /> Serwery MCP</h3>
          <div className="pageActions">
            <IconButton icon={RefreshCw} className={healthChecking ? 'isSpinning' : ''} label={healthChecking ? 'Sprawdzam' : 'Sprawdź stan'} onClick={checkHealth} disabled={healthChecking} />
            {healthCheckedAt ? <span className="mcpHealthStamp">ostatnio {healthCheckedAt}</span> : null}
            <IconButton icon={Plus} label="Nowy MCP" variant="primary" showLabel onClick={() => { setMcpForm({ name: '', port: '', kbFilter: [] }); setMcpResult(null); setShowMcpModal(true); }}>Nowy MCP</IconButton>
          </div>
        </div>

        {servers.length === 0 ? (
          <EmptyState message="Brak serwerów MCP." />
        ) : (
          <div className="mcpServerGrid">
            {servers.map((s) => {
              const isScoped = s.kind === 'erp_knowledge_scoped';
              const kbs = s.kbFilter?.length ? s.kbFilter : ALL_KB_NAMESPACES;
              const busyAction = serverBusy[s.id];
              return (
                <div key={s.id} className={`mcpServerCard ${isScoped ? 'mcpServerCardScoped' : 'mcpServerCardDefault'}`}>
                  <div className="mcpServerInfo">
                    <div className="mcpServerMeta">
                      <strong className="mcpServerName" onClick={() => setDetailServer(s)}>{s.name}</strong>
                      <StatusBadge value={s.status} />
                      <ServerHealthBadge status={healthMap[s.id] || 'unknown'} />
                      {isScoped && <code className="mcpServerPort">port {s.port}</code>}
                    </div>
                    <div className="mcpServerTags">
                      <span>{kbs.length} KB</span>
                      <span>·</span>
                      <span>{s.toolCount} narzędzi</span>
                      <span>·</span>
                      <code>{s.transport || 'sse'}</code>
                      {kbs.length <= 6 && kbs.map((ns) => {
                        const g = kbGroup(ns);
                        return <code key={ns} style={{ fontSize: '10px', background: 'var(--soft)', padding: '1px 5px', borderRadius: '3px' }}>{g.short}</code>;
                      })}
                      {kbs.length > 6 && <span title={kbs.join(', ')} style={{ cursor: 'help', borderBottom: '1px dashed var(--line)' }}>+{kbs.length - 6} więcej</span>}
                    </div>
                  </div>
                  <div className="mcpServerActions">
                    <IconButton icon={Plug} label="Połącz" tooltip={`Połącz z ${s.name}`} onClick={() => openConnModal(s)} disabled={Boolean(busyAction)} />
                    <IconButton icon={Info} label="Info" tooltip="Szczegóły serwera" onClick={() => setDetailServer(s)} disabled={Boolean(busyAction)} />
                    {isScoped && (
                      <>
                        <IconButton icon={busyAction === 'stop' ? RefreshCw : Square} className={busyAction === 'stop' ? 'isSpinning' : ''} label="Stop" tooltip="Zatrzymaj MCP" onClick={() => handleMcpStop(s.id)} disabled={Boolean(busyAction)} />
                        <IconButton icon={busyAction === 'restart' ? RefreshCw : RotateCcw} className={busyAction === 'restart' ? 'isSpinning' : ''} label="Restart" tooltip="Restartuj MCP" onClick={() => handleMcpRestart(s.id)} disabled={Boolean(busyAction)} />
                        <IconButton icon={busyAction === 'delete' ? RefreshCw : Trash2} className={busyAction === 'delete' ? 'isSpinning' : ''} label="Usuń" tooltip="Usuń MCP" onClick={() => handleMcpDelete(s.id)} disabled={Boolean(busyAction)} />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pageSection">
        <div className="sectionHeader">
          <h3 className="mcpSectionTitle"><UsersIcon size={18} strokeWidth={1.5} /> Użytkownicy i klucze API</h3>
          <div className="pageActions">
            <IconButton icon={Plus} label="Nowy użytkownik" variant="primary" showLabel onClick={() => { setEditUserId(null); setUserInfo({ name: '', email: '' }); setUserMCPs([]); setShowUserModal(true); }}>Nowy użytkownik</IconButton>
          </div>
        </div>

        {error && <div className="badMessage">{error}</div>}

        {users.length === 0 ? (
          <EmptyState message="Brak użytkowników. Dodaj pierwszego." />
        ) : (
          <DataTable
            rows={users}
            columns={[
              { key: 'name', label: 'Użytkownik', render: (u) => <strong>{u.name}</strong> },
              { key: 'email', label: 'Email', render: (u) => u.email || <span className="muted">—</span> },
              { key: 'mcp', label: 'Dostęp MCP', render: (u) => (u.mcpAssignments || []).length ? u.mcpAssignments.map((a) => <code key={a} style={{ marginRight: '3px' }}>{a}</code>) : <span className="muted">brak</span> },
              { key: 'keys', label: 'Klucze', render: (u) => <code>{activeKeysCount(u)}/{u.apiKeys.length}</code> },
              { key: 'actions', label: '', render: (u) => (
                <div className="mcpUserCell">
                  <IconButton icon={KeyRound} label="+Klucz" tooltip="Generuj nowy klucz API" onClick={() => handleGenerateKey(u.id)} />
                  {u.apiKeys.filter((k) => k.status === 'active').map((k) => (
                    <span key={k.id} style={{ display: 'inline-flex', gap: '2px', alignItems: 'center' }}>
                      <code style={{ fontSize: '10px' }}>{k.prefix}…</code>
                      <IconButton icon={Trash2} label="Revoke" tooltip="Zablokuj klucz" onClick={() => handleRevokeKey(u.id, k.id)} />
                      <IconButton icon={RotateCcw} label="Rotate" tooltip="Rotacja klucza" onClick={() => handleRotateKey(u.id, k.id)} />
                    </span>
                  ))}
                  <IconButton icon={Edit} label="Edytuj" tooltip="Edytuj użytkownika" onClick={() => openEditUser(u)} />
                  <IconButton icon={Trash2} label="Usuń" tooltip="Usuń użytkownika" onClick={() => handleDeleteUser(u.id)} />
                </div>
              )},
            ]}
          />
        )}
      </div>

      {showUserModal && (
        <Modal title={editUserId ? 'Edytuj użytkownika' : 'Nowy użytkownik'} onClose={() => { setShowUserModal(false); setEditUserId(null); setError(''); }}>
          <p style={{ margin: '4px 0 16px', fontSize: '13px', color: 'var(--muted)' }}>Przydziel użytkownikowi dostęp do serwerów MCP. Klucz API wygenerujesz po zapisaniu.</p>
          {error && <div className="badMessage" style={{ marginBottom: '12px' }}>{error}</div>}
          <div className="mcpModalBody">
            <div>
              <div className="mcpSectionLabel">Podstawowe</div>
              <div className="mcpUserFormGrid">
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Nazwa</span>
                  <input value={userInfo.name} onChange={(e) => setUserInfo((p) => ({ ...p, name: e.target.value }))} placeholder="np. Jan Kowalski" className="mcpInput" />
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Email</span>
                  <input value={userInfo.email} onChange={(e) => setUserInfo((p) => ({ ...p, email: e.target.value }))} placeholder="jan@firma.pl" className="mcpInput" />
                </label>
              </div>
            </div>
            <McpAccessSection servers={servers} userMCPs={userMCPs} toggleAssignment={toggleAssignment} setUserMCPs={setUserMCPs} />
          </div>
          <div className="modalActions">
            <button className="secondary" onClick={() => { setShowUserModal(false); setEditUserId(null); setError(''); }}>Anuluj</button>
            <button className="primary" onClick={editUserId ? handleUpdateUser : handleCreateUser}>{editUserId ? 'Zapisz' : 'Dodaj'}</button>
          </div>
        </Modal>
      )}

      {showKeyModal && newKey && (
        <Modal title="Nowy klucz API" onClose={() => { setShowKeyModal(null); setNewKey(null); setCopied(false); }}>
          <div style={{ margin: '12px 0' }}>
            <p className="mcpKeyBanner">Klucz pokazany tylko raz!</p>
            <div className="mcpKeyValue">
              <code className="mcpKeyCode">{newKey.keyRaw}</code>
              <IconButton icon={copied ? Check : CopyIcon} label="Kopiuj" onClick={copyKey} />
            </div>
            <p className="mcpKeyMeta">
              Prefix: <code>{newKey.keyPrefix}</code> · <strong>{users.find((u) => u.id === newKey.userId)?.name}</strong>
            </p>
          </div>
          <div className="modalActions">
            <button className="secondary" onClick={() => { setShowKeyModal(null); setNewKey(null); setCopied(false); }}>Zamknij</button>
          </div>
        </Modal>
      )}

      {connModal && (
        <Modal title={`Podłączanie: ${connModal.name}`} onClose={() => setConnModal(null)}>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
            Skopiuj snippet do konfiguracji agenta MCP.
          </p>
          <div className="mcpConnSnippet">
            <label style={{ fontSize: '13px', fontWeight: 500 }}>Klucz API (opcjonalnie)</label>
            <select
              value={connKey}
              onChange={(e) => setConnKey(e.target.value)}
              style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px', borderRadius: '6px', border: '1px solid var(--line)' }}
            >
              <option value="TWÓJ_KLUCZ_API">— Wpisz ręcznie —</option>
              {userKeyOptions.map((k) => (
                <option key={k.id} value={k.keyRaw || k.id}>{k.userName} — {k.prefix}…</option>
              ))}
            </select>
          </div>
          <SnippetBlock
            label={`SSE Transport (${connModal.sseUrl || connModal.url + '/sse'})`}
            snippet={{
              mcpServers: { [connModal.id]: {
                transport: 'sse',
                url: (connModal.sseUrl || connModal.url + '/sse').replace(/\/+$/, ''),
                headers: { Authorization: `Bearer ${connKey}` },
              }},
            }}
          />
          <SnippetBlock
            label="Stdio Proxy (npx)"
            snippet={{
              mcpServers: { [connModal.id]: {
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-sse-proxy', (connModal.sseUrl || connModal.url + '/sse').replace(/\/+$/, ''), connKey],
              }},
            }}
            compact
          />
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
            <p><strong>Kompatybilne agenty:</strong></p>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li><strong>Claude Desktop</strong> – <code>claude_desktop_config.json</code></li>
              <li><strong>Cursor</strong> – <code>.cursor/mcp.json</code></li>
              <li><strong>Continue.dev</strong> – <code>~/.continue/config.json</code></li>
            </ul>
          </div>
          <div className="modalActions">
            <button className="secondary" onClick={() => setConnModal(null)}>Zamknij</button>
          </div>
        </Modal>
      )}

      {showMcpModal && (
        <Modal title="Nowy MCP serwer" onClose={() => { setShowMcpModal(false); setMcpResult(null); }}>
          <p style={{ margin: '4px 0 16px', fontSize: '13px', color: 'var(--muted)' }}>Serwer z ograniczonym dostępem do wybranych baz wiedzy.</p>
          {mcpResult?.error && <div className="badMessage">{mcpResult.error}</div>}
          {mcpResult?.server && (
            <div className="formMessage" style={{ margin: '8px 0' }}>
              <strong>MCP utworzony:</strong> {mcpResult.server.name} <code>{mcpResult.server.id}</code>
              <p style={{ marginTop: '4px', fontSize: '12px' }}>{mcpResult.message}</p>
            </div>
          )}
          <div className="mcpModalBody">
            <div>
              <div className="mcpSectionLabel">Podstawowe</div>
              <div className="mcpFormRow">
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Nazwa</span>
                  <input value={mcpForm.name} onChange={(e) => setMcpForm((p) => ({ ...p, name: e.target.value }))} placeholder="np. Taxbell HR MCP" className="mcpInput" />
                </label>
                <label style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Port <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(opc.)</span></span>
                  <input value={mcpForm.port} onChange={(e) => setMcpForm((p) => ({ ...p, port: e.target.value }))} type="number" placeholder="3402–3499" min="3402" max="3499" className="mcpInput" />
                </label>
              </div>
            </div>
            <AddMcpKbSection kbFilter={mcpForm.kbFilter} toggleMcpKb={toggleMcpKb} setAllMcpKb={setAllMcpKb} setGroupMcpKb={setGroupMcpKb} />
          </div>
          <div className="modalActions">
            <button className="secondary" onClick={() => { setShowMcpModal(false); setMcpResult(null); }}>Anuluj</button>
            <button className="primary" onClick={handleMcpCreate} disabled={mcpCreating || !mcpForm.name.trim()}>{mcpCreating ? 'Tworzenie...' : 'Utwórz MCP'}</button>
          </div>
        </Modal>
      )}

      {detailServer && (
        <Modal title={detailServer.name} onClose={() => setDetailServer(null)}>
          <div className="mcpDetailGrid">
            <div><strong>ID</strong><br /><code>{detailServer.id}</code></div>
            <div><strong>Port</strong><br /><code>{detailServer.port || '—'}</code></div>
            <div className="mcpDetailWide">
              <div className="mcpDetailHeaderLine">
                <strong>URL</strong>
                <IconButton
                  icon={copiedText === `${detailServer.id}:url` ? Check : CopyIcon}
                  label="Kopiuj URL"
                  onClick={() => copyText(`${detailServer.id}:url`, detailServer.sseUrl || detailServer.url)}
                />
              </div>
              <code className="mcpDetailUrl">{detailServer.sseUrl || detailServer.url}</code>
            </div>
            <div><strong>Transport</strong><br /><StatusBadge value={detailServer.transport || 'sse'} /></div>
            <div><strong>Auth</strong><br /><StatusBadge value={detailServer.authMethod} /></div>
            <div><strong>Status</strong><br /><StatusBadge value={detailServer.status} /></div>
            <div><strong>Health</strong><br /><ServerHealthBadge status={healthMap[detailServer.id] || 'unknown'} /></div>
            <div><strong>Typ</strong><br /><code>{detailServer.kind}</code></div>
            <div className="mcpDetailWide"><strong>Opis</strong><br /><span className="muted">{detailServer.description}</span></div>
            <div className="mcpDetailWide">
              <strong>KB ({detailServer.kbFilter?.length || 'all'})</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {(detailServer.kbFilter?.length ? detailServer.kbFilter : ALL_KB_NAMESPACES).map((ns) => (
                  <code key={ns} style={{ fontSize: '11px' }}>{ns}</code>
                ))}
              </div>
            </div>
            <div className="mcpDetailWide">
              <strong>Narzędzia ({detailServer.toolCount})</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {(detailServer.capabilities || []).map((cap) => (
                  <code key={cap} style={{ fontSize: '11px' }}>{cap}</code>
                ))}
              </div>
            </div>
            {detailServer.kind === 'erp_knowledge_scoped' && (
              <div className="mcpDetailWideBorder">
                <div className="mcpDetailHeaderLine">
                  <strong>Instalacja</strong>
                  <IconButton
                    icon={copiedText === `${detailServer.id}:install` ? Check : CopyIcon}
                    label="Kopiuj instalację"
                    onClick={() => copyText(`${detailServer.id}:install`, `sudo cp config/mcp/${detailServer.id}/${detailServer.id}.service /etc/systemd/system/\nsudo cp config/mcp/${detailServer.id}/${detailServer.id}.env /etc/\nsudo systemctl daemon-reload\nsudo systemctl enable --now ${detailServer.id}`)}
                  />
                </div>
                <pre className="mcpInstallSnippet">sudo cp config/mcp/{detailServer.id}/{detailServer.id}.service /etc/systemd/system/{'\n'}sudo cp config/mcp/{detailServer.id}/{detailServer.id}.env /etc/{'\n'}sudo systemctl daemon-reload{'\n'}sudo systemctl enable --now {detailServer.id}</pre>
              </div>
            )}
          </div>
          <div className="modalActions">
            <IconButton icon={Plug} label="Połącz" onClick={() => { setDetailServer(null); openConnModal(detailServer); }} />
            <button className="primary" onClick={() => setDetailServer(null)}>Zamknij</button>
          </div>
        </Modal>
      )}
    </section>
  );
}
