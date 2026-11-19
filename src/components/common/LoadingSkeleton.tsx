import { Suspense, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { PageSkeleton, type PageSkeletonProps } from "./PageSkeleton";

export function LoadingReveal({ loading, children, fullscreen = false, label, page, uiTheme }: PageSkeletonProps & {
  loading: boolean;
  children: ReactNode;
  fullscreen?: boolean;
  label?: string;
}) {
  const [retained, setRetained] = useState(loading);
  if (loading && !retained) setRetained(true);
  useEffect(() => {
    if (loading || !retained) return;
    // Retain only the outgoing frame, not a hidden copy of every page forever.
    const timer = window.setTimeout(() => setRetained(false), 240);
    return () => window.clearTimeout(timer);
  }, [loading, retained]);
  return (
    <div className={`loading-reveal${fullscreen ? " loading-reveal-fullscreen" : ""}`} data-loading={loading} aria-busy={loading}>
      {(loading || retained) && <div className="loading-reveal-placeholder" aria-hidden={!loading}>
        <PageSkeleton label={label} page={page} uiTheme={uiTheme} />
      </div>}
      <div className="loading-reveal-content" inert={loading} aria-hidden={loading || undefined}>
        {children}
      </div>
    </div>
  );
}

function LoadingSignal({ loading, onChange, children }: {
  loading: boolean;
  onChange: (loading: boolean) => void;
  children?: ReactNode;
}) {
  // Suspense re-runs layout effects when hidden content becomes visible again.
  useLayoutEffect(() => { onChange(loading); }, [loading, onChange]);
  return children;
}

/** Keeps the placeholder mounted so it can fade out when a lazy page commits. */
export function SkeletonSuspense({ children, fullscreen = false, label, page, uiTheme, pending = false }: PageSkeletonProps & {
  children: ReactNode;
  fullscreen?: boolean;
  pending?: boolean;
}) {
  // Only show a skeleton when Suspense actually commits its fallback. Starting
  // busy hides already-cached pages and makes nested boundaries fade repeatedly.
  const [loading, setLoading] = useState(false);
  return (
    <LoadingReveal loading={pending || loading} fullscreen={fullscreen} label={label} page={page} uiTheme={uiTheme}>
      <Suspense fallback={<LoadingSignal loading onChange={setLoading} />}>
        {!pending && <LoadingSignal loading={false} onChange={setLoading}>{children}</LoadingSignal>}
      </Suspense>
    </LoadingReveal>
  );
}
