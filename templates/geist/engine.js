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

  // ---- header summary ----
  document.getElementById("summary").textContent =
    M.nodes.length + " resources · " + M.edges.length + " relationships" + (M.warnings && M.warnings.length ? " · " + M.warnings.length + " warnings" : "");

  // ---- legends (kinds + namespaces) ----
  function accentOf(kind) { var n = cy.nodes('[kind = "' + kind + '"]'); return n.nonempty() ? n[0].data("accent") : "#8f8f8f"; }
  var kinds = {}; M.nodes.forEach(function (n) { kinds[n.kind] = (kinds[n.kind] || 0) + 1; });
  var kindOn = {}; var kEl = document.getElementById("kinds");
  Object.keys(kinds).sort().forEach(function (k) {
    kindOn[k] = true;
    var row = document.createElement("div"); row.className = "row"; row.dataset.k = k;
    row.innerHTML = '<span class="sw" style="background:' + esc(accentOf(k)) + '"></span><span>' + esc(k) + '</span><span class="c">' + kinds[k] + '</span>';
    row.onclick = function () { kindOn[k] = !kindOn[k]; row.classList.toggle("off", !kindOn[k]); applyFilter(); };
    kEl.appendChild(row);
  });
  var nsOn = {}; var nsEl = document.getElementById("namespaces");
  (M.groups || []).forEach(function (g) {
    nsOn[g.id] = true;
    var row = document.createElement("div"); row.className = "row"; row.dataset.ns = g.id;
    var cnt = M.nodes.filter(function (n) { return n.group === g.id; }).length;
    row.innerHTML = '<span>' + esc(g.label) + '</span><span class="c">' + cnt + '</span>';
    row.onclick = function () { nsOn[g.id] = !nsOn[g.id]; row.classList.toggle("off", !nsOn[g.id]); applyFilter(); };
    nsEl.appendChild(row);
  });
  var ekEl = document.getElementById("edgekinds");
  Object.keys(EDGE).forEach(function (k) { var s = document.createElement("span"); s.innerHTML = '<i style="border-color:' + EDGE[k].c + '"></i>' + EDGE[k].l; ekEl.appendChild(s); });
  document.getElementById("toggleAll").onclick = function () {
    var anyOff = Object.keys(kindOn).some(function (k) { return !kindOn[k]; });
    Object.keys(kindOn).forEach(function (k) { kindOn[k] = anyOff; });
    document.querySelectorAll("#kinds .row").forEach(function (r) { r.classList.toggle("off", !kindOn[r.dataset.k]); });
    applyFilter();
  };
  window.applyFilter = function () {
    cy.batch(function () {
      cy.nodes("[resource]").forEach(function (n) { n.style("display", (kindOn[n.data("kind")] && nsOn[n.data("group")]) ? "element" : "none"); });
      cy.nodes(":parent").forEach(function (p) {
        var vis = p.children().filter(function (c) { return c.style("display") === "element"; }).length;
        p.style("display", vis ? "element" : "none");
      });
    });
  };

  // ---- selection + inspector ----
  var detail = document.getElementById("detail");
  window.clearHi = function () { cy.elements().removeClass("hi dim"); };
  window.focusNode = function (n) {
    clearHi();
    var neigh = n.closedNeighborhood();
    cy.elements().addClass("dim"); neigh.removeClass("dim").addClass("hi"); cy.nodes(":parent").removeClass("dim");
    showDetail(n);
  };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function showDetail(n) {
    var d = n.data("_n");
    var out = n.outgoers("edge"), inc = n.incomers("edge");
    function conn(es, dir) { return es.map(function (e) {
      var o = dir === "out" ? e.target() : e.source();
      return '<button data-goto="' + esc(o.id()) + '">' + esc(o.data("kind")) + "/" + esc(o.data("label")) + "</button>"; }).join(""); }
    var src = d.source ? '<div class="lbl">Source</div><a>' + esc(d.source.file) + (d.source.line ? ":" + d.source.line : "") + "</a>" : "";
    detail.innerHTML =
      '<button class="close" id="dClose" aria-label="Close inspector">✕</button><span class="chip">' + esc(d.kind) + "</span>" +
      "<h2>" + esc(d.name) + "</h2>" +
      '<div class="ns">' + (d.ns ? "namespace · " + esc(d.ns) : "cluster-scoped") + (d.nodeName ? " · node " + esc(d.nodeName) : "") + "</div>" +
      '<div class="tabs"><button class="tabbtn active" data-tab="sum">Summary</button><button class="tabbtn" data-tab="man">Manifest</button></div>' +
      '<div class="tab active" id="tab-sum">' +
        "<p>" + esc(d.summary) + "</p>" +
        (out.nonempty() ? '<div class="lbl">Depends on</div><div class="chips">' + conn(out, "out") + "</div>" : "") +
        (inc.nonempty() ? '<div class="lbl">Used by</div><div class="chips">' + conn(inc, "in") + "</div>" : "") +
        src +
      "</div>" +
      '<div class="tab" id="tab-man"><button class="btn copy" id="copym">copy</button><div class="lbl">manifest</div>' +
        '<div class="code" id="mancode">' + esc(d.manifest || "(not available)") + "</div></div>";
    detail.classList.add("show");
    document.getElementById("dClose").onclick = function () { detail.classList.remove("show"); clearHi(); };
    detail.querySelectorAll(".tabbtn").forEach(function (b) { b.onclick = function () {
      detail.querySelectorAll(".tabbtn").forEach(function (x) { x.classList.remove("active"); });
      detail.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active"); document.getElementById("tab-" + b.dataset.tab).classList.add("active");
    }; });
    var cp = document.getElementById("copym");
    if (cp) cp.onclick = function () { try { navigator.clipboard.writeText(d.manifest || ""); cp.textContent = "copied"; } catch (e) {} };
    detail.querySelectorAll("[data-goto]").forEach(function (b) { b.onclick = function () {
      var t = cy.getElementById(b.dataset.goto);
      cy.animate({ center: { eles: t }, zoom: Math.max(cy.zoom(), 1.0) }, { duration: 300 }); focusNode(t);
    }; });
  }
  cy.on("tap", "node", function (e) { if (!e.target.isParent()) focusNode(e.target); });
  cy.on("tap", function (e) { if (e.target === cy) { clearHi(); detail.classList.remove("show"); } });
  cy.on("mouseover", "node", function (e) { if (!e.target.isParent()) e.target.connectedEdges().addClass("show"); });
  cy.on("mouseout", "node", function (e) { e.target.connectedEdges().removeClass("show"); });

  // ---- search ----
  var search = document.getElementById("search");
  search.oninput = function () {
    var q = search.value.trim().toLowerCase(); cy.nodes().removeClass("match"); if (!q) return;
    cy.nodes("[resource]").forEach(function (n) {
      if ((n.data("label") + " " + n.data("kind") + " " + n.data("ns")).toLowerCase().indexOf(q) >= 0) n.addClass("match");
    });
  };
  search.onkeydown = function (ev) { if (ev.key !== "Enter") return; var hit = cy.nodes(".match"); if (hit.nonempty()) { cy.animate({ fit: { eles: hit, padding: 80 } }, { duration: 350 }); if (hit.length === 1) focusNode(hit[0]); } };

  // ---- toolbar ----
  document.getElementById("layout").onchange = function (e) { clearHi(); detail.classList.remove("show"); window.runLayout(e.target.value); };
  document.getElementById("btnFit").onclick = function () { cy.animate({ fit: { padding: 50 } }, { duration: 350 }); };
  document.getElementById("btnReset").onclick = function () {
    clearHi(); detail.classList.remove("show"); search.value = ""; cy.nodes().removeClass("match");
    Object.keys(kindOn).forEach(function (k) { kindOn[k] = true; }); Object.keys(nsOn).forEach(function (k) { nsOn[k] = true; });
    document.querySelectorAll("aside .row").forEach(function (r) { r.classList.remove("off"); });
    applyFilter(); document.getElementById("layout").value = "cluster"; window.runLayout("cluster");
  };
  document.getElementById("zin").onclick = function () { cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }); };
  document.getElementById("zout").onclick = function () { cy.zoom({ level: cy.zoom() / 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { clearHi(); detail.classList.remove("show"); } });
})();
