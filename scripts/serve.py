#!/usr/bin/env python3
"""LIGHT SHOW local server (art8): python http.server + Cache-Control: no-cache for .js/.mjs/.html/.css
(and directory index pages), so a ?v bump can never strand a phone on stale modules.
Usage: python3 scripts/serve.py [port=8765] [bind=127.0.0.1]   (serves the app root = parent of scripts/)"""
import os, sys, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NO_CACHE = ('.js', '.mjs', '.html', '.htm', '.css')

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        if path.endswith('/') or path.lower().endswith(NO_CACHE):
            self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

class Server(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    bind = sys.argv[2] if len(sys.argv) > 2 else '127.0.0.1'
    Server((bind, port), functools.partial(Handler, directory=ROOT)).serve_forever()
