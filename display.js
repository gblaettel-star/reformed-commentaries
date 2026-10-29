/* Display settings for easier reading: typeface, heavier text and colours.
   Loaded in the <head> of every page, before anything is drawn, so a chosen
   colour scheme never flashes the default first. Choices are kept in
   localStorage and shared by all pages; the controls live in the
   Text & Display panel on the home screen (index.html). */
(function () {
  var root = document.documentElement;
  var THEMES = { night: '#0b1524', light: '#fbf7ef', contrast: '#000000' };
  var FONT_URL = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap';

  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }

  // Atkinson Hyperlegible was designed by the Braille Institute for readers
  // with low vision; it is only fetched once someone chooses it.
  function loadFont() {
    if (document.getElementById('display-font')) return;
    var l = document.createElement('link');
    l.id = 'display-font'; l.rel = 'stylesheet'; l.href = FONT_URL;
    document.head.appendChild(l);
  }

  function themeColor(t) {
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', THEMES[t] || THEMES.night);
  }

  function apply(theme, font, bold) {
    if (theme && theme !== 'night' && THEMES[theme]) root.setAttribute('data-theme', theme);
    else root.removeAttribute('data-theme');
    if (font === 'clear') { root.setAttribute('data-font', 'clear'); loadFont(); }
    else root.removeAttribute('data-font');
    if (bold) root.setAttribute('data-bold', ''); else root.removeAttribute('data-bold');
    themeColor(theme);
  }

  // Every element is forced to the scheme's colours, because many older rules
  // in the pages use fixed colours rather than the shared variables. The dim
  // overlays behind panels (ids ending in "backdrop", and #rc-bd) are left
  // see-through.
  function scheme(t, bg, fg, accent, line, soft) {
    var h = 'html[data-theme=' + t + ']';
    var all = h + ' body *:not([id$=backdrop]):not([id=rc-bd])';
    return h + '{--ink:' + bg + ';--ink-2:' + bg + ';--ink-3:' + bg + ';--parch:' + fg + ';--parch-2:' + fg
      + ';--muted:' + fg + ';--faint:' + fg + ';--gold:' + accent + ';--gold-soft:' + accent
      + ';--hair:' + line + ';--hair-soft:' + soft + ';background:' + bg + '!important}'
      + h + ' body{background:' + bg + '!important;color:' + fg + '!important}'
      + all + '{background-color:' + bg + '!important;background-image:none!important;color:' + fg + '!important;'
      + 'border-color:' + soft + '!important;box-shadow:none!important;text-shadow:none!important;'
      + '-webkit-backdrop-filter:none!important;backdrop-filter:none!important}'
      + h + ' body :is(a,button,h1,h2,h3,h4,strong,b,summary,label,.vbv-ref,.section-hd-ref,.study-lbl,.gl-name,.pk-title,.vjump-title,.hc-arrow,.section-chevron,.row-name,.term-name,.fig-name)'
      + ':not([id$=backdrop]){color:' + accent + '!important}'
      + h + ' body :is(button,input,select,.verse-chip,.section-chip,.gl-chip,.pk-n,.pk-b,.pk-rc,.vjump-num,.home-card):not([id$=backdrop]):not([id=rc-bd]){border-color:' + line + '!important}'
      + h + ' body :is(.active,.on,[aria-pressed=true],[aria-selected=true],[aria-current]){outline:2px solid ' + accent + '!important;outline-offset:1px}'
      + h + ' #dl-bar>div{background-color:' + accent + '!important}'
      + h + ' input[type=range]{accent-color:' + accent + '}'
      + h + ' ::placeholder{color:' + fg + '!important;opacity:.75}'
      + h + ' body *:focus-visible{outline:3px solid ' + accent + '!important;outline-offset:2px}'
      + h + ' [id$=backdrop],' + h + ' #rc-bd{background:rgba(0,0,0,.55)!important}';
  }

  var css =
    // Clear typeface: one sans-serif face everywhere, no long italic passages,
    // ordinary (lining) figures, a little more space between lines.
    'html[data-font=clear]{--text:"Atkinson Hyperlegible",Verdana,"Segoe UI",system-ui,sans-serif;--display:"Atkinson Hyperlegible",Verdana,"Segoe UI",system-ui,sans-serif}'
    + 'html[data-font=clear] body,html[data-font=clear] body *{font-family:"Atkinson Hyperlegible",Verdana,"Segoe UI",system-ui,sans-serif!important;font-feature-settings:normal!important;letter-spacing:normal!important}'
    + 'html[data-font=clear] body *:not(em):not(i):not(cite){font-style:normal!important}'
    + 'html[data-font=clear] main p,html[data-font=clear] main li{line-height:1.75!important}'
    // Heavier text: thin strokes thickened throughout.
    + 'html[data-bold] body,html[data-bold] body *{font-weight:600!important;-webkit-font-smoothing:auto!important}'
    + 'html[data-bold] body :is(strong,b,h1,h2,h3,h4){font-weight:800!important}'
    // Light: near-black on warm white, dark amber accents (7:1 contrast).
    + scheme('light', '#fbf7ef', '#161616', '#6b3f00', '#8a7350', '#c9bda6')
    // High contrast: white on black, yellow accents.
    + scheme('contrast', '#000', '#fff', '#ffe14d', '#ffe14d', '#9a9a9a');

  var st = document.createElement('style');
  st.id = 'display-css';
  st.textContent = css;
  document.head.appendChild(st);

  apply(load('display-theme'), load('display-font'), load('display-bold') === '1');

  window.Display = {
    get: function () {
      return {
        theme: root.getAttribute('data-theme') || 'night',
        font: root.getAttribute('data-font') || 'classic',
        bold: root.hasAttribute('data-bold')
      };
    },
    set: function (o) {
      var c = this.get();
      if (o.theme !== undefined) c.theme = o.theme;
      if (o.font !== undefined) c.font = o.font;
      if (o.bold !== undefined) c.bold = !!o.bold;
      save('display-theme', c.theme === 'night' ? null : c.theme);
      save('display-font', c.font === 'clear' ? 'clear' : null);
      save('display-bold', c.bold ? '1' : null);
      apply(c.theme, c.font, c.bold);
    }
  };

  // Another open page changed the settings: follow along.
  window.addEventListener('storage', function (e) {
    if (/^display-/.test(e.key || '')) apply(load('display-theme'), load('display-font'), load('display-bold') === '1');
  });
})();
