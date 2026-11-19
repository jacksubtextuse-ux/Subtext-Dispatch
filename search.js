/* search.js - search across every edition of The Subtext Dispatch.
 *
 * Every page loads this file (<script src="/search.js" defer>; the weekly
 * publish script adds the tag to each new edition). It puts a search box in
 * the page's .site-nav. A search opens /search.html?q=..., where this same
 * file lists the matching stories from /search-index.json. The index is
 * rebuilt from the published editions at each weekly publish
 * (build-search-index.py, beside publish-weekly.ps1, outside this repo).
 *
 * Matching: every word typed must begin a word somewhere in the story (its
 * school's badge and full name, conference tags, headline, section, source or text), so
 * "chapel hill development" finds Chapel Hill stories about development, and
 * "develop" also finds "development". A word of three letters or fewer must
 * match a whole word, so "unc" finds UNC and not "uncertain".
 */
(function () {
  "use strict";

  // A page opened straight from disk cannot fetch the index: leave it alone.
  if (location.protocol === "file:") return;

  var INDEX_URL = "/search-index.json";
  var RESULTS_URL = "/search.html";
  var SNIPPET = 280;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fold(s) { return String(s || "").normalize("NFD").replace(/[\u{300}-\u{36f}]/gu, ""); }
  function norm(s) { return fold(s).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim(); }
  function reEsc(s) { return s.replace(/[.*+?^(){}|[\]\\$]/g, "\\$&"); }
  function words(q) { var n = norm(q); return n ? n.split(" ") : []; }
  // Short words (UNC, LSU, UCF) match whole words only; longer ones match word starts.
  function wholeOnly(w) { return w.length <= 3; }

  function longDate(iso) {
    var p = String(iso || "").split("-").map(Number);
    if (p.length !== 3 || !p[0]) return iso || "";
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("en-US",
      { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function injectStyle() {
    if (document.getElementById("dsearch-style")) return;
    var css = [
      ".dsearch-nav { display:inline-block; margin:0 18px 0 0; vertical-align:baseline; }",
      ".dsearch-nav input { font-family:'Inter',sans-serif; font-size:11px; letter-spacing:0.03em; color:#1a1a1a; width:200px; padding:1px 2px 2px 2px;",
      "  border:0; border-bottom:1px solid #444; border-radius:0; background:transparent; outline:none; -webkit-appearance:none; appearance:none; }",
      ".dsearch-nav input::placeholder { color:#777; text-transform:uppercase; letter-spacing:0.18em; font-size:10px; }",
      ".dsearch-nav input:focus { border-bottom-color:#000; }",
      "@media (max-width:700px) { .dsearch-nav input { width:140px; } }",
      ".dsearch-page { max-width:760px; margin:28px auto 0 auto; }",
      ".dsearch-big { display:flex; gap:10px; align-items:center; border-bottom:2px solid #1a1a1a; padding-bottom:6px; }",
      ".dsearch-big input { flex:1; min-width:0; font-family:'Libre Baskerville',serif; font-size:20px; color:#1a1a1a; border:0; background:transparent; outline:none; padding:4px 2px; }",
      ".dsearch-big button { font-family:'Inter',sans-serif; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; background:#1a1a1a; color:#faf7f0; border:0; padding:9px 16px; cursor:pointer; }",
      ".dsearch-big button:hover { background:#000; }",
      ".dsearch-hint { font-family:'Inter',sans-serif; font-size:11px; color:#666; margin:8px 0 0 0; letter-spacing:0.02em; }",
      ".dsearch-summary { font-family:'Inter',sans-serif; font-size:10.5px; letter-spacing:0.14em; text-transform:uppercase; color:#555; margin:22px 0 0 0; }",
      ".dsr-ed { margin:20px 0 0 0; }",
      ".dsr-ed-head { display:flex; justify-content:space-between; align-items:baseline; gap:12px; border-bottom:1px solid #1a1a1a; padding-bottom:4px; }",
      ".dsr-ed-head h2 { font-family:'Playfair Display',serif; font-size:21px; font-weight:700; margin:0; }",
      ".dsr-ed-head h2 span { font-weight:400; color:#555; font-size:15px; margin-left:10px; }",
      ".dsr-ed-head a { font-family:'Inter',sans-serif; font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:#444; text-decoration:none; border-bottom:1px solid #444; white-space:nowrap; }",
      ".dsr { padding:14px 0; border-bottom:1px dotted #b8aa90; }",
      ".dsr:last-child { border-bottom:0; }",
      ".dsr-tags { font-family:'Inter',sans-serif; font-size:9.5px; letter-spacing:0.14em; text-transform:uppercase; color:#555; }",
      ".dsr-tags b { color:#1a1a1a; font-weight:700; }",
      ".dsr h3 { font-family:'Playfair Display',serif; font-size:19px; line-height:1.22; margin:5px 0 6px 0; font-weight:700; }",
      ".dsr h3 a { color:#1a1a1a; text-decoration:none; }",
      ".dsr h3 a:hover { text-decoration:underline; }",
      ".dsr p { font-family:'Libre Baskerville',serif; font-size:13px; line-height:1.6; color:#333; margin:0; }",
      ".dsr-src { font-family:'Inter',sans-serif; font-size:10px; color:#6b6255; margin-top:6px; letter-spacing:0.03em; }",
      ".dsr-src a { color:#6b6255; }",
      ".dsearch-page mark { background:#efe2a8; color:inherit; padding:0 1px; }",
      ".dsearch-empty { font-family:'Libre Baskerville',serif; font-size:14px; line-height:1.6; color:#555; margin:28px 0; text-align:center; }"
    ].join("\n");
    var el = document.createElement("style");
    el.id = "dsearch-style";
    el.textContent = css;
    document.head.appendChild(el);
  }

  // ----- the box in every page's nav ---------------------------------------

  function addNavBox() {
    var nav = document.querySelector(".site-nav");
    if (!nav || nav.querySelector(".dsearch-nav")) return;
    var form = document.createElement("form");
    form.className = "dsearch-nav";
    form.action = RESULTS_URL;
    form.method = "get";
    form.setAttribute("role", "search");
    form.innerHTML = '<input type="search" name="q" placeholder="Search all editions" aria-label="Search all editions" autocomplete="off">';
    form.addEventListener("submit", function (e) {
      if (!form.q.value.trim()) { e.preventDefault(); form.q.focus(); }
    });
    nav.insertBefore(form, nav.firstChild);
  }

  // ----- the results page (search.html) ------------------------------------

  var index = null;

  function loadIndex() {
    return fetch(INDEX_URL, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (d) {
      d.stories.forEach(function (s) {
        s._hay = " " + norm([s.school, s.school_name, (s.tags || []).join(" "), s.headline, s.section, s.source, s.text].join(" ")) + " ";
      });
      return d;
    });
  }

  function matches(s, ws) {
    for (var i = 0; i < ws.length; i++) {
      if (s._hay.indexOf(" " + ws[i] + (wholeOnly(ws[i]) ? " " : "")) < 0) return false;
    }
    return true;
  }

  // Wraps each word-start match of the query words in <mark>; escapes the rest.
  function highlighter(ws) {
    ws = ws.filter(function (w) { return w.length > 1; });
    if (!ws.length) return esc;
    var re = new RegExp("(^|[^A-Za-z0-9])(" + ws.slice().sort(function (a, b) { return b.length - a.length; })
      .map(function (w) { return reEsc(w) + (wholeOnly(w) ? "(?![A-Za-z0-9])" : ""); }).join("|") + ")", "gi");
    return function (t) {
      t = String(t == null ? "" : t);
      var out = "", last = 0, m;
      re.lastIndex = 0;
      while ((m = re.exec(t))) {
        var start = m.index + m[1].length, end = start + m[2].length;
        out += esc(t.slice(last, start)) + "<mark>" + esc(t.slice(start, end)) + "</mark>";
        last = end;
        if (!m[0].length) re.lastIndex++;
      }
      return out + esc(t.slice(last));
    };
  }

  // About SNIPPET characters of the story, starting just before its first match.
  function snippet(t, ws) {
    t = String(t || "");
    if (t.length <= SNIPPET) return t;
    var lower = fold(t).toLowerCase(), at = -1;
    ws.forEach(function (w) {
      var m = new RegExp("(^|[^a-z0-9])" + reEsc(w) + (wholeOnly(w) ? "(?![a-z0-9])" : "")).exec(lower);
      if (m && (at < 0 || m.index + m[1].length < at)) at = m.index + m[1].length;
    });
    var start = at < 0 ? 0 : Math.max(0, at - 90);
    if (start > 0) { var sp = t.indexOf(" ", start); if (sp >= 0 && sp < at) start = sp + 1; }
    var end = Math.min(t.length, start + SNIPPET);
    if (end < t.length) { var sp2 = t.lastIndexOf(" ", end); if (sp2 > start + 40) end = sp2; }
    return (start > 0 ? "... " : "") + t.slice(start, end) + (end < t.length ? " ..." : "");
  }

  function storyHtml(s, ws, hl) {
    var tags = [s.school_name || s.school].concat((s.tags || []).filter(function (t) { return t && t !== s.school && t !== s.school_name; }));
    if (s.section) tags.push(s.section);
    return '<article class="dsr"><div class="dsr-tags"><b>' + hl(tags[0] || "") + "</b>"
      + tags.slice(1).map(function (t) { return " &middot; " + hl(t); }).join("") + "</div>"
      + '<h3><a href="' + esc(s.link) + '" title="Open this story in its edition">' + hl(s.headline) + "</a></h3>"
      + "<p>" + hl(snippet(s.text, ws)) + "</p>"
      + (s.source ? '<div class="dsr-src">Source: ' + (s.source_url
          ? '<a href="' + esc(s.source_url) + '" target="_blank" rel="noopener">' + hl(s.source) + "</a>"
          : hl(s.source)) + "</div>" : "")
      + "</article>";
  }

  function render(page, q) {
    var sum = page.querySelector(".dsearch-summary");
    var host = page.querySelector(".dsearch-results");
    if (!index) return;
    var ws = words(q);
    if (!ws.length) {
      sum.textContent = "";
      host.innerHTML = '<div class="dsearch-empty">Search every story the Dispatch has printed: '
        + index.stories.length + " stories in " + index.editions.length + " editions.</div>";
      return;
    }
    var hits = index.stories.filter(function (s) { return matches(s, ws); });
    if (!hits.length) {
      sum.textContent = "";
      host.innerHTML = '<div class="dsearch-empty">No stories match <b>' + esc(q.trim())
        + '</b>. Try fewer words, or the start of a word ("develop", "acqui").</div>';
      return;
    }
    var groups = [], byEd = {};
    hits.forEach(function (s) {
      if (!byEd[s.edition]) { byEd[s.edition] = []; groups.push(byEd[s.edition]); }
      byEd[s.edition].push(s);
    });
    sum.textContent = hits.length + (hits.length === 1 ? " story" : " stories") + " in "
      + groups.length + (groups.length === 1 ? " edition" : " editions") + ", newest first";
    var hl = highlighter(ws);
    host.innerHTML = groups.map(function (ss) {
      var e = ss[0].edition;
      return '<section class="dsr-ed"><div class="dsr-ed-head"><h2>Edition ' + esc(e)
        + "<span>" + esc(longDate(ss[0].date)) + "</span></h2>"
        + '<a href="/editions/edition-' + esc(e) + '/">Open edition</a></div>'
        + ss.map(function (s) { return storyHtml(s, ws, hl); }).join("") + "</section>";
    }).join("");
  }

  function initResults(page) {
    var form = page.querySelector(".dsearch-big");
    var input = form.q;
    var baseTitle = document.title;
    input.value = new URLSearchParams(location.search).get("q") || "";
    var timer = null;
    function update() {
      var q = input.value.trim();
      history.replaceState(null, "", RESULTS_URL + (q ? "?q=" + encodeURIComponent(q).replace(/%20/g, "+") : ""));
      document.title = q ? q + " | " + baseTitle : baseTitle;
      render(page, input.value);
    }
    input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(update, 120); });
    form.addEventListener("submit", function (e) { e.preventDefault(); clearTimeout(timer); update(); });
    page.querySelector(".dsearch-results").innerHTML = '<div class="dsearch-empty">Loading the archive...</div>';
    loadIndex().then(function (d) {
      index = d;
      document.title = input.value.trim() ? input.value.trim() + " | " + baseTitle : baseTitle;
      render(page, input.value);
    }).catch(function () {
      page.querySelector(".dsearch-results").innerHTML = '<div class="dsearch-empty">Search is not available right now.</div>';
    });
    if (!input.value) input.focus();
  }

  injectStyle();
  var page = document.getElementById("dsearch-page");
  if (page) initResults(page); else addNavBox();
})();
