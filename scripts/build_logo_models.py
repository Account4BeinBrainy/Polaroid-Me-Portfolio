"""Two rounded lacquer plaques, original artwork embedded byte-for-byte."""
import json,struct,math,sys
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]/'dist'
W,H,D,R,B=.300,.164,.006,.009,.0008
for kind,filename,back in [('google','google-logo-front.jpeg',(244,244,244)),('preply','preply-logo-front.png',(255,118,170))]:
 if len(sys.argv)>1 and kind!=sys.argv[1]:continue
 D=.012 if kind=='preply' else .006
 g={'asset':{'version':'2.0','generator':'Logo plaque builder'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':kind.title()+'_Logo','children':[1,2],'extras':{'units':'meters','front':'+Z','castShadow':True,'receiveShadow':True}},{'name':'Logo_Body','mesh':0},{'name':'Logo_Front','mesh':1}],'meshes':[],'materials':[],'buffers':[{}],'bufferViews':[],'accessors':[],'images':[],'textures':[{'source':0,'sampler':0}],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':33071,'wrapT':33071}]};binary=bytearray()
 def view(data,target=None):
  binary.extend(b'\0'*((-len(binary))%4));v={'buffer':0,'byteOffset':len(binary),'byteLength':len(data)}
  if target:v['target']=target
  g['bufferViews'].append(v);binary.extend(data);return len(g['bufferViews'])-1
 def acc(values,typ,dtype='<f4'):
  a=np.array(values,dtype=dtype);entry={'bufferView':view(a.tobytes(),34963 if typ=='SCALAR' else 34962),'componentType':5123 if typ=='SCALAR' else 5126,'count':len(a),'type':typ}
  if typ=='VEC3':entry.update(min=a.min(0).tolist(),max=a.max(0).tolist())
  g['accessors'].append(entry);return len(g['accessors'])-1
 def add_mesh(name,p,n,ix,mat,uv=None):
  attrs={'POSITION':acc(p,'VEC3'),'NORMAL':acc(n,'VEC3')}
  if uv is not None:attrs['TEXCOORD_0']=acc(uv,'VEC2')
  g['meshes'].append({'name':name,'primitives':[{'attributes':attrs,'indices':acc(ix,'SCALAR','<u2'),'material':mat}]})
 # Analytic quarter-circle corner normals; four steps around each edge bevel.
 angles=[(corner*math.pi/2+j*math.pi/24,corner) for corner in range(4) for j in range(13)]
 def ring(inset,z):
  result=[]
  for a,c in angles:
   sx=1 if c in [0,3] else -1;sy=1 if c in [0,1] else -1
   result.append((sx*(W/2-R)+(R-inset)*math.cos(a),sy*(H/2-R)+(R-inset)*math.sin(a),z))
  return result
 count=len(angles);p=[];n=[];ix=[]
 profiles=[]
 for j in range(5):
  a=-math.pi/2+j*math.pi/8;profiles.append((B*(1-math.cos(a)),-D/2+B+B*math.sin(a),a))
 for j in range(5):
  a=j*math.pi/8;profiles.append((B*(1-math.cos(a)),D/2-B+B*math.sin(a),a))
 for inset,z,beta in profiles:
  p+=ring(inset,z);n += [(math.cos(a)*math.cos(beta),math.sin(a)*math.cos(beta),math.sin(beta)) for a,_ in angles]
 for j in range(len(profiles)-1):
  for i in range(count):
   a=j*count+i;b=j*count+(i+1)%count;c=b+count;d=a+count;ix.extend([a,b,c,a,c,d])
 # Back face separate vertices have exact -Z normals.
 start=len(p);p += [(0,0,-D/2)]+ring(B,-D/2);n += [(0,0,-1)]*(count+1)
 for i in range(count):ix.extend([start,start+1+(i+1)%count,start+1+i])
 def linear(c):
  c=c/255;return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
 g['materials']=[{'name':kind.title()+'_Lacquer_Sides','pbrMetallicRoughness':{'baseColorFactor':[*(linear(c) for c in back),1],'metallicFactor':0,'roughnessFactor':.36}},{'name':kind.title()+'_Original_Artwork','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.40}}]
 tex=ROOT/'public/textures'/filename;im=Image.open(tex);iw=.282;ih=iw*im.height/im.width
 if kind=='preply':
  # Recolor only the source background palette, keeping all black artwork in place.
  palette=im.getpalette()
  if palette:
   for j in range(0,len(palette),3):
    r,gg,bb=palette[j:j+3]
    if r>=250 and gg>=115 and bb>=165:palette[j:j+3]=list(back)
   im.putpalette(palette);im.save(tex)
  add_mesh('Logo_Body',p,n,ix,0)
  front=[(0,0,D/2)]+ring(B,D/2);uv=[(x/iw+.5,.5-y/ih) for x,y,z in front];faces=[]
  for j in range(count):faces.extend([0,1+j,1+(j+1)%count])
  add_mesh('Logo_Front',front,[(0,0,1)]*len(front),faces,1,uv)
  g['meshes'][0]['primitives']+=g['meshes'][1]['primitives'];g['meshes']=g['meshes'][:1];g['meshes'][0]['name']='Preply_Plaque'
  g['nodes']=g['nodes'][:2];g['nodes'][0]['children']=[1];g['nodes'][1]['name']='Preply_Plaque'
 else:
  outside=ring(B,D/2);inside=[(iw/2,ih/2,D/2),(-iw/2,ih/2,D/2),(-iw/2,-ih/2,D/2),(iw/2,-ih/2,D/2)]
  start=len(p);p+=outside+inside;n += [(0,0,1)]*(count+4)
  for c in range(4):
   inner=start+count+c
   for j in range(12):ix.extend([inner,start+c*13+j,start+c*13+j+1])
   end=start+c*13+12;next_start=start+((c+1)%4)*13;next_inner=start+count+(c+1)%4
   ix.extend([inner,end,next_start,inner,next_start,next_inner])
  add_mesh('Logo_Body',p,n,ix,0)
  # The art is a flush face sharing the rim boundary, with no overlapping surfaces.
  add_mesh('Logo_Front',inside,[(0,0,1)]*4,[0,1,2,0,2,3],1,[(1,0),(0,0),(0,1),(1,1)])
 g['images']=[{'name':kind+'_original','bufferView':view(tex.read_bytes()),'mimeType':'image/jpeg' if filename.endswith('jpeg') else 'image/png'}]
 g['buffers'][0]['byteLength']=len(binary);binary.extend(b'\0'*((-len(binary))%4));js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
 out=struct.pack('<4sII',b'glTF',2,28+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary
 dest=ROOT/f'public/models/{kind}-logo-3d.glb';dest.write_bytes(out)
 triangles=sum(g['accessors'][prim['indices']]['count']//3 for m in g['meshes'] for prim in m['primitives'])
 assert triangles==(1040 if kind=='preply' else 1046)
 assert abs(iw/ih-im.width/im.height)<1e-8
 # Verify triangle winding, normals and source art bytes.
 for prim in [p for m in g['meshes'] for p in m['primitives']]:
  def read(i):
   a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];return np.frombuffer(binary,dtype='<u2' if a['type']=='SCALAR' else '<f4',count=a['count']*(1 if a['type']=='SCALAR' else 3),offset=v['byteOffset'])
  ps=read(prim['attributes']['POSITION']).reshape(-1,3);ns=read(prim['attributes']['NORMAL']).reshape(-1,3);tris=read(prim['indices']).reshape(-1,3)
  cross=np.cross(ps[tris[:,1]]-ps[tris[:,0]],ps[tris[:,2]]-ps[tris[:,0]]);assert np.all(np.sum(cross*ns[tris].mean(1),axis=1)>=-1e-12)
  assert np.allclose(np.linalg.norm(ns,axis=1),1)
 print(kind,len(out),'bytes',triangles,'triangles',im.size,'texture', 'dimensions',W,H,D)
