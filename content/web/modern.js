// DOM-only micro-interactions (Web Animations API). No pdf.js globals touched.
const SPRING = "linear(0, .18 6%, .62 14%, .92 23%, 1.05 32%, 1.03 42%, 1 60%, 1)";

// Zoom label under the rail zoom icon (pdf.js changes select.value without events).
{
  const sel = document.getElementById("scaleSelect");
  const box = document.getElementById("scaleSelectContainer");
  if (sel && box) {
    const label = () => {
      const o = sel.selectedOptions[0];
      if (!o) return "";
      const v = sel.value;
      if (v === "auto") return "Auto";
      if (v === "page-actual") return "100%";
      if (v === "page-fit") return "Fit";
      if (v === "page-width") return "Width";
      if (v === "custom") return o.textContent.trim();
      return Math.round(parseFloat(v) * 100) + "%";
    };
    const sync = () => {
      const t = label();
      if (box.dataset.label !== t) box.dataset.label = t;
    };
    sel.addEventListener("change", sync);
    setInterval(sync, 300);
    sync();
  }
}

if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const $ = id => document.getElementById(id);

  // 1. Ink press ripple
  document.addEventListener("pointerdown", e => {
    const btn = e.target.closest?.(".toolbarButton:not([disabled])");
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const ink = document.createElement("span");
    ink.className = "ink";
    Object.assign(ink.style, {
      width: `${size}px`,
      height: `${size}px`,
      left: `${e.clientX - r.left - size / 2}px`,
      top: `${e.clientY - r.top - size / 2}px`,
    });
    btn.append(ink);
    ink
      .animate(
        [
          { transform: "scale(0)", opacity: 0.35 },
          { transform: "scale(2.4)", opacity: 0 },
        ],
        { duration: 450, easing: "ease-out" }
      )
      .addEventListener("finish", () => ink.remove());
  });

  // 2. Segmented sliding indicator
  for (const id of ["sidebarViewButtons", "editorModeButtons"]) {
    const group = $(id);
    if (!group) continue;
    const pill = document.createElement("span");
    pill.className = "seg-pill";
    group.prepend(pill);
    let first = true;
    const sync = () => {
      const active = group.querySelector(".toolbarButton.toggled, .toolbarButton[aria-checked='true']");
      if (!active) {
        pill.style.opacity = "0";
        return;
      }
      const g = group.getBoundingClientRect();
      const b = active.getBoundingClientRect();
      if (!b.width) return;
      const kf = {
        transform: `translate(${b.left - g.left - 2}px, ${b.top - g.top - 2}px)`,
        width: `${b.width}px`,
        height: `${b.height}px`,
        opacity: 1,
      };
      pill.animate(kf, {
        duration: first ? 0 : 350,
        easing: SPRING,
        fill: "forwards",
      });
      first = false;
    };
    new MutationObserver(sync).observe(group, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-checked"],
    });
    group.addEventListener("click", () => requestAnimationFrame(sync));
    sync();
    new ResizeObserver(sync).observe(group);
    // Sidebar may be hidden/zero-sized at start; re-sync when it opens.
    window.addEventListener("resize", sync);
    $("sidebarToggleButton")?.addEventListener("click", () => setTimeout(sync, 340));
  }

  // 3 + 4. Scroll shadow and page island
  const viewer = $("viewerContainer");
  const numPages = $("numPages");
  const pageNumber = $("pageNumber");
  const toolbar = document.querySelector(".toolbar");
  const main = viewer?.parentElement;
  if (viewer && toolbar) {
    viewer.addEventListener(
      "scroll",
      () => toolbar.classList.toggle("scrolled", viewer.scrollTop > 4),
      { passive: true }
    );
  }
  if (viewer && numPages && pageNumber && main) {
    const island = document.createElement("div");
    island.id = "pageIsland";
    island.setAttribute("aria-hidden", "true");
    main.append(island);
    let last = "";
    let hideTimer = 0;
    let queued = false;
    let visible = false;
    const show = () => {
      if (!visible) {
        visible = true;
        island.animate(
          [
            { opacity: 0, transform: "translateY(12px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 250, easing: SPRING, fill: "forwards" }
        );
      }
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        visible = false;
        island.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 200,
          fill: "forwards",
        });
      }, 1200);
    };
    const update = () => {
      queued = false;
      const total = numPages.textContent.replace(/\D+/g, "");
      if (!total) return;
      const text = `${pageNumber.value} / ${total}`;
      if (text === last) return;
      const initial = last === "";
      last = text;
      island.textContent = text;
      if (!initial) show();
    };
    viewer.addEventListener(
      "scroll",
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    new MutationObserver(update).observe(numPages, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  // 5. Zoom pulse
  const pulse = () =>
    $("scaleSelectContainer")?.animate(
      { transform: ["scale(1)", "scale(1.06)", "scale(1)"] },
      { duration: 260, easing: "ease-out" }
    );
  $("zoomIn")?.addEventListener("click", pulse);
  $("zoomOut")?.addEventListener("click", pulse);
}

// Sidebar hover-peek: keep pdf.js's sidebar state "open" (thumbnails need it),
// reveal it only while hovering the toggle/panel or when pinned by click.
{
  const outer = document.getElementById("outerContainer");
  const toggle = document.getElementById("sidebarToggle");
  const panel = document.getElementById("sidebarContainer");
  if (outer && toggle && panel) {
    let allow = false;
    let timer = 0;
    const pdfToggle = () => {
      allow = true;
      toggle.click();
      allow = false;
    };
    const ensureOpen = () => {
      if (!outer.classList.contains("sidebarOpen")) pdfToggle();
    };
    new MutationObserver(ensureOpen).observe(outer, {
      attributes: true,
      attributeFilter: ["class"],
    });
    // pdf.js initialises asynchronously; retry briefly until open.
    let tries = 0;
    const boot = setInterval(() => {
      ensureOpen();
      if (outer.classList.contains("sidebarOpen") || ++tries > 20) clearInterval(boot);
    }, 250);

    toggle.addEventListener(
      "click",
      e => {
        if (allow) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        outer.classList.toggle("sidebarPinned");
        toggle.setAttribute(
          "aria-expanded",
          String(outer.classList.contains("sidebarPinned"))
        );
      },
      true
    );
    const peek = on => {
      clearTimeout(timer);
      if (on) outer.classList.add("sidebarPeek");
      else timer = setTimeout(() => outer.classList.remove("sidebarPeek"), 250);
    };
    for (const el of [toggle, panel]) {
      el.addEventListener("pointerenter", () => peek(true));
      el.addEventListener("pointerleave", () => peek(false));
    }
  }
}

// Align each editor option panel vertically with its rail button.
{
  const place = (btn, panel) => {
    if (panel.classList.contains("hidden")) return;
    requestAnimationFrame(() => {
      const parent = panel.offsetParent || document.body;
      const pr = parent.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      const h = panel.offsetHeight;
      const mid = br.top + br.height / 2 - pr.top;
      const top = Math.max(8, Math.min(mid - h / 2, pr.height - h - 8));
      panel.style.top = `${top}px`;
      panel.style.bottom = "auto";
    });
  };
  for (const btn of document.querySelectorAll("#editorModeButtons > .toolbarButton")) {
    const panel = document.getElementById(btn.getAttribute("aria-controls"));
    if (!panel) continue;
    new MutationObserver(() => place(btn, panel)).observe(panel, {
      attributes: true,
      attributeFilter: ["class"],
    });
    btn.addEventListener("click", () => place(btn, panel));
  }
}
