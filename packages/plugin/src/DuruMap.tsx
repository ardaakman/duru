import { K8s } from "@kinvolk/headlamp-plugin/lib";

export function DuruMap() {
  const [pods, error] = K8s.ResourceClasses.Pod.useList();
  return (
    <div className="duru-app" style={{ padding: 24 }}>
      <h2>duru</h2>
      {error ? <p>error: {String(error)}</p> : <p>{pods === null ? "loading…" : `${pods.length} pods live`}</p>}
    </div>
  );
}
