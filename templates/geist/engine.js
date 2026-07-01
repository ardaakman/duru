(function () {
  "use strict";
  var M = window.__MODEL__, ICONS = window.__ICONS__;
  if (window.cytoscapeDagre) cytoscape.use(window.cytoscapeDagre);
  var FCOSE = false; try { if (window.cytoscapeFcose) { cytoscape.use(window.cytoscapeFcose); FCOSE = true; } } catch (e) {}

  // edge type -> Geist colour
  var EDGE = { owns:{c:"#171717",l:"owns"}, selects:{c:"#0070f3",l:"selects"}, routes:{c:"#0070f3",l:"routes"},
    mounts:{c:"#f5a623",l:"mounts"}, class:{c:"#7928ca",l:"class"}, uses:{c:"#8f8f8f",l:"uses"} };
  function iconUri(key, color) {
    var inner = (ICONS[key] || ICONS.crd).replace(/CURRENT/g, color);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="' + color +
      '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  // ---- build elements ----
  var nodeIds = {}; M.nodes.forEach(function (n) { nodeIds[n.id] = 1; });
  var GLABEL = {}; (M.groups || []).forEach(function (gr) { GLABEL[gr.id] = gr.label; });
  var els = [];
  M.nodes.forEach(function (n) {
    var nm = n.count ? n.name + "  ×" + n.count : n.name;
    // resource:1 marks real nodes (compound namespace parents have no `resource` -> excluded by [resource]).
    // Label is "KIND\nname" so every node shows its kind + name, never icon-only (spec F2).
    els.push({ data: { id: n.id, resource: 1, label: n.kind.toUpperCase() + "\n" + nm,
      kind: n.kind, ns: n.ns, group: n.group, tier: n.tier || 2, accent: n.accent,
      icon: iconUri(n.icon, n.accent), _n: n } });
  });
  M.edges.forEach(function (e, i) {
    if (nodeIds[e.source] && nodeIds[e.target])
      els.push({ data: { id: "e" + i, source: e.source, target: e.target, kind: e.type, label: e.label } });
  });

  var edgeStyles = Object.keys(EDGE).map(function (k) {
    return { selector: 'edge[kind = "' + k + '"]', style: { "line-color": EDGE[k].c, "target-arrow-color": EDGE[k].c } };
  });

  var cy = window.__cy = cytoscape({
    container: document.getElementById("cy"), elements: els, wheelSensitivity: 0.25,
    style: [
      { selector: "node[resource]", style: {
        "shape": "round-rectangle", "background-color": "#ffffff", "border-width": 1.5, "border-color": "data(accent)",
        "width": "152px", "height": "64px",
        "background-image": "data(icon)", "background-width": "20px", "background-height": "20px",
        "background-position-x": "50%", "background-position-y": "6px", "background-fit": "none", "background-clip": "none",
        "label": "data(label)", "font-family": "Inter, system-ui, sans-serif", "font-size": "9.5px", "font-weight": 500,
        "color": "#171717", "text-valign": "bottom", "text-halign": "center", "text-margin-y": "-6px",
        "text-wrap": "wrap", "text-max-width": "134px" } },
      { selector: ":parent", style: {
        "background-color": "#ffffff", "background-opacity": 0.5, "border-width": 1, "border-color": "#ebebeb",
        "shape": "round-rectangle", "label": "data(label)", "font-family": "JetBrains Mono, monospace",
        "font-size": "12px", "color": "#8f8f8f", "text-transform": "uppercase", "text-valign": "top",
        "text-halign": "left", "text-margin-x": 10, "text-margin-y": 14, "padding": "24px" } },
      { selector: "edge", style: { "width": 1.4, "curve-style": "bezier", "line-opacity": 0.55,
        "target-arrow-shape": "triangle", "arrow-scale": 0.8, "label": "", "font-size": "9px",
        "color": "#8f8f8f", "text-rotation": "autorotate", "text-background-color": "#fafafa",
        "text-background-opacity": 1, "text-background-padding": "2px" } }
    ].concat(edgeStyles).concat([
      { selector: "edge.show", style: { "label": "data(label)" } },
      { selector: "node.dim", style: { "opacity": 0.12 } },
      { selector: "edge.dim", style: { "opacity": 0.06 } },
      { selector: "node.hi", style: { "border-width": 3, "z-index": 40 } },
      { selector: "edge.hi", style: { "width": 3, "line-opacity": 1, "label": "data(label)", "z-index": 40 } },
      { selector: "node.match", style: { "border-color": "#0070f3", "border-width": 3 } }
    ]),
    layout: { name: "preset" }
  });

  // ---- layouts ----
  function layeredPositions() {
    var byTier = {}; cy.nodes("[resource]").forEach(function (n) { var t = n.data("tier") || 2; (byTier[t] = byTier[t] || []).push(n); });
    var pos = {}, COLW = 172, ROWH = 128;
    Object.keys(byTier).sort().forEach(function (t) {
      var arr = byTier[t], w = arr.length * COLW;
      arr.forEach(function (n, i) { pos[n.id()] = { x: i * COLW - w / 2, y: (t - 1) * ROWH }; });
    });
    return pos;
  }
  function buildParents() {
    var seen = {}; cy.nodes("[resource]").forEach(function (n) { seen[n.data("group")] = 1; });
    cy.batch(function () {
      Object.keys(seen).forEach(function (g) { if (cy.getElementById("ns::" + g).empty()) cy.add({ group: "nodes", data: { id: "ns::" + g, label: GLABEL[g] || g } }); });
      cy.nodes("[resource]").forEach(function (n) { n.move({ parent: "ns::" + n.data("group") }); });
    });
  }
  function removeParents() {
    if (cy.nodes(":parent").empty()) return;
    cy.batch(function () {
      cy.nodes("[resource]").forEach(function (n) { if (n.parent().nonempty()) n.move({ parent: null }); });
      cy.nodes().filter(function (n) { return String(n.id()).indexOf("ns::") === 0; }).remove();
    });
  }
  window.runLayout = function (key) {
    var spec;
    if (key === "cluster") { buildParents();
      spec = { name: FCOSE ? "fcose" : "cose", quality: "default", animate: true, animationDuration: 600,
        nodeSeparation: 110, packComponents: true, idealEdgeLength: 80, nodeRepulsion: 5500, nestingFactor: 0.1, padding: 30 };
    } else { removeParents(); spec = { name: "preset", positions: layeredPositions(), fit: true, padding: 55, animate: true, animationDuration: 500 }; }
    cy.layout(spec).run();
  };
  window.runLayout(document.getElementById("layout") ? document.getElementById("layout").value : "cluster");
  cy.ready(function () { setTimeout(function () { cy.fit(undefined, 50); }, 150); });

  /*INTERACTIONS*/
})();
