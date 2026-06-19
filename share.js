/* Copy-to-share for the reference pages (dictionary, creeds, councils, figures,
   heresies, philosophers, prayer, solas). Drop a faint clipboard icon into the
   corner of every entry card; tapping copies clean plain text to the clipboard.

   Each page configures it via data attributes on the <script> tag, e.g.:
     <script src="share.js" data-card-selector=".term-card"
             data-scripture-selector=".verse-text"></script>
   - data-card-selector       (required) the per-entry card element
   - data-scripture-selector  (optional) if a card contains a match, the official
                              ESV citation is appended to the copied text. */
(function () {
  var cfg = (document.currentScript && document.currentScript.dataset) || {};
  var CARD = cfg.cardSelector;
  if (!CARD) return;
  var SCRIPTURE = cfg.scriptureSelector || '';

  var FOOTER = '— Reformed Commentaries · Soli Deo Gloria';
  var ESV = 'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved. The ESV text may not be quoted in any publication made available to the public by a Creative Commons license. The ESV may not be translated in whole or in part into any other language.';
  var COPY_ICON  = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  var CHECK_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  var css = '.copy-btn{position:absolute;top:.55rem;right:.55rem;background:none;border:none;margin:0;padding:.3rem;cursor:pointer;color:#c9a84c;opacity:.4;line-height:0;border-radius:5px;z-index:5;-webkit-tap-highlight-color:transparent;transition:opacity .15s,background .15s,color .15s}'
    + '.copy-btn:hover{opacity:1;background:rgba(201,168,76,.14)}'
    + '.copy-btn:active{opacity:1}'
    + '.copy-btn.copied{opacity:1;color:#7bbf6a;background:rgba(123,191,106,.14)}'
    + '.copy-btn svg{display:block}'
    + '.copy-host{position:relative}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function htmlToText(html) {
    if (!html) return '';
    var s = html
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6])\s*>/gi, '\n\n')
      .replace(/<[^>]+>/g, '');
    var t = document.createElement('textarea'); t.innerHTML = s; s = t.value;
    return s.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n')
      .replace(/\n([•▸▶‣∙▪◦·])[ \t]*\n+[ \t]*/g, '\n• ')
      .replace(/\n{3,}/g, '\n\n').trim();
  }

  function addButtons() {
    document.querySelectorAll(CARD).forEach(function (card) {
      if (card.querySelector(':scope > .copy-btn')) return;
      card.classList.add('copy-host');
      var b = document.createElement('button');
      b.className = 'copy-btn'; b.type = 'button';
      b.setAttribute('aria-label', 'Copy to share'); b.title = 'Copy to share';
      b.innerHTML = COPY_ICON;
      card.appendChild(b);
    });
  }

  function flashCopied(btn) {
    if (btn._orig === undefined) btn._orig = btn.innerHTML;
    btn.innerHTML = CHECK_ICON; btn.classList.add('copied');
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { btn.innerHTML = btn._orig; btn.classList.remove('copied'); }, 1500);
  }

  function copyText(text, btn) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flashCopied(btn); }).catch(function () { fallback(); flashCopied(btn); });
    } else {
      fallback(); flashCopied(btn);
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.copy-btn');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    var card = btn.closest(CARD);
    if (!card) return;
    var hasScripture = SCRIPTURE ? !!card.querySelector(SCRIPTURE) : false;
    var clone = card.cloneNode(true);
    clone.querySelectorAll('.copy-btn').forEach(function (x) { x.remove(); });
    var text = htmlToText(clone.innerHTML) + '\n\n' + FOOTER;
    if (hasScripture) text += '\n\n' + ESV;
    copyText(text.replace(/\n{3,}/g, '\n\n').trim(), btn);
  });

  // Cards are re-rendered on search/filter, so re-inject after any DOM change.
  var pending = false;
  var observer = new MutationObserver(function () {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; addButtons(); }, 60);
  });

  function start() {
    addButtons();
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
