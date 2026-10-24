"""Read a JavaScript array or object literal out of a page's script, as Python data.

The Reference pages keep their entries in literals such as `const TERMS = [ ... ];`
written by hand: unquoted keys, '…', "…" and `…` strings, trailing commas,
comments, and strings joined with +.  This reads exactly that much JavaScript.
"""
import re


class _Reader:
    def __init__(self, src, pos):
        self.s, self.i = src, pos

    def fail(self, msg):
        line = self.s.count('\n', 0, self.i) + 1
        raise ValueError('%s at line %d: %r' % (msg, line, self.s[self.i:self.i + 40]))

    def space(self):
        s = self.s
        while self.i < len(s):
            c = s[self.i]
            if c in ' \t\r\n':
                self.i += 1
            elif s.startswith('//', self.i):
                self.i = s.find('\n', self.i) if '\n' in s[self.i:] else len(s)
            elif s.startswith('/*', self.i):
                self.i = s.index('*/', self.i) + 2
            else:
                break

    def peek(self):
        self.space()
        return self.s[self.i] if self.i < len(self.s) else ''

    def value(self):
        v = self.single()
        # 'a' + 'b' + `c`
        while self.peek() == '+':
            self.i += 1
            v = v + self.single()
        return v

    def single(self):
        c = self.peek()
        if c == '[':
            self.i += 1
            out = []
            while self.peek() != ']':
                out.append(self.value())
                if self.peek() == ',':
                    self.i += 1
            self.i += 1
            return out
        if c == '{':
            self.i += 1
            out = {}
            while self.peek() != '}':
                if self.peek() in '\'"':
                    key = self.string()
                else:
                    m = re.compile(r'[A-Za-z_$][\w$]*').match(self.s, self.i)
                    if not m:
                        self.fail('expected a key')
                    key, self.i = m.group(0), m.end()
                if self.peek() != ':':
                    self.fail('expected :')
                self.i += 1
                out[key] = self.value()
                if self.peek() == ',':
                    self.i += 1
            self.i += 1
            return out
        if c in '\'"`':
            return self.string()
        m = re.compile(r'-?\d+(\.\d+)?|true|false|null').match(self.s, self.i)
        if not m:
            self.fail('unexpected value')
        self.i = m.end()
        t = m.group(0)
        return {'true': True, 'false': False, 'null': None}.get(t, float(t) if '.' in t else int(t) if t[0] in '-0123456789' else t)

    def string(self):
        q, s = self.s[self.i], self.s
        self.i += 1
        out = []
        while True:
            c = s[self.i]
            if c == q:
                self.i += 1
                return ''.join(out)
            if q == '`' and s.startswith('${', self.i):
                self.fail('template expressions are not supported')
            if c == '\\':
                n = s[self.i + 1]
                if n == 'u':
                    out.append(chr(int(s[self.i + 2:self.i + 6], 16)))
                    self.i += 6
                    continue
                if n == '\n':
                    self.i += 2
                    continue
                out.append({'n': '\n', 't': '\t', 'r': '', 'b': '', 'f': '', 'v': '', '0': ''}.get(n, n))
                self.i += 2
                continue
            out.append(c)
            self.i += 1


def literal(src, name):
    """The value of `const|let|var <name> = ...` in src."""
    m = re.search(r'\b(?:const|let|var)\s+' + re.escape(name) + r'\s*=\s*', src)
    if not m:
        raise ValueError('no %s in the page' % name)
    return _Reader(src, m.end()).value()
