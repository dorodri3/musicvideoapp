# art1: offline painted backdrop generator (bg plate + fg layer w/ alpha) per world.
# art2: writes *_procedural backups only; bg.jpg is now the painted cinematic plate.
import numpy as np, os, math
from PIL import Image, ImageFilter
W,H=720,1280
OUT='/workspace/light-show/assets/worlds'
R=np.random.default_rng(7)
yy,xx=np.mgrid[0:H,0:W].astype(np.float32); Y=yy/H; X=xx/W

def noise(sx,sy,oct=5,seed=0,pers=0.5):
    r=np.random.default_rng(seed); acc=np.zeros((H,W),np.float32); a=1; tot=0
    for o in range(oct):
        gx,gy=max(2,int(sx*2**o)),max(2,int(sy*2**o))
        g=(r.random((gy,gx))*255).astype(np.uint8)
        acc+=a*np.asarray(Image.fromarray(g).resize((W,H),Image.BICUBIC),np.float32)/255; tot+=a; a*=pers
    return acc/tot
def n1(n,scale,oct=5,seed=0):
    r=np.random.default_rng(seed); acc=np.zeros(n); a=1; tot=0
    for o in range(oct):
        k=max(2,int(scale*2**o)); pts=r.random(k+1)
        acc+=a*np.interp(np.linspace(0,k,n),np.arange(k+1),pts); tot+=a; a*=0.5
    return acc/tot
def C(*c): return np.array(c,np.float32)
def grad(stops):
    img=np.zeros((H,W,3),np.float32); ys=[s[0] for s in stops]
    for ch in range(3): img[...,ch]=np.interp(Y,ys,[s[1][ch] for s in stops])
    return img
def blend(img,col,alpha):
    a=np.clip(alpha,0,1)[...,None]; return img*(1-a)+np.asarray(col,np.float32)*a
def glow(img,cx,cy,rad,col,k=1.0):
    d=np.sqrt(((X-cx)*W)**2+((Y-cy)*H)**2)/(rad*W); return img+np.asarray(col,np.float32)*(np.exp(-d*d)*k)[...,None]
def ridge(img,base,amp,col,scale=3,seed=1,rough=6):
    h=base-amp*n1(W,scale,rough,seed); m=(Y>=h[None,:]); return blend(img,col,m.astype(np.float32)),m
def stars(img,n,seed=3,top=0.6,b=200):
    r=np.random.default_rng(seed)
    for _ in range(n):
        x,y=int(r.random()*W),int(r.random()*H*top); v=b*r.random()**2
        img[y:y+2,x:x+2]+=v
    return img
def clouds(img,col,dens,sx=3,sy=6,seed=5,top=0,bot=1):
    nz=noise(sx,sy,6,seed); band=np.clip((Y-top)/0.08,0,1)*np.clip((bot-Y)/0.08,0,1)
    return blend(img,col,np.clip((nz-(1-dens))*3,0,1)*band)
def pines(rgba_or_img,base_y,n,hmin,hmax,col,seed=9,alpha=False,xr=(0,1)):
    r=np.random.default_rng(seed); img=rgba_or_img
    for _ in range(n):
        cx=(xr[0]+r.random()*(xr[1]-xr[0]))*W; hh=(hmin+r.random()*(hmax-hmin))*H; by=base_y*H+r.random()*20; ww=hh*0.22
        m=(yy<by)&(yy>by-hh)&(np.abs(xx-cx)<ww*((yy-(by-hh))/hh)*(1+0.25*np.sin(yy*0.35)))
        if alpha: img[m]=list(col)+[255]
        else: img[m]=col
    return img
def trunks(rgba,n,col,seed=11,wmin=8,wmax=40):
    r=np.random.default_rng(seed)
    for _ in range(n):
        cx=r.random()*W; w=wmin+r.random()*(wmax-wmin)
        m=np.abs(xx-cx-np.sin(yy*0.004+cx)*6)<w/2; rgba[m]=list(col)+[255]
    return rgba
def grass(rgba,top,col,seed=13,dens=900,hmax=0.12):
    r=np.random.default_rng(seed); base=np.asarray(col)
    rgba[yy>H*(top+hmax*0.7)]=list(col)+[255]
    from PIL import ImageDraw
    im=Image.fromarray(rgba,'RGBA'); d=ImageDraw.Draw(im)
    for _ in range(dens):
        x=r.random()*W; y0=H*(top+hmax*0.7)+r.random()*H*0.05; hh=H*hmax*(0.3+r.random()*0.7); lean=(r.random()-0.5)*40
        c=tuple(int(v) for v in np.clip(base+r.integers(-6,10,3),0,255))+(255,)
        d.line([(x,y0),(x+lean*0.5,y0-hh*0.5),(x+lean,y0-hh)],fill=c,width=2)
    return np.array(im)
def rubble(rgba,top,col,seed=17):
    h=top-0.06*n1(W,8,6,seed)-0.05*(np.abs(np.linspace(-1,1,W))**2)
    rgba[Y>=h[None,:]]=list(col)+[255]; return rgba
def edgefade(rgba,y0=0.55):
    a=rgba[...,3].astype(np.float32); a*=np.clip((Y-y0+0.04)/0.08,0,1)*0+1; rgba[...,3]=a.astype(np.uint8)
    im=Image.fromarray(rgba,'RGBA'); al=im.split()[3].filter(ImageFilter.GaussianBlur(1.5)); im.putalpha(al); return im
def finish(img,name,fg=None,mood_cap=232):
    img=np.clip(img,0,mood_cap)
    img+= (R.random((H,W,1))-0.5)*6
    im=Image.fromarray(np.clip(img,0,255).astype(np.uint8)).filter(ImageFilter.ModeFilter(5)).filter(ImageFilter.SMOOTH)
    d=f'{OUT}/{name}'; os.makedirs(d,exist_ok=True)
    im.save(f'{d}/bg_procedural.jpg',quality=78,optimize=True,progressive=True)
    if fg is not None: fg.save(f'{d}/fg_procedural.webp',quality=72,method=6)
    print(name, os.path.getsize(f'{d}/bg_procedural.jpg')//1024,'KB', (os.path.getsize(f'{d}/fg_procedural.webp')//1024 if fg is not None else '-'))
def newfg(): return np.zeros((H,W,4),np.uint8)
def reflect(img,line,dark=0.55,ripple=6):
    L=int(line*H); src=img[:L][::-1]; n=min(H-L,L)
    off=(np.sin(np.arange(n)[:,None]*0.9+xx[:n]*0.03)*ripple*np.linspace(0.3,1.5,n)[:,None]).astype(int)
    idx=np.clip(xx[:n].astype(int)+off,0,W-1); rows=np.arange(n)[:,None]
    img[L:L+n]=src[rows,idx]*dark+np.array([10,14,22])*(1-dark); return img

def meadow_fauna():
    img=grad([(0,C(60,80,140)),(0.35,C(230,150,120)),(0.5,C(250,200,140)),(1,C(70,90,50))])
    img=glow(img,0.62,0.47,0.35,C(120,80,30),1.0)
    img=clouds(img,C(250,190,170),0.35,4,10,21,0.05,0.42)
    img,_=ridge(img,0.52,0.08,C(120,110,140),3,2); img,_=ridge(img,0.58,0.06,C(90,110,80),4,3)
    img,_=ridge(img,0.66,0.05,C(70,100,50),3,4)
    fl=noise(40,40,2,8)>0.82; m=fl&(Y>0.7); img[m]=img[m]*0.4+C(240,200,120)*0.6
    fg=newfg(); fg=grass(fg,0.84,(22,32,18),dens=1400)
    # deer silhouette
    from PIL import ImageDraw
    im=Image.fromarray(fg,'RGBA'); d=ImageDraw.Draw(im); c=(18,22,16,255); x,y=520,1020
    d.ellipse([x,y,x+90,y+38],fill=c); d.polygon([(x+80,y+10),(x+105,y-30),(x+118,y-26),(x+100,y+18)],fill=c)
    d.ellipse([x+100,y-44,x+128,y-24],fill=c)
    for lx in (8,22,64,78): d.line([(x+lx,y+30),(x+lx+2,y+90)],fill=c,width=5)
    d.line([(x+110,y-42),(x+100,y-70),(x+92,y-80)],fill=c,width=3); d.line([(x+116,y-42),(x+124,y-72),(x+134,y-80)],fill=c,width=3)
    finish(img,'meadow_fauna',edgefade(np.array(im)))
def misty_lake():
    img=grad([(0,C(40,55,90)),(0.4,C(150,160,185)),(0.5,C(190,180,190)),(1,C(30,40,60))])
    img=glow(img,0.3,0.36,0.12,C(90,90,80),1)
    img,_=ridge(img,0.44,0.16,C(70,80,110),3,5); img=blend(img,C(170,175,195),np.exp(-((Y-0.45)/0.03)**2)*0.6)
    img,_=ridge(img,0.5,0.06,C(40,55,70),5,6); img=pines(img,0.5,70,0.02,0.05,C(25,38,45),seed=4)
    img=reflect(img,0.505,0.6)
    img=blend(img,C(200,205,220),np.clip(noise(2,12,5,30)-0.45,0,1)*1.2*np.exp(-((Y-0.52)/0.06)**2))
    fg=newfg(); fg=pines(fg,1.02,7,0.25,0.42,(10,16,20),seed=31,alpha=True,xr=(-0.05,0.25)); fg=pines(fg,1.02,6,0.2,0.38,(10,16,20),seed=32,alpha=True,xr=(0.8,1.05))
    fg=rubble(fg,0.95,(12,18,22),3)
    finish(img,'misty_lake',edgefade(fg))
def forest():
    img=grad([(0,C(40,70,50)),(0.5,C(110,140,100)),(1,C(30,40,25))])
    for k,(col,n,w) in enumerate([((80,105,80),40,10),((55,75,55),26,18),((35,50,35),16,30)]):
        r=np.random.default_rng(40+k)
        for _ in range(n):
            cx=r.random()*W; m=np.abs(xx-cx)<w/2; img[m]=img[m]*0.2+np.array(col)*0.8
        img=blend(img,C(150,170,140),np.full((H,W),0.25,np.float32))
    for sx in (0.3,0.55,0.7):
        sh=np.clip(1-np.abs((X-sx)-(Y*0.25))/0.05,0,1)*np.clip(1-Y,0,1)
        img=img+C(120,110,70)*sh[...,None]*0.5
    img=blend(img,C(40,55,30),np.clip((Y-0.82)/0.1,0,1))
    fg=newfg(); fg=trunks(fg,3,(14,18,12),seed=44,wmin=50,wmax=90); fg[:, int(W*0.2):int(W*0.8)][...,3]=0
    fg=grass(fg,0.88,(16,24,12),seed=45,dens=900,hmax=0.08)
    finish(img,'forest',edgefade(fg))
def dream_clouds():
    img=grad([(0,C(110,120,200)),(0.45,C(230,170,210)),(0.75,C(250,210,190)),(1,C(200,170,220))])
    img=glow(img,0.5,0.4,0.3,C(60,40,20),1)
    for i,(top,bot,col) in enumerate([(0.05,0.3,(245,215,235)),(0.55,0.8,(240,200,225)),(0.78,1.0,(250,225,235))]):
        img=clouds(img,C(*col),0.5,3,6,60+i,top,bot)
    img=stars(img,120,61,0.4,120)
    # floating island
    m=((X-0.3)**2/0.02+(Y-0.42)**2/0.0016<1)&(Y>0.415); img[m]=img[m]*0.3+C(110,90,130)*0.7
    m=((X-0.3)**2/0.02+(Y-0.415)**2/0.0003<1); img[m]=C(150,170,140)
    fg=newfg(); r=noise(4,4,5,66); a=np.clip((r-0.45)*4,0,1)*np.clip((Y-0.82)/0.08,0,1)
    fg[...,0]=240; fg[...,1]=215; fg[...,2]=235; fg[...,3]=(a*230).astype(np.uint8)
    finish(img,'dream_clouds',Image.fromarray(fg,'RGBA'))
def space():
    img=grad([(0,C(5,6,18)),(1,C(12,8,25))])
    n=noise(2,3,6,70); n2=noise(3,4,6,71)
    img=img+C(120,40,140)*(np.clip(n-0.5,0,1)*2.2)[...,None]+C(30,90,160)*(np.clip(n2-0.52,0,1)*2.2)[...,None]
    img=stars(img,900,72,1.0,230)
    d=np.sqrt(((X-0.68)*W)**2+((Y-0.78)*H)**2)/(0.55*W); pm=d<1
    shade=np.clip(1-((X-0.55)*W)/(0.8*W),0,1)
    img[pm]=(C(60,70,110)*(0.25+0.75*shade[...,None]))[pm]*(0.7+0.3*noise(6,10,3,73)[...,None])[pm]
    img=img+C(80,140,220)*(np.exp(-((d-1)/0.02)**2)*0.6)[...,None]
    finish(img,'space',None,225)
def rainy_city():
    img=grad([(0,C(20,25,45)),(0.45,C(55,60,90)),(0.6,C(40,40,60)),(1,C(15,15,25))])
    r=np.random.default_rng(80)
    for layer,(shade,hmin,hmax,base) in enumerate([((45,50,75),0.15,0.3,0.58),((28,30,48),0.2,0.38,0.62)]):
        x=0
        while x<W:
            bw=40+r.random()*90; bh=(hmin+r.random()*(hmax-hmin))*H; top=base*H-bh
            m=(xx>=x)&(xx<x+bw)&(yy>top)&(yy<base*H); img[m]=shade
            for wy in np.arange(top+8,base*H-8,14):
                for wx in np.arange(x+6,x+bw-6,11):
                    if r.random()<0.35:
                        col=r.choice([[255,200,120],[120,200,255],[255,120,180]])
                        img[int(wy):int(wy)+6,int(wx):int(wx)+5]=np.array(col)*0.85
            x+=bw+r.random()*6
    img=glow(img,0.25,0.6,0.25,C(120,40,80),0.6); img=glow(img,0.8,0.62,0.2,C(30,80,130),0.6)
    img=reflect(img,0.62,0.5,3)
    fg=newfg(); rr=np.random.default_rng(81)
    from PIL import ImageDraw
    im=Image.fromarray(fg,'RGBA'); d=ImageDraw.Draw(im)
    for _ in range(500):
        x,y=rr.random()*W,rr.random()*H; d.line([(x,y),(x-4,y+28)],fill=(190,200,230,70),width=1)
    d.rectangle([0,1180,W,H],fill=(10,10,16,255)); d.rectangle([60,700,72,1190],fill=(12,12,18,255)); d.ellipse([40,690,110,712],fill=(255,210,150,200))
    finish(img,'rainy_city',im)
def apocalyptic_warzone():
    img=grad([(0,C(40,25,25)),(0.4,C(150,70,35)),(0.55,C(200,100,40)),(1,C(30,20,18))])
    img=clouds(img,C(50,35,35),0.55,3,8,90,0,0.45)
    img=glow(img,0.6,0.55,0.35,C(140,60,10),0.8)
    r=np.random.default_rng(91); x=0
    while x<W:
        bw=50+r.random()*110; bh=(0.12+r.random()*0.25)*H; top=0.62*H-bh
        jag=n1(int(bw)+1,3,4,int(x))*bh*0.35
        for i in range(int(bw)):
            xi=int(x+i)
            if xi<W: img[int(top+jag[i]):int(0.62*H),xi]=C(35,25,25)
        x+=bw+r.random()*30
    smoke=noise(2,5,6,92); img=blend(img,C(70,55,50),np.clip(smoke-0.45,0,1)*1.6*(Y<0.62))
    img,_=ridge(img,0.66,0.04,C(25,18,16),6,93)
    for _ in range(140):
        ex,ey=int(r.random()*W),int(r.random()*H*0.8); img[ey:ey+2,ex:ex+2]=C(255,170,80)
    fg=newfg(); fg=rubble(fg,0.86,(14,10,10),94)
    from PIL import ImageDraw
    im=Image.fromarray(fg,'RGBA'); d=ImageDraw.Draw(im)
    d.line([(80,1280),(150,880),(170,870)],fill=(14,10,10,255),width=10); d.line([(640,1280),(600,940)],fill=(14,10,10,255),width=14)
    finish(img,'apocalyptic_warzone',edgefade(np.array(im)),220)
def metal_hall():
    img=grad([(0,C(8,6,8)),(0.6,C(30,12,12)),(1,C(12,8,8))])
    for cx,col in [(0.2,(200,40,30)),(0.5,(230,120,40)),(0.8,(200,40,30))]:
        cone=np.clip(1-np.abs(X-cx-(Y-0.05)*(cx-0.5)*0.6)/(0.02+Y*0.18),0,1)*np.clip(1-Y*1.1,0,1)
        img=img+C(*col)*cone[...,None]*0.55
    img=blend(img,C(60,40,40),np.clip(noise(3,6,5,100)-0.5,0,1)*1.2)
    for px in (0.08,0.92):
        m=np.abs(X-px)<0.035; img[m]=img[m]*0.3
    m=(Y>0.62)&(Y<0.66); img[m]=C(40,30,30)
    img=glow(img,0.5,0.6,0.4,C(90,30,10),0.6)
    fg=newfg(); r=np.random.default_rng(101)
    from PIL import ImageDraw
    im=Image.fromarray(fg,'RGBA'); d=ImageDraw.Draw(im); c=(6,5,6,255)
    d.rectangle([0,1150,W,H],fill=c)
    for _ in range(40):
        x=r.random()*W; y=1080+r.random()*90; s=26+r.random()*16
        d.ellipse([x-s/2,y-s/2,x+s/2,y+s/2],fill=c); d.rectangle([x-s*0.8,y+s*0.4,x+s*0.8,H],fill=c)
        if r.random()<0.3: d.line([(x+s*0.4,y),(x+s*0.6+r.random()*20,y-90-r.random()*40)],fill=c,width=9)
    finish(img,'metal_hall',im,215)
def storm():
    img=grad([(0,C(25,30,40)),(0.5,C(70,80,95)),(0.62,C(50,58,70)),(1,C(20,25,32))])
    img=clouds(img,C(35,38,48),0.6,3,6,110,0,0.5); img=clouds(img,C(95,100,115),0.3,4,8,111,0.1,0.45)
    from PIL import ImageDraw
    im=Image.fromarray(np.clip(img,0,255).astype(np.uint8)); d=ImageDraw.Draw(im); r=np.random.default_rng(112)
    x,y=430,120; pts=[(x,y)]
    while y<720: x+=r.integers(-40,40); y+=r.integers(30,70); pts.append((x,y))
    d.line(pts,fill=(200,210,240),width=4)
    img=np.asarray(im.filter(ImageFilter.GaussianBlur(0)),np.float32); img=glow(img,0.6,0.3,0.25,C(60,70,110),0.7)
    sea=noise(10,40,5,113); m=Y>0.62; img[m]=(C(25,32,40)+C(80,90,100)*np.clip(sea-0.55,0,1)[...,None]*3)[m]
    fg=newfg(); fg=rubble(fg,0.9,(10,12,14),114)
    im=Image.fromarray(fg,'RGBA'); d=ImageDraw.Draw(im)
    for _ in range(400):
        x,y=r.random()*W,r.random()*H; d.line([(x,y),(x-12,y+34)],fill=(170,180,200,60),width=1)
    finish(img,'storm',im)
def red_void():
    img=grad([(0,C(30,4,6)),(0.5,C(120,15,20)),(0.62,C(70,8,12)),(1,C(18,2,4))])
    img=blend(img,C(160,40,40),np.clip(noise(2,6,6,120)-0.5,0,1)*1.3)
    img=glow(img,0.5,0.5,0.22,C(110,30,20),0.8)
    m=(np.abs(X-0.5)<0.07)&(Y>0.3)&(Y<0.62); img[m]=C(15,2,3)
    img=reflect(img,0.62,0.45,2)
    finish(img,'red_void',None,210)
def dark_sparse():
    img=grad([(0,C(6,8,14)),(0.55,C(28,32,48)),(0.62,C(16,18,26)),(1,C(5,6,9))])
    img=stars(img,200,130,0.55,90); img=glow(img,0.72,0.2,0.04,C(150,150,160),1.2); img=glow(img,0.72,0.2,0.18,C(30,30,45),0.8)
    img,_=ridge(img,0.62,0.04,C(10,11,16),4,131)
    img=blend(img,C(50,55,70),np.clip(noise(2,14,5,132)-0.5,0,1)*np.exp(-((Y-0.62)/0.05)**2)*1.5)
    fg=newfg()
    from PIL import ImageDraw
    im=Image.fromarray(fg,'RGBA'); d=ImageDraw.Draw(im); c=(4,5,7,255)
    d.rectangle([0,1190,W,H],fill=c); d.line([(170,1200),(180,900),(150,780)],fill=c,width=16)
    d.line([(178,960),(250,880),(300,870)],fill=c,width=8); d.line([(165,850),(110,760)],fill=c,width=7); d.line([(240,890),(260,820)],fill=c,width=5)
    finish(img,'dark_sparse',im,200)
def cathedral_space():
    img=grad([(0,C(15,12,20)),(0.5,C(45,38,50)),(1,C(20,16,20))])
    from PIL import ImageDraw
    for k,(sc,shade) in enumerate([(1.0,40),(0.7,30),(0.5,22)]):
        pass
    for i,px in enumerate([0.12,0.3,0.7,0.88]):
        m=np.abs(X-px)<0.04*(1.3 if px in(0.12,0.88) else 0.8); img[m]=img[m]*0.35
    win=((X-0.5)**2/0.012+(Y-0.25)**2/0.012<1)
    cols=noise(14,24,1,140); hue=np.stack([200*cols,120*(1-cols)+40,220*(1-cols)],-1)
    img[win]=(hue*0.9+30)[win]
    for sx in (0.42,0.5,0.58):
        sh=np.clip(1-np.abs(X-sx-(Y-0.25)*(sx-0.5)*1.5)/(0.03+0.05*Y),0,1)*np.clip((Y-0.25)/0.1,0,1)*np.clip(1.05-Y,0,1)
        img=img+C(170,140,180)*sh[...,None]*0.35
    img=blend(img,C(30,25,30),np.clip((Y-0.7)/0.05,0,1)*0.8)
    fg=newfg(); im=Image.fromarray(fg,'RGBA'); d=ImageDraw.Draw(im); c=(8,6,10,255)
    d.rectangle([0,0,70,H],fill=c); d.rectangle([W-70,0,W,H],fill=c)
    d.pieslice([-40,-300,W+40,500],0,180,fill=(0,0,0,0)); d.rectangle([0,0,W,60],fill=c)
    for r0 in range(6): d.rectangle([90,1000+r0*45,W//2-50,1020+r0*45],fill=c); d.rectangle([W//2+50,1000+r0*45,W-90,1020+r0*45],fill=c)
    finish(img,'cathedral_space',im)
for f in [meadow_fauna,misty_lake,forest,dream_clouds,space,rainy_city,apocalyptic_warzone,metal_hall,storm,red_void,dark_sparse,cathedral_space]: f()
