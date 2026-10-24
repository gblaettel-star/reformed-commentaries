/* Arriving on a Reference page (or Monthly Prayer) from a Search result:
   mark the searched words in the entry, bring them into view, and offer
   "Back to results", which returns to Search as it was (sxResume in index.html).
   The page may define searchReveal(id) to show an entry it keeps hidden. */
(function () {
  var land;
  try { land = JSON.parse(sessionStorage.getItem('sx-land')); } catch (e) {}
  if (!land || decodeURIComponent(location.hash.slice(1)) !== land.id) return;
  try { sessionStorage.removeItem('sx-land'); } catch (e) {}

  // Same word rules as sxFind() in index.html: accent-free, lower case, words that begin with a searched word.
  function fold(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function find(t, ws) {
    var f = '';
    for (var i = 0; i < t.length; i++) { var c = fold(t[i]); f += c.length === 1 ? c : t[i].toLowerCase(); }
    var re = new RegExp('(^|[^a-z])((?:' + ws.join('|') + ')[a-z]*)', 'g'), out = [], m;
    while ((m = re.exec(f))) out.push([m.index + m[1].length, m.index + m[0].length]);
    return out;
  }
  function mark(root, ws) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [], n, first = null, count = 0;
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (n) {
      if (count > 40) return;
      var t = n.nodeValue, ms = find(t, ws);
      if (!ms.length) return;
      var frag = document.createDocumentFragment(), pos = 0;
      ms.forEach(function (m) {
        frag.appendChild(document.createTextNode(t.slice(pos, m[0])));
        var mk = document.createElement('mark'); mk.className = 'sx-mark'; mk.textContent = t.slice(m[0], m[1]);
        frag.appendChild(mk); if (!first) first = mk; pos = m[1]; count++;
      });
      frag.appendChild(document.createTextNode(t.slice(pos)));
      n.parentNode.replaceChild(frag, n);
    });
    return first;
  }

  function back() {
    try { sessionStorage.setItem('sx-return', '1'); } catch (e) {}
    if (/index\.html$|\/$/.test(document.referrer.split(/[?#]/)[0]) && history.length > 1) history.back();
    else location.href = 'index.html';
  }

  function go() {
    if (typeof window.searchReveal === 'function') window.searchReveal(land.id);
    var el = document.getElementById(land.id);
    if (!el) return;
    var first = land.ws && land.ws.length ? mark(el, land.ws) : null;
    var st = document.createElement('style');
    st.textContent = 'mark.sx-mark{background:rgba(201,168,76,.45);color:inherit;border-radius:2px;padding:0 .05em;animation:sx-fade 1.6s ease 3.5s forwards}'
      + '@keyframes sx-fade{to{background:transparent}}'
      + '#sx-back{position:fixed;left:50%;bottom:calc(1rem + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:999;display:flex;align-items:center;'
      + 'background:#c9a84c;color:#0d2137;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.45);font-family:Georgia,serif;font-size:.9rem;font-weight:bold;max-width:calc(100% - 2rem)}'
      + '#sx-back button{background:none;border:none;color:inherit;font:inherit;cursor:pointer;touch-action:manipulation;padding:.55rem .3rem .55rem 1rem;white-space:nowrap}'
      + '#sx-back .x{padding:.55rem .9rem .55rem .4rem;font-weight:normal;opacity:.7}';
    document.head.appendChild(st);
    var chip = document.createElement('div');
    chip.id = 'sx-back';
    chip.innerHTML = '<button type="button">&#8592; Back to results</button><button type="button" class="x" aria-label="Dismiss">&#10005;</button>';
    chip.firstChild.onclick = back;
    chip.lastChild.onclick = function () { chip.remove(); };
    document.body.appendChild(chip);
    // after the browser's own jump to the #id, put the first marked word in the middle of the screen
    setTimeout(function () {
      if (first) first.scrollIntoView({ block: 'center' });
      else el.scrollIntoView({ block: 'start' });
    }, 60);
  }
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
})();
