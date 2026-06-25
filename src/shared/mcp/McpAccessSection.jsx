export default function McpAccessSection({ servers, userMCPs, toggleAssignment, setUserMCPs }) {
  const scoped = servers.filter((s) => s.kind === 'erp_knowledge_scoped');
  const standard = servers.filter((s) => s.kind !== 'erp_knowledge_scoped');
  const selectedCount = userMCPs.length;
  return (
    <div>
      <div className="mcpSectionLabel">Dostęp MCP</div>
      <div className="mcpActionBar">
        <span className={`mcpSummaryPill ${selectedCount > 0 ? 'mcpSummaryPillActive' : 'mcpSummaryPillEmpty'}`}>{selectedCount} / {servers.length} MCP</span>
        <button className="secondary mcpMiniBtn" onClick={() => setUserMCPs(servers.map((s) => s.id))}>Zaznacz wszystkie</button>
        <button className="secondary mcpMiniBtn" onClick={() => setUserMCPs([])}>Odznacz wszystkie</button>
      </div>
      <div className="mcpServerGrid">
        {[{ label: 'Standardowe', items: standard }, { label: 'Scoped', items: scoped }].filter((g) => g.items.length).map((group) => {
          const grpSelected = group.items.filter((s) => userMCPs.includes(s.id)).length;
          const allInGroup = group.items.every((s) => userMCPs.includes(s.id));
          return (
            <div key={group.label} className="mcpInfoBlock">
              <div className="mcpInfoHeader">
                {group.label}
                <span className="mcpKbGroupCount" style={{ color: grpSelected === group.items.length ? 'var(--ok)' : grpSelected > 0 ? 'var(--warn)' : 'var(--muted)' }}>{grpSelected}/{group.items.length}</span>
                <button className="secondary mcpMiniBtnSmall" onClick={() => setUserMCPs((prev) =>
                  allInGroup ? prev.filter((id) => !group.items.find((s) => s.id === id)) : [...new Set([...prev, ...group.items.map((s) => s.id)])],
                )}>
                  {allInGroup ? 'Odznacz' : 'Zaznacz'}
                </button>
              </div>
              <div className="mcpInfoItems">
                {group.items.map((s) => (
                  <label key={s.id} className={`mcpKbCheckboxLabel ${userMCPs.includes(s.id) ? 'mcpKbCheckboxLabelSelected' : ''}`}>
                    <input type="checkbox" className="mcpKbCheckbox" checked={userMCPs.includes(s.id)} onChange={() => toggleAssignment(s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
