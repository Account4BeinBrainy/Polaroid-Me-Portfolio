"""Append embroidered surface decals without rewriting any source geometry/UV bytes."""
import copy,io,json,struct
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageFilter
ROOT=Path(__file__).resolve().parents[1];MODELS=ROOT/'dist/public/models'
source=(MODELS/'graduation-cap-green-gold.glb').read_bytes();jl=struct.unpack_from('<I',source,12)[0];original=json.loads(source[20:20+jl]);bl=struct.unpack_from('<I',source,20+jl)[0];original_bin=source[28+jl:28+jl+bl]
def accessor(i):
 a=original['accessors'][i];v=original['bufferViews'][a['bufferView']];dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']];width={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']]
 return np.frombuffer(original_bin,dtype=dtype,count=a['count']*width,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,width)
body=original['meshes'][0]['primitives'][0];positions=accessor(body['attributes']['POSITION']);normals=accessor(body['attributes']['NORMAL']);indices=accessor(body['indices']).reshape(-1,3)
def clip(poly,axis,edge,greater):
 out=[]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  ia=(a[axis]>=edge) if greater else (a[axis]<=edge);ib=(b[axis]>=edge) if greater else (b[axis]<=edge)
  if ia:out.append(a)
  if ia!=ib:out.append(a+(b-a)*(edge-a[axis])/(b[axis]-a[axis]))
 return out
for slug,label,color,width,cx in [('uofa','UofA',(213,169,70),.060,-.023),('hec','HEC Montréal',(133,193,236),.100,-.012)]:
 g=copy.deepcopy(original); binary=bytearray(original_bin)
 if slug=='hec':
  for m in g['materials']:
   if m['name'] in ['Emerald_Silk','Golden_Silk']:m['pbrMetallicRoughness']['baseColorFactor']=[.004,.015,.060,1]
 W,H=1024,256;alpha=Image.new('L',(W,H));font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf',160 if slug=='uofa' else 124);draw=ImageDraw.Draw(alpha);bb=draw.textbbox((0,0),label,font=font);tw,th=bb[2]-bb[0],bb[3]-bb[1];draw.text(((W-tw)/2-bb[0],(H-th)/2-bb[1]),label,font=font,fill=255)
 # Thread ridges are in normal and color; no baked light or drop shadow.
 y,x=np.mgrid[:H,:W];a=np.array(alpha)/255;threads=.92+.08*np.cos((x+y*.45)*np.pi*.72);rgb=np.stack([threads*c for c in color],axis=-1).astype('uint8');rgba=np.dstack([rgb,np.array(alpha)])
 height=np.array(alpha.filter(ImageFilter.GaussianBlur(1.4)))/255*.65+a*.10*np.sin((x+y*.45)*np.pi*.72)
 dy,dx=np.gradient(height);nm=np.stack([-dx*2,dy*2,np.ones_like(dx)],axis=-1);nm/=np.linalg.norm(nm,axis=-1,keepdims=True);nm=((nm*.5+.5)*255).astype('uint8')
 def view(data,target=None):
  binary.extend(b'\0'*((-len(binary))%4));v={'buffer':0,'byteOffset':len(binary),'byteLength':len(data)}
  if target:v['target']=target
  g['bufferViews'].append(v);binary.extend(data);return len(g['bufferViews'])-1
 def texture(im,name):
  f=io.BytesIO();im.save(f,format='PNG');g['images'].append({'bufferView':view(f.getvalue()),'mimeType':'image/png','name':name});g['textures'].append({'source':len(g['images'])-1,'sampler':sampler});return len(g['textures'])-1
 g.setdefault('samplers',[]).append({'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071});sampler=len(g['samplers'])-1
 color_tex=texture(Image.fromarray(rgba),'Embroidery_'+slug+'_RGBA');normal_tex=texture(Image.fromarray(nm),'Embroidery_'+slug+'_Normal')
 g['materials'].append({'name':'Embroidery_'+label,'alphaMode':'MASK','alphaCutoff':.45,'doubleSided':False,'pbrMetallicRoughness':{'baseColorTexture':{'index':color_tex},'metallicFactor':0,'roughnessFactor':.64},'normalTexture':{'index':normal_tex,'scale':.55}})
 cy=.134;dh=.026 if slug=='uofa' else .023;xmin,xmax=cx-width/2,cx+width/2;ymin,ymax=cy-dh/2,cy+dh/2
 pv=[];nv=[];uv=[];ix=[]
 for tri in indices:
  if positions[tri,2].min()<0:continue
  poly=[np.r_[positions[k].astype(float),normals[k].astype(float)] for k in tri]
  for axis,edge,gt in [(0,xmin,True),(0,xmax,False),(1,ymin,True),(1,ymax,False)]:
   if poly:poly=clip(poly,axis,edge,gt)
  if len(poly)<3:continue
  start=len(pv)
  for p in poly:
   pv.append([p[0],p[1],p[2]+.00012]);nv.append(p[3:]/np.linalg.norm(p[3:]));uv.append([(p[0]-xmin)/width,1-(p[1]-ymin)/dh])
  for j in range(1,len(poly)-1):ix.extend([start,start+j,start+j+1])
 def acc(values,dtype,typ,target):
  arr=np.array(values,dtype=dtype);a={'bufferView':view(arr.tobytes(),target),'componentType':5126 if dtype=='<f4' else 5123,'count':len(arr),'type':typ}
  if typ=='VEC3':a.update(min=arr.min(0).tolist(),max=arr.max(0).tolist())
  g['accessors'].append(a);return len(g['accessors'])-1
 attrs={'POSITION':acc(pv,'<f4','VEC3',34962),'NORMAL':acc(nv,'<f4','VEC3',34962),'TEXCOORD_0':acc(uv,'<f4','VEC2',34962)}
 g['meshes'].append({'name':'EmbroideryDecal','primitives':[{'attributes':attrs,'indices':acc(ix,'<u2','SCALAR',34963),'material':len(g['materials'])-1}]});g['nodes'].append({'name':'EmbroideryDecal','mesh':len(g['meshes'])-1,'extras':{'text':label,'surfaceOffsetMeters':.00012,'placement':'left front; glTF +Z front'}});g['nodes'][10]['children'].append(len(g['nodes'])-1)
 g['buffers'][0]['byteLength']=len(binary);binary.extend(b'\0'*((-len(binary))%4));js=json.dumps(g,ensure_ascii=False,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
 output=struct.pack('<4sII',b'glTF',2,28+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary
 dest=MODELS/f'graduation-cap-{slug}.glb';dest.write_bytes(output)
 assert binary[:len(original_bin)]==original_bin
 assert g['meshes'][:len(original['meshes'])]==original['meshes']
 assert g['accessors'][:len(original['accessors'])]==original['accessors']
 for i,m in enumerate(original['materials']):
  if slug=='hec' and m['name'] in ['Emerald_Silk','Golden_Silk']:continue
  assert g['materials'][i]==m
 print(slug,'original geometry/UV/materials preserved; decal triangles:',len(ix)//3,'offset: 0.12 mm;',len(output),'bytes')
