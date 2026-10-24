#!/usr/bin/env python3
"""Build the search index the app's Search screen reads (search/).

Run from anywhere; publish.sh runs it before every commit, so the index always
matches the text.  Output is deterministic: an unchanged commentary gives
byte-identical files, so nothing new is committed.

  search/places.json   every searchable place: book, chapter, verse entry, field
  search/w-XX.json     words starting with XX -> the places that contain them
  search/r-PAGE.json   the plain text of each entry on a Reference page, for result snippets
  search/p-XX.json     word pairs, for "exact phrase" searches (see pair_keys)

A "place" is one block of commentary as the reader shows it: a verse entry's
commentary (or its study note), a section's overview / Theology / Then & Now,
or a chapter's Overview / Theology / Then & Now / For Reflection / article.  On the
Reference pages and Monthly Prayer, a place is one whole entry (a term, a figure,
a month's prayer); its "book" number counts on past the books, into REFS.

The word rules here must match sxWords() in index.html.
"""
import json, os, re, sys, unicodedata, html, glob, functools
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from js_literal import literal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'search')

STOP = set('''a an and are as at be but by for from had has have he her hers him his i if in into is it its
me my no not of on or our she so than that the their them then there these they this those to us was we were
what when which who whom will with you your yours'''.split())

# Fields, in the order the reader shows them.  Verse-entry fields first, then chapter fields.
FIELDS = ['c', 'n', 'so', 'st', 'se', 'o', 't', 'e', 'r', 'sec', 'ref', 'es']
VERSE_FIELDS = [('commentary', 'c'), ('note', 'n')]
SECTION_FIELDS = [('sectionOverview', 'so'), ('theology', 'st'), ('examples', 'se')]
CHAPTER_FIELDS = [('t', 'theology'), ('e', 'examples'), ('r', 'reflection'), ('es', 'essay')]

# The Reference pages and Monthly Prayer: page, its entries' list in the page's
# script, title, short name for the filter, and the id each entry's card has on
# the page (as the page's own script makes it).
by_name = lambda prefix: lambda e, i: prefix + re.sub(r'[^a-zA-Z]', '_', e['name'])
REFS = [
    ('dictionary', 'TERMS', 'Theological Dictionary', 'Dictionary', lambda e, i: 'term-' + e['anchor']),
    ('figures', 'FIGURES', 'Theological Figures', 'Figures', lambda e, i: e['anchor']),
    ('philosophers', 'PHILOSOPHERS', 'Philosophers & Christian Thought', 'Philosophers', by_name('phil-')),
    ('heresies', 'HERESIES', "Heresies & the Church's Response", 'Heresies', by_name('heresy-')),
    ('councils', 'COUNCILS', 'Church Councils', 'Councils', by_name('council-')),
    ('creeds', 'CREEDS', 'Creeds & Confessions', 'Creeds', by_name('creed-')),
    ('solas', 'SOLAS', 'The Five Solas', 'Solas', lambda e, i: e['id']),
    ('prayer', 'MONTHS', 'Monthly Prayer', 'Prayer', lambda e, i: 'card-%d' % i),
]
# Keys that hold ids and sorting codes rather than text the reader sees.
REF_SKIP = {'anchor', 'letter', 'era', 'id', 'yearSort', 'icon', 'see', 'sort', 'her'}


def plain(h):
    return html.unescape(re.sub(r'<[^>]+>', ' ', h or ''))


def fold(s):
    s = unicodedata.normalize('NFD', s)
    return ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()


def words(text):
    return {w for w in re.findall(r'[a-z]+', fold(text)) if len(w) > 1 and w not in STOP}


# Phrases.  Each pair of neighbouring words, with the small words between them
# ("fruit of the spirit", "faith alone"), is hashed into one of PAIR_BUCKETS
# buckets; a bucket lists the places holding any pair that lands in it.  A
# phrase's places are those in all its pairs' buckets that also hold all its
# words; Search then checks the text itself when it shows them.  Storing the
# pairs themselves would take some 45 MB; the buckets take a fraction of that.
# pair_keys() and fnv() must match sxPairKeys() and sxFnv() in index.html.
PAIR_BITS = 18
PAIR_BUCKETS = 1 << PAIR_BITS
PAIR_SHARD_BITS = 10          # 2^(18-10) = 256 files, search/p-00.json … p-ff.json
MAX_GAP = 3                   # more small words than this in a row break the chain


def pair_keys(text):
    keys, prev, gap = set(), None, []
    for t in re.findall(r'[a-z]+', fold(text)):
        if len(t) > 1 and t not in STOP:
            if prev:
                keys.add(' '.join([prev] + gap + [t]))
            prev, gap = t, []
        else:
            gap.append(t)
            if len(gap) > MAX_GAP:
                prev, gap = None, []
    return keys


@functools.lru_cache(maxsize=None)
def fnv(s):
    h = 0x811c9dc5
    for ch in s.encode('ascii'):
        h = ((h ^ ch) * 0x01000193) & 0xffffffff
    return h


def verses(ref):
    m = re.match(r'\s*(?:vv?\.\s*)?(\d+(?::\d+)?(?:\s*(?:–|-|&ndash;)\s*\d+(?::\d+)?)?)', ref or '')
    return m.group(1).replace('&ndash;', '–').replace('-', '–').replace(' ', '') if m else ''


def entry_text(v, key=None):
    if key in REF_SKIP:
        return ''
    if isinstance(v, dict):
        return ' '.join(entry_text(x, k) for k, x in v.items())
    if isinstance(v, list):
        return ' '.join(entry_text(x) for x in v)
    return plain(v) if isinstance(v, str) else str(v) if isinstance(v, int) and key == 'year' else ''


def book_ids():
    src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    block = src[src.index('const BOOKS = ['):]
    block = block[:block.index('];')]
    return re.findall(r"\{\s*id:'([a-z0-9-]+)'", block)


def main():
    books = book_ids()
    places, index = [], {}

    pairs = {}

    def add(b, k, i, f, label, text):
        text = text if f == 'ref' else plain(text)
        ws = words(text)
        if not ws:
            return
        p = len(places)
        places.append([b, k, i, FIELDS.index(f), label])
        for w in ws:
            index.setdefault(w, []).append(p)
        for h in {fnv(key) % PAIR_BUCKETS for key in pair_keys(text)}:
            pairs.setdefault(h, []).append(p)

    for b, bid in enumerate(books):
        path = os.path.join(ROOT, 'data', bid + '.json')
        if not os.path.exists(path):
            continue
        data = json.load(open(path, encoding='utf-8'))
        for k in sorted(data, key=lambda x: int(x) if x.isdigit() else 10**6):
            ch = data[k]
            if not isinstance(ch, dict):
                continue
            add(b, k, -1, 'o', '', ch.get('overview') or ch.get('intro') or '')
            for i, v in enumerate(ch.get('verseByVerse') or []):
                lab = verses(v.get('ref')) or re.sub(r'\s+', ' ', plain(v.get('ref')))[:60].strip()
                fields = SECTION_FIELDS if v.get('sectionBreak') else VERSE_FIELDS
                for key, f in fields:
                    if isinstance(v.get(key), str):
                        add(b, k, i, f, lab, v[key])
            for i, s in enumerate(ch.get('sections') or []):
                add(b, k, i, 'sec', verses(s.get('ref')) or plain(s.get('title'))[:60], s.get('commentary'))
            for f, key in CHAPTER_FIELDS:
                if isinstance(ch.get(key), str):
                    add(b, k, -1, f, '', ch[key])

    os.makedirs(OUT, exist_ok=True)
    keep = set()
    for r, (page, var, title, short, card) in enumerate(REFS):
        entries = literal(open(os.path.join(ROOT, page + '.html'), encoding='utf-8').read(), var)
        texts = []
        for i, e in enumerate(entries):
            t = re.sub(r'\s+', ' ', entry_text(e)).strip()
            texts.append(t)
            add(len(books) + r, card(e, i), i, 'ref', re.sub(r'\s+', ' ', plain(e.get('name') or e['latin'])).strip(), t)
        name = 'r-' + page + '.json'
        keep.add(name)
        write(os.path.join(OUT, name), texts)

    pshards = {}
    for h in sorted(pairs):
        pshards.setdefault('%02x' % (h >> PAIR_SHARD_BITS), {})[base36(h & ((1 << PAIR_SHARD_BITS) - 1))] = deltas(pairs[h])
    for key, d in pshards.items():
        name = 'p-' + key + '.json'
        keep.add(name)
        write(os.path.join(OUT, name), d)

    shards = {}
    for w in sorted(index):
        shards.setdefault(w[:2], {})[w] = deltas(index[w])

    for key, d in shards.items():
        name = 'w-' + key + '.json'
        keep.add(name)
        write(os.path.join(OUT, name), d)
    write(os.path.join(OUT, 'places.json'),
          {'v': 1, 'pairs': {'bits': PAIR_BITS, 'shardBits': PAIR_SHARD_BITS, 'gap': MAX_GAP, 'shards': sorted(pshards)}, 'books': books, 'refs': [[p, t, sh] for p, _, t, sh, _ in REFS], 'fields': FIELDS, 'shards': sorted(shards), 'places': places})
    keep.add('places.json')
    for old in os.listdir(OUT):
        if old not in keep:
            os.remove(os.path.join(OUT, old))
    print('search index: %d places, %d words, %d shards' % (len(places), len(index), len(shards)))


def deltas(ids):
    """Place numbers, in order, as base-36 gaps: "3,1a,2" is places 3, 49, 51."""
    prev, out = 0, []
    for p in ids:
        out.append(base36(p - prev)); prev = p
    return ','.join(out)


def base36(n):
    s = ''
    while True:
        n, r = divmod(n, 36)
        s = '0123456789abcdefghijklmnopqrstuvwxyz'[r] + s
        if not n:
            return s


def write(path, obj):
    new = json.dumps(obj, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    try:
        if open(path, encoding='utf-8').read() == new:
            return
    except FileNotFoundError:
        pass
    open(path, 'w', encoding='utf-8').write(new)


if __name__ == '__main__':
    sys.exit(main())
