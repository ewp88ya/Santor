#!/usr/bin/env python3
"""Validate Santor's server-rendered public-site source without network access."""
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "deployment/public-site").resolve()
ROUTES = {
    "/": ROOT / "index.html",
    "/features/": ROOT / "features/index.html",
    "/pricing/": ROOT / "pricing/index.html",
    "/faq/": ROOT / "faq/index.html",
    "/contact/": ROOT / "contact/index.html",
    "/privacy/": ROOT / "privacy/index.html",
    "/terms/": ROOT / "terms/index.html",
    "/imprint/": ROOT / "imprint/index.html",
    "/refund/": ROOT / "refund/index.html",
}

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = False
        self.title_text = ""
        self.meta = {}
        self.canonical = None
        self.links = []
        self.in_title = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title": self.in_title = True
        if tag == "meta" and attrs.get("name") in {"description", "robots"}:
            self.meta[attrs["name"]] = attrs.get("content", "")
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href")
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
    def handle_data(self, data):
        if self.in_title: self.title_text += data

errors = []
parsed = {}
for route, file in ROUTES.items():
    if not file.is_file():
        errors.append(f"Missing route file: {file}")
        continue
    raw = file.read_text(encoding="utf-8")
    parser = PageParser(); parser.feed(raw)
    parsed[route] = (raw, parser)
    if not parser.title_text.strip(): errors.append(f"{route}: missing title")
    if len(parser.meta.get("description", "").strip()) < 40: errors.append(f"{route}: missing/short meta description")
    expected = "https://santor.app" + route
    if parser.canonical != expected: errors.append(f"{route}: canonical {parser.canonical!r} != {expected!r}")
    if re.search(r"/src/main\.tsx|Vite \+ React", raw, re.I): errors.append(f"{route}: Vite source shell leaked into public HTML")
    if "<h1" not in raw.lower(): errors.append(f"{route}: missing h1")
    print(f"{'CHECK' if route in parsed else 'MISS'} {route:<12} title={parser.title_text.strip()}")

for route, (_, parser) in parsed.items():
    for href in parser.links:
        if href.startswith("/") and not href.startswith("//"):
            clean = href.split("#", 1)[0].split("?", 1)[0]
            if clean in {"/login", "/register", "/dashboard", "/admin"}:
                continue
            if clean and clean != "/" and not clean.endswith("/"):
                clean += "/"
            if clean and clean not in ROUTES:
                errors.append(f"{route}: internal link has no public route: {href}")

try:
    sitemap = ET.parse(ROOT / "sitemap.xml").getroot()
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = [node.text for node in sitemap.findall("s:url/s:loc", ns)]
    for url in urls:
        route = url.removeprefix("https://santor.app")
        if route not in ROUTES: errors.append(f"Sitemap contains unknown route: {url}")
        if route in {"/privacy/", "/terms/", "/imprint/", "/refund/"}:
            errors.append(f"Sitemap must not advertise draft legal page: {url}")
    if "https://santor.app/" not in urls: errors.append("Sitemap missing homepage")
    if len(urls) != len(set(urls)): errors.append("Sitemap has duplicate URLs")
    print(f"CHECK sitemap    {len(urls)} public URLs")
except Exception as exc:
    errors.append(f"Invalid sitemap.xml: {exc}")

robots = (ROOT / "robots.txt").read_text(encoding="utf-8") if (ROOT / "robots.txt").exists() else ""
if "Sitemap: https://santor.app/sitemap.xml" not in robots: errors.append("robots.txt missing sitemap directive")
if "Disallow: /login" not in robots or "Disallow: /register" not in robots: errors.append("robots.txt should disallow auth routes")
if errors:
    print("FAIL public-site validation:", file=sys.stderr)
    for err in errors: print(f" - {err}", file=sys.stderr)
    raise SystemExit(1)
print("PASS public-site validation")
