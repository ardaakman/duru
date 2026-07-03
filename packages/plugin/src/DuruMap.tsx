import { App } from "./App";
import { useClusterModel } from "./useClusterModel";

export function DuruMap() {
  const { model, pending, refresh, structureRev, loading, warnings } = useClusterModel();
  if (loading || !model) return <div className="duru-app"><div className="duru-load">connecting to cluster…</div></div>;
  return <App model={model} pending={pending} onRefresh={refresh} structureRev={structureRev} warnings={warnings} />;
}
