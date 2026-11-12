/* Lectio — shared behaviour. Classic script, works on file:// and any host.
   Progress goes through Lectio.store, a small adapter. Today it is localStorage;
   on an authenticated host it can be swapped for a fetch-backed store without touching pages. */
(function () {
  var NS = "ro_";
  var mem = {};
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(NS + k); return v === null ? (k in mem ? mem[k] : d) : JSON.parse(v); }
      catch (e) { return k in mem ? mem[k] : d; }
    },
    set: function (k, v) {
      mem[k] = v;
      try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) {}
    }
  };

  /* Path back to the course root, read from this script's own src (never from location). */
  var SELF = (document.currentScript && document.currentScript.getAttribute("src")) || "";
  var ROOT = SELF.indexOf("assets/") >= 0 ? SELF.substring(0, SELF.indexOf("assets/")) : "";

  /* FNV-1a over UTF-8 bytes of the lower-cased text. tools/render-audio.mjs uses the same function,
     so a rendered file audio/<hash>.mp3 is found here without any manifest. */
  function hash(text) {
    var bytes = new TextEncoder().encode(text.normalize("NFC").trim().toLowerCase()), h = 0x811c9dc5;
    for (var i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    return ("0000000" + h.toString(16)).slice(-8);
  }

  var root = document.documentElement;
  if (store.get("marks", true)) root.classList.add("marks-on");
  if (store.get("theme", "day") === "night") root.classList.add("theme-night");

  /* Wrap the five marked letters (and their legacy cedilla forms) so the theme can highlight them. */
  var MARKED = /([ăâîșțĂÂÎȘȚşţŞŢ])/;
  function markDiacritics(scope) {
    var els = (scope || document).querySelectorAll('[lang="ro"]');
    for (var i = 0; i < els.length; i++) {
      var walker = document.createTreeWalker(els[i], NodeFilter.SHOW_TEXT, null);
      var nodes = [], n;
      while ((n = walker.nextNode())) {
        if (n.parentNode.className !== "dia" && MARKED.test(n.nodeValue)) nodes.push(n);
      }
      nodes.forEach(function (node) {
        var parts = node.nodeValue.split(MARKED), frag = document.createDocumentFragment();
        parts.forEach(function (p) {
          if (!p) return;
          if (MARKED.test(p) && p.length === 1) {
            var s = document.createElement("span"); s.className = "dia"; s.textContent = p; frag.appendChild(s);
          } else frag.appendChild(document.createTextNode(p));
        });
        node.parentNode.replaceChild(frag, node);
      });
    }
  }

  function toast(msg) {
    var t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 4200);
  }

  /* Optional audio: the browser's own Romanian voice, if the device has one. Never required. */
  function speak(text) {
    var fell = false;
    function fallback() { if (!fell) { fell = true; synth(text); } }
    try {
      var a = new Audio(ROOT + "audio/" + hash(text) + ".mp3");
      a.onerror = fallback;
      var p = a.play();
      if (p && p.catch) p.catch(fallback);
    } catch (e) { fallback(); }
  }
  function synth(text) {
    try {
      if (!("speechSynthesis" in window)) throw 0;
      var voices = speechSynthesis.getVoices().filter(function (v) { return /^ro/i.test(v.lang); });
      if (!voices.length && speechSynthesis.getVoices().length) throw 0;
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "ro-RO"; u.rate = 0.8; if (voices[0]) u.voice = voices[0];
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) {
      toast("No Romanian voice on this device. Audio is optional here; the lesson works without it.");
    }
  }
  try { if ("speechSynthesis" in window) speechSynthesis.getVoices(); } catch (e) {}

  function syncToggles() {
    var b = document.querySelectorAll("[data-toggle]");
    for (var i = 0; i < b.length; i++) {
      var on = b[i].getAttribute("data-toggle") === "marks" ? root.classList.contains("marks-on") : root.classList.contains("theme-night");
      b[i].setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-toggle],[data-speak],.pair__side,[data-complete]") : null;
    if (!t) return;
    if (t.classList.contains("pair__side")) { t.setAttribute("aria-pressed", t.getAttribute("aria-pressed") === "true" ? "false" : "true"); return; }
    if (t.hasAttribute("data-complete")) {
      var d = store.get("done", {}); d[t.getAttribute("data-complete")] = true; store.set("done", d); paintComplete(); return;
    }
    if (t.hasAttribute("data-speak")) { speak(t.getAttribute("data-speak")); return; }
    if (t.getAttribute("data-toggle") === "marks") {
      store.set("marks", root.classList.toggle("marks-on"));
    } else {
      store.set("theme", root.classList.toggle("theme-night") ? "night" : "day");
    }
    syncToggles();
  });

  function paintComplete() {
    var b = document.querySelectorAll("[data-complete]"), d = store.get("done", {});
    for (var i = 0; i < b.length; i++) if (d[b[i].getAttribute("data-complete")]) b[i].textContent = "Lesson complete ✓";
  }

  /* Multiple-choice drill with instant feedback. items: [{ro, q, options[], answer, why}] */
  function quiz(el, items, key) {
    var i = 0, score = 0, locked = false;
    el.innerHTML =
      '<div class="quiz__prompt"><div class="ro ro--display" lang="ro" data-q></div><p class="muted" data-sub></p></div>' +
      '<div class="quiz__options" data-opts></div>' +
      '<div class="quiz__feedback" role="status" aria-live="polite" data-fb></div>' +
      '<div class="quiz__meta"><span data-count></span><button class="btn btn--primary" data-next hidden>Next</button></div>';
    var q = el.querySelector("[data-q]"), sub = el.querySelector("[data-sub]"), opts = el.querySelector("[data-opts]"),
        fb = el.querySelector("[data-fb]"), count = el.querySelector("[data-count]"), next = el.querySelector("[data-next]");
    function show() {
      locked = false; next.hidden = true; fb.textContent = "";
      if (i >= items.length) {
        q.textContent = score + " / " + items.length;
        sub.textContent = score === items.length ? "Clean sweep. The five letters are yours." : "Run it again tomorrow; the misses are the useful part.";
        opts.innerHTML = ""; count.textContent = "";
        next.textContent = "Again"; next.hidden = false;
        if (key) { var best = store.get(key, 0); if (score > best) store.set(key, score); }
        return;
      }
      var it = items[i];
      q.textContent = it.ro; markDiacritics(el);
      sub.textContent = it.q;
      count.textContent = "Word " + (i + 1) + " of " + items.length + " · " + score + " right";
      opts.innerHTML = "";
      it.options.forEach(function (o, idx) {
        var b = document.createElement("button");
        b.className = "btn quiz__option"; b.type = "button"; b.textContent = o;
        b.addEventListener("click", function () {
          if (locked) return; locked = true;
          var right = idx === it.answer;
          if (right) score++;
          b.classList.add(right ? "is-right" : "is-wrong");
          opts.children[it.answer].classList.add("is-right");
          fb.textContent = (right ? "Yes. " : "Not quite. ") + it.why;
          next.textContent = "Next"; next.hidden = false; next.focus();
        });
        opts.appendChild(b);
      });
    }
    next.addEventListener("click", function () {
      if (i >= items.length) { i = 0; score = 0; } else i++;
      show();
    });
    show();
  }


  /* Tap counter for listening practice: one button per word, counts kept per key. */
  function tally(el, words, key) {
    var counts = store.get(key, {});
    el.innerHTML = '<div class="tally" lang="ro"></div><div class="quiz__meta"><span data-total></span><button class="btn" type="button" data-reset>Reset</button></div>';
    var grid = el.firstChild, total = el.querySelector("[data-total]");
    function paint() {
      var sum = 0; grid.innerHTML = "";
      words.forEach(function (w) {
        var n = counts[w] || 0; sum += n;
        var b = document.createElement("button"); b.type = "button"; b.className = "btn tally__btn";
        var a = document.createElement("span"); a.className = "ro"; a.textContent = w;
        var c = document.createElement("span"); c.className = "tally__n"; c.textContent = n;
        b.appendChild(a); b.appendChild(c);
        b.addEventListener("click", function () { counts[w] = (counts[w] || 0) + 1; store.set(key, counts); paint(); });
        grid.appendChild(b);
      });
      total.textContent = sum + " words caught";
      markDiacritics(el);
    }
    el.querySelector("[data-reset]").addEventListener("click", function () { counts = {}; store.set(key, counts); paint(); });
    paint();
  }

  /* Sunday notes sheet: a small form whose entries are kept in the store. */
  function notes(el, key) {
    var fields = [["date", "Date", "input"], ["text", "Text or reference", "input"], ["points", "The points I followed", "textarea"], ["caught", "Phrases I caught", "textarea"], ["lookup", "Words to look up", "textarea"]];
    var html = '<form>';
    fields.forEach(function (f) { html += '<label class="field"><span>' + f[1] + '</span><' + f[2] + ' name="' + f[0] + '"></' + f[2] + '></label>'; });
    el.innerHTML = html + '<button class="btn btn--primary" type="submit">Save this Sunday</button></form><div data-list></div>';
    var form = el.querySelector("form"), list = el.querySelector("[data-list]");
    function paint() {
      var all = store.get(key, []); list.innerHTML = "";
      all.slice().reverse().forEach(function (n) {
        var d = document.createElement("div"); d.className = "note-entry";
        var h = document.createElement("strong"); h.textContent = (n.date || "Undated") + (n.text ? " · " + n.text : ""); d.appendChild(h);
        ["points", "caught", "lookup"].forEach(function (k) { if (n[k]) { var p = document.createElement("pre"); p.textContent = n[k]; d.appendChild(p); } });
        list.appendChild(d);
      });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var n = {}, any = false;
      fields.forEach(function (f) { n[f[0]] = form.elements[f[0]].value.trim(); if (n[f[0]]) any = true; });
      if (!any) return;
      var all = store.get(key, []); all.push(n); store.set(key, all); form.reset(); paint(); toast("Saved in this browser.");
    });
    paint();
  }

  function initChecks() {
    var boxes = document.querySelectorAll("input[data-check]"), state = store.get("checks", {});
    for (var i = 0; i < boxes.length; i++) boxes[i].checked = !!state[boxes[i].getAttribute("data-check")];
  }
  document.addEventListener("change", function (e) {
    if (!e.target.hasAttribute || !e.target.hasAttribute("data-check")) return;
    var state = store.get("checks", {}); state[e.target.getAttribute("data-check")] = e.target.checked; store.set("checks", state);
  });

  document.addEventListener("DOMContentLoaded", function () { markDiacritics(); syncToggles(); paintComplete(); initChecks(); });
  window.Lectio = { tally: tally, notes: notes, root: ROOT, hash: hash, store: store, speak: speak, quiz: quiz, markDiacritics: markDiacritics, toast: toast };
})();
