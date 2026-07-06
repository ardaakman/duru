import { App } from "./App";
import { useClusterModel } from "./useClusterModel";
import { useDark } from "./useDark";

export function DuruMap() {
  const { model, pending, refresh, structureRev, loading, warnings } = useClusterModel();
  const dark = useDark();
  if (loading || !model) return <div className={"duru-app" + (dark ? " duru-dark" : "")}><div className="duru-load">connecting to cluster…</div></div>;
  return <App model={model} pending={pending} onRefresh={refresh} structureRev={structureRev} warnings={warnings} dark={dark} />;
}
