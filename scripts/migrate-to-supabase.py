#!/usr/bin/env python3
"""
Migrasi data dari SQLite lokal (data/nyong-noni.db) ke Supabase via REST API.

Prasyarat:
  1. supabase/setup.sql sudah dijalankan di Dashboard > SQL Editor
  2. .env.local sudah diisi:
       NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
       NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
       SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
  3. Akun admin sudah dibuat di Dashboard > Authentication > Users
     (lalu jalankan dengan --admin-email email-itu)

Penggunaan:
  python3 scripts/migrate-to-supabase.py --dry-run            # cek saja
  python3 scripts/migrate-to-supabase.py                       # migrasi data
  python3 scripts/migrate-to-supabase.py --admin-email a@b.com # + role admin
  python3 scripts/migrate-to-supabase.py --upload-photos       # foto ke Storage

Idempoten: baris yang sudah ada (berdasarkan key unik per tabel) dilewati.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import pathlib
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
DB_PATH = ROOT / 'data' / 'nyong-noni.db'
ENV_PATH = ROOT / '.env.local'
PUBLIC_DIR = ROOT / 'public'

BUCKETS = ['gallery', 'titleholders', 'finalists']


def load_env(path: pathlib.Path) -> dict:
    env = {}
    if not path.exists():
        sys.exit(f'ERROR: {path} tidak ditemukan.')
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


class Supabase:
    def __init__(self, url: str, key: str, dry_run: bool):
        self.url = url.rstrip('/')
        self.key = key
        self.dry_run = dry_run

    def request(self, method: str, path: str, payload=None, params: dict | None = None,
                full_url: str | None = None, allow_error: bool = False):
        url = full_url or f'{self.url}{path}'
        if params:
            url += '?' + urllib.parse.urlencode(params)
        data = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(url, data=data, method=method, headers={
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        })
        try:
            with urllib.request.urlopen(req) as res:
                body = res.read().decode()
                return json.loads(body) if body else None
        except urllib.error.HTTPError as e:
            detail = e.read().decode()
            if allow_error:
                return {'__error__': e.code, 'detail': detail}
            hint = ''
            if e.code in (404, 400) and ('does not exist' in detail or 'schema cache' in detail):
                hint = '\nHINT: tabel belum ada — jalankan supabase/setup.sql dulu di SQL Editor.'
            elif e.code in (401, 403):
                hint = '\nHINT: key di .env.local salah/tidak berlaku.'
            sys.exit(f'ERROR {method} {url}\n{detail}{hint}')

    def mutate(self, method: str, path: str, payload=None, params: dict | None = None):
        if self.dry_run:
            shown = payload
            if isinstance(shown, list) and len(shown) > 2:
                shown = [shown[0], shown[1], f'... +{len(shown) - 2} lagi']
            print(f'  [dry-run] {method} {path} :: {json.dumps(shown, ensure_ascii=False)[:180]}')
            return None
        return self.request(method, path, payload, params)


def upload_file(sb: Supabase, bucket: str, rel_path: str, data: bytes, content_type: str) -> str:
    path = f'{bucket}/{urllib.parse.quote(rel_path, safe="/")}'
    url = f'{sb.url}/storage/v1/object/{path}'
    if sb.dry_run:
        print(f'  [dry-run] UPLOAD {path} ({len(data)} bytes, {content_type})')
        return f'{sb.url}/storage/v1/object/public/{path}'
    req = urllib.request.Request(url, data=data, method='POST', headers={
        'apikey': sb.key,
        'Authorization': f'Bearer {sb.key}',
        'Content-Type': content_type,
        'x-upsert': 'true',
    })
    try:
        with urllib.request.urlopen(req) as res:
            res.read()
    except urllib.error.HTTPError as e:
        print(f'  WARN: gagal upload {path}: {e.read().decode()[:200]}')
        return ''
    return f'{sb.url}/storage/v1/object/public/{path}'


def local_file_for(url: str) -> pathlib.Path | None:
    if not url or not url.startswith('/images/'):
        return None
    return PUBLIC_DIR / urllib.parse.unquote(url).lstrip('/')


def image_url_for_upload(sb: Supabase, bucket: str, image_url: str) -> str:
    """Upload file lokal ke Storage, kembalikan URL publik. Fallback: URL asli."""
    local = local_file_for(image_url)
    if local is None or not local.exists():
        print(f'  WARN: file tidak ditemukan untuk {image_url} — URL asli dipakai')
        return image_url
    content_type = mimetypes.guess_type(local.name)[0] or 'application/octet-stream'
    ext = local.suffix
    digest = hashlib.sha1(str(local.relative_to(PUBLIC_DIR)).encode()).hexdigest()[:20]
    remote = f'seed/{digest}{ext}'
    public = upload_file(sb, bucket, remote, local.read_bytes(), content_type)
    return public or image_url


def main():
    parser = argparse.ArgumentParser(description='Migrasi SQLite lokal -> Supabase')
    parser.add_argument('--admin-email', help='Email akun di Authentication yang diberi role admin')
    parser.add_argument('--upload-photos', action='store_true',
                        help='Upload foto galeri/titleholders ke Storage & pakai URL Supabase '
                             '(default: tetap pakai /images/... dari repo)')
    parser.add_argument('--dry-run', action='store_true', help='Tampilkan aksi tanpa menulis')
    args = parser.parse_args()

    env = load_env(ENV_PATH)
    url = env.get('NEXT_PUBLIC_SUPABASE_URL', '')
    key = env.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not url or 'placeholder' in url or not key or 'placeholder' in key:
        sys.exit('ERROR: isi NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY di .env.local dulu.')
    if not DB_PATH.exists():
        sys.exit(f'ERROR: {DB_PATH} tidak ditemukan.')

    sb = Supabase(url, key, args.dry_run)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    total = {'insert': 0, 'update': 0, 'skip': 0, 'warn': 0}

    print(f'Target: {url}  {"(DRY RUN)" if args.dry_run else ""}')

    # --- 0. cek setup.sql sudah jalan -------------------------------------
    sb.request('GET', '/rest/v1/faculties', params={'select': 'id,code', 'limit': '1'})
    print('[OK] Koneksi REST berhasil, tabel faculties ada (setup.sql sudah jalan).')

    # --- 1. buckets storage ------------------------------------------------
    print('\n== Storage buckets ==')
    for bucket in BUCKETS:
        if sb.dry_run:
            print(f'  [dry-run] create bucket {bucket} (public)')
            continue
        res = sb.request('POST', '/storage/v1/bucket',
                         {'id': bucket, 'name': bucket, 'public': True}, allow_error=True)
        if isinstance(res, dict) and '__error__' in res:
            if 'already' in res['detail'].lower() or 'duplicate' in res['detail'].lower():
                print(f'  bucket {bucket}: sudah ada')
            else:
                sys.exit(f'ERROR bucket {bucket}: {res["detail"]}')
        else:
            print(f'  bucket {bucket}: dibuat (public)')

    # --- 2. faculties ------------------------------------------------------
    print('\n== faculties ==')
    supa_fac = {r['code']: r['id'] for r in sb.request(
        'GET', '/rest/v1/faculties', params={'select': 'id,code'}) or []}
    local_fac = list(cur.execute('SELECT * FROM faculties ORDER BY name'))
    fac_id_map: dict[str, str] = {}  # local id -> supabase id
    for row in local_fac:
        if row['code'] in supa_fac:
            fac_id_map[row['id']] = supa_fac[row['code']]
            total['skip'] += 1
            continue
        res = sb.mutate('POST', '/rest/v1/faculties', {'name': row['name'], 'code': row['code']})
        new_id = res[0]['id'] if isinstance(res, list) and res else None
        fac_id_map[row['id']] = new_id or row['id']
        supa_fac[row['code']] = fac_id_map[row['id']]
        total['insert'] += 1
    print(f'  {len(local_fac)} fakultas, {total["insert"]} baru')

    # --- 3. study_programs -------------------------------------------------
    print('\n== study_programs ==')
    supa_sp = {r['code']: r for r in sb.request(
        'GET', '/rest/v1/study_programs', params={'select': 'id,name,code,faculty_id'}) or []}
    n_ins = n_upd = n_skip = 0
    for row in cur.execute('SELECT * FROM study_programs ORDER BY code'):
        fac_id = fac_id_map.get(row['faculty_id'])
        if fac_id is None:
            print(f'  WARN: faculty_id {row["faculty_id"]} tidak terpetakan, {row["code"]} dilewati')
            total['warn'] += 1
            continue
        existing = supa_sp.get(row['code'])
        if existing:
            if existing['name'] != row['name'] or existing['faculty_id'] != fac_id:
                sb.mutate('PATCH', '/rest/v1/study_programs', {'name': row['name'], 'faculty_id': fac_id},
                          params={'code': f'eq.{row["code"]}'})
                n_upd += 1
            else:
                n_skip += 1
        else:
            sb.mutate('POST', '/rest/v1/study_programs',
                      {'name': row['name'], 'code': row['code'], 'faculty_id': fac_id})
            n_ins += 1
    total['insert'] += n_ins
    total['update'] += n_upd
    total['skip'] += n_skip
    print(f'  {n_ins} baru, {n_upd} diperbarui, {n_skip} sama')

    # --- 4. settings -------------------------------------------------------
    print('\n== settings ==')
    supa_set = {r['key']: r['value'] for r in sb.request(
        'GET', '/rest/v1/settings', params={'select': 'key,value'}) or []}
    n_ins = n_upd = n_skip = 0
    for row in cur.execute('SELECT * FROM settings'):
        try:
            local_val = json.loads(row['value'])
        except (json.JSONDecodeError, TypeError):
            local_val = row['value']
        if row['key'] in supa_set:
            if supa_set[row['key']] != local_val:
                sb.mutate('PATCH', '/rest/v1/settings', {'value': local_val},
                          params={'key': f'eq.{row["key"]}'})
                n_upd += 1
            else:
                n_skip += 1
        else:
            sb.mutate('POST', '/rest/v1/settings', {'key': row['key'], 'value': local_val})
            n_ins += 1
    total['insert'] += n_ins
    total['update'] += n_upd
    total['skip'] += n_skip
    print(f'  {n_ins} baru, {n_upd} diperbarui, {n_skip} sama (3 key default setup.sql tetap ada)')

    # --- 5. gallery --------------------------------------------------------
    print('\n== gallery ==')
    existing_urls = {r['image_url'] for r in sb.request(
        'GET', '/rest/v1/gallery', params={'select': 'image_url'}) or []}
    rows, n_skip = [], 0
    for row in cur.execute('SELECT * FROM gallery ORDER BY created_at'):
        if row['image_url'] in existing_urls:
            n_skip += 1
            continue
        image_url = row['image_url']
        if args.upload_photos:
            image_url = image_url_for_upload(sb, 'gallery', image_url)
        rows.append({
            'title': row['title'],
            'description': row['description'],
            'image_url': image_url,
            'category': row['category'],
            'created_at': row['created_at'],
            'width': row['width'],
            'height': row['height'],
        })
    if rows:
        sb.mutate('POST', '/rest/v1/gallery', rows)
        total['insert'] += len(rows)
    total['skip'] += n_skip
    print(f'  {len(rows)} baru, {n_skip} sudah ada')

    # --- 6. titleholders ---------------------------------------------------
    print('\n== titleholders ==')
    existing_th = {(r['tahun'], r['category']) for r in sb.request(
        'GET', '/rest/v1/titleholders', params={'select': 'tahun,category'}) or []}
    rows, n_skip = [], 0
    for row in cur.execute('SELECT * FROM titleholders'):
        if (row['tahun'], row['category']) in existing_th:
            n_skip += 1
            continue
        rec = {k: row[k] for k in (
            'tahun', 'category', 'nyong_name', 'noni_name', 'faculty', 'study_program',
            'region', 'motto', 'biography', 'nyong_photo_url', 'noni_photo_url',
            'nyong_instagram', 'noni_instagram', 'sort_order', 'created_at', 'updated_at')}
        if args.upload_photos:
            for field in ('nyong_photo_url', 'noni_photo_url'):
                if rec[field]:
                    rec[field] = image_url_for_upload(sb, 'titleholders', rec[field])
        rows.append(rec)
    if rows:
        sb.mutate('POST', '/rest/v1/titleholders', rows)
        total['insert'] += len(rows)
    total['skip'] += n_skip
    print(f'  {len(rows)} baru, {n_skip} sudah ada')

    # --- 7. current_titleholders -------------------------------------------
    print('\n== current_titleholders ==')
    existing_ct = {(r['title'], r['name']) for r in sb.request(
        'GET', '/rest/v1/current_titleholders', params={'select': 'title,name'}) or []}
    rows, n_skip = [], 0
    for row in cur.execute('SELECT * FROM current_titleholders'):
        if (row['title'], row['name']) in existing_ct:
            n_skip += 1
            continue
        rec = {k: row[k] for k in (
            'title', 'name', 'faculty', 'study_program', 'photo_url', 'instagram',
            'biography', 'sort_order', 'created_at', 'updated_at')}
        if args.upload_photos and rec['photo_url']:
            rec['photo_url'] = image_url_for_upload(sb, 'titleholders', rec['photo_url'])
        rows.append(rec)
    if rows:
        sb.mutate('POST', '/rest/v1/current_titleholders', rows)
        total['insert'] += len(rows)
    total['skip'] += n_skip
    print(f'  {len(rows)} baru, {n_skip} sudah ada')

    # --- 8. profiles admin -------------------------------------------------
    print('\n== profiles (admin) ==')
    if not args.admin_email:
        print('  SKIPPED: beri --admin-email <email> agar akun Authentication jadi role admin')
    else:
        res = sb.request('GET', '/auth/v1/admin/users',
                         params={'email': args.admin_email})
        users = (res or {}).get('users') or []
        if not users:
            print(f'  ERROR: {args.admin_email} belum ada di Authentication — buat dulu di dashboard')
            total['warn'] += 1
        else:
            uid = users[0]['id']
            full_name = users[0].get('user_metadata', {}).get('full_name', 'Admin')
            patched = sb.mutate('PATCH', '/rest/v1/profiles',
                                {'email': args.admin_email, 'full_name': full_name, 'role': 'admin'},
                                params={'id': f'eq.{uid}'})
            if patched is None or patched:
                print(f'  profile {args.admin_email} -> role admin (id {uid})')
                total['update'] += 1
            else:  # 0 baris terpengaruh (trigger belum bikin profile)
                sb.mutate('POST', '/rest/v1/profiles', {
                    'id': uid, 'email': args.admin_email, 'full_name': full_name, 'role': 'admin'})
                print(f'  profile baru {args.admin_email} -> role admin (id {uid})')
                total['insert'] += 1

    conn.close()
    print(f'\n== SELESAI {"(dry-run) " if args.dry_run else ""}==')
    print(f'  insert={total["insert"]}  update={total["update"]}  skip={total["skip"]}  warn={total["warn"]}')
    if total['warn']:
        print('  Perhatikan baris WARN di atas.')


if __name__ == '__main__':
    main()
