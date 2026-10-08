#!/usr/bin/env python3
"""Seed foto dari public/images/<Folder> ke tabel gallery (SQLite lokal).

Jalankan ulang kapan saja — item yang sudah ada (berdasarkan image_url)
akan dilewati. Tambah foto baru ke folder mana pun lalu run lagi.

Kebutuhan: python3 (sqlite3 stdlib). PIL opsional (untuk dimensi asli).
"""
import os
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES_DIR = os.path.join(ROOT, "public", "images")
DB_PATH = os.path.join(ROOT, "data", "nyong-noni.db")

SKIP_DIRS = {"Title holders"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}

CATEGORY_NAMES = {
    "PHOTOSHOOT": "Photoshoot",
    "PRANATAL": "Pra Natal",
    "SOSIALISASI": "Sosialisasi",
    "BAKTI SOSIAL": "Bakti Sosial",
    "BERTUGAS": "Bertugas",
    "PK2MB": "PK2MB",
}

FALLBACK_WIDTH, FALLBACK_HEIGHT = 1600, 1067


def category_for(folder: str) -> str:
    if folder in CATEGORY_NAMES:
        return CATEGORY_NAMES[folder]
    return folder.title()


def image_dims(path: str):
    try:
        from PIL import Image

        with Image.open(path) as im:
            return im.size
    except Exception:
        return FALLBACK_WIDTH, FALLBACK_HEIGHT


def main() -> int:
    if not os.path.exists(DB_PATH):
        print(f"DB tidak ditemukan: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    cur = conn.cursor()

    cols = {row[1] for row in cur.execute("PRAGMA table_info(gallery)")}
    if not cols:
        print("Tabel gallery tidak ada di DB.")
        return 1
    if "width" not in cols:
        cur.execute("ALTER TABLE gallery ADD COLUMN width INTEGER")
    if "height" not in cols:
        cur.execute("ALTER TABLE gallery ADD COLUMN height INTEGER")
    conn.commit()

    existing = {row[0] for row in cur.execute("SELECT image_url FROM gallery")}

    added, skipped, empties = 0, 0, 0
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    folders = sorted(
        d
        for d in os.listdir(IMAGES_DIR)
        if os.path.isdir(os.path.join(IMAGES_DIR, d)) and d not in SKIP_DIRS
    )

    for folder in folders:
        fpath = os.path.join(IMAGES_DIR, folder)
        files = sorted(
            f
            for f in os.listdir(fpath)
            if os.path.splitext(f)[1].lower() in IMAGE_EXTS
        )
        if not files:
            empties += 1
            print(f"  [kosong] {folder}")
            continue

        category = category_for(folder)
        for i, name in enumerate(files, start=1):
            rel = f"/images/{quote(folder)}/{quote(name)}"
            if rel in existing:
                skipped += 1
                continue
            w, h = image_dims(os.path.join(fpath, name))
            cur.execute(
                """INSERT INTO gallery (id, title, description, image_url, category, created_at, width, height)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    uuid.uuid4().hex,
                    f"{category} {i:02d}",
                    None,
                    rel,
                    category,
                    now,
                    w,
                    h,
                ),
            )
            added += 1
            print(f"  [+] {rel}  ({w}x{h}, {category})")

    conn.commit()
    total = cur.execute("SELECT count(*) FROM gallery").fetchone()[0]
    conn.close()
    print(f"\nSelesai: +{added} baru, {skipped} sudah ada, {empties} folder kosong. Total di galeri: {total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
