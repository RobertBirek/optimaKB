export default function PageSkeleton() {
  return (
    <div style={{ padding: '16px' }}>
      <div className="skeleton skeletonTitle" />
      <div className="skeleton skeletonLine" />
      <div className="skeleton skeletonLine" />
      <div className="skeleton skeletonCard" />
      <div className="skeleton skeletonCard" />
      <div className="skeleton skeletonCard" />
    </div>
  );
}
