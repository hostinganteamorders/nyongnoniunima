import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { it } from 'vitest'

it('imports catalogs without overwriting target programs or duplicating legacy faculties', () => {
  execFileSync('python3', ['-B', '-c', String.raw`
import contextlib
import copy
import importlib.util
import io
import pathlib
import sqlite3
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('catalog_importer', sys.argv[1])
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class CatalogComplete(Exception):
    pass


class FakeSupabase:
    dry_run = False

    def __init__(self, faculties, programs):
        self.faculties = copy.deepcopy(faculties)
        self.programs = copy.deepcopy(list(programs))
        self.mutations = []

    def request(self, method, path, payload=None, params=None, **kwargs):
        if method == 'GET' and path == '/rest/v1/settings':
            raise CatalogComplete()
        if method == 'POST' and path == '/storage/v1/bucket':
            return {'__error__': 409, 'detail': 'already exists'}
        if method == 'GET' and path in ('/rest/v1/faculties', '/rest/v1/study_programs'):
            rows = self.faculties if path.endswith('/faculties') else self.programs
            fields = params['select'].split(',')
            return [{key: row[key] for key in fields} for row in rows]
        raise AssertionError((method, path))

    def mutate(self, method, path, payload, params=None):
        self.mutations.append((method, path, copy.deepcopy(payload), params))
        if method != 'POST':
            raise AssertionError('Existing catalog rows must never be mutated')
        rows = self.faculties if path == '/rest/v1/faculties' else self.programs
        row = {'id': 'target-new-' + payload['code'], **payload}
        rows.append(row)
        return [row.copy()]


class CatalogImportTests(unittest.TestCase):
    def run_catalog(self, local_faculties, local_programs, target_faculties,
                    target_programs=(), active_column=True):
        conn = sqlite3.connect(':memory:')
        self.addCleanup(conn.close)
        conn.execute('CREATE TABLE faculties (id TEXT, code TEXT, name TEXT)')
        active_sql = ', is_active INTEGER NOT NULL DEFAULT 1' if active_column else ''
        conn.execute('CREATE TABLE study_programs '
                     '(code TEXT, name TEXT, faculty_id TEXT' + active_sql + ')')
        conn.executemany('INSERT INTO faculties VALUES (?, ?, ?)', local_faculties)
        placeholders = '?, ?, ?, ?' if active_column else '?, ?, ?'
        conn.executemany('INSERT INTO study_programs VALUES (' + placeholders + ')',
                         local_programs)
        sb = FakeSupabase(target_faculties, target_programs)
        output = io.StringIO()
        # No repository DB, .env reads, network, or post-catalog phases are allowed.
        with patch.object(importer, 'load_env', return_value={
            'NEXT_PUBLIC_SUPABASE_URL': 'https://catalog.invalid',
            'SUPABASE_SERVICE_ROLE_KEY': 'fake-test-key',
        }), patch.object(importer, 'DB_PATH', SimpleNamespace(exists=lambda: True)), \
             patch.object(importer, 'Supabase', return_value=sb), \
             patch.object(importer.sqlite3, 'connect', return_value=conn), \
             patch.object(pathlib.Path, 'read_text', side_effect=AssertionError('File read')), \
             patch.object(importer.urllib.request, 'urlopen', side_effect=AssertionError('Network')), \
             patch.object(sys, 'argv', ['migrate-to-supabase.py']), \
             contextlib.redirect_stdout(output):
            with self.assertRaises(CatalogComplete):
                importer.main()
        return sb, output.getvalue()

    def test_existing_codes_keep_target_names_and_archived_flags(self):
        target = [
            {'id': 'target-pgsd', 'code': 'PGSD', 'name': 'Pendidikan Guru Sekolah Dasar',
             'faculty_id': 'target-fipp', 'is_active': True},
            {'id': 'target-ptik', 'code': 'PTIK', 'name': 'Pendidikan Teknologi Informasi',
             'faculty_id': 'target-ft', 'is_active': False},
        ]
        sb, output = self.run_catalog(
            [('source-fip', 'FIP', 'Legacy Education'), ('source-ft', 'FT', 'Engineering')],
            [('PGSD', 'Old PGSD label', 'source-fip', 0),
             ('PTIK', 'Old PTIK label', 'source-ft', 1)],
            [{'id': 'target-fipp', 'code': 'FIPP'}, {'id': 'target-ft', 'code': 'FT'}],
            target)
        self.assertEqual(sb.programs, target)
        self.assertEqual(sb.mutations, [])
        self.assertNotIn('WARN', output)

    def test_all_faculty_aliases_preserve_source_id_relationships(self):
        aliases = [('FIP', 'FIPP'), ('FE', 'FEB'), ('FOK', 'FIKKM'), ('FMIPA', 'FMIPAK')]
        sb, output = self.run_catalog(
            [('source-' + old, old, 'Legacy ' + old) for old, new in aliases],
            [('TEST-' + old, 'Synthetic ' + old, 'source-' + old, 1) for old, new in aliases],
            [{'id': 'target-' + new, 'code': new} for old, new in aliases])
        self.assertEqual(len(sb.faculties), 4)
        self.assertEqual(len(sb.mutations), 4)
        for program in sb.programs:
            old = program['code'].removeprefix('TEST-')
            self.assertEqual(program['faculty_id'], 'target-' + dict(aliases)[old])
        self.assertNotIn('WARN', output)

    def test_canonical_faculty_wins_even_if_target_has_legacy_code(self):
        sb, _ = self.run_catalog(
            [('source-fip', 'FIP', 'Legacy Education')],
            [('TEST', 'Synthetic program', 'source-fip', 1)],
            [{'id': 'target-fip', 'code': 'FIP'}, {'id': 'target-fipp', 'code': 'FIPP'}])
        self.assertEqual(sb.programs[0]['faculty_id'], 'target-fipp')
        self.assertEqual(len(sb.faculties), 2)

    def test_cross_faculty_code_conflict_warns_without_moving_program(self):
        target = [{'id': 'target-conflict', 'code': 'PGSD', 'name': 'Target name',
                   'faculty_id': 'target-other', 'is_active': False}]
        sb, output = self.run_catalog(
            [('source-fip', 'FIP', 'Legacy Education')],
            [('PGSD', 'Old PGSD label', 'source-fip', 1)],
            [{'id': 'target-fipp', 'code': 'FIPP'}, {'id': 'target-other', 'code': 'OTHER'}],
            target)
        self.assertEqual(sb.programs, target)
        self.assertEqual(sb.mutations, [])
        for text in ('WARN', 'PGSD', 'target-other', 'target-fipp', 'dilewati'):
            self.assertIn(text, output)

    def test_new_program_matches_by_code_only_and_preserves_active_flags(self):
        sb, _ = self.run_catalog(
            [('source-ft', 'FT', 'Engineering')],
            [('NEW-ARCHIVE', 'Shared name', 'source-ft', 0),
             ('NEW-ACTIVE', 'New active program', 'source-ft', 1)],
            [{'id': 'target-ft', 'code': 'FT'}],
            [{'id': 'target-old', 'code': 'OTHER', 'name': 'Shared name',
              'faculty_id': 'target-ft', 'is_active': True}])
        inserts = {payload['code']: payload for method, path, payload, params in sb.mutations}
        self.assertEqual(len(inserts), 2)
        self.assertIs(inserts['NEW-ARCHIVE']['is_active'], False)
        self.assertIs(inserts['NEW-ACTIVE']['is_active'], True)
        self.assertEqual(inserts['NEW-ARCHIVE']['faculty_id'], 'target-ft')

    def test_old_schema_without_active_column_still_imports(self):
        sb, _ = self.run_catalog(
            [('source-ft', 'FT', 'Engineering')],
            [('TEST', 'Synthetic program', 'source-ft')],
            [{'id': 'target-ft', 'code': 'FT'}], active_column=False)
        self.assertEqual(sb.mutations, [('POST', '/rest/v1/study_programs',
            {'name': 'Synthetic program', 'code': 'TEST', 'faculty_id': 'target-ft'}, None)])

    def test_missing_canonical_faculty_keeps_legacy_insert_and_id_mapping(self):
        sb, _ = self.run_catalog(
            [('source-fip', 'FIP', 'Legacy Education')],
            [('TEST', 'Synthetic program', 'source-fip', 1)], [])
        self.assertEqual(sb.faculties[0]['code'], 'FIP')
        self.assertEqual(sb.programs[0]['faculty_id'], sb.faculties[0]['id'])
        self.assertNotEqual(sb.programs[0]['faculty_id'], 'source-fip')


unittest.main(argv=['importer-catalog'], verbosity=2)
`, path.resolve('scripts/migrate-to-supabase.py')], { stdio: 'pipe', timeout: 15_000 })
})
