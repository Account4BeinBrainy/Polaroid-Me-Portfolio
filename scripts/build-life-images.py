"""Build and verify Life Journey display images without touching originals."""
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1] / 'dist/assets/life-journey'
PHOTOS = ROOT / 'photos'


def dimensions(path):
    output = subprocess.check_output(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', str(path)], text=True)
    return tuple(int(re.search(rf'pixel{axis}: (\d+)', output).group(1)) for axis in ('Width', 'Height'))


def build(source, target, max_side, quality):
    width, height = dimensions(source)
    longest = max(width, height)
    resized = (width, height) if longest <= max_side else (
        round(width * max_side / longest), round(height * max_side / longest))
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['cwebp', '-quiet', '-q', str(quality), '-metadata', 'icc', '-resize', *map(str, resized),
                    str(source), '-o', str(target)], check=True)
    actual = dimensions(target)
    assert target.stat().st_size > 0 and actual == resized, target
    assert abs(actual[0] / actual[1] - width / height) < .005, target


for source in sorted(PHOTOS.rglob('*')):
    if not source.is_file():
        continue
    relative = source.relative_to(PHOTOS).with_suffix('.webp')
    build(source, ROOT / 'wall' / relative, 720, 84)
    build(source, ROOT / 'album' / relative, 1400, 88)

print(f'Verified {sum(path.is_file() for path in PHOTOS.rglob("*"))} wall and album image pairs')
