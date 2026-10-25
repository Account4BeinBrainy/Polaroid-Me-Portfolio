"""Generate a meter-scale, Y-up GLB. Blender Z-up is converted by exporter."""
import bpy, math, random, json
import numpy as np
from pathlib import Path
from mathutils import Vector
random.seed(12)
ROOT=Path(__file__).resolve().parents[1]/'dist'
OUT=ROOT/'public/models/graduation-cap-green-gold.glb'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
# Tileable tangent-space micro weave, no lighting/AO baked into any material.
n=256
y,x=np.mgrid[0:n,0:n]; h=.5*np.sin(x*2*math.pi/8)*np.cos(y*2*math.pi/8)+.13*np.sin((x+y)*2*math.pi/4)
dx=(np.roll(h,-1,1)-np.roll(h,1,1))*.22; dy=(np.roll(h,-1,0)-np.roll(h,1,0))*.22
pixels=np.stack([-dx,-dy,np.ones_like(dx)],-1); pixels/=np.linalg.norm(pixels,axis=-1,keepdims=True)
pixels=np.concatenate([pixels*.5+.5,np.ones((n,n,1))],-1).astype(np.float32)
img=bpy.data.images.new('Fine_Woven_Normal_256',width=n,height=n); img.colorspace_settings.name='Non-Color'; img.pixels.foreach_set(pixels.ravel()); img.pack()
def mat(name,color,rough,metal=0,weave=False):
 m=bpy.data.materials.new(name); m.use_nodes=True; p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
 if 'Sheen Weight' in p.inputs: p.inputs['Sheen Weight'].default_value=.025 if weave else (.07 if metal==0 else 0)
 if weave:
  tex=m.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=img
  normal=m.node_tree.nodes.new('ShaderNodeNormalMap'); normal.inputs['Strength'].default_value=.32
  m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']); m.node_tree.links.new(normal.outputs['Normal'],p.inputs['Normal'])
 return m
black=mat('Black_Fine_Woven_Cloth',(.006,.007,.009),.78,weave=True)
inner=mat('Black_Inner_Lining',(.006,.007,.009),.9)
green=mat('Emerald_Silk',(.012,.19,.115),.34)
gold=mat('Golden_Silk',(.69,.37,.055),.36)
metal=mat('Satin_Gold_Metal',(.72,.47,.16),.25,.8)
def finish(o,name,m):
 o.name=name; o.data.materials.append(m)
 if o.type=='MESH':
  for p in o.data.polygons:p.use_smooth=True
 return o
def mesh(name,verts,faces,m,uv=None):
 me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update(); o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o); finish(o,name,m)
 if uv:
  layer=me.uv_layers.new(name='UVMap')
  for p in me.polygons:
   for li in p.loop_indices:layer.data[li].uv=uv[me.loops[li].vertex_index]
 return o
def tube(name,points,r,m,res=3):
 c=bpy.data.curves.new(name,'CURVE'); c.dimensions='3D'; c.resolution_u=2; c.bevel_depth=r; c.bevel_resolution=res; c.resolution_u=2
 s=c.splines.new('POLY'); s.points.add(len(points)-1)
 for p,co in zip(s.points,points):p.co=(*co,1)
 c.use_fill_caps=True; o=bpy.data.objects.new(name,c); bpy.context.collection.objects.link(o); o.data.materials.append(m); return o
def sphere(name,pos,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=pos); o=bpy.context.object; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return finish(o,name,m)
# Square board: rounded corners and softly bevelled 4.8 mm rim.
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.118)); top=bpy.context.object; top.dimensions=(.285,.285,.0048); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); finish(top,'Cap_Top',black)
bev=top.modifiers.new('Soft_Edge','BEVEL'); bev.width=.0018; bev.segments=4
bpy.context.view_layer.objects.active=top; bpy.ops.object.modifier_apply(modifier=bev.name)
# Flat board normals plus smooth bevels.
for p in top.data.polygons:p.use_smooth=p.area<.0002
for p in top.data.polygons:
 for li in p.loop_indices:
  co=top.data.vertices[top.data.loops[li].vertex_index].co; top.data.uv_layers.active.data[li].uv=(co.x*28,co.y*28)
# Tailored hollow crown. Five broad diagonal folds, gentle asymmetry, closed hem.
N=96; M=20; verts=[]; uvs=[]
def body_point(a,t,inset=0):
 wave=math.sin(math.pi*t)**1.4
 folds=(.0035*math.sin(5*a+4*t)+.0018*math.sin(9*a-5*t)+.0012*math.sin(3*a+9*t))*wave
 radius=1+.09*math.sin(math.pi*t)-.035*t
 z=.019+.095*t+.004*math.cos(a+.3)*(1-t)**2+.002*math.sin(3*a)*wave
 return ((.088*radius+folds-inset)*math.cos(a),(.098*radius+folds-inset)*math.sin(a),z)
for side in range(2):
 for j in range(M+1):
  for i in range(N+1):
   a=i/N*2*math.pi; verts.append(body_point(a,j/M,.0011*side)); uvs.append((i/N*15,j/M*3))
faces=[]; stride=N+1; layer=stride*(M+1)
for side in range(2):
 for j in range(M):
  for i in range(N):
   k=side*layer+j*stride+i; f=(k,k+1,k+stride+1,k+stride); faces.append(f if side==0 else f[::-1])
for j in [0,M]:
 for i in range(N):
  k=j*stride+i; faces.append((k,k+layer,k+layer+1,k+1) if j==0 else (k,k+1,k+layer+1,k+layer))
body=mesh('Cap_Body',verts,faces,black,uvs); body.data.materials.append(inner)
for p in body.data.polygons:
 if M*N<=p.index<2*M*N:p.material_index=1
# Restrained sewn hem and four panel seams.
for j in [0,.025]: tube('Cap_Hem', [body_point(i/192*2*math.pi,j) for i in range(193)],.00065,black,2)
for a in [.3,math.pi/2+.3,math.pi+.3,math.pi*1.5+.3]:tube('Cap_Seam',[body_point(a,j/32) for j in range(33)],.00027,black,1)
sphere('Cap_Button',(0,0,.122),(.008,.008,.0028),black)
# Cord rests on board, turns over right/front edge, then hangs vertically.
# Cubic Bezier through manually art-directed anchor handles.
def bez(a,b,c,d,count):
 a,b,c,d=map(np.array,(a,b,c,d));return [tuple((1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d) for t in np.linspace(0,1,count)]
path=bez((0,0,.123),(.025,-.018,.125),(.09,-.053,.123),(.14,-.065,.123),65)+bez((.14,-.065,.123),(.154,-.065,.123),(.155,-.065,.106),(.157,-.065,.077),40)[1:]
for strand in range(3):
 pts=[]
 for i,p in enumerate(path):
  tangent=Vector(path[min(i+1,len(path)-1)])-Vector(path[max(0,i-1)]); tangent.normalize(); u=tangent.cross(Vector((0,1,0))).normalized(); v=tangent.cross(u).normalized(); angle=i*.92+strand*math.tau/3
  pts.append(Vector(p)+.00065*(math.cos(angle)*u+math.sin(angle)*v))
 tube('Tassel_Cord',pts,.00075,green,2)
# Green knot winds around the cord and a split green/gold silk head.
for j in range(3):tube('Tassel_Knot',[(.157+.0026*math.cos(a),-.065+.0026*math.sin(a),.077-j*.0013+.0004*math.sin(2*a)) for a in np.linspace(0,math.tau,41)],.00075,green,2)
sphere('Tassel_Head',(.157,-.065,.066),(.0045,.0045,.008),green)
# Individual smooth strands, grouped by color on opposite sides rather than random stripes.
for i in range(72):
 a=i*2.399963; rr=.0041*math.sqrt((i+.5)/72); ox=rr*math.cos(a); oy=rr*math.sin(a); m=gold if ox+oy<0 else green
 length=.125+random.uniform(-.003,.003)
 pts=[]
 for j in range(13):
  t=j/12; spread=1+.48*t*t; pts.append((.157+ox*spread+.006*t*t+.00035*math.sin(t*9+a)*t,-.065+oy*spread+.002*math.sin(t*3)*t,.057-length*t))
 tube('Tassel_Bundle',pts,.00043,m,1)
 # Strands continue through the rounded head.
 tube('Tassel_Head',[(.157+ox*math.sin(t*math.pi/2),-.065+oy*math.sin(t*math.pi/2),.074-.014*t) for t in np.linspace(0,1,9)],.0004,m,1)
bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.0052,depth=.010,location=(.157,-.065,.058)); band=finish(bpy.context.object,'Tassel_Band',metal)
b=band.modifiers.new('Rounded_Metal_Edge','BEVEL'); b.width=.00055;b.segments=3;bpy.context.view_layer.objects.active=band;bpy.ops.object.modifier_apply(modifier=b.name)
for z in [.0538,.055,.057,.059,.061,.0622]:tube('Tassel_Band',[(.157+.00517*math.cos(a),-.065+.00517*math.sin(a),z) for a in np.linspace(0,math.tau,49)],.00017,metal,1)
# Convert and consolidate by semantic part: few draw calls, readable node names.
for o in list(bpy.context.scene.objects):
 bpy.ops.object.select_all(action='DESELECT'); o.select_set(True);bpy.context.view_layer.objects.active=o
 if o.type=='CURVE':bpy.ops.object.convert(target='MESH')
for prefix in ['Cap_Hem','Cap_Seam','Tassel_Cord','Tassel_Knot','Tassel_Head','Tassel_Bundle','Tassel_Band']:
 obs=[o for o in bpy.context.scene.objects if o.name.startswith(prefix)]
 if obs:
  bpy.ops.object.select_all(action='DESELECT')
  for o in obs:o.select_set(True)
  bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();obs[0].name=prefix
# Origin centered on board X/Y and lowest tassel point at ground Y=0 after export.
low=min((o.matrix_world@v.co).z for o in bpy.context.scene.objects for v in o.data.vertices)
for o in bpy.context.scene.objects:
 o.location.z-=low
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.select_set(False)
root=bpy.data.objects.new('Graduation_Cap_Green_Gold',None);bpy.context.collection.objects.link(root)
for o in list(bpy.context.scene.objects):
 if o!=root:o.parent=root
root['units']='meters';root['up_axis']='Y (glTF)';root['front_axis']='+Z (glTF)';root['description']='Black woven mortarboard; emerald and golden silk tassel; satin gold band. No baked shadows.'
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',export_yup=True,export_apply=True,export_cameras=False,export_lights=False,export_extras=True)
print('EXPORTED',OUT,OUT.stat().st_size)

# Separate studio QA render; lights and floor are added AFTER GLB export.
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.world.color=(.32,.32,.32)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.0005)); floor=bpy.context.object; floor.data.materials.append(mat('Preview_Only_Ivory',(.92,.91,.88),.9))
def area(pos,power,size):
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.12))-o.location).to_track_quat('-Z','Y').to_euler()
area((-.35,-.4,.6),5,.38);area((.4,-.1,.4),2,.3);area((0,.35,.5),4,.25)
bpy.ops.object.camera_add(location=(.37,-.55,.39));camera=bpy.context.object;camera.rotation_euler=(Vector((.01,0,.12))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=.48;scene.camera=camera
scene.render.resolution_x=1100;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ROOT/'demo/graduation-cap-studio.png');bpy.ops.render.render(write_still=True)
