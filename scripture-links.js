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
  st.textContent = 'main{zoom:var(--ts,1)}';
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
  var data = {}, el = null, cur = null;
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
    if (!a) return name + ' ' + r.ch;
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
      + '#rc-bd.open{opacity:1;pointer-events:auto}'
      + '#rc{position:fixed;left:0;right:0;bottom:0;z-index:140;max-width:720px;margin:0 auto;background:#0a1e30;border-top:2px solid #c9a84c;border-radius:14px 14px 0 0;padding:1rem 1.1rem calc(1.1rem + env(safe-area-inset-bottom));transform:translateY(102%);transition:transform .22s ease;font-family:Georgia,serif}'
      + '#rc.open{transform:translateY(0)}'
      + '#rc .rc-ref{color:#c9a84c;font-weight:bold;font-size:1rem;margin-bottom:.55rem}'
      + '#rc .rc-text{color:#e8dcc8;font-style:italic;font-size:calc(1rem * var(--ts,1));line-height:1.65;max-height:42vh;overflow-y:auto;margin-bottom:1rem}'
      + '#rc .rc-wait{color:#7090b0;font-style:normal}'
      + '#rc .rc-acts{display:flex;gap:.6rem}'
      + '#rc .rc-btn{flex:1;text-align:center;text-decoration:none;font-family:Georgia,serif;font-size:.92rem;padding:.75rem .5rem;border-radius:8px;cursor:pointer;touch-action:manipulation;border:1px solid #c9a84c}'
      + '#rc .rc-go{background:#c9a84c;color:#0d2137;font-weight:bold}'
      + '#rc .rc-go[disabled]{opacity:.4;cursor:default}'
      + '#rc .rc-esv{background:transparent;color:#c9a84c}';
    document.head.appendChild(st);
    var bd = document.createElement('div'); bd.id = 'rc-bd'; bd.onclick = close;
    el = document.createElement('div'); el.id = 'rc'; el.setAttribute('role', 'dialog');
    el.innerHTML = '<div class="rc-ref"></div><div class="rc-text"></div><div class="rc-acts">'
      + '<button class="rc-btn rc-go" type="button">Commentary</button>'
      + '<a class="rc-btn rc-esv" target="_blank" rel="noopener">ESV.org &#8599;</a></div>';
    document.body.appendChild(bd); document.body.appendChild(el);
    el.querySelector('.rc-go').onclick = go;
    el.querySelector('.rc-esv').onclick = function(){ setTimeout(close, 50); };
  }
  function open(r, label){
    if (!el) build();
    cur = r;
    var refEl = el.querySelector('.rc-ref'), txt = el.querySelector('.rc-text'), btn = el.querySelector('.rc-go');
    refEl.textContent = lbl(r, r.v, r.v);
    txt.innerHTML = '<span class="rc-wait">Loading&hellip;</span>';
    btn.disabled = true;
    el.querySelector('.rc-esv').href = r.href;
    document.getElementById('rc-bd').classList.add('open'); el.classList.add('open');
    load(r.id).then(function(d){
      if (cur !== r) return;
      var ch = d[r.ch];
      if (!ch) throw 0;
      btn.disabled = false;
      var e = find(ch, r.v);
      if (r.v && e) {
        refEl.textContent = lbl(r, e.a, e.b);
        txt.innerHTML = esc(plain(e.q));
      } else {
        var t = plain(ch.title || ''), q = e ? plain(e.q) : '';
        if (q.length > 320) q = q.slice(0, 317).replace(/\s+\S*$/, '') + '…';
        txt.innerHTML = (t ? '<div style="font-style:normal;color:#c9a84c;margin-bottom:.4rem">' + esc(t) + '</div>' : '') + esc(q);
      }
    }).catch(function(){
      if (cur !== r) return;
      txt.innerHTML = '<span class="rc-wait">This passage isn’t in the commentary yet.</span>';
    });
  }
  function close(){
    if (!el) return;
    el.classList.remove('open'); document.getElementById('rc-bd').classList.remove('open'); cur = null;
  }
  function go(){
    if (!cur) return;
    var r = cur; close();
    if (typeof window.sdgGoto === 'function') window.sdgGoto(r.id, r.ch, r.v);
    else location.href = 'index.html?go=' + r.id + '.' + r.ch + '.' + r.v;
  }
  document.addEventListener('click', function(ev){
    if (ev.defaultPrevented || ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target.closest && ev.target.closest('a.scripture-link');
    if (!a) return;
    var r = parse(a.href);
    if (!r) return;           // unparseable: let the ESV link work as before
    ev.preventDefault();
    open(r);
  }, true);
  return { open: open, close: close, isOpen: function(){ return !!(el && el.classList.contains('open')); } };
})();
