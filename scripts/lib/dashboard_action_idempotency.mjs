const APPROVAL_ACTION_TYPES = new Set(['promote_export', 'approve_export_build']);

export function reusableDraftApprovalAction(draft, actions = []) {
  const matching = actions.filter((action) => (
    action.draftId === draft.id && APPROVAL_ACTION_TYPES.has(action.type)
  ));
  const running = matching.find((action) => action.status === 'RUNNING');
  if (running) return running;
  if (draft.status !== 'promoted') return null;
  return matching.find((action) => action.status === 'FINISH') || null;
}
