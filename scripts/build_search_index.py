#!/usr/bin/env python3
"""Build the search index the app's Search screen reads (search/).

Run from anywhere; publish.sh runs it before every commit, so the index always
matches the text.  Output is deterministic: an unchanged commentary gives
byte-identical files, so nothing new is committed.

  search/places.json   every searchable place: book, chapter, verse entry, field
  search/w-XX.json     words starting with XX -> the places that contain them

A "place" is one block of commentary as the reader shows it: a verse entry's
commentary (or its study note), a section's overview / Theology / Then & Now,
or a chapter's Overview / Theology / Then & Now / For Reflection.

The word rules here must match sxWords() in index.html.
"""
import json, os, re, sys, unicodedata, html, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'search')

STOP = set('''a an and are as at be but by for from had has have he her hers him his i if in into is it its
me my no not of on or our she so than that the their them then there these they this those to us was we were
what when which who whom will with you your yours'''.split())

# Fields, in the order the reader shows them.  Verse-entry fields first, then chapter fields.
FIELDS = ['c', 'n', 'so', 'st', 'se', 'o', 't', 'e', 'r', 'sec']
VERSE_FIELDS = [('commentary', 'c'), ('note', 'n')]
SECTION_FIELDS = [('sectionOverview', 'so'), ('theology', 'st'), ('examples', 'se')]
CHAPTER_FIELDS = [('t', 'theology'), ('e', 'examples'), ('r', 'reflection')]


def plain(h):
    return html.unescape(re.sub(r'<[^>]+>', ' ', h or ''))


def fold(s):
    s = unicodedata.normalize('NFD', s)
    return ''.join(ch for ch in s if not unicodedata.combining(ch)).lower()


def words(text):
    return {w for w in re.findall(r'[a-z]+', fold(text)) if len(w) > 1 and w not in STOP}


def verses(ref):
    m = re.match(r'\s*(?:vv?\.\s*)?(\d+(?::\d+)?(?:\s*(?:–|-|&ndash;)\s*\d+(?::\d+)?)?)', ref or '')
    return m.group(1).replace('&ndash;', '–').replace('-', '–').replace(' ', '') if m else ''


def book_ids():
    src = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    block = src[src.index('const BOOKS = ['):]
    block = block[:block.index('];')]
    return re.findall(r"\{\s*id:'([a-z0-9-]+)'", block)


def main():
    books = book_ids()
    places, index = [], {}

    def add(b, k, i, f, label, text):
        ws = words(plain(text))
        if not ws:
            return
        p = len(places)
        places.append([b, k, i, FIELDS.index(f), label])
        for w in ws:
            index.setdefault(w, []).append(p)

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
    shards = {}
    for w in sorted(index):
        ids = index[w]
        prev, deltas = 0, []
        for p in ids:
            deltas.append(base36(p - prev)); prev = p
        shards.setdefault(w[:2], {})[w] = ','.join(deltas)

    keep = set()
    for key, d in shards.items():
        name = 'w-' + key + '.json'
        keep.add(name)
        write(os.path.join(OUT, name), d)
    write(os.path.join(OUT, 'places.json'),
          {'v': 1, 'books': books, 'fields': FIELDS, 'shards': sorted(shards), 'places': places})
    keep.add('places.json')
    for old in os.listdir(OUT):
        if old not in keep:
            os.remove(os.path.join(OUT, old))
    print('search index: %d places, %d words, %d shards' % (len(places), len(index), len(shards)))


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
