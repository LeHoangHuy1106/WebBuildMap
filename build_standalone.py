"""Build a fully offline single-file HTML with all current manifest images embedded.

Run: python scan_assets.py && python build_standalone.py
"""
from __future__ import annotations
import base64
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
MANIFEST=ROOT/'asset_manifest.json'
INDEX=ROOT/'index.html'
OUT=ROOT/'standalone.html'


def inline(path: str) -> str:
    if not isinstance(path,str) or not path.startswith('Asset/Sprites/'):
        return path
    local=ROOT/path
    if not local.is_file():
        raise FileNotFoundError(f'Asset manifest points to missing file: {path}')
    suffix=local.suffix.lower()
    mime={'.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg'}.get(suffix)
    if not mime:
        raise ValueError(f'Unsupported image format: {path}')
    return f'data:{mime};base64,'+base64.b64encode(local.read_bytes()).decode('ascii')


def build() -> None:
    manifest=json.loads(MANIFEST.read_text(encoding='utf-8'))
    for bike in manifest['vehicles']['bikes']:
        for direction in ('top','right','down'):
            bike[direction]=inline(bike[direction])
    for person in manifest.get('pedestrians',[]):
        for direction,paths in person['frames'].items():
            person['frames'][direction]=[inline(p) for p in paths]
    for group in ('roads','deco','constructions'):
        for entries in manifest[group].values():
            for asset in entries:
                asset['path']=inline(asset['path'])
    for group in manifest.get('decoGroups',{}).values():
        for asset in group: asset['path']=inline(asset['path'])
    for group in ('houses','interiors','doors'):
        for asset in manifest.get('constructionAssets',{}).get(group,[]):
            asset['path']=inline(asset['path'])
    for color,asset in list(manifest['trafficLights'].items()):
        manifest['trafficLights'][color]=inline(asset)

    source=INDEX.read_text(encoding='utf-8')
    marker='<script src="asset_manifest.js"></script>'
    assert marker in source, 'Missing manifest script tag'
    source=source.replace(marker, '<script>window.__ASSET_MANIFEST__='+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';</script>',1)
    construction=(ROOT/'construction_extension.js').read_text(encoding='utf-8')
    source=source.replace('<script src="construction_extension.js"></script>', '<script>'+construction+'</script>',1)
    source=source.replace('<script src="deco_editor.js"></script>', '<script>'+(ROOT/'deco_editor.js').read_text(encoding='utf-8')+'</script>',1)
    source=source.replace('<script src="asset_settings.js"></script>', '<script>'+(ROOT/'asset_settings.js').read_text(encoding='utf-8')+'</script>',1)
    source=source.replace('<script src="deco_lights.js"></script>', '<script>'+(ROOT/'deco_lights.js').read_text(encoding='utf-8')+'</script>',1)
    OUT.write_text(source,encoding='utf-8')
    print(f'Wrote {OUT} ({OUT.stat().st_size/1024/1024:.2f} MiB)')

if __name__=='__main__':
    build()
