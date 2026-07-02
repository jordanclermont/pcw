/* ============================================================
   PCW — ui.js
   The backstage DOM panels: the log and the call sheet. These are
   the LOCKER-ROOM view (the work), separate from the crowd's view.
   ============================================================ */
(function () {
  "use strict";
  const PCW = window.PCW;
  const $log = document.getElementById("log");
  const $cs = document.getElementById("callsheet");

  PCW.log = function (msg, cls) {
    const d = document.createElement("div");
    if (cls) d.className = cls;
    const t = (PCW.G.tick || 0);
    d.textContent = "[t" + String(t).padStart(5, "0") + "] " + msg;
    $log.appendChild(d);
    $log.scrollTop = $log.scrollHeight;
  };

  PCW.clearLog = function () { $log.innerHTML = ""; };

  PCW.renderCallsheet = function () {
    const match = PCW.G.match;
    if (!match) return;
    $cs.innerHTML = "";
    match.script.forEach((sp, i) => {
      const d = document.createElement("div");
      d.className = "spot " + (
        sp.status === "botched" ? "botched" :
        sp.status === "done" ? "done" :
        i === match.spot ? "now" : "");
      const who = sp.caller === "p1" ? "STOVE" : "BOULDER";
      d.textContent = (i + 1) + ". " + sp.name + (sp.count ? " ×" + sp.count : "") +
        "  ·  " + who;
      $cs.appendChild(d);
    });
  };
})();
