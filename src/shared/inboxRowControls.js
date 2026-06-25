const PENDING_STATUS = 'pending';

export function isPendingDraft(draft) {
  return String(draft?.status || '').toLowerCase() === PENDING_STATUS;
}

export function inboxRowControlState(draft) {
  const actionable = isPendingDraft(draft);
  return {
    visible: true,
    actionable,
    disabledReason: actionable ? '' : 'Dostępne tylko dla pending draftów',
  };
}
