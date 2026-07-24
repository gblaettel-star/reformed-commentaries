// scripture-links.js — shared Scripture -> ESV.org linkifier.
// Extracted verbatim from the commentary (index.html) so the study pages
// (dictionary, creeds, councils, figures, heresies, philosophers, prayer,
// solas) link references exactly the way the commentary does.
//
// Usage:  linkifyScripture(rootElement, curBook, curChapter)
//   curBook/curChapter may be null on non-Bible pages; full refs such as
//   "Eph 1:8-9" resolve on their own.
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
