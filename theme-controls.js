(function () {
  const storageKeys = {
    theme: "aai1001-proposal-theme",
    tocCollapsed: "aai1001-proposal-toc-collapsed",
    tocWidth: "aai1001-proposal-toc-width",
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (_error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_error) {
      // Browsers can block localStorage for local files. The controls still work.
    }
  }

  function setTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    document.body.dataset.theme = nextTheme;
    writeStorage(storageKeys.theme, nextTheme);
    updateThemeButtons(nextTheme);
  }

  function updateThemeButtons(theme) {
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      const active = button.dataset.themeChoice === theme;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function applyTocPanelWidth(width) {
    const panel = document.querySelector(".proposal-toc-panel");
    if (!panel) return;

    const collapsed = document.body.classList.contains("toc-collapsed");
    const visibleWidth = collapsed ? 0 : width;
    const minWidth = collapsed ? 0 : Math.min(220, visibleWidth);

    panel.style.setProperty("width", `${visibleWidth}px`, "important");
    panel.style.setProperty("max-width", `${visibleWidth}px`, "important");
    panel.style.setProperty("min-width", `${minWidth}px`, "important");
  }

  function setTocWidth(width) {
    const nextWidth = clamp(Number(width) || 300, 220, 440);
    document.documentElement.style.setProperty("--toc-width", `${nextWidth}px`);
    writeStorage(storageKeys.tocWidth, String(nextWidth));
    applyTocPanelWidth(nextWidth);

    const output = document.querySelector("[data-toc-width-output]");
    const input = document.querySelector("[data-toc-width]");
    if (output) output.textContent = `${nextWidth}px`;
    if (input) input.value = String(nextWidth);
  }

  function setTocCollapsed(collapsed) {
    document.body.classList.toggle("toc-collapsed", collapsed);
    writeStorage(storageKeys.tocCollapsed, collapsed ? "true" : "false");

    const panel = document.querySelector(".proposal-toc-panel");
    if (panel) {
      panel.setAttribute("aria-hidden", String(collapsed));
      applyTocPanelWidth(Number(readStorage(storageKeys.tocWidth)) || 300);
    }

    const button = document.querySelector("[data-toc-toggle]");
    if (button) {
      button.textContent = collapsed ? "Show table of contents" : "Hide table of contents";
      button.setAttribute("aria-pressed", String(collapsed));
    }
  }

  function setControlsOpen(open) {
    const panel = document.querySelector(".document-controls");
    const trigger = document.querySelector("[data-controls-toggle]");
    if (!panel || !trigger) return;

    panel.hidden = !open;
    panel.classList.toggle("is-open", open);
    trigger.classList.toggle("is-active", open);
    trigger.setAttribute("aria-expanded", String(open));

    if (open) {
      const activeButton = panel.querySelector(".segmented-control .is-active");
      window.setTimeout(() => (activeButton || panel).focus(), 0);
    }
  }

  function createControls() {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "view-control-fab";
    trigger.dataset.controlsToggle = "";
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", "document-controls");
    trigger.textContent = "View";

    const panel = document.createElement("aside");
    panel.id = "document-controls";
    panel.className = "document-controls";
    panel.hidden = true;
    panel.tabIndex = -1;
    panel.setAttribute("aria-label", "Document display controls");
    panel.innerHTML = `
      <div class="document-controls-header">
        <span>View options</span>
        <button type="button" class="document-controls-close" data-controls-close aria-label="Close view options">Close</button>
      </div>
      <div class="segmented-control" aria-label="Color theme">
        <button type="button" data-theme-choice="light" aria-pressed="true">Light</button>
        <button type="button" data-theme-choice="dark" aria-pressed="false">Dark</button>
      </div>
      <button type="button" class="toc-toggle-button" data-toc-toggle aria-pressed="false">Hide table of contents</button>
      <label class="toc-width-control">
        <span>Table of contents width <strong data-toc-width-output>300px</strong></span>
        <input type="range" min="220" max="440" step="10" value="300" data-toc-width>
      </label>
    `;

    document.body.append(trigger, panel);

    trigger.addEventListener("click", () => {
      setControlsOpen(!panel.classList.contains("is-open"));
    });

    panel.querySelector("[data-controls-close]").addEventListener("click", () => {
      setControlsOpen(false);
      trigger.focus();
    });

    panel.querySelectorAll("[data-theme-choice]").forEach((button) => {
      button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
    });

    panel.querySelector("[data-toc-toggle]").addEventListener("click", () => {
      setTocCollapsed(!document.body.classList.contains("toc-collapsed"));
    });

    panel.querySelector("[data-toc-width]").addEventListener("input", (event) => {
      setTocWidth(event.target.value);
    });

    document.addEventListener("click", (event) => {
      if (!panel.classList.contains("is-open")) return;
      if (panel.contains(event.target) || trigger.contains(event.target)) return;
      setControlsOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setControlsOpen(false);
    });
  }

  function inferDepth(link, root) {
    const item = link.closest("li");
    if (!item) return 1;

    let depth = 0;
    let node = item;
    while (node && node !== root) {
      if (node.tagName === "LI") depth += 1;
      node = node.parentElement;
    }

    return clamp(depth, 1, 4);
  }

  function collectTocLinks(originalNav) {
    const seen = new Set();
    return Array.from(originalNav.querySelectorAll("a[href^='#']"))
      .map((link) => {
        const href = link.getAttribute("href");
        const text = link.textContent.trim().replace(/\s+/g, " ");
        const depth = inferDepth(link, originalNav);
        return { href, text, depth };
      })
      .filter((link) => {
        if (!link.href || !link.text || seen.has(link.href)) return false;
        seen.add(link.href);
        return true;
      });
  }

  function collectDocumentHeadings() {
    const root = document.querySelector("#quarto-document-content") || document.querySelector("main.content");
    if (!root) return [];

    const seen = new Set();
    return Array.from(root.querySelectorAll("section[id] > h1, section[id] > h2, section[id] > h3, section[id] > h4"))
      .map((heading) => {
        const section = heading.closest("section[id]");
        const depth = clamp(Number(heading.tagName.slice(1)) || 1, 1, 4);
        const href = section ? `#${section.id}` : "";
        const text = heading.textContent.trim().replace(/\s+/g, " ");
        return { href, text, depth };
      })
      .filter((link) => {
        if (!link.href || !link.text || seen.has(link.href)) return false;
        seen.add(link.href);
        return true;
      });
  }

  function promoteTocSidebar() {
    if (document.querySelector(".proposal-toc-panel")) {
      document.body.classList.add("toc-enhanced");
      return;
    }

    const originalNav = document.querySelector("#quarto-sidebar-toc-left nav") || document.querySelector("#TOC");
    const links = collectDocumentHeadings();
    if (!links.length && originalNav) links.push(...collectTocLinks(originalNav));
    if (!links.length) return;

    const panel = document.createElement("aside");
    panel.id = "proposal-toc-panel";
    panel.className = "proposal-toc-panel";
    panel.setAttribute("aria-label", "Table of contents");
    panel.innerHTML = `
      <div class="proposal-toc-header">
        <span>Table of contents</span>
      </div>
      <nav class="proposal-toc-nav" aria-label="Table of contents"></nav>
    `;

    const nav = panel.querySelector(".proposal-toc-nav");
    links.forEach((item) => {
      const link = document.createElement("a");
      link.className = "proposal-toc-link";
      link.href = item.href;
      link.textContent = item.text;
      link.dataset.depth = String(item.depth);
      nav.appendChild(link);
    });

    document.body.appendChild(panel);
    document.body.classList.add("toc-enhanced");
  }

  function setActiveTocLink(hash) {
    document.querySelectorAll(".proposal-toc-link").forEach((link) => {
      link.classList.toggle("is-active", link.hash === hash);
    });
  }

  function syncActiveTocLinks() {
    const links = Array.from(document.querySelectorAll(".proposal-toc-link"));
    const targets = links
      .map((link) => {
        try {
          return document.querySelector(decodeURIComponent(link.hash));
        } catch (_error) {
          return null;
        }
      })
      .filter(Boolean);

    if (!links.length || !targets.length) return;

    const updateFromScroll = () => {
      const active = targets
        .filter((target) => target.getBoundingClientRect().top <= window.innerHeight * 0.32)
        .pop() || targets[0];
      setActiveTocLink(`#${active.id}`);
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          if (visible) setActiveTocLink(`#${visible.target.id}`);
        },
        { rootMargin: "-18% 0px -72% 0px", threshold: 0.01 }
      );
      targets.forEach((target) => observer.observe(target));
    }

    window.addEventListener("scroll", updateFromScroll, { passive: true });
    updateFromScroll();
  }

  function addTocDragHandle() {
    const panel = document.querySelector(".proposal-toc-panel");
    if (!panel || panel.querySelector(".toc-resize-handle")) return;

    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "toc-resize-handle";
    handle.setAttribute("aria-label", "Drag to resize table of contents");
    panel.appendChild(handle);

    let startX = 0;
    let startWidth = 0;

    const onPointerMove = (event) => {
      const delta = event.clientX - startX;
      setTocWidth(startWidth + delta);
    };

    const onPointerUp = (event) => {
      document.body.classList.remove("toc-resizing");
      try {
        handle.releasePointerCapture(event.pointerId);
      } catch (_error) {
        // Pointer capture may already be released.
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (document.body.classList.contains("toc-collapsed")) {
        setTocCollapsed(false);
      }
      startX = event.clientX;
      startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--toc-width"), 10) || 300;
      document.body.classList.add("toc-resizing");
      handle.setPointerCapture(event.pointerId);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    });
  }

  function boot() {
    promoteTocSidebar();
    createControls();
    addTocDragHandle();
    syncActiveTocLinks();
    setTheme(readStorage(storageKeys.theme) || "light");
    setTocWidth(readStorage(storageKeys.tocWidth) || 300);
    setTocCollapsed(readStorage(storageKeys.tocCollapsed) === "true");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
