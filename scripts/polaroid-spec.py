"""Generate shared Polaroid tokens from the canonical GLB; --check verifies drift."""
import json, struct, pathlib, sys
root = pathlib.Path(__file__).resolve().parents[1]
path = root / 'dist/public/model/photo-single-template-v2.glb'
b = path.read_bytes()
n = struct.unpack_from('<I', b, 12)[0]
gltf = json.loads(b[20:20+n])
def geometry(name):
    mesh = next(m for m in gltf['meshes'] if m['name'] == name)
    accessor = gltf['accessors'][mesh['primitives'][0]['attributes']['POSITION']]
    view = gltf['bufferViews'][accessor['bufferView']]
    offset = 28+n+view.get('byteOffset',0)+accessor.get('byteOffset',0)
    vertices = [struct.unpack_from('<fff', b, offset+i*view.get('byteStride',12)) for i in range(accessor['count'])]
    return accessor['min'], accessor['max'], vertices
lo, hi, vertices = geometry('TemplatePaperSolid')
il, ih, _ = geometry('BlankInsetSurface')
w, h, thickness = hi[0]-lo[0], hi[2]-lo[2], hi[1]-lo[1]
side, top, bottom = (w-(ih[0]-il[0]))/2, il[2]-lo[2], hi[2]-ih[2]
# Smallest nonzero Y level is the bevel; outermost Z edge ends at the corner inset.
bevel = round(min(p[1] for p in vertices if p[1] > 1e-9),9)
corner = round(hi[0]-max(p[0] for p in vertices if abs(p[2]-lo[2]) < 1e-8),8)
spec = dict(modelUrl='/public/model/photo-single-template-v2.glb', revision='template-v2',
 width=w,height=h,thickness=thickness,aspect=w/h,imageSide=ih[0]-il[0],
 imageWidthRatio=(ih[0]-il[0])/w,imageHeightRatio=(ih[2]-il[2])/h,
 sideBorderRatio=side/w,topBorderRatio=top/h,bottomBorderRatio=bottom/h,
 imageBottomRatio=(ih[2]-lo[2])/h,topMargin=top,bottomMargin=bottom,
 bevel=bevel,cornerRadius=corner,edgeDepth=thickness,
 imagePlaneY=il[1],imageCenterZ=(il[2]+ih[2])/2,
 origin='paper center X/Z, back surface Y=0; face +Y; image top -Z',
 paperColor='#EEEDEA',imageColor='#FDFDFC',defaultFit='cover',blank=True)
css = {'paper':spec['paperColor'],'image-base':spec['imageColor'],'aspect':spec['aspect'],
 'image-ratio':1,'side-border':f'{side/w*100:.10f}%', 'top-border':f'{top/h*100:.10f}%',
 'bottom-border':f'{bottom/h*100:.10f}%', 'image-width':f'{spec["imageWidthRatio"]*100:.10f}%',
 'image-height':f'{spec["imageHeightRatio"]*100:.10f}%', 'caption-top':f'{spec["imageBottomRatio"]*100:.10f}%',
 'edge-depth':f'{thickness/w*100:.10f}cqw','radius-x':f'{corner/w*100:.10f}%',
 'radius-y':f'{corner/h*100:.10f}%','image-fit':spec['defaultFit']}
outputs = {'dist/js/polaroid-spec.js':'// Generated from photo-single-template-v2.glb by scripts/polaroid-spec.py.\nexport const POLAROID_PAPER_COLOR = \'#EEEDEA\';\nexport const POLAROID_SPEC = Object.freeze('+json.dumps(spec,indent=2).replace('\"paperColor\": \"#EEEDEA\"', '\"paperColor\": POLAROID_PAPER_COLOR')+');\n',
 'dist/styles/polaroid-tokens.css':'/* Generated from the same canonical GLB as polaroid-spec.js. */\n:root {\n'+''.join(f'  --polaroid-{k}: {v};\n' for k,v in css.items())+'}\n'}
for name, content in outputs.items():
    p=root/name
    if '--check' in sys.argv:
        assert p.read_text()==content, f'{name} differs from canonical GLB'
    else: p.write_text(content)
print(json.dumps(spec,indent=2))
