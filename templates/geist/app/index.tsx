import { createRoot } from "react-dom/client";
import rfCss from "reactflow/dist/style.css";

const style = document.createElement("style");
style.textContent = rfCss as unknown as string;
document.head.appendChild(style);

const raw = document.getElementById("kubeviz-model")?.textContent || "{}";
const model = JSON.parse(raw);

createRoot(document.getElementById("root")!).render(
  <div id="kv-boot" style={{ font: "13px Inter, system-ui", padding: 16 }}>
    kubeviz — {model.nodes ? model.nodes.length : 0} nodes
  </div>
);
