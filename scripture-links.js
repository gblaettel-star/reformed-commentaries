// scripture-links.js — shared Scripture -> ESV.org linkifier.
// Extracted verbatim from the commentary (index.html) so the study pages
// (dictionary, creeds, councils, figures, heresies, philosophers, prayer,
// solas) link references exactly the way the commentary does.
//
// Usage:  linkifyScripture(rootElement, curBook, curChapter)
//   curBook/curChapter may be null on non-Bible pages; full refs such as
//   "Eph 1:8-9" resolve on their own.
// Reading text size (set from the app's "Aa" panel; stored per device).
// Scales the page's <main> only, so headers and buttons keep their size.
(function(){
  var v = 1;
  try { v = parseFloat(localStorage.getItem('text-scale')) || 1; } catch (e) {}
  document.documentElement.style.setProperty('--ts', v);
  var st = document.createElement('style');
  st.textContent = 'main{zoom:var(--ts,1)}html{touch-action:manipulation}';
  (document.head || document.documentElement).appendChild(st);
})();

var ESV_BOOKS = (function(){
  var defs = [
    ['Genesis','genesis gen ge gn'],['Exodus','exodus exod exo ex'],
    ['Leviticus','leviticus lev lv'],['Numbers','numbers num nm nu'],
    ['Deuteronomy','deuteronomy deut deu dt'],['Joshua','joshua josh jos'],
    ['Judges','judges judg jdg jgs'],['Ruth','ruth rth ru'],
    ['1 Samuel','1samuel 1sam 1sa 1sm'],['2 Samuel','2samuel 2sam 2sa 2sm'],
    ['1 Kings','1kings 1kgs 1kin 1ki'],['2 Kings','2kings 2kgs 2kin 2ki'],
    ['1 Chronicles','1chronicles 1chron 1chr 1ch'],['2 Chronicles','2chronicles 2chron 2chr 2ch'],
    ['Ezra','ezra ezr'],['Nehemiah','nehemiah neh'],['Esther','esther esth est'],
    ['Job','job jb'],['Psalms','psalms psalm psa pss ps'],
    ['Proverbs','proverbs prov prv pro pr'],['Ecclesiastes','ecclesiastes eccles eccl ecc'],
    ['Song of Solomon','songofsolomon songofsongs song sos ss'],['Isaiah','isaiah isa is'],
    ['Jeremiah','jeremiah jer'],['Lamentations','lamentations lam'],
    ['Ezekiel','ezekiel ezek eze ezk'],['Daniel','daniel dan dn'],
    ['Hosea','hosea hos'],['Joel','joel joe jl'],['Amos','amos amo'],
    ['Obadiah','obadiah obad oba ob'],['Jonah','jonah jon jnh'],['Micah','micah mic'],
    ['Nahum','nahum nah'],['Habakkuk','habakkuk hab'],['Zephaniah','zephaniah zeph zep'],
    ['Haggai','haggai hag'],['Zechariah','zechariah zech zec'],['Malachi','malachi mal'],
    ['Matthew','matthew matt mat mt'],['Mark','mark mrk mar mk'],['Luke','luke luk lk'],
    ['John','john jhn joh jn'],['Acts','acts act'],['Romans','romans rom rm ro'],
    ['1 Corinthians','1corinthians 1cor 1co'],['2 Corinthians','2corinthians 2cor 2co'],
    ['Galatians','galatians gal'],['Ephesians','ephesians eph'],
    ['Philippians','philippians phil php pp'],['Colossians','colossians col'],
    ['1 Thessalonians','1thessalonians 1thess 1thes 1th'],['2 Thessalonians','2thessalonians 2thess 2thes 2th'],
    ['1 Timothy','1timothy 1tim 1ti 1tm'],['2 Timothy','2timothy 2tim 2ti 2tm'],
    ['Titus','titus tit'],['Philemon','philemon philem phlm phm'],
    ['Hebrews','hebrews heb'],['James','james jas jm'],
    ['1 Peter','1peter 1pet 1pe 1pt'],['2 Peter','2peter 2pet 2pe 2pt'],
    ['1 John','1john 1jn 1jhn 1jo'],['2 John','2john 2jn 2jhn 2jo'],['3 John','3john 3jn 3jhn 3jo'],
    ['Jude','jude jud jde'],['Revelation','revelation rev rv re']
  ];
  var map = {};
  defs.forEach(function(d){ d[1].split(' ').forEach(function(a){ map[a] = d[0]; }); });
  return map;
})();

// Scan rendered text and wrap Scripture references as links to the full chapter
// on ESV.org (new tab). Handles four forms:
//   1) Full:         "Isa 43:25", "Rom. 8:23-25", "1 Cor. 15:3"
//   2) Series/cont.: "Acts 6:7; 12:24; 19:20"  (later refs inherit the book)
//   3) Bare ch:v:    "1:15"                     (resolved to the book in view)
//   4) Verse words:  "v. 15", "vv. 15-17"       (resolved to book + current chapter)
// Verse-word form is matched BEFORE the book form so "v. 3" (with a space) is not
// mistaken for a book named "v".  curBook = canonical ESV name of the book in view
// (or null on non-Bible entries); curChapter = current chapter as a string (or null).
function linkifyScripture(root, curBook, curChapter){
  if (!root || !document.createTreeWalker) return;
  var SP = '[\\s\\u00A0]';
  var re = new RegExp(
    '\\b(vv?\\.|verses?)' + SP + '*(\\d+(?:[-–,]' + SP + '?\\d+)*)' +                                     // 1,2: verse words
    '|\\b([1-3]?' + SP + '?[A-Za-z][A-Za-z.]{1,})' + SP + '+(\\d+(?:[:.]\\d+(?:[-–,]' + SP + '?\\d+)*)?)' + // 3,4: Book ch(:v)
    '|(\\d{1,3}:\\d{1,3}(?:[-–,]' + SP + '?\\d+)*)',                                                       // 5: bare ch:v
    'g');
  var sepOnly = /^[\s ;,–—-]*$/;
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function(n){
      if (!/\d/.test(n.nodeValue || '')) return NodeFilter.FILTER_REJECT;
      for (var p = n.parentNode; p && p !== root; p = p.parentNode){
        if (p.nodeName === 'A') return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);

  function mkLink(label, canon, cv){
    cv = cv.replace(/\./g, ':').replace(/–/g, '-').replace(/[\s ]/g, '');
    var a = document.createElement('a');
    a.href = 'https://www.esv.org/' + canon.replace(/ /g, '+') + '+' + cv + '/';
    a.target = '_blank'; a.rel = 'noopener'; a.className = 'scripture-link';
    a.textContent = label;
    return a;
  }

  nodes.forEach(function(node){
    var text = node.nodeValue, m, last = 0, frag = null;
    var activeBook = null, prevEnd = -1;   // per-node citation-series state
    re.lastIndex = 0;
    while ((m = re.exec(text))){
      var start = m.index, end = start + m[0].length;
      var canon = null, cv = null;
      if (m[1]){                                   // "v./vv./verse(s) N" -> book + chapter
        if (!curBook || !curChapter) continue;
        canon = curBook; cv = curChapter + ':' + m[2];
        activeBook = curBook;
      } else if (m[3]){                            // Full "Book ch:v"
        canon = ESV_BOOKS[m[3].toLowerCase().replace(/[.\s ]/g, '')];
        if (!canon){ re.lastIndex = start + m[3].length; continue; } // unknown word ("cf.", "see"): rewind so a trailing "1 Cor" isn't eaten
        cv = m[4];
        activeBook = canon;
      } else if (m[5]){                            // bare "ch:v"
        var before = start > 0 ? text.charAt(start - 1) : '';
        if (/[\d:]/.test(before)) continue;        // part of a larger number
        if (/^[\s ]?[ap]\.?m\b/i.test(text.slice(end, end + 5))) continue; // clock time
        var inSeries = prevEnd >= 0 && activeBook && sepOnly.test(text.slice(prevEnd, start));
        canon = inSeries ? activeBook : curBook;
        if (!canon) continue;
        cv = m[5];
        if (!inSeries) activeBook = curBook;
      } else continue;

      if (!frag) frag = document.createDocumentFragment();
      if (start > last) frag.appendChild(document.createTextNode(text.slice(last, start)));
      frag.appendChild(mkLink(m[0], canon, cv));
      last = end; prevEnd = end;
    }
    if (frag){
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    }
  });
}

// Auto mode for the study pages (formerly esv-links.js): links the whole page,
// and re-links whenever the page re-renders (filters, search). Also injects the
// link style so it wins over each page's own rule, as before.
function autoLinkifyScripture(){
  var st = document.createElement('style');
  st.textContent = '.scripture-link{color:inherit;text-decoration:underline;text-decoration-color:rgba(201,168,76,.45);text-decoration-style:dotted;text-decoration-thickness:1px;text-underline-offset:3px}.scripture-link:hover{text-decoration-color:#c9a84c}';
  (document.head || document.documentElement).appendChild(st);
  var obs = null, t = null;
  function run(){
    if (obs) obs.disconnect();
    try { linkifyScripture(document.body); } catch (e) {}
    if (obs) obs.observe(document.body, { childList: true, subtree: true });
  }
  function schedule(){ clearTimeout(t); t = setTimeout(run, 150); }
  function init(){
    if (window.MutationObserver) obs = new MutationObserver(schedule);
    run();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.addEventListener('load', run);
}

// ── Reference card ─────────────────────────────────────────────────────────
// Tapping any Scripture link opens a small card with the verse's ESV text (taken
// from the commentary's own quotations) and two choices: read our commentary on
// it, or open ESV.org. Tap outside the card to close it. Pages that host the
// commentary define window.sdgGoto(bookId, chapter, verse); other pages open
// index.html?go=book.chapter.verse.
var RefCard = (function(){
  var data = {}, el = null, cur = null, openedAt = 0, startOutside = false;
  function bookId(canon){ var c = canon.toLowerCase().replace(/\s+/g, ''); return c === 'songofsolomon' ? 'songofsongs' : c; }
  function parse(href){
    var m = /esv\.org\/(.+?)\/?$/.exec(href || ''); if (!m) return null;
    var s = decodeURIComponent(m[1]), i = s.lastIndexOf('+'); if (i < 0) return null;
    var canon = ESV_BOOKS[s.slice(0, i).toLowerCase().replace(/[\s+.]/g, '')];
    var cm = /^(\d+)(?::(\d+))?/.exec(s.slice(i + 1));
    if (!canon || !cm) return null;
    return { canon: canon, id: bookId(canon), ch: +cm[1], v: cm[2] ? +cm[2] : 0, href: href };
  }
  function load(id){
    if (!data[id]) data[id] = fetch('data/' + id + '.json').then(function(r){ if (!r.ok) throw 0; return r.json(); });
    return data[id];
  }
  var ONE = { obadiah: 1, philemon: 1, '2john': 1, '3john': 1, jude: 1 };
  function lbl(r, a, b){
    var name = r.canon === 'Psalms' ? 'Psalm' : r.canon;
    if (!a) return ONE[r.id] ? name : name + ' ' + r.ch;
    var vs = a === b ? a : a + '–' + b;
    return name + ' ' + (ONE[r.id] ? vs : r.ch + ':' + vs);
  }
  function plain(h){ var d = document.createElement('div'); d.innerHTML = h || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  function esc(t){ return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function find(ch, v){
    var best = null;
    ((ch && ch.verseByVerse) || []).forEach(function(e){
      if (best || e.sectionBreak) return;
      var m = /^v{1,2}\.\s*(\d+)(?:\s*[–—-]\s*(\d+))?/.exec(String(e.ref || ''));
      if (!m) return;
      var a = +m[1], b = m[2] ? +m[2] : a;
      if (!v || (v >= a && v <= b)) best = { a: a, b: b, q: e.quote };
    });
    return best;
  }
  function build(){
    var st = document.createElement('style');
    st.textContent = '#rc-bd{position:fixed;inset:0;background:rgba(5,14,24,.55);z-index:130;opacity:0;pointer-events:none;transition:opacity .18s}'
      + '#rc-bd.open{opacity:1}'
      + '#rc{position:fixed;left:0;right:0;bottom:0;z-index:140;max-width:720px;margin:0 auto;background:var(--ink-2,#0f1c2f);border-top:1px solid rgba(200,169,90,.26);border-radius:18px 18px 0 0;box-shadow:0 -20px 40px rgba(0,0,0,.45);padding:.8rem 1.2rem calc(.9rem + env(safe-area-inset-bottom));transform:translateY(105%);transition:transform .22s ease;font-family:var(--text,Georgia),serif;display:flex;flex-direction:column;max-height:80vh;max-height:80dvh}'
      + '#rc.open{transform:translateY(0)}'
      + '#rc.chapter{height:82vh;height:82dvh;max-height:none}'
      + '#rc:before{content:"";display:block;width:2.4rem;height:4px;border-radius:2px;background:rgba(200,169,90,.26);margin:-.2rem auto .7rem;flex-shrink:0}'
      + '#rc .rc-head{display:flex;align-items:center;gap:.6rem;margin-bottom:.55rem;flex-shrink:0}'
      + '#rc .rc-ref{color:var(--gold,#c8a95a);font-family:var(--display,Georgia),serif;font-weight:500;font-size:1.45rem;flex:1;font-variant-numeric:lining-nums}'
      + '#rc .rc-x,#rc .rc-back{background:none;border:none;color:var(--gold,#c8a95a);font-family:var(--text,Georgia),serif;font-size:1.05rem;line-height:1;padding:.45rem .3rem;cursor:pointer;touch-action:manipulation}'
      + '#rc .rc-x{font-size:1.15rem;color:#8fa6bd}'
      + '#rc .rc-back{display:none}#rc.chapter .rc-back{display:inline-block}'
      + '#rc .rc-text{color:var(--parch,#ece3cf);font-style:italic;font-size:calc(1.06rem * var(--ts,1));line-height:1.7;flex:1 1 auto;min-height:2.5em;overflow-y:auto;overscroll-behavior:contain;margin-bottom:.9rem}'
      + '#rc.chapter .rc-text{font-style:normal;line-height:1.75}'
      + '#rc .rc-text p{margin:0 0 .7rem}'
      + '#rc .rc-text sup{color:rgba(200,169,90,.75);font-size:.68em;font-style:normal;font-weight:bold;margin:0 .2em 0 .35em;vertical-align:super}'
      + '#rc .rc-text .hl{background:rgba(201,168,76,.18);border-radius:3px;box-shadow:0 0 0 2px rgba(201,168,76,.18)}'
      + '#rc .rc-text sup.hl{background:#c9a84c;color:#0d2137;border-radius:8px;padding:0 .3em;box-shadow:none}'
      + '#rc .rc-wait{color:#7090b0;font-style:normal}'
      + '#rc .rc-acts{flex-shrink:0;border-top:1px solid rgba(200,169,90,.26);border-bottom:1px solid rgba(200,169,90,.26)}'
      + '#rc .rc-btn{display:flex;align-items:center;width:100%;background:none;border:none;border-top:1px solid rgba(236,227,207,.085);color:var(--parch,#ece3cf);text-decoration:none;text-align:left;font-family:var(--text,Georgia),serif;font-size:1.08rem;padding:.85rem .1rem;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}'
      + '#rc .rc-btn:first-child{border-top:none}'
      + '#rc .rc-btn:active{background:rgba(200,169,90,.06)}'
      + '#rc .rc-btn span{flex:1}'
      + '#rc .rc-btn i{font-style:normal;color:rgba(200,169,90,.7);font-size:1.15rem}'
      + '#rc.chapter .rc-ch{display:none}'
      + '#rc .rc-btn[disabled]{opacity:.4;cursor:default}';
    document.head.appendChild(st);
    // The dark backdrop is purely visual (pointer-events:none). iPhone Safari can
    // leave the page unresponsive when a touch lands on a full-screen overlay that
    // then disappears, so outside taps are detected on the document instead.
    var bd = document.createElement('div'); bd.id = 'rc-bd';
    el = document.createElement('div'); el.id = 'rc'; el.setAttribute('role', 'dialog');
    el.innerHTML = '<div class="rc-head"><button class="rc-back" type="button">&#8249; Back</button><div class="rc-ref"></div>'
      + '<button class="rc-x" type="button" aria-label="Close">&#10005;</button></div><div class="rc-text"></div><div class="rc-acts">'
      + '<button class="rc-btn rc-go" type="button"><span>Commentary</span><i>&#8250;</i></button>'
      + '<button class="rc-btn rc-ch" type="button"><span>Whole chapter</span><i>&#8250;</i></button>'
      + '<a class="rc-btn rc-esv" target="_blank" rel="noopener"><span>ESV.org</span><i>&#8599;</i></a></div>';
    document.body.appendChild(bd); document.body.appendChild(el);
    el.querySelector('.rc-go').onclick = go;
    el.querySelector('.rc-ch').onclick = showChapter;
    el.querySelector('.rc-back').onclick = showVerse;
    el.querySelector('.rc-x').onclick = function(){ close('x button'); };
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') close('escape'); });
    // Installed on an iPhone home screen, a normal link opens ESV.org in a browser
    // layer over the app, and returning from it leaves Safari's touch handling
    // stuck. There, hand the page to the Safari app itself instead.
    el.querySelector('.rc-esv').onclick = function(ev){
      var href = this.href;
      close('esv button');
      if (window.navigator.standalone === true && /^https:/.test(href)) {
        ev.preventDefault();
        window.location.href = 'x-safari-' + href;
      }
    };
  }
  // Verse view: the commentary's quotation of the tapped verse(s).
  function showVerse(){
    if (!cur || !cur.ch_) return;
    var r = cur, ch = r.ch_, e = r.e_;
    el.classList.remove('chapter');
    var refEl = el.querySelector('.rc-ref'), txt = el.querySelector('.rc-text');
    if (r.v && e) {
      refEl.textContent = lbl(r, e.a, e.b);
      txt.innerHTML = esc(plain(e.q));
    } else {
      var t = plain(ch.title || ''), q = e ? plain(e.q) : '';
      refEl.textContent = lbl(r, 0, 0);
      if (q.length > 320) q = q.slice(0, 317).replace(/\s+\S*$/, '') + '…';
      txt.innerHTML = (t ? '<div style="font-style:normal;color:#c9a84c;margin-bottom:.4rem">' + esc(t) + '</div>' : '') + esc(q);
    }
    txt.scrollTop = 0;
    cur.mode_ = 'verse';
  }
  // Chapter view: the whole chapter's ESV text, scrolled to the tapped verse(s).
  function showChapter(){
    if (!cur || !cur.ch_ || !cur.ch_.text) return;
    var r = cur, e = r.e_, a = r.v ? (e ? e.a : r.v) : 0, b = r.v ? (e ? e.b : r.v) : 0;
    var parts = String(r.ch_.text).split(/<sup>(\d+)<\/sup>/), h = parts[0];
    for (var i = 1; i < parts.length; i += 2) {
      var n = +parts[i], body = parts[i + 1] || '', on = a && n >= a && n <= b;
      var clean = !/<\/?(p|div|blockquote|br)\b/i.test(body);
      h += '<sup' + (on ? ' class="hl"' : '') + ' data-v="' + n + '">' + n + '</sup>'
        + (on && clean ? '<span class="hl">' + body + '</span>' : body);
    }
    el.classList.add('chapter');
    el.querySelector('.rc-ref').textContent = lbl(r, 0, 0);
    var txt = el.querySelector('.rc-text');
    txt.innerHTML = h;
    var target = a ? txt.querySelector('sup[data-v="' + a + '"]') : null;
    txt.scrollTop = 0;
    if (target) txt.scrollTop = Math.max(0, target.offsetTop - txt.offsetTop - 60);
    cur.mode_ = 'chapter';
  }
  function open(r, label){
    if (!el) build();
    cur = r; openedAt = Date.now();
    el.classList.remove('chapter');
    var refEl = el.querySelector('.rc-ref'), txt = el.querySelector('.rc-text'),
        btn = el.querySelector('.rc-go'), chb = el.querySelector('.rc-ch');
    refEl.textContent = lbl(r, r.v, r.v);
    txt.innerHTML = '<span class="rc-wait">Loading&hellip;</span>';
    btn.disabled = true; chb.disabled = true;
    el.querySelector('.rc-esv').href = r.href;
    document.getElementById('rc-bd').classList.add('open'); el.classList.add('open');
    load(r.id).then(function(d){
      if (cur !== r) return;
      var ch = d[r.ch];
      if (!ch) throw 0;
      r.ch_ = ch; r.e_ = find(ch, r.v);
      btn.disabled = false; chb.disabled = !ch.text;
      showVerse();
    }).catch(function(){
      if (cur !== r) return;
      txt.innerHTML = '<span class="rc-wait">This passage isn’t in the commentary yet.</span>';
    });
  }
  function close(why){
    if (!el) return;
    el.classList.remove('open', 'chapter'); document.getElementById('rc-bd').classList.remove('open'); cur = null;
  }
  function go(){
    if (!cur) return;
    var r = cur; close('commentary button');
    if (typeof window.sdgGoto === 'function') window.sdgGoto(r.id, r.ch, r.v);
    else location.href = 'index.html?go=' + r.id + '.' + r.ch + '.' + r.v;
  }
  // Outside taps: a touch/press that STARTS outside the open card, then a click
  // outside it, closes the card and is swallowed (so nothing underneath fires).
  function isOpen(){ return !!(el && el.classList.contains('open')); }
  function startHandler(ev){
    startOutside = isOpen() && !el.contains(ev.target);
  }
  document.addEventListener('touchstart', startHandler, { capture: true, passive: true });
  document.addEventListener('mousedown', startHandler, true);
  document.addEventListener('click', function(ev){
    if (!isOpen() || el.contains(ev.target)) return;
    ev.preventDefault(); ev.stopPropagation();
    var ok = startOutside && Date.now() - openedAt > 400;
    if (ok) close('outside tap');
    startOutside = false;
  }, true);
  // Coming back to the app (from Safari, another app or the lock screen):
  // close any open card and nudge the page so iOS hands touches back to it.
  function wake(){
    if (isOpen()) close('back in view');
    startOutside = false;
    var y = window.scrollY; window.scrollTo(0, y + 1); window.scrollTo(0, y);
  }
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') wake();
  });
  window.addEventListener('pageshow', function(e){ if (e.persisted) wake(); });

  document.addEventListener('click', function(ev){
    if (ev.defaultPrevented || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target.closest && ev.target.closest('a.scripture-link');
    if (!a) return;
    var r = parse(a.href);
    if (!r) return;           // unparseable: let the ESV link work as before
    ev.preventDefault();
    open(r);
  }, true);
  return { open: open, close: close, isOpen: isOpen };
})();
