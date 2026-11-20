"""Scan Asset/Sprites into asset_manifest.json and asset_manifest.js.

Usage: python scan_assets.py
Bikes must have exactly bike_N_top.png, bike_N_right.png and bike_N_down.png.
Right is the base horizontal facing; runtime flips it for left.
"""
from __future__ import annotations
import json
import math
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
        'pedestrians': [],
        'invalidPedestrians': [],
        'invalidBikes': [],
        'roads': {str(i): [] for i in range(1, 6)},
        'deco': {str(i): [] for i in range(1, 6)},
        'decoGroups': {},
        'decoSortPoints': {},  # legacy v24 fallback only
        'decoLights': {},  # v27: asset-level nighttime lighting
        'assetSortY': {},  # single Y-only point for each shared sprite asset
        'constructions': {str(i): [] for i in range(1, 6)},
        'trafficLights': {},
        'constructionAssets': {'houses': [], 'interiors': [], 'doors': []},
        'houseConfigs': {},
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

    # Pedestrians have exactly 12 pngs per person, left is a horizontal mirror of right.
    person_root=ASSET/'Pedestrians'
    if person_root.is_dir():
        for folder in sorted((p for p in person_root.iterdir() if p.is_dir()),key=lambda p:p.name):
            expected=[f'{folder.name}_{dir}_frame_{i}.png' for dir in ('down','right','up') for i in range(1,5)]
            present={p.name.lower():p for p in folder.iterdir() if p.is_file()}
            missing=[n for n in expected if n.lower() not in present]
            extra=[n for n in present if n not in {e.lower() for e in expected}]
            if missing or extra:
                manifest['invalidPedestrians'].append({'id':folder.name,'reason':f'Thiếu {missing}, dư {extra}'})
                continue
            manifest['pedestrians'].append({'id':folder.name,
                'frames':{dir:[rel(present[f'{folder.name}_{dir}_frame_{i}.png'.lower()]) for i in range(1,5)]
                          for dir in ('down','right','up')}})

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

    # One authoritative file in Asset/Sprites/Deco/ controls all Deco sorting anchors.
    # Keys use a stable Group/asset_id, values are normalized within the PNG.
    deco_sort_path = ASSET / 'Deco' / 'deco_sort_points.json'
    if deco_sort_path.is_file():
        try:
            raw = json.loads(deco_sort_path.read_text(encoding='utf-8'))
            if not isinstance(raw, dict) or not isinstance(raw.get('points', {}), dict):
                raise ValueError('Expected an object with a points dictionary')
            for k, xy in raw.get('points', {}).items():
                if not isinstance(k, str) or not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]*/[^/]+', k) or not isinstance(xy, dict):
                    continue
                try:
                    x, y = float(xy['x']), float(xy['y'])
                except (ValueError, TypeError, KeyError):
                    continue
                if 0 <= x <= 1 and 0 <= y <= 1:
                    manifest['decoSortPoints'][k] = {'x': x, 'y': y}
                else:
                    print(f'WARNING: Deco sort point {k} must be between 0 and 1')
        except (OSError, ValueError) as exc:
            print(f'WARNING: Failed to load {deco_sort_path}: {exc}')

    # v25 authoritative shared asset settings (Y-only; the X anchor is ALWAYS center).
    sort_config = ASSET / 'asset_sort_y.json'
    if sort_config.is_file():
        try:
            data = json.loads(sort_config.read_text(encoding='utf-8'))
            for name, value in data.get('points', {}).items():
                if not isinstance(name, str) or not isinstance(value, (int, float)):
                    continue
                y = float(value)
                if 0 <= y <= 1:
                    manifest['assetSortY'][name] = y
                else:
                    print(f'WARNING: Sort Y for {name} outside 0..1')
        except (OSError, ValueError, AttributeError, TypeError) as exc:
            print(f'WARNING: Invalid asset_sort_y.json: {exc}')
    else:
        # Old v24 project files still load; export once in Asset Settings to migrate.
        manifest['assetSortY'].update({f'Deco/{key}': pos['y']
                                        for key, pos in manifest['decoSortPoints'].items()})

    # Shared Deco night lights. Local-image pixel coordinates, independently of map placement.
    lights_file = ASSET / 'deco_lights.json'
    if lights_file.is_file():
        try:
            payload = json.loads(lights_file.read_text(encoding='utf-8'))
            groups = payload.get('assets', {})
            if not isinstance(groups, dict):
                raise ValueError('assets must be an object')
            for asset_key, lights in groups.items():
                if not isinstance(asset_key,str) or not re.fullmatch(r'Deco/[A-Za-z][A-Za-z0-9_-]*/[^/]+', asset_key) or not isinstance(lights,list):
                    continue
                checked=[]
                for entry in lights[:100]:
                    if not isinstance(entry,dict) or entry.get('shape') not in ('circle','rect'):
                        continue
                    if not re.fullmatch(r'#[0-9A-Fa-f]{6}',str(entry.get('color','#ffd38c'))):
                        continue
                    try:
                        numeric={k:float(entry.get(k,default)) for k,default in [('x',0),('y',0),('radius',35),('width',42),('height',24),('intensity',.65)]}
                        if not all(math.isfinite(v) for v in numeric.values()):
                            continue
                    except (TypeError,ValueError):
                        continue
                    numeric['intensity']=max(0,min(3,numeric['intensity']))
                    checked.append(dict(id=str(entry.get('id',f'light_{len(checked)}')),shape=entry['shape'],color=entry['color'],**numeric))
                manifest['decoLights'][asset_key]=checked
        except (OSError,ValueError,TypeError) as exc:
            print(f'WARNING: Invalid deco_lights.json: {exc}')

    # The new level-independent Deco groups are named after their folders.
    # Example: Deco/Trees/tree_01.png, Deco/TrashBins/bin_green.png
    deco_root = ASSET / 'Deco'
    if deco_root.is_dir():
        for group_dir in sorted(deco_root.iterdir()):
            if not group_dir.is_dir() or re.fullmatch(r'Level_[1-5]', group_dir.name):
                continue
            if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_-]*', group_dir.name):
                continue
            for img in sorted(group_dir.glob('*.png')):
                manifest['decoGroups'].setdefault(group_dir.name, []).append({
                    'id': img.stem, 'group': group_dir.name, 'path': rel(img)})

    # Standardized modular construction assets, independent of generic Constructions cards.
    for level in range(1, 6):
        base=ASSET/'Constructions'/f'Level_{level}'
        for folder, destination in [('Houses','houses'),('Interiors','interiors'),('ClosedDoors','doors')]:
            for p in sorted((base/folder).glob('*.png')):
                row={'id':p.stem,'path':rel(p),'level':level}
                if destination=='interiors':
                    m=re.fullmatch(r'(\d{2})_(\d{2})',p.stem)
                    if not m or int(m.group(1))!=level: continue
                    row['industry']=int(m.group(2))
                manifest['constructionAssets'][destination].append(row)
    house_file=ROOT/'houses.json'
    if house_file.exists():
        try: manifest['houseConfigs']=json.loads(house_file.read_text(encoding='utf-8')).get('houses',{})
        except (ValueError,OSError): manifest['houseConfigs']={}
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
