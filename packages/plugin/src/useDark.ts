import { useTheme } from "@mui/material/styles";
import { useEffect, useState } from "react";

// Headlamp's toolchain externalizes @mui/material to the HOST app, so useTheme()
// returns Headlamp's live theme — toggling in settings re-renders us. If this
// import ever fails to build against a host version, replace the body with the
// matchMedia fallback below (and report it).
export function useDark(): boolean {
  const theme: any = useTheme();
  const mode = theme?.palette?.mode;
  const [mq, setMq] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    if (mode) return; // host theme wins; no listener needed
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const h = (e: MediaQueryListEvent) => setMq(e.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, [mode]);
  return mode ? mode === "dark" : !!mq;
}
