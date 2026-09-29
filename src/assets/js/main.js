(() => {
  const root = document.documentElement;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} },
  };

  // --- Dialogs (menu + reading comfort) ---
  document.querySelectorAll("[data-open]").forEach((btn) => {
    const dlg = document.getElementById(btn.dataset.open);
    if (!dlg || typeof dlg.showModal !== "function") return;
    btn.addEventListener("click", () => dlg.showModal());
  });
  document.querySelectorAll("dialog").forEach((dlg) => {
    dlg.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => dlg.close()));
    // Click on the backdrop closes the dialog.
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  });

  // --- Reading comfort settings ---
  const settings = {
    size: { key: "cfs-size", attr: "size" },
    theme: { key: "cfs-theme", attr: "theme" },
    calm: { key: "cfs-calm", attr: "calm" },
  };
  const syncButtons = () => {
    document.querySelectorAll("[data-set]").forEach((b) => {
      const cur = root.dataset[settings[b.dataset.set].attr] || "";
      b.setAttribute("aria-pressed", String(cur === b.dataset.value));
    });
  };
  document.querySelectorAll("[data-set]").forEach((b) => {
    b.addEventListener("click", () => {
      const s = settings[b.dataset.set];
      const v = b.dataset.value;
      if (v) root.dataset[s.attr] = v; else delete root.dataset[s.attr];
      store.set(s.key, v);
      syncButtons();
    });
  });
  syncButtons();

  // --- Filterable listings (trials, conferences) ---
  document.querySelectorAll("[data-filterable]").forEach((wrap) => {
    const items = [...wrap.querySelectorAll("[data-item]")];
    const controls = [...wrap.querySelectorAll("[data-filter]")];
    const count = wrap.querySelector("[data-count]");
    const empty = wrap.querySelector("[data-empty]");
    const noun = count ? count.dataset.noun || "results" : "results";

    const apply = () => {
      let shown = 0;
      const q = {};
      controls.forEach((c) => (q[c.dataset.filter] = c.value.trim().toLowerCase()));
      items.forEach((el) => {
        const ok = Object.entries(q).every(([k, v]) => {
          if (!v) return true;
          if (k.endsWith("text")) return el.textContent.toLowerCase().includes(v);
          return (el.dataset[k] || "").toLowerCase().split("|").includes(v);
        });
        el.hidden = !ok;
        if (ok) shown++;
      });
      if (count) count.textContent = `Showing ${shown} of ${items.length} ${noun}`;
      if (empty) empty.hidden = shown !== 0;
      const params = new URLSearchParams(location.search);
      controls.forEach((c) => (c.value ? params.set(c.dataset.filter, c.value) : params.delete(c.dataset.filter)));
      const qs = params.toString();
      history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
    };

    // Allow links like /research/trials/?country=Australia
    const params = new URLSearchParams(location.search);
    controls.forEach((c) => {
      const v = params.get(c.dataset.filter);
      if (v) c.value = v;
      c.addEventListener("input", apply);
      c.addEventListener("change", apply);
    });
    const reset = wrap.querySelector("[data-reset]");
    if (reset) reset.addEventListener("click", () => { controls.forEach((c) => (c.value = "")); apply(); });
    apply();
  });

  // --- Copy-to-clipboard buttons (GP script etc.) ---
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = document.getElementById(btn.dataset.copy);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.innerText.trim());
        const old = btn.textContent;
        btn.textContent = "Copied ✓";
        setTimeout(() => (btn.textContent = old), 2000);
      } catch {
        btn.textContent = "Select the text and copy it";
      }
    });
  });
})();
