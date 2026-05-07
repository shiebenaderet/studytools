#!/usr/bin/env python3
"""
Download remote `imageUrl` references in a unit's config.json to local files,
then rewrite the config to point at the local paths.

Why this exists: hotlinking Wikimedia thumbnails works but adds runtime
dependency on Wikimedia's servers, slows page load, and breaks if a file is
ever renamed upstream. This script localizes images once at author time so
the deployed site is self-contained.

Usage:
    python3 scripts/download-vocab-images.py civil-war
    python3 scripts/download-vocab-images.py civil-war --dry-run
    python3 scripts/download-vocab-images.py civil-war --redownload

Files are saved to:
    study-tools/units/{unit}/images/portraits/{slug}.{ext}  (people)
    study-tools/units/{unit}/images/vocab/{slug}.{ext}      (everything else)

The classifier looks at the term: if it has a likely-person shape (at least
one capitalized word, no battle/event keywords), it goes to portraits/.
That's heuristic — override with `--all-vocab` to put everything in vocab/.
"""
import argparse
import json
import os
import re
import sys
import urllib.request
import urllib.parse
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
USER_AGENT = "studytools-image-downloader/1.0 (educational; shierone@gmail.com)"

PERSON_KEYWORDS_NEGATIVE = {
    'battle', 'siege', 'rebellion', 'raid', 'debates', 'address',
    'compromise', 'proviso', 'law', 'act', 'amendment', 'plan',
    'proclamation', 'cabin', 'gin', 'ball', 'line', 'election',
    'kansas', 'sumter', 'antietam', 'vicksburg', 'gettysburg',
    'appomattox', 'underground', '54th', 'usct', 'copperheads',
    'reconstruction', 'sectionalism', 'slavery', 'abolitionism',
    'plantation', 'state', 'secession', 'sovereignty', 'war',
}


def slugify(term: str) -> str:
    """Convert a vocab term to a filesystem-safe slug."""
    s = term.lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s


def is_person(term: str) -> bool:
    """Rough classifier. Person if first word starts capital AND no event keywords."""
    lower = term.lower()
    if any(kw in lower for kw in PERSON_KEYWORDS_NEGATIVE):
        return False
    words = term.split()
    return bool(words) and words[0][0].isupper()


def extract_extension(url: str) -> str:
    """Pull the file extension from a Wikimedia URL.
    Handles three URL shapes:
      - /thumb/h/hh/Foo.jpg/400px-Foo.jpg  → last segment has the ext
      - Special:FilePath/Foo.jpg            → filename is in the path
      - /commons/h/hh/Foo.jpg               → filename is the last segment
    """
    path = urllib.parse.urlparse(url).path
    # Special:FilePath/{filename}
    m = re.search(r"Special:FilePath/([^/?#]+)", path)
    if m:
        last = urllib.parse.unquote(m.group(1))
    else:
        last = path.rsplit("/", 1)[-1]
        last = re.sub(r"^\d+px-", "", last)
    if "." in last:
        ext = last.rsplit(".", 1)[1].lower()
        # SVGs are served as PNG when fetched via thumb/FilePath with width
        if ext == "svg":
            return "png"
        return ext
    return "jpg"


def download(url: str, dest: Path, dry_run: bool = False) -> bool:
    """Download URL to dest. Returns True if file is now present."""
    if dest.exists():
        return True
    if dry_run:
        print(f"  [dry-run] would download -> {dest.relative_to(REPO_ROOT)}")
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp, open(dest, "wb") as f:
            f.write(resp.read())
        return True
    except Exception as e:
        print(f"  ERROR downloading {url}: {e}", file=sys.stderr)
        return False


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("unit", help="Unit id, e.g. 'civil-war'")
    ap.add_argument("--dry-run", action="store_true", help="Show what would download without writing")
    ap.add_argument("--redownload", action="store_true", help="Re-download even if local file exists")
    ap.add_argument("--all-vocab", action="store_true", help="Put every image in vocab/ (skip portraits/ classifier)")
    args = ap.parse_args()

    unit_dir = REPO_ROOT / "study-tools" / "units" / args.unit
    config_path = unit_dir / "config.json"
    if not config_path.exists():
        sys.exit(f"No config at {config_path}")

    with open(config_path) as f:
        config = json.load(f)

    vocab = config.get("vocabulary", [])
    remote_count = sum(1 for v in vocab if v.get("imageUrl", "").startswith("http"))
    print(f"{args.unit}: {remote_count} remote imageUrl(s) of {len(vocab)} terms")

    downloaded = 0
    skipped = 0
    rewritten = 0

    for v in vocab:
        url = v.get("imageUrl", "")
        if not url.startswith("http"):
            continue

        slug = slugify(v["term"])
        ext = extract_extension(url)
        bucket = "portraits" if (not args.all_vocab and is_person(v["term"])) else "vocab"
        dest = unit_dir / "images" / bucket / f"{slug}.{ext}"

        if args.redownload and dest.exists():
            dest.unlink()

        local_path = f"images/{bucket}/{slug}.{ext}"
        print(f"- {v['term']:35s} -> {local_path}")

        ok = download(url, dest, dry_run=args.dry_run)
        if ok and not args.dry_run:
            downloaded += 1
            v["imageUrl"] = local_path
            rewritten += 1
        elif not ok:
            skipped += 1

    if not args.dry_run:
        with open(config_path, "w") as f:
            json.dump(config, f, indent=4, ensure_ascii=False)
            f.write("\n")

    print(f"\nDone. Rewrote {rewritten} imageUrl(s) to local paths. {skipped} failed.")


if __name__ == "__main__":
    main()
