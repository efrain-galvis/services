#!/usr/bin/env python3
"""Cheap, dependency-free sanity checks for this static site.

This repo is 24 hand-written files with no build step and no dependencies
on purpose (see README.md). The realistic failure mode for a site like
this is a typo'd or renamed local path: a stylesheet, script, font, or
in-page anchor that quietly 404s for visitors. This script catches that
class of bug using only the Python standard library -- no third-party
action, no npm, no network access.

Checks performed, for every *.html file at the repository root:
  1. The file parses as HTML without the parser raising.
  2. Every local href/src (link/script/img/a) resolves to a real file
     relative to the HTML file's own directory.
  3. Every in-page anchor link (href="#something") resolves to an
     element in the same document carrying that id.
  4. Every local stylesheet reachable from the HTML is itself scanned
     for CSS url(...) references (fonts, images) and those are checked
     for existence too.

Deliberately NOT checked (see CI report for why): external links,
HTML5 spec conformance/accessibility, favicon rendering, image content.
"""

from __future__ import annotations

import pathlib
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urlsplit

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent

# Attributes that can carry a local, followable reference, per tag.
REFERENCE_ATTRS = {
    "link": "href",
    "script": "src",
    "img": "src",
    "a": "href",
}

CSS_URL_RE = re.compile(r"""url\(\s*(['"]?)([^'")]+)\1\s*\)""")


class PageIndex(HTMLParser):
    """Collects every id= in the document and every followable reference."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.references: list[tuple[str, str]] = []  # (tag, raw attr value)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {name: value for name, value in attrs if value is not None}
        if "id" in attr_map:
            self.ids.add(attr_map["id"])
        wanted = REFERENCE_ATTRS.get(tag)
        if wanted and wanted in attr_map:
            self.references.append((tag, attr_map[wanted]))


def is_local_reference(value: str) -> bool:
    """True for a reference this script should resolve on disk."""
    if not value:
        return False
    if value.startswith("#"):
        return False  # handled separately, as an anchor check
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return False  # http(s)://, mailto:, tel:, //cdn..., data:, etc.
    return True


def strip_fragment_and_query(value: str) -> str:
    parsed = urlsplit(value)
    return parsed.path


def check_css_urls(css_path: pathlib.Path, errors: list[str]) -> None:
    try:
        text = css_path.read_text(encoding="utf-8")
    except OSError as exc:
        errors.append(f"{css_path}: could not read file ({exc})")
        return
    for raw_url in CSS_URL_RE.findall(text):
        url = raw_url[1] if isinstance(raw_url, tuple) else raw_url
        if not is_local_reference(url):
            continue
        target = (css_path.parent / strip_fragment_and_query(url)).resolve()
        if not target.is_file():
            errors.append(f"{css_path}: url({url}) -> missing file {target}")


def check_html_file(html_path: pathlib.Path, errors: list[str]) -> None:
    text = html_path.read_text(encoding="utf-8")

    parser = PageIndex()
    try:
        parser.feed(text)
        parser.close()
    except Exception as exc:  # pragma: no cover - defensive
        errors.append(f"{html_path}: does not parse as HTML ({exc})")
        return

    for tag, value in parser.references:
        if value.startswith("#"):
            continue
        if not is_local_reference(value):
            continue
        target_rel = strip_fragment_and_query(value)
        if not target_rel:
            continue
        target = (html_path.parent / target_rel).resolve()
        if not target.is_file():
            errors.append(f"{html_path}: <{tag}> references missing file '{value}'")
            continue
        if target.suffix == ".css":
            check_css_urls(target, errors)

    for tag, value in parser.references:
        if tag == "a" and value.startswith("#") and value != "#":
            anchor = value[1:]
            if anchor not in parser.ids:
                errors.append(
                    f"{html_path}: <a href=\"{value}\"> has no matching id=\"{anchor}\" in the page"
                )


def main() -> int:
    html_files = sorted(REPO_ROOT.glob("*.html"))
    if not html_files:
        print("No *.html files found at repo root -- nothing to check.")
        return 0

    errors: list[str] = []
    for html_file in html_files:
        check_html_file(html_file, errors)

    if errors:
        print(f"Found {len(errors)} problem(s):\n")
        for err in errors:
            print(f"  - {err}")
        return 1

    print(f"OK: checked {len(html_files)} HTML file(s), all local references resolve.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
