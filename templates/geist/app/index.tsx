import { createRoot } from "react-dom/client";
import rfCss from "reactflow/dist/style.css";
import type { GraphModel } from "../../../src/core/types.js";
import { App } from "./App.js";

const style = document.createElement("style");
style.textContent = rfCss as unknown as string;
document.head.appendChild(style);

const raw = document.getElementById("duru-model")?.textContent || "{}";
const model = JSON.parse(raw) as GraphModel;

createRoot(document.getElementById("root")!).render(<App model={model} />);
