import { KB_GROUPS, kbGroup } from './kbConstants';

export default function AddMcpKbSection({ kbFilter, toggleMcpKb, setAllMcpKb, setGroupMcpKb }) {
  const selectedCount = kbFilter.length;
  return (
    <div>
      <div className="mcpSectionLabel">Zakres KB</div>
      <div className="mcpActionBar">
        <span className={`mcpSummaryPill ${selectedCount > 0 ? 'mcpSummaryPillActive' : 'mcpSummaryPillEmpty'}`}>{selectedCount} / 12 KB wybrane</span>
        <button className="secondary mcpMiniBtn" onClick={() => setAllMcpKb(true)}>Zaznacz wszystkie</button>
        <button className="secondary mcpMiniBtn" onClick={() => setAllMcpKb(false)}>Odznacz wszystkie</button>
      </div>
      <div className="mcpServerGrid">
        {KB_GROUPS.map((group) => {
          const groupSelected = group.items.filter((ns) => kbFilter.includes(ns)).length;
          const allInGroup = group.items.every((ns) => kbFilter.includes(ns));
          return (
            <div key={group.name} className="mcpKbGroupBox">
              <div className="mcpKbGroupHeader">
                {group.name}
                <span className="mcpKbGroupCount" style={{ color: groupSelected === group.items.length ? 'var(--ok)' : groupSelected > 0 ? 'var(--warn)' : 'var(--muted)' }}>{groupSelected}/{group.items.length}</span>
                <button className="secondary mcpMiniBtnSmall" onClick={() => setGroupMcpKb(group.items, !allInGroup)}>
                  {allInGroup ? 'Odznacz' : 'Zaznacz'}
                </button>
              </div>
              <div className="mcpInfoItems">
                {group.items.map((ns) => {
                  const g = kbGroup(ns);
                  return (
                    <label key={ns} className={`mcpKbCheckboxLabel ${kbFilter.includes(ns) ? 'mcpKbCheckboxLabelSelected' : ''}`}>
                      <input type="checkbox" className="mcpKbCheckbox" checked={kbFilter.includes(ns)} onChange={() => toggleMcpKb(ns)} />
                      {g.short}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
