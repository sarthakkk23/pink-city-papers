// Pink City Papers. Progressive enhancement only: every page is complete without this file.
(() => {
  window.__board = true;
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- watch: run once when an element comes into view. If the observer never reports, show everything; never a gate ----------
  const watch = (els, onIn, margin = "0px 0px -6% 0px") => {
    if (!els.length) return;
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(onIn); return; }
    let alive = false;
    setTimeout(() => { if (!alive) els.forEach(onIn); }, 2000);
    const io = new IntersectionObserver((es) => {
      alive = true;
      es.forEach((e) => { if (e.isIntersecting) { onIn(e.target); io.unobserve(e.target); } });
    }, { rootMargin: margin });
    els.forEach((t) => io.observe(t));
  };

  // ---------- the loader: while the ink is up, entrances wait for it; a click to another page brings the ink back first ----------
  const loader = document.querySelector(".loader");
  const lag = loader && getComputedStyle(loader).display !== "none" ? 650 : 0;
  const later = (fn) => (lag ? setTimeout(fn, lag) : fn());
  if (!reduce && loader) {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search) || /\.(?!html?$)\w+$/.test(u.pathname)) return;
      e.preventDefault();
      root.classList.add("leaving");
      setTimeout(() => { location.href = u.href; }, 480);
    });
    addEventListener("pageshow", (e) => { if (e.persisted) root.classList.remove("leaving"); });   // back to a page kept in memory
  }

  // ---------- entrances: tiles rise in, a board at a time, staggered by position ----------
  later(() => watch([...document.querySelectorAll(".rv")], (t) => {
    const sib = [...(t.parentElement?.children || [])];
    t.style.transitionDelay = `${Math.min(6, Math.max(0, sib.indexOf(t))) * 75}ms`;
    t.classList.add("in");
  }));

  // ---------- headings rise word by word: each word in a clipped span, the text itself unchanged ----------
  if (!reduce) {
    const heads = [...document.querySelectorAll("main h2")].filter((h) => !h.closest(".hx"));
    heads.forEach((h) => {
      let k = 0;
      const walk = (node) => [...node.childNodes].forEach((n) => {
        if (n.nodeType === 1) return walk(n);
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement("span"), i = document.createElement("span");
          w.className = "w"; i.textContent = part; i.style.setProperty("--k", k++); w.append(i); frag.append(w);
        });
        n.replaceWith(frag);
      });
      walk(h);
      h.classList.add("split");
    });
    later(() => watch(heads, (h) => h.classList.add("in"), "0px 0px -10% 0px"));
  }

  // ---------- big figures count up from zero when they arrive; the page's own number is always what's left ----------
  const ease = (t) => 1 - Math.pow(2, -10 * t);
  const count = (el, delay) => {
    if (el.dataset.counted) return;               // once only: a late observer must not restart it from a half-counted value
    el.dataset.counted = "1";
    const txt = el.textContent.trim(), m = txt.match(/^(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?$/);
    if (!m) return;
    const commas = m[1].includes(","), dec = m[2] ? m[2].length - 1 : 0, end = parseFloat(txt.replace(/,/g, ""));
    const fmt = new Intl.NumberFormat("en-US", { useGrouping: commas, minimumFractionDigits: dec, maximumFractionDigits: dec });
    el.style.display = "inline-block"; el.style.minWidth = `${el.getBoundingClientRect().width}px`;
    el.textContent = fmt.format(0);
    setTimeout(() => {
      const t0 = performance.now(), dur = end < 20 ? 900 : 1400;
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = p < 1 ? fmt.format(end * ease(p)) : txt;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      setTimeout(() => { el.textContent = txt; }, dur + 400);   // if frames stall (a background tab), the real figure still lands
    }, delay);
  };
  if (!reduce) {
    const first = !root.classList.contains("seen");
    watch([...document.querySelectorAll(".hx-n .n, .fig .n, .ans-figs .n")].filter((n) => !n.closest(".gq")),
      (n) => count(n, (n.closest(".hx") ? (first ? 1850 : 700) : 150) + lag), "0px 0px -8% 0px");
  }

  // ---------- the footer's name builds itself, block by block ----------
  const blocks = document.querySelector(".blocks");
  if (blocks) {
    [...blocks.children].forEach((b, j) => b.style.setProperty("--j", j));
    watch([blocks], (b) => b.classList.add("in"), "0px 0px -15% 0px");
  }

  // ---------- the bar steps aside while you read down, and comes back when you scroll up ----------
  const bar = document.querySelector(".bar"), menu = document.querySelector(".menu");
  if (bar) {
    let lastY = scrollY, ticking = false;
    addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = scrollY, d = y - lastY;
        if (Math.abs(d) > 6) { bar.classList.toggle("tuck", d > 0 && y > 240 && !menu?.open); lastY = y; }
        ticking = false;
      });
    }, { passive: true });
  }

  // ---------- the main buttons lean toward the pointer, a little ----------
  if (!reduce && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".hx-acts .btn, .bar-btn, .act-go .btn").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        b.style.translate = `${(dx * 6).toFixed(1)}px ${(dy * 4).toFixed(1)}px`;
      });
      b.addEventListener("pointerleave", () => { b.style.translate = ""; });
    });
  }

  // ---------- the story: one moment at a time; the reader turns the page ----------
  const box = document.querySelector(".story-box");
  if (box) {
    const steps = [...box.querySelectorAll(".step")], dots = [...box.querySelectorAll(".dot-btn")];
    const next = box.querySelector(".story-next"), back = box.querySelector(".story-back"), nav = box.querySelector(".story-nav");
    const today = box.querySelector(".today img");
    let at = 0;
    const show = (i, dir) => {
      at = (i + steps.length) % steps.length;
      steps.forEach((s, n) => {
        const on = n === at;
        s.hidden = !on;
        if (on && dir && !reduce) { s.classList.add(dir > 0 ? "from-right" : "from-left"); void s.offsetWidth; s.classList.remove("from-right", "from-left"); }
      });
      dots.forEach((d, n) => { d.classList.toggle("seen", n < at); n === at ? d.setAttribute("aria-current", "step") : d.removeAttribute("aria-current"); });
      box.dataset.stage = String(at);              // the city builds to this moment
      if (at >= 1) today?.setAttribute("loading", "eager");   // fetch today's photograph before the last page
      back.disabled = at === 0;
      next.textContent = at === steps.length - 1 ? next.dataset.again : next.dataset.next;
    };
    box.classList.add("story-on");
    nav.hidden = false;
    next.addEventListener("click", () => show(at === steps.length - 1 ? 0 : at + 1, 1));
    back.addEventListener("click", () => show(at - 1, -1));
    dots.forEach((d, n) => d.addEventListener("click", () => show(n, n > at ? 1 : -1)));
    box.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); show(Math.min(at + 1, steps.length - 1), 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(Math.max(at - 1, 0), -1); }
    });
    // a swipe on a phone turns the page too
    let x0 = null;
    const swipe = box.querySelector(".story-body");
    swipe.addEventListener("pointerdown", (e) => { x0 = e.clientX; });
    swipe.addEventListener("pointerup", (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) dx < 0 ? show(Math.min(at + 1, steps.length - 1), 1) : show(Math.max(at - 1, 0), -1);
    });
    show(0, 0);

    // wide screens with room for the whole box: scrolling down carries the moments across, the city builds with them
    const sec = box.closest(".history"), wrap = box.querySelector(".steps");
    const roomy = () => !reduce && matchMedia("(min-width: 901px)").matches && box.offsetHeight + 24 < innerHeight;
    let on = false, run = 0;
    const span = () => (steps.length - 1) * innerHeight * 0.7;      // how far you scroll to see all four
    const paint = () => {
      run = 0;
      if (!on) return;
      const top = parseFloat(box.style.getPropertyValue("--st")) || 0;
      const p = Math.min(1, Math.max(0, (top - sec.getBoundingClientRect().top) / span()));
      const sp = p * (steps.length - 1), n = Math.round(sp);
      wrap.style.setProperty("--sp", sp.toFixed(4));
      steps.forEach((s, i) => { s.style.opacity = Math.max(0, 1 - Math.abs(sp - i) * 1.4).toFixed(3); });
      if (n !== at) { at = n; dots.forEach((d, i) => { d.classList.toggle("seen", i < at); i === at ? d.setAttribute("aria-current", "step") : d.removeAttribute("aria-current"); });
        box.dataset.stage = String(at); if (at >= 1) today?.setAttribute("loading", "eager"); }
    };
    const fit = () => {
      const want = roomy();
      if (want !== on) {
        on = want;
        box.classList.toggle("story-scroll", on); sec.classList.toggle("story-scroll", on);
        steps.forEach((s) => { s.hidden = on ? false : s.hidden; s.style.opacity = ""; });
        if (!on) { sec.style.height = ""; show(at, 0); }
      }
      if (on) {
        box.style.setProperty("--st", `${Math.max(0, (innerHeight - box.offsetHeight) / 2)}px`);
        sec.style.height = `${box.offsetHeight + span() + 8}px`;
        paint();
      }
    };
    // in scroll mode the dots and arrow keys scroll the page to that moment
    const go = (i) => { if (!on) return false; scrollTo({ top: sec.offsetTop - (parseFloat(box.style.getPropertyValue("--st")) || 0) + span() * i / (steps.length - 1) + 1, behavior: "smooth" }); return true; };
    dots.forEach((d, n) => d.addEventListener("click", (e) => { if (go(n)) e.stopImmediatePropagation(); }, true));
    box.addEventListener("keydown", (e) => {
      if (on && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { e.preventDefault(); e.stopImmediatePropagation(); go(Math.min(steps.length - 1, Math.max(0, at + (e.key === "ArrowRight" ? 1 : -1)))); }
    }, true);
    addEventListener("scroll", () => { if (on && !run) run = requestAnimationFrame(paint); }, { passive: true });
    addEventListener("resize", fit);
    fit();
  }

  // ---------- sideways: the row pins to the screen and scrolling down moves it across. Without the script it is a row you swipe ----------
  const rows = reduce ? [] : [...document.querySelectorAll(".hs")];
  if (rows.length) {
    let run = 0;
    const move = () => {
      run = 0;
      rows.forEach((r) => {
        const d = r._d || 0, p = d ? Math.min(1, Math.max(0, -r.getBoundingClientRect().top / d)) : 0;
        r._t.style.transform = `translate3d(${(-p * d).toFixed(1)}px, 0, 0)`;
        r.style.setProperty("--p", p.toFixed(4));
        r._c.forEach((c) => {                    // each tile knows where it sits across the screen, for a little parallax
          const b = c.getBoundingClientRect(), x = (b.left + b.width / 2) / innerWidth - 0.5;
          c.style.setProperty("--x", Math.max(-1, Math.min(1, x)).toFixed(3));
        });
      });
    };
    const fit = () => {
      rows.forEach((r) => {
        r.classList.add("hs-on");
        r._t = r.querySelector(".hs-track"); r._c = [...r._t.children];
        r._d = Math.max(0, r._t.scrollWidth - r.querySelector(".hs-view").clientWidth);
        r.style.height = r._d ? `${r._d + r.querySelector(".hs-pin").offsetHeight}px` : "";
        if (!r._d) r.classList.remove("hs-on");
      });
      move();
    };
    // a keyboard user tabbing into a tile off to the side: scroll the page to where that tile is in view
    rows.forEach((r) => r.addEventListener("focusin", (e) => {
      const c = e.target.closest(".hs-track > *");
      if (!c || !r._d) return;
      scrollTo({ top: r.offsetTop + Math.min(r._d, Math.max(0, c.offsetLeft - 16)), behavior: "auto" });
    }));
    addEventListener("scroll", () => { if (!run) run = requestAnimationFrame(move); }, { passive: true });
    addEventListener("resize", fit);
    addEventListener("load", fit);
    fit();
  }

  // ---------- jewellery: one finding at a time, then an offer to read the rest ----------
  const jf = document.querySelector("[data-jf]");
  if (jf) {
    const cards = [...jf.querySelectorAll(".jf-card")], marks = [...jf.querySelectorAll(".jf-marks i")];
    const nav = jf.querySelector(".jf-nav"), end = jf.querySelector(".jf-end"), again = jf.querySelector(".jf-again");
    let at = 0;
    const show = (n, scroll) => {
      at = n;
      const done = n >= cards.length;
      cards.forEach((c, i) => { c.hidden = i !== n; c.classList.toggle("in", i === n); });
      marks.forEach((m, i) => { m.classList.toggle("now", i === n); m.classList.toggle("done", i < n); });
      end.hidden = !done; end.classList.toggle("in", done);
      nav.hidden = done; again.hidden = !done;
      if (scroll) jf.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    };
    jf.querySelector(".jf-next").addEventListener("click", () => show(at + 1, true));
    again.addEventListener("click", () => show(0, true));
    jf.querySelector(".jf-marks").hidden = false;
    jf.classList.add("jf-on");
    show(0, false);
  }

  // ---------- guess first: the reader guesses, then sees the real figure ----------
  const game = document.querySelector(".guess");
  if (game) {
    const S = JSON.parse(game.dataset.s), total = +game.dataset.total;
    const cards = [...game.querySelectorAll(".gq")], marks = [...game.querySelectorAll(".gq-marks i")];
    const nav = game.querySelector(".gq-nav"), nextBtn = game.querySelector(".gq-next"), end = game.querySelector(".gq-end");
    let at = 0, hits = 0;
    const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k]);
    cards.forEach((c) => {
      const range = c.querySelector("input"), out = c.querySelector("output"), unit = c.dataset.unit;
      const say = () => { out.textContent = `${range.value}${unit}`; range.setAttribute("aria-valuetext", `${range.value}${unit}`); };
      range.addEventListener("input", say);
      say();
      c.querySelector(".gq-lock").addEventListener("click", () => {
        const guess = +range.value, real = parseFloat(c.dataset.value), d = guess - real, off = Math.abs(d);
        const word = off <= 2 ? S.spot : off <= 10 ? S.near : S.far;   // "close" means within ten points, the same line the score uses
        c.querySelector(".gq-verdict").textContent = off <= 2 ? word : `${word} ${fill(S.gap, { d: Math.round(off), dir: d < 0 ? S.under : S.over })}`;
        if (off <= 10) hits++;
        c.classList.add("shown");
        range.disabled = true; c.querySelector(".gq-lock").disabled = true;
        requestAnimationFrame(() => {
          c.querySelector(".gq-you").style.setProperty("--w", `${guess}%`);
          c.querySelector(".gq-real").style.setProperty("--w", `${Math.min(100, real)}%`);
        });
        nextBtn.textContent = at === total - 1 ? S.finish : S.next;
        nav.hidden = false;
        nextBtn.focus({ preventScroll: true });
        if (matchMedia("(max-width: 900px)").matches)   // on a phone the answer is below the slider: bring it into view
          c.querySelector(".gq-reveal").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
    });
    const show = (i) => {
      at = i;
      cards.forEach((c, n) => { c.hidden = n !== i; });
      marks.forEach((m, n) => { m.classList.toggle("done", n < i); m.classList.toggle("now", n === i); });
      nav.hidden = true;
    };
    const reset = () => {
      hits = 0;
      cards.forEach((c) => {
        c.classList.remove("shown");
        const r = c.querySelector("input"); r.disabled = false; r.value = 50; r.dispatchEvent(new Event("input"));
        c.querySelector(".gq-lock").disabled = false;
        c.querySelectorAll(".gq-bars i").forEach((b) => b.style.removeProperty("--w"));
      });
      end.hidden = true; game.querySelector(".gq-list").hidden = false; game.querySelector(".gq-marks").hidden = false;
      show(0);
    };
    nextBtn.addEventListener("click", () => {
      if (at < total - 1) { show(at + 1); cards[at].querySelector("input").focus({ preventScroll: true }); return; }
      game.querySelector(".gq-score").textContent = fill(S.done, { n: hits, total });
      game.querySelector(".gq-more").textContent = fill(S.done_more, { all: game.dataset.all });
      game.querySelector(".gq-list").hidden = true; game.querySelector(".gq-marks").hidden = true; nav.hidden = true;
      end.hidden = false;
    });
    game.querySelector(".gq-again").addEventListener("click", reset);
    game.classList.add("gq-on");
    game.querySelector(".gq-marks").hidden = false;
    show(0);
  }

  // ---------- find your trade: pick one, the board answers in place ----------
  const answer = document.getElementById("answer");
  const trades = [...document.querySelectorAll(".trade[data-trade]")];
  if (answer && trades.length) {
    const panels = [...answer.querySelectorAll(".ans")];
    const pick = (key, focus) => {
      trades.forEach((t) => t.setAttribute("aria-pressed", String(t.dataset.trade === key)));
      panels.forEach((p) => {
        const on = p.dataset.for === key;
        p.hidden = !on;
        if (on) { p.classList.remove("swap"); void p.offsetWidth; p.classList.add("swap"); }
      });
      if (focus && matchMedia("(max-width: 900px)").matches) answer.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    };
    trades.forEach((t) => {
      t.setAttribute("role", "button");
      t.addEventListener("click", (e) => { e.preventDefault(); pick(t.dataset.trade, true); });
      t.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); pick(t.dataset.trade, true); } });
    });
    pick("cafes", false);
  }

  // ---------- copy the email address in one tap ----------
  document.querySelectorAll(".copy[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    const say = b.closest(".t")?.querySelector(".copied");
    try { await navigator.clipboard.writeText(b.dataset.copy); if (say) say.textContent = "Copied. Paste it into any email."; }
    catch { if (say) say.textContent = b.dataset.copy; }
  }));

  // ---------- the sign-up form ----------
  const form = document.querySelector(".sign");
  if (!form) return;
  const status = form.querySelector(".status");
  const nameEl = form.querySelector('input[type="text"]'), telEl = form.querySelector('input[type="tel"]');
  const qEl = form.querySelector("textarea"), boxes = [...form.querySelectorAll('input[type="checkbox"]')];
  const say = (t) => { status.textContent = t; };
  const isPhone = (v) => /^(\+?91|0)?[6-9]\d{9}$/.test(v.replace(/[\s()-]/g, ""));

  // arriving from "Tell me when it's live" or "Vote for this": the right box is ticked, the trade is written in
  const q = new URLSearchParams(location.search);
  const want = q.get("pick");
  if (want) boxes.forEach((b) => { b.checked = b.dataset.key === want || (b.dataset.key === "cafes" && want === "cafes"); });
  if (q.get("trade") && !qEl.value) qEl.value = `I'd like the next index to be: ${q.get("trade").slice(0, 60)}.`;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!nameEl.value.trim()) { say("Please add your name."); nameEl.focus(); return; }
    if (!isPhone(telEl.value.trim())) { say("Please add a 10-digit Indian mobile number."); telEl.focus(); return; }
    const picked = boxes.filter((b) => b.checked).map((b) => b.value);
    if (!picked.length) { say("Pick at least one thing to hear about."); boxes[0].focus(); return; }

    if (form.dataset.provider !== "google_form") {
      // no form connected yet: hand the details to the person's own email app, addressed to Sarthak
      const body = [`Name: ${nameEl.value.trim()}`, `WhatsApp: ${telEl.value.trim()}`, `Send me: ${picked.join(", ")}`,
        qEl.value.trim() ? `\nWhat I wish I knew:\n${qEl.value.trim()}` : ""].join("\n");
      location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(form.dataset.subject)}&body=${encodeURIComponent(body)}`;
      say(form.dataset.thanksEmail);
      return;
    }
    form.classList.add("sending"); say("Sending…");
    try {
      await fetch(form.dataset.action, { method: "POST", mode: "no-cors", body: new FormData(form) });   // Google Forms gives no readable reply
      form.classList.add("done"); say(form.dataset.thanks);
      form.reset();
    } catch { say("That didn't go through. Please try again in a moment."); }
    form.classList.remove("sending");
  });
})();

// ---------- motion, third pass: ink that soaks in, a marker under the figures, sheets that slide, sums that add up, digits that roll ----------
// Its own block, and progressive like the rest: with reduced motion, no observer, or a stalled tab, none of it applies.
(() => {
  const root = document.documentElement;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (cls, text) => { const s = document.createElement("span"); s.className = cls; s.textContent = text; return s; };
  root.classList.add("m3");
  let alive = false, wake = () => {};                  // if the observer hasn't reported yet (a tab opened in the background), drop every
                                                       // "not yet" state so nothing waits on it; the moment it does report, the motion comes back
  setTimeout(() => { if (!alive) root.classList.remove("m3", "m3-curtain"); }, 2500);
  const once = (els, fn, margin = "0px 0px -10% 0px") => {
    if (!els.length) return;
    const io = new IntersectionObserver((es) => { if (!alive) { alive = true; root.classList.add("m3"); setTimeout(wake, 0); } es.forEach((e) => { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } }); }, { rootMargin: margin });
    els.forEach((t) => io.observe(t));
  };
  once([document.body], () => {}, "0px");

  // wrap every match of `re` (one capturing group) in the element's own text; the words themselves are untouched
  const wrap = (el, re, cls) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [], made = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      if (!n.nodeValue.trim() || n.parentElement.closest(".ev, .mk, .iw, .btn, svg")) return;
      const parts = n.nodeValue.split(re);
      if (parts.length < 2) return;
      const frag = document.createDocumentFragment();
      parts.forEach((t, i) => { if (!t) return; if (i % 2) { const s = span(cls, t); made.push(s); frag.append(s); } else frag.append(t); });
      n.replaceWith(frag);
    });
    return made;
  };

  // ---------- a statement inks in as you read: only one that starts below the first screen ----------
  const inks = $$("main p.lead").filter((p) => !p.closest(".hero, .ph, .hx, .page-head, .p-head") && p.getBoundingClientRect().top > innerHeight * 0.7)
    .map((p) => { p.classList.add("m3-ink"); return { p, w: wrap(p, /(\S+)/, "iw"), n: -1 }; });

  // ---------- the marker: money, shares and multiples in running text ----------
  const FIG = /((?:₹|US\$)\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:%|×))/;
  const marked = new Map();
  $$(".fd-body, .cs-body > p, .rule-row p").forEach((p) => { const m = wrap(p, FIG, "mk"); if (m.length) marked.set(p, m); });
  once([...marked.keys()], (p) => marked.get(p).forEach((m, i) => setTimeout(() => m.classList.add("on"), 350 + i * 160)), "0px 0px -18% 0px");

  // ---------- the sums: rows in order, then the total with the marker under it ----------
  once($$("table.pt"), (t) => {
    const rows = $$("tbody tr", t);
    rows.forEach((r, i) => r.style.setProperty("--r", i));
    t.classList.add("m3-go");
    const b = rows.length > 1 && rows[rows.length - 1].querySelector("td:last-child b");
    if (b) { b.classList.add("mk"); setTimeout(() => b.classList.add("on"), 650 + rows.length * 110); }
  }, "0px 0px -15% 0px");

  // ---------- the hero's rotating figure: when it changes, its digits roll in one by one ----------
  const num = document.querySelector("[data-rot] .hero-num");
  if (num) {
    const mo = new MutationObserver(() => {
      const t = [...num.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
      if (!t) return;
      mo.disconnect();
      const frag = document.createDocumentFragment();
      [...t.nodeValue].forEach((ch, i) => { const o = span("rc", ""), s = span("", ch); s.removeAttribute("class"); s.style.setProperty("--c", i); o.append(s); frag.append(o); });
      t.replaceWith(frag);
      mo.observe(num, { childList: true });
    });
    mo.observe(num, { childList: true });
  }

  // ---------- sheets: each finding, and each step of a worked example, slides a little under the next ----------
  const sheets = [];
  $$(".chapter, .cs-list").forEach((box) => {
    const kids = $$(":scope > .fd, :scope > .cs-step", box);
    if (kids.length < 2) return;
    kids.forEach((el, i) => {
      el.classList.add("m3-sheet");
      el.style.zIndex = i + 1;
      if (getComputedStyle(el).backgroundColor === "rgba(0, 0, 0, 0)") {       // a sheet needs a ground to cover the one beneath
        let up = el.parentElement, bg = "";
        while (up && !bg) { const c = getComputedStyle(up).backgroundColor; if (c !== "rgba(0, 0, 0, 0)") bg = c; up = up.parentElement; }
        if (bg) el.style.setProperty("--sheet-bg", bg);
        el.classList.add("m3-bare");
      }
      if (kids[i + 1]) sheets.push({ el, next: kids[i + 1], c: 0 });
    });
  });

  // ---------- the page lifts off its footer (only where the footer follows the page directly, fits on one screen and has no build of its own) ----------
  const foot = document.querySelector(".foot"), main = document.querySelector("main");
  const fitCurtain = () => root.classList.toggle("m3-curtain", !!(foot && main && main.nextElementSibling === foot && !foot.querySelector(".blocks") && foot.offsetHeight <= innerHeight));
  fitCurtain();

  // ---------- the ticker hurries when you scroll, then settles (main site) ----------
  const track = document.querySelector(".hx-track");
  const tape = track && track.getAnimations ? track.getAnimations()[0] : null;
  let lastY = scrollY, vel = 0, rate = 1, tick = 0;

  const update = () => {
    tick = 0;
    const vh = innerHeight;
    inks.forEach((k) => {
      const r = k.p.getBoundingClientRect();
      if (r.top > vh * 1.2 && k.n <= 0) return;
      const lit = Math.round(clamp((vh * 0.9 - r.top) / (r.height + vh * 0.38)) * k.w.length);
      if (lit === k.n) return;
      k.n = lit;
      k.w.forEach((w, i) => w.classList.toggle("on", i < lit));
    });
    const lag = Math.min(44, vh * 0.055);
    sheets.forEach((s) => {
      const top = s.next.getBoundingClientRect().top;
      const c = top > vh * 1.1 || top < -vh ? 0 : clamp((vh - top) / vh);
      if (Math.abs(c - s.c) < 0.004) return;
      s.c = c;
      s.el.style.translate = c ? `0 ${(c * lag).toFixed(1)}px` : "";
      s.el.style.setProperty("--c", c.toFixed(3));
    });
    if (foot && main && root.classList.contains("m3-curtain")) {
      const f = clamp((vh - main.getBoundingClientRect().bottom) / Math.max(1, foot.offsetHeight));
      foot.style.setProperty("--f", f.toFixed(3));
    }
    if (tape) {
      const y = scrollY;
      vel = vel * 0.8 + (y - lastY) * 0.2; lastY = y;
      rate += (1 + Math.min(9, Math.abs(vel) * 0.5) - rate) * 0.12;
      tape.playbackRate = rate;
      if (Math.abs(rate - 1) > 0.02 || Math.abs(vel) > 0.1) request();
    }
  };
  const request = () => { if (!tick) tick = requestAnimationFrame(update); };
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", () => { fitCurtain(); request(); });
  addEventListener("load", () => { fitCurtain(); request(); });
  wake = () => { fitCurtain(); request(); };
  request();

  // ---------- guess first: a close guess gets a handful of paper squares (main site) ----------
  const bits = (from) => {
    const css = getComputedStyle(root), cols = ["--red", "--pink", "--blush", "--clay", "--stone-2"].map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
    const cv = document.createElement("canvas"), dpr = Math.min(devicePixelRatio || 1, 2), r = from.getBoundingClientRect();
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90";
    cv.setAttribute("aria-hidden", "true");
    document.body.append(cv);
    const ctx = cv.getContext("2d"), ox = (r.left + r.width / 2) * dpr, oy = (r.top + Math.min(r.height, innerHeight) * 0.35) * dpr;
    const ps = Array.from({ length: 70 }, () => { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = (5 + Math.random() * 11) * dpr;
      return { x: ox + (Math.random() - 0.5) * r.width * 0.5 * dpr, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: Math.random() * 6, vt: (Math.random() - 0.5) * 0.3, s: (6 + Math.random() * 8) * dpr, c: cols[Math.random() * cols.length | 0] }; });
    const t0 = performance.now();
    const step = (now) => {
      const k = (now - t0) / 1900;
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (k >= 1) { cv.remove(); return; }
      ps.forEach((p) => { p.vy += 0.4 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.t += p.vt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t); ctx.globalAlpha = clamp(2.4 - k * 2.4); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore(); });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => cv.remove(), 2600);
  };
  $$(".gq").forEach((c) => {
    let was = c.classList.contains("shown");
    new MutationObserver(() => {
      const now = c.classList.contains("shown");
      if (now && !was) { const inp = c.querySelector("input"); if (inp && Math.abs(+inp.value - parseFloat(c.dataset.value)) <= 10) bits(c); }
      was = now;
    }).observe(c, { attributes: true, attributeFilter: ["class"] });
  });
})();
