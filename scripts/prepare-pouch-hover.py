"""Prepare only a seam and split zipper tape in a copy of the finished v6 pouch."""
import bpy,math
from pathlib import Path
base=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(base.parent/'polaroid-accessories-v6/source/polaroid_accessories_models.blend'))
root=bpy.data.objects['FilterPouch_ROOT'];body=bpy.data.objects['Pouch_MainBody'];old=body.data
assert len(old.vertices)==9*128, 'Unexpected pouch source topology; inspect before preparing seam'
verts=[tuple(v.co) for v in old.vertices];faces=[];N=128;duplicates={}
for j in range(9):
 k=j*N;duplicates[k]=len(verts);verts.append((verts[k][0],-.000005,verts[k][2]));verts[k]=(verts[k][0],.000005,verts[k][2])
for poly in old.polygons:
 face=list(poly.vertices)
 if poly.index%N==N-1:face=[duplicates.get(k,k) for k in face]
 faces.append(face)
mesh=bpy.data.meshes.new('Pouch_SewnOpening');mesh.from_pydata(verts,[],faces);mesh.update()
for mat in old.materials:mesh.materials.append(mat)
uv=mesh.uv_layers.new(name='UVMap')
for i,item in enumerate(old.uv_layers.active.data):uv.data[i].uv=item.uv
for p in mesh.polygons:p.use_smooth=True
body.data=mesh
# Closed rest: two touching halves, rather than a solid bridge that cannot unzip.
tape=bpy.data.objects['Pouch_ZipperTape'];mat=tape.data.materials[0];collection=tape.users_collection[0];bpy.data.objects.remove(tape,do_unlink=True)
for sign in [-1,1]:
 vs=[];fs=[]
 for i in range(65):
  x=-.072+i*.144/64
  for y,z in [(0,.08205),(sign*.0065,.08205),(sign*.0065,.08355),(0,.08355)]:vs.append((x,y,z))
 for i in range(64):
  for k in range(4):fs.append((i*4+k,i*4+(k+1)%4,(i+1)*4+(k+1)%4,(i+1)*4+k))
 fs.extend([(3,2,1,0),(256,257,258,259)])
 m=bpy.data.meshes.new('TapeRail');m.from_pydata(vs,[],fs);m.materials.append(mat);m.update()
 o=bpy.data.objects.new('Pouch_ZipperTape_'+str(sign),m);collection.objects.link(o);o.parent=root
 # Normals are corrected for the mirrored half.
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
bpy.ops.object.select_all(action='DESELECT')
for o in [root]+list(root.children_recursive):
 if not o.get('modeling_tool'):o.hide_set(False);o.select_set(True)
out=base/'dist/public/model/filter-pouch-hover.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
print(out)
