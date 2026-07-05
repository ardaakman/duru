import { registerRoute, registerSidebarEntry } from "@kinvolk/headlamp-plugin/lib";
import { DuruMap } from "./DuruMap";
import { injectStyles } from "./styles";

injectStyles();

registerSidebarEntry({
  parent: null,
  name: "duru",
  label: "Duru",
  url: "/duru",
  icon: "mdi:waves",
});

registerRoute({
  path: "/duru",
  sidebar: "duru",
  name: "duru",
  exact: true,
  component: () => <DuruMap />,
});
