#!/usr/bin/env python3
"""Download Overture Maps buildings (OpenStreetMap footprints) around the Weihenstephan campus.

Uses plain HTTP range requests against the public Overture bucket: only parquet footers and
the row groups whose bounding boxes touch the campus are fetched (a few MB, not the planet).

Usage: python3 tools/fetch_overture_buildings.py overture-buildings.parquet [release]
"""
import io, re, sys, urllib.request, concurrent.futures as cf
import pyarrow as pa, pyarrow.parquet as pq

BASE = 'https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com'
REL = 'release/2026-09-23.1'
X0, X1, Y0, Y1 = 11.700, 11.750, 48.388, 48.412

def get(url, rng=None):
    req = urllib.request.Request(url, headers={'Range': f'bytes={rng[0]}-{rng[1]}'} if rng else {})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception:
            if attempt == 3: raise

class RangeFile(io.RawIOBase):
    def __init__(self, url, size):
        self.url, self.size, self.pos, self.cache = url, size, 0, {}
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else (self.pos + off if whence == 1 else self.size + off)
        return self.pos
    def read(self, n=-1):
        if n < 0: n = self.size - self.pos
        if n <= 0: return b''
        data = get(self.url, (self.pos, min(self.size, self.pos + n) - 1))
        self.pos += len(data)
        return data
    def readinto(self, b):
        d = self.read(len(b)); b[:len(d)] = d; return len(d)

def list_keys(prefix):
    keys, token = [], None
    while True:
        q = f'{BASE}/?list-type=2&prefix={prefix}' + (f'&continuation-token={urllib.parse.quote(token)}' if token else '')
        x = get(q).decode()
        keys += [(k, int(s)) for k, s in re.findall(r'<Key>([^<]*)</Key>.*?<Size>(\d+)</Size>', x)]
        m = re.search(r'<NextContinuationToken>([^<]*)', x)
        if not m: return keys
        token = m.group(1)

import urllib.parse
MISSING = []
def scan(key, size, columns):
    url = f'{BASE}/{key}'
    try:
        pf = pq.ParquetFile(RangeFile(url, size))
    except Exception as e:
        MISSING.append(key); print('skip', key, e, file=sys.stderr); return None
    md = pf.metadata
    names = pf.schema_arrow.names
    path_idx = {md.schema.column(i).path: i for i in range(md.num_columns)}
    want = []
    for rg in range(md.num_row_groups):
        g = md.row_group(rg)
        st = {p: g.column(path_idx[f'bbox.{p}']).statistics for p in ('xmin', 'xmax', 'ymin', 'ymax')}
        if st['xmin'].min < X1 and st['xmax'].max > X0 and st['ymin'].min < Y1 and st['ymax'].max > Y0:
            want.append(rg)
    if not want: return None
    t = pf.read_row_groups(want, columns=[c for c in columns if c in names])
    bb = t.column('bbox').combine_chunks()
    import pyarrow.compute as pc
    m = pc.and_(pc.and_(pc.less(bb.field('xmin'), X1), pc.greater(bb.field('xmax'), X0)),
                pc.and_(pc.less(bb.field('ymin'), Y1), pc.greater(bb.field('ymax'), Y0)))
    return t.filter(m)

if __name__ == '__main__':
    out = sys.argv[1]
    if len(sys.argv) > 2:
        REL = f'release/{sys.argv[2]}'
    cols = ['id', 'names', 'class', 'subtype', 'height', 'num_floors', 'sources', 'geometry', 'bbox']
    keys = list_keys(f'{REL}/theme=buildings/type=building/')
    print(len(keys), 'files', file=sys.stderr)
    with cf.ThreadPoolExecutor(16) as ex:
        parts = [t for t in ex.map(lambda k: scan(k[0], k[1], cols), keys) if t is not None and t.num_rows]
    tbl = pa.concat_tables(parts, promote_options='default')
    pq.write_table(tbl, out)
    print(f'{tbl.num_rows} buildings, {len(MISSING)} files unavailable', file=sys.stderr)
