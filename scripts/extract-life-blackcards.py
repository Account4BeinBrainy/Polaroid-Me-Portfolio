from PIL import Image,ImageOps,ImageDraw,ImageCms
import io
import numpy as np,json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'dist/assets/life-journey/black-cards';out.mkdir(parents=True,exist_ok=True)
# Explicit source filenames and manually traced source-pixel contours (1368 x 1824 oriented preview).
cards={
'colombia':('Colombia.JPG',[(201,380),(1192,378),(1180,1510),(1070,1544),(282,1553),(220,1523),(202,352),(202,307),(300,305),(302,352),(365,353),(367,379)],[(201,380),(1192,378),(1180,1547),(220,1553)]),
'dallas':('dallas, TX.JPG',[(221,344),(1190,335),(1204,1458),(1134,1490),(289,1502),(249,1483),(220,324),(221,281),(330,278),(331,322),(381,323),(384,346)],[(221,344),(1190,335),(1204,1494),(249,1505)]),
'italy':('Italy.JPG',[(177,311),(1164,321),(1158,1460),(1091,1497),(252,1507),(189,1478),(175,288),(179,248),(291,247),(292,286),(339,286),(341,312)],[(177,311),(1164,321),(1158,1500),(189,1507)]),
'england':('England.JPG',[(190,278),(1204,286),(1194,1480),(1121,1513),(273,1526),(205,1496),(191,249),(200,208),(310,204),(311,247),(365,249),(365,276)],[(190,278),(1204,286),(1194,1516),(205,1526)]),
'montreal':('Montréal.JPG',[(188,345),(1215,338),(1202,1518),(1119,1550),(278,1558),(221,1536),(188,320),(190,284),(308,280),(309,319),(357,320),(359,344)],[(188,345),(1215,338),(1202,1551),(221,1558)]),
'edmonton':('edmonton.JPG',[(199,287),(1221,285),(1221,1487),(1148,1518),(258,1518),(204,1495),(198,262),(204,222),(313,219),(314,259),(363,259),(364,286)],[(199,287),(1221,285),(1221,1520),(204,1520)]),
'japan':('Japan.JPG',[(176,436),(1147,433),(1157,1588),(1091,1605),(226,1610),(181,1588),(176,414),(179,369),(288,366),(291,412),(338,413),(339,435)],[(176,436),(1147,433),(1157,1607),(181,1612)]),
'china':('china.JPG',[(188,447),(1065,442),(1071,1469),(1008,1497),(257,1505),(196,1480),(187,425),(189,385),(278,382),(280,423),(330,423),(332,447)],[(188,447),(1065,442),(1071,1500),(196,1506)])}
previews=[]
for id,(name,poly,quad) in cards.items():
 im=ImageOps.exif_transpose(Image.open(pathlib.Path('/Users/alison/Desktop')/name))
 if im.info.get('icc_profile'):
  im=ImageCms.profileToProfile(im,ImageCms.ImageCmsProfile(io.BytesIO(im.info['icc_profile'])),ImageCms.createProfile('sRGB'),outputMode='RGB')
 im=im.convert('RGBA').resize((1368,1824),Image.Resampling.LANCZOS)
 mask=Image.new('L',im.size);ImageDraw.Draw(mask).polygon(poly,fill=255);im.putalpha(mask)
 pixels=np.array(im);rgb=pixels[:,:,:3].astype(float);wood=(rgb[:,:,0]>rgb[:,:,1]*1.3)&(rgb[:,:,1]>rgb[:,:,2]*1.15)&(rgb[:,:,0]>65);pixels[wood,3]=0;im=Image.fromarray(pixels)
 w=850;h=1020;tab=72
 dest=[(0,tab),(w,tab),(w,h+tab),(0,h+tab)]
 A=[];b=[]
 for (x,y),(u,v) in zip(dest,quad):
  A += [[x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]];b += [u,v]
 coeff=np.linalg.solve(A,b)
 im=im.transform((w,h+tab),Image.Transform.PERSPECTIVE,coeff,Image.Resampling.BICUBIC)
 im.save(out/f'{id}.png')
 thumb=Image.new('RGB',(260,350),'#eeeeeb');im.thumbnail((230,305));thumb.paste(im,((260-im.width)//2,20),im);ImageDraw.Draw(thumb).text((15,330),id,fill='black');previews.append(thumb)
contact=Image.new('RGB',(1040,700),'white')
for i,im in enumerate(previews):contact.paste(im,((i%4)*260,(i//4)*350))
contact.save(root/'checks/black-cards-preview.jpg')
(out/'sources.json').write_text(json.dumps({id:{'source':name,'output':f'{id}.png'} for id,(name,*_) in cards.items()},ensure_ascii=False,indent=2))
