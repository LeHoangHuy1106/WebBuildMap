"""Scan Asset/Sprites into asset_manifest.json and asset_manifest.js.

Usage: python scan_assets.py
Bikes must have exactly bike_N_top.png, bike_N_right.png and bike_N_down.png.
Right is the base horizontal facing; runtime flips it for left.
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ASSET = ROOT / 'Asset' / 'Sprites'


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def scan() -> dict:
    manifest = {
        'version': 1,
        'root': 'Asset/Sprites',
        'vehicles': {'bikes': [], 'cars': []},
        'invalidBikes': [],
        'roads': {str(i): [] for i in range(1, 6)},
        'deco': {str(i): [] for i in range(1, 6)},
        'constructions': {str(i): [] for i in range(1, 6)},
        'trafficLights': {},
    }
    bike_root = ASSET / 'Vehicles' / 'Bikes'
    for folder in sorted(bike_root.iterdir(), key=lambda p: int(p.name.split('_')[-1]) if p.name.split('_')[-1].isdigit() else 999999):
        if not folder.is_dir():
            continue
        if not re.fullmatch(r'bike_[1-9][0-9]*', folder.name):
            manifest['invalidBikes'].append({'id': folder.name, 'reason': 'Tên thư mục phải có dạng bike_1, bike_2...'})
            continue
        expected = {direction: f'{folder.name}_{direction}.png' for direction in ('top', 'right', 'down')}
        present = {p.name.lower(): p for p in folder.iterdir() if p.is_file()}
        missing = [v for v in expected.values() if v.lower() not in present]
        extra = [p.name for p in folder.iterdir() if p.is_file() and p.name.lower() not in {n.lower() for n in expected.values()}]
        if missing or extra:
            manifest['invalidBikes'].append({'id': folder.name, 'missing': missing, 'extra': extra,
                'reason': 'Thiếu/sai tên frame hoặc có file thừa'})
            continue
        manifest['vehicles']['bikes'].append({'id': folder.name, 'category': 'bike',
            'top': rel(present[expected['top'].lower()]),
            'right': rel(present[expected['right'].lower()]),
            'down': rel(present[expected['down'].lower()]),})

    # Cars: empty until car assets/specification are supplied. No invented frames.
    # Road codes follow xab (x=level-1); images are named 000.png .. 412.png.
    for group, target in [('Roads', 'roads'), ('Deco', 'deco'), ('Constructions', 'constructions')]:
        for level in range(1, 6):
            folder = ASSET / group / f'Level_{level}'
            for path in sorted(folder.rglob('*.png')):
                value = {'id': path.stem, 'path': rel(path), 'level': level}
                if group == 'Roads':
                    if not re.fullmatch(r'\d{3}', path.stem) or int(path.stem[0]) != level - 1:
                        continue
                    value['code'] = path.stem
                manifest[target][str(level)].append(value)
                if group == 'Deco' and path.stem in ('traffic_light_red', 'traffic_light_yellow', 'traffic_light_green'):
                    manifest['trafficLights'][path.stem.split('_')[-1]] = rel(path)

    return manifest


def save(manifest: dict) -> None:
    text = json.dumps(manifest, ensure_ascii=False, indent=2)
    (ROOT / 'asset_manifest.json').write_text(text, encoding='utf-8')
    (ROOT / 'asset_manifest.js').write_text('window.__ASSET_MANIFEST__ = ' + json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')


if __name__ == '__main__':
    m = scan()
    save(m)
    print(f"{len(m['vehicles']['bikes'])} Bikes hợp lệ, {len(m['invalidBikes'])} Bikes lỗi, "
          f"{sum(map(len, m['roads'].values()))} road tiles")
    for error in m['invalidBikes']:
        print('ERROR:', error)
