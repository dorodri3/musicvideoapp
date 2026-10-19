#!/usr/bin/env python3
"""Cache-tag every relative module specifier in js/** (static, export-from, side-effect, dynamic import)
plus index.html script/link tags with ?v=<TAG>. Replaces any existing ?v=… on them. Usage: tag-imports.py art8"""
import re, sys, pathlib
TAG = sys.argv[1]
root = pathlib.Path(__file__).resolve().parent.parent
SPEC = r"""(?P<q>['"])(\.{1,2}/[^'"?]+?\.(?:js|mjs|json|css))(?:\?v=[\w.-]+)?(?P=q)"""
pats = [re.compile(r"(\bfrom\s*)" + SPEC), re.compile(r"(\bimport\s*)" + SPEC), re.compile(r"(\bimport\(\s*)" + SPEC)]
total = 0
for f in sorted((root / 'js').rglob('*.js')):
    s = f.read_text(); n0 = s
    for p in pats:
        s, k = p.subn(lambda m: f"{m.group(1)}{m.group(2)}{m.group(3)}?v={TAG}{m.group(2)}", s); total += k
    if s != n0: f.write_text(s)
h = root / 'index.html'; s = h.read_text()
s, k = re.subn(r"""((?:src|href)=")((?:js|css)/[^"?]+\.(?:js|css))(?:\?v=[\w.-]+)?(")""", lambda m: f"{m.group(1)}{m.group(2)}?v={TAG}{m.group(3)}", s); total += k
h.write_text(s)
print('specifiers tagged:', total)
