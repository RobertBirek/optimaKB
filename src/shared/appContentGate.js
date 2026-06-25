const OVERVIEW_DEPENDENT_TABS = new Set(['overview']);

export function canRenderTabWithoutOverview(tab) {
  return !OVERVIEW_DEPENDENT_TABS.has(tab);
}
