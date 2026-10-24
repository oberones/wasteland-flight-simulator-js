"""Author 32 original editable low-poly scenery assets. Coordinates below are game meters."""
import math
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
PALETTE = {'rust':'94583d','steel':'737d78','concrete':'a19c87','edge':'bdb49b',
           'soot':'343a38','rock':'595b55','wood':'76634b','grass':'8b8460',
           'green':'637457','rubber':'292d2b','paint':'9aab9f','sand':'a18a69'}
CATALOG = [
 ('bare_tree','Bare branching tree','flora'),('broken_snag','Broken snag','flora'),
 ('fallen_trunk','Fallen trunk','flora'),('thorn_scrub','Thorn scrub','flora'),
 ('hardy_grass','Hardy grass clump','flora'),('green_shrub','Sparse green shrub','flora'),
 ('warehouse','Collapsed warehouse','buildings'),('service_station','Roadside service station','buildings'),
 ('scrap_shack','Scrap shack','buildings'),('hangar','Ruined hangar','buildings'),
 ('water_tower','Damaged water tower','buildings'),
 ('outcrop','Jagged outcrop','landscape'),('rock_stack','Layered rock stack','landscape'),
 ('boulders','Boulder group','landscape'),('scree','Scree patch','landscape'),
 ('slab_field','Fractured concrete slab field','landscape'),
 ('car','Crushed car','wreckage'),('van','Stripped van','wreckage'),
 ('bus','Burned bus','wreckage'),('truck','Cargo truck','wreckage'),
 ('tanker','Tanker trailer','wreckage'),('wagon','Freight wagon','wreckage'),
 ('fuselage','Broken aircraft fuselage','wreckage'),('wing','Detached wing','wreckage'),
 ('sheet_pile','Corrugated sheet pile','debris'),('girders','Bent girders','debris'),
 ('rubble','Concrete rubble with rebar','debris'),('pipes','Pipe bundle','debris'),
 ('barrels','Barrel cluster','debris'),('tires','Tire pile','debris'),
 ('crates','Broken crates','debris'),('engine','Engine machinery','debris')]

def linear(v):
    return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4

def point(p):
    return Vector((p[0]+ORIGIN,-p[2],p[1]))

def finish(obj,name,color):
    obj.name=f'{MODEL}_{name}'
    for c in list(obj.users_collection): c.objects.unlink(obj)
    COLLECTION.objects.link(obj)
    obj.data.materials.clear()
    obj.data.materials.append(MATERIALS[color])
    attr=obj.data.color_attributes.new(name='Palette',type='FLOAT_COLOR',domain='CORNER')
    for c in attr.data: c.color=MATERIALS[color].diffuse_color
    obj.data.color_attributes.active_color=attr
    return obj

def box(name,p,size,color='rust',tilt=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=point(p))
    o=bpy.context.object; o.scale=(size[0],size[2],size[1]); o.rotation_euler.y=tilt
    return finish(o,name,color)

def rod(name,a,b,r=.16,color='rust',sides=5,r2=None):
    start,end=point(a),point(b)
    bpy.ops.mesh.primitive_cone_add(vertices=sides,radius1=r,radius2=r if r2 is None else r2,depth=(end-start).length,location=(start+end)/2)
    o=bpy.context.object; o.rotation_euler=(end-start).to_track_quat('Z','Y').to_euler()
    return finish(o,name,color)

def beam(name,a,b,w=.16,color='rust'):
    start,end=point(a),point(b)
    bpy.ops.mesh.primitive_cube_add(size=1,location=(start+end)/2)
    o=bpy.context.object; o.scale=(w,w,(end-start).length); o.rotation_euler=(end-start).to_track_quat('Z','Y').to_euler()
    return finish(o,name,color)

def mesh(name,verts,faces,color):
    m=bpy.data.meshes.new(name); m.from_pydata([point(v) for v in verts],[],faces); m.update()
    bm=bmesh.new(); bm.from_mesh(m); bmesh.ops.recalc_face_normals(bm,faces=bm.faces); bm.to_mesh(m); bm.free()
    o=bpy.data.objects.new(name,m); COLLECTION.objects.link(o)
    return finish(o,name,color)

def prism(name,profile,z,depth,color='concrete'):
    n=len(profile)
    return mesh(name,[(x,y,zz) for zz in [z-depth/2,z+depth/2] for x,y in profile],
                [list(range(n-1,-1,-1)),list(range(n,n*2))]+[[i,(i+1)%n,(i+1)%n+n,i+n] for i in range(n)],color)

def rock(name,p,size,color='rock',phase=0):
    # Two irregular pentagonal rings plus an offset peak give a fractured silhouette.
    x,y,z=p; sx,sy,sz=size
    vs=[(x+math.cos(i*math.tau/5)*sx*.5,y-.25,z+math.sin(i*math.tau/5)*sz*.5) for i in range(5)]
    vs += [(x+math.cos(i*math.tau/5+.15)*sx*.4,y+sy*(.5+.1*((i+phase)%3)),z+math.sin(i*math.tau/5+.15)*sz*.4) for i in range(5)]
    vs += [(x+sx*.05,y+sy,z-sz*.12)]
    return mesh(name,vs,[list(range(4,-1,-1))]+[[i,(i+1)%5,(i+1)%5+5,i+5] for i in range(5)]+[[5+i,5+(i+1)%5,10] for i in range(5)],color)

def ring(name,center,radius,width,color='rubber',axis='x',sides=8):
    x,y,z=center; vs=[]
    for d in [-width/2,width/2]:
        for r in [radius,radius*.56]:
            for i in range(sides):
                a=i*math.tau/sides
                vs.append((x+d,y+math.cos(a)*r,z+math.sin(a)*r) if axis=='x' else (x+math.cos(a)*r,y+math.sin(a)*r,z+d) if axis=='z' else (x+math.cos(a)*r,y+d,z+math.sin(a)*r))
    fs=[]
    for i in range(sides):
        j=(i+1)%sides
        fs += [[i,j,2*sides+j,2*sides+i],[sides+i,3*sides+i,3*sides+j,sides+j],
               [i,sides+i,sides+j,j],[2*sides+i,2*sides+j,3*sides+j,3*sides+i]]
    return mesh(name,vs,fs,color)

def sheet(name,p,width,depth,color='steel',tilt=0):
    # Solid accordion cross-section; five ridges remain visible at grazing angles.
    x,y,z=p
    profile=[(x-width/2+i*width/8,y+(i%2)*.16+tilt*i/8) for i in range(9)]
    profile += [(xx,yy-.09) for xx,yy in reversed(profile)]
    return prism(name,profile,z,depth,color)

def foundation(w,d):
    box('foundation',(0,-.45,0),(w,1.5,d),'concrete')

def wheels(width,length,r=.55,pairs=2):
    for side in [-1,1]:
        for i in range(pairs):
            z=-length*.32+i*length*.64/(pairs-1)
            ring(f'wheel {side} {i}',(side*width*.46,r-.12,z),r,.32,sides=6)

def vehicle(w,l,h,kind):
    wheels(w,l,.5 if kind=='car' else .65,3 if kind in ['truck','bus'] else 2)
    box('chassis',(0,.5,0),(w*.86,.3,l),'soot')
    box('rusted belly',(0,.85,0),(w,.5,l),'rust')
    if kind=='car':
        prism('crumpled hood',[(-w/2,1),(w/2,1),(w*.4,1.25),(0,1.05),(-w/2,1.35)],-l*.33,l*.25,'paint')
        box('folded roof',(.15,h,-.1),(w*.8,.15,l*.35),'paint',.16)
        for x in [-w*.4,w*.4]:
            beam('windshield pillar',(x,1,-l*.25),(x,h,-l*.12),.1,'steel')
            beam('rear pillar',(x,1,l*.3),(x,h,l*.2),.1,'rust')
        box('exposed seat',(0,1.05,.4),(w*.6,.3,.5),'soot')
        box('rear bumper',(0,.65,l*.5),(w*1.02,.22,.15),'steel')
    elif kind in ['van','bus']:
        for x in [-w/2,w/2]:
            box('side panel',(x,1.25,0),(.12,.7,l),'paint' if kind=='van' else 'soot')
            for z in [-l*.44,-l*.2,l*.07,l*.34]:
                beam('window rib',(x,1.5,z),(x,h,z),.12,'rust')
            beam('roof rail',(x,h,-l*.48),(x,h,l*.48),.15,'rust')
        box('torn roof',(0,h,l*.22),(w,.15,l*.5),'steel')
        for z in [-l*.2,l*.1,l*.3]: box('seat row',(0,1.15,z),(w*.7,.4,.45),'soot')
        box('rear doors',(0,h*.65,l*.49),(w,h*.6,.15),'rust')
    else:
        box('engine hood',(0,1.35,-l*.34),(w,.8,l*.2),'paint')
        for x in [-w*.45,w*.45]:
            box('cab door',(x,1.65,-l*.16),(.15,1.1,l*.18),'rust')
            beam('cab pillar',(x,1.8,-l*.24),(x,h,-l*.2),.13,'steel')
        box('cab roof',(0,h,-l*.16),(w,.16,l*.23),'paint')
        for x in [-w/2,w/2]:
            box('cargo rail',(x,1.35,l*.22),(.16,.6,l*.53),'wood')
            for z in [0,l*.25,l*.48]: beam('bed stake',(x,1,z),(x,2.3,z),.13)


def author():
    if MODEL in ['bare_tree','broken_snag']:
        rod('split trunk',(0,-.3,0),(.3,7 if MODEL=='bare_tree' else 4,.2),.55,'wood',5,.2)
        branches=[((.1,3,0),(-2,5.3,.1)),((.2,4,0),(2.2,6,-.5)),((.3,5.8,.1),(-.8,8,-.4))] if MODEL=='bare_tree' else [((0,2,0),(-1.4,2.7,.2)),((.25,3,.2),(1,4.3,0))]
        for i,(a,b) in enumerate(branches):
            rod('branch',a,b,.22,'wood',5,.06)
            if MODEL=='bare_tree': rod('fork',tuple((a[j]+b[j])*.5 for j in range(3)),(b[0]*1.1,b[1]+1,b[2]+1),.11,'wood',4,.02)
    elif MODEL=='fallen_trunk':
        rod('fallen log',(-3,.3,0),(3,.5,.4),.6,'wood',7,.4)
        rod('broken limb',(0,.45,.2),(.6,1.5,1.6),.22,'wood',5,.06)
        rod('pale cut end',(-3.02,.3,0),(-2.99,.3,0),.4,'sand',7)
    elif MODEL=='thorn_scrub':
        for i in range(6):
            a=i*math.tau/6; end=(math.cos(a)*1.3,1.2+(i%2)*.4,math.sin(a)*1.3)
            rod('thorn stem',(0,-.2,0),end,.09,'wood',4,.02)
            rod('thorn fork',tuple(v*.65 for v in end),(end[0]*.7,end[1]+.5,end[2]*.7),.04,'wood',3,.005)
    elif MODEL=='hardy_grass':
        for i in range(11):
            a=i*2.4; x=math.cos(a)*.6; z=math.sin(a)*.6
            prism('dry blade',[(x-.09,-.15),(x+.09,-.15),(x+.25,.7+(i%3)*.18)],z,.035,'grass')
    elif MODEL=='green_shrub':
        for i in range(4):
            a=i*2.4; x=math.cos(a)*.6; z=math.sin(a)*.6
            rod('stem',(0,-.2,0),(x,1.2,z),.08,'wood',4,.03)
            rock('sparse leaves',(x,.7,z),(1,.7,.8),'green',i)
    elif MODEL=='warehouse':
        foundation(24,17)
        prism('fractured rear wall',[(-12,0),(12,0),(12,4),(7,3),(5,7),(-3,6),(-5,9),(-12,9)],-8,.6)
        for x in [-11,0,11]:
            beam('front pier',(x,0,7),(x,7,7),.4)
            beam('exposed rafter',(x,7,7),(x,10,0),.32)
            beam('rear rafter',(x,10,0),(x,8,-8),.32)
        for x in [-7,0]: sheet('collapsed roof',(x,2,1),7,12,'rust',3)
        box('west wall',(-11.6,3.5,0),(.5,7,15),'steel')
    elif MODEL=='service_station':
        foundation(22,18)
        box('shop rear',(0,2,-6),(14,4,.4),'concrete')
        for x in [-7,7]: box('shop side',(x,2,-3),(.4,4,6),'concrete')
        box('shop roof',(-1,4.1,-3),(12,.3,6),'rust',.04)
        for x in [-8,8]: beam('canopy column',(x,0,6),(x,4.5,6),.25,'steel')
        box('broken canopy',(-1,4.7,5),(19,.25,6),'paint',.03)
        for x in [-5,5]:
            box('pump island',(x,.2,5),(2.5,.4,1.7),'concrete')
            box('fuel pump',(x,1.2,5),(.9,1.7,.7),'rust')
            box('pump display',(x,1.65,5.36),(.6,.4,.025),'soot')
            beam('hanging hose',(x+.65,1.7,5),(x+.8,.2,5),.08,'rubber')
        beam('sign post',(10,0,-4),(10,7,-4),.2,'steel')
        box('blank battered sign',(10,6.5,-4),(2.2,1.2,.15),'paint',.12)
    elif MODEL=='scrap_shack':
        foundation(7,6)
        box('rear patches',(0,1.5,-2.8),(6.5,3,.16),'rust')
        for x in [-3.2,3.2]: box('side sheet',(x,1.4,0),(.18,2.8,5.5),'steel')
        box('door side',(-1.8,1.3,2.8),(2.5,2.6,.15),'wood')
        sheet('slanted roof',(0,3,0),7,6,'rust',-.7)
        beam('antenna',(2.5,2,-2),(2.6,5,-2),.08,'steel')
    elif MODEL=='hangar':
        foundation(28,24)
        for z in [-11,-4,4,11]:
            for side in [-1,1]:
                beam('arch leg',(side*13,0,z),(side*13,6,z),.4,'steel')
                beam('arch shoulder',(side*13,6,z),(side*7,12,z),.4,'steel')
                beam('arch crown',(side*7,12,z),(0,14,z),.4,'steel')
        for x in [-13,13]: box('low side wall',(x,1.5,0),(.4,3,22),'concrete')
        for x in [-7,0,7]: sheet('torn rear roofing',(x,10 if x else 14,-8),7,6,'rust',1 if x<0 else -1)
    elif MODEL=='water_tower':
        foundation(8,8)
        for x in [-3,3]:
            for z in [-3,3]: beam('splayed support',(x,0,z),(x*.7,12,z*.7),.3,'steel')
        for z in [-3,3]:
            beam('cross brace',(-3,1,z),(2.3,10,z*.75),.15)
            beam('cross brace',(3,1,z),(-2.3,10,z*.75),.15)
        vs=[]
        for y in [11,16]:
            for r in [3.7,3.4]:
                for i in range(10):
                    a=i*math.tau/10
                    vs.append((math.cos(a)*r,y-(1.4 if y==16 and i in [2,3] else 0),math.sin(a)*r))
        faces=[]
        for i in range(10):
            j=(i+1)%10
            if i!=2: faces += [[i,j,j+20,i+20],[i+10,i+30,j+30,j+10],[i+20,j+20,j+30,i+30]]
            faces += [[i,i+10,j+10,j]]
        for i in [2,3]: faces += [[i,i+20,i+30,i+10]]
        mesh('ruptured open tank',vs,faces,'rust')
        rod('tank floor',(0,10.9,0),(0,11.1,0),3.7,'soot',10)
        rod('leaking downpipe',(-2,11,0),(-2,2,0),.18,'rust',5)
    elif MODEL=='outcrop':
        for i,(x,z,w,h) in enumerate([(-3,0,5,6),(1,1,5,9),(4,-1,4,5)]): rock('fractured spire',(x,0,z),(w,h,5),'rock',i)
    elif MODEL=='rock_stack':
        for i in range(4): rock('stratum',(i*.35,i*1.05,0),(6-i*.6,1.5,4-i*.4),'rock' if i%2 else 'sand',i)
    elif MODEL in ['boulders','scree','slab_field']:
        count=5 if MODEL=='boulders' else 7
        for i in range(count):
            a=i*2.4; r=1+i*.6; x=math.cos(a)*r; z=math.sin(a)*r
            if MODEL=='slab_field': box('broken slab',(x,0,z),(2.5,.45,1.8),'concrete',.13*(i%3-1))
            else: rock('stone',(x,0,z),(2.5 if MODEL=='boulders' else 1.2,2 if MODEL=='boulders' else .6,2),'rock',i)
    elif MODEL in ['car','van','bus','truck']:
        sizes={'car':(2.3,4.7,1.65),'van':(2.5,5.8,2.8),'bus':(2.8,11,3.3),'truck':(2.8,8.5,3.2)}
        vehicle(*sizes[MODEL],MODEL)
    elif MODEL=='tanker':
        wheels(2.7,9,.65,3)
        box('trailer frame',(0,.6,0),(2.5,.3,9),'soot')
        rod('fuel tank',(0,2,-3.5),(0,2,3.5),1.35,'rust',10)
        for z in [-2,2]: box('tank saddle',(0,1,z),(2.7,.3,.5),'steel')
        rod('filler neck',(0,3.2,0),(0,3.6,0),.35,'steel',6)
    elif MODEL=='wagon':
        wheels(3,12,.65,3)
        box('rail chassis',(0,.65,0),(3,.4,12),'soot')
        for x in [-1.5,1.5]:
            box('freight side',(x,1.7,0),(.14,1.8,12),'rust')
            for z in [-5,-2,1,4]: box('side rib',(x*1.04,1.7,z),(.13,1.9,.15),'steel')
        box('end bulkhead',(0,1.7,-5.9),(3,1.8,.15),'rust')
        for z in [-6.5,6.5]: beam('coupling',(0,.7,z),(0,.7,z*.9),.3,'soot')
    elif MODEL=='fuselage':
        # Open six-sided tubular shell, deliberately torn at both ends.
        vs=[]; n=8
        for end,z in enumerate([-6,5]):
            for i in range(n):
                a=i*math.tau/n
                vs.append((math.cos(a)*1.9,2+math.sin(a)*1.9,z+(i%3)*.5*(1 if end else -1)))
        vs += [(x*.9,2+(y-2)*.9,z) for x,y,z in vs]
        faces=[]
        for i in range(n):
            j=(i+1)%n
            if i!=1: faces += [[i,j,j+n,i+n],[i+2*n,i+3*n,j+3*n,j+2*n],[i,i+2*n,j+2*n,j],[i+n,j+n,j+3*n,i+3*n]]
        for i in [1,2]: faces += [[i,i+n,i+3*n,i+2*n]]
        mesh('torn hollow fuselage',vs,faces,'paint')
        for z in [-4,-1,2]:
            for side in [-1,1]: box('dark window',(side*1.85,2.4,z),(.04,.65,.8),'soot')
        prism('tail remnant',[(-.2,2),(.2,2),(.2,6.5),(-.2,5)],4.5,2,'rust')
        box('interior floor',(0,.45,0),(2.3,.15,10),'soot')
    elif MODEL=='wing':
        mesh('tapered broken wing',[(-6,0,-1.8),(-6,.3,1.4),(5,.3,.6),(7,0,-.6),(-6,.5,-1.8),(-6,.65,1.4),(5,.5,.6),(7,.3,-.6)],[[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]],'paint')
        for x in [-4,-1,2]: beam('exposed wing spar',(x,.7,-1),(x,.7,.9),.12,'rust')
    elif MODEL=='sheet_pile':
        for i in range(2): sheet('folded sheet',(i*.4,i*.25,0),3.5,3,'rust' if i else 'steel',.5)
    elif MODEL=='girders':
        for i in range(2):
            for y in [.1,.5]:
                beam('bent flange',(-2,y+i*.6,i*.5),(0,y+i*.6,i*.5),.22)
                beam('kinked flange',(0,y+i*.6,i*.5),(2,y+i*.6+.7,i*.5+.3),.22)
            box('web',(-1,.3+i*.6,i*.5),(2,.4,.07),'steel')
    elif MODEL=='rubble':
        for i in range(4): rock('concrete fragment',((i%2)*1.5-.8,0,(i//2)*1.5-.7),(2,1,1.5),'concrete',i)
        for i in range(3): beam('exposed rebar',(-1+i*.7,.4,0),(-.6+i*.7,2,1),.055,'rust')
    elif MODEL=='pipes':
        for i in range(3):
            # Open tubes along Z, with visible dark bore and solid end rim.
            ring('open pipe',(i*.8-.8,.3,0),.38,3.5,'steel',axis='z',sides=6)
    elif MODEL=='barrels':
        for i in range(3):
            x=(i%2)*1.1-.55; z=(i//2)*1.1-.4
            rod('drum',(x,-.15,z),(x,1.25,z),.48,'rust',6)
            for y in [.1,1]: rod('hoop',(x,y,z),(x,y+.08,z),.5,'steel',6)
    elif MODEL=='tires':
        for i in range(2): ring('discarded tire',(.35*i,.18+i*.42,0),.7,.4,axis='y',sides=6)
    elif MODEL=='crates':
        for x in [-1,1]:
            box('crate base',(x,.05,0),(1.6,.2,1.6),'wood')
            for z in [-.7,.7]:
                for y in [.4,.85]: box('broken plank',(x,y,z),(1.5,.25,.12),'wood')
            for xx in [x-.7,x+.7]: beam('corner post',(xx,0,-.7),(xx,1.1,-.7),.13,'sand')
    elif MODEL=='engine':
        box('engine block',(0,.6,0),(1.8,1.1,1.5),'soot')
        for x in [-.5,0,.5]: box('cylinder head',(x,1.3,0),(.36,.4,1.4),'steel')
        rod('flywheel',(1,.6,0),(1.3,.6,0),.6,'rust',7)
        for x in [-.5,.5]: beam('exhaust manifold',(x,1,0),(x,1.8,.8),.18,'rust')

bpy.ops.wm.read_factory_settings(use_empty=True)
MATERIALS={}
for name,hexcolor in PALETTE.items():
    m=bpy.data.materials.new(name); m.diffuse_color=tuple(linear(int(hexcolor[i:i+2],16)/255) for i in [0,2,4])+(1,); MATERIALS[name]=m
for index,(MODEL,label,category) in enumerate(CATALOG):
    ORIGIN=index*60
    COLLECTION=bpy.data.collections.new(MODEL+'_EXPORT'); bpy.context.scene.collection.children.link(COLLECTION)
    COLLECTION['originX']=ORIGIN; COLLECTION['label']=label; COLLECTION['category']=category
    COLLECTION['batch']='major' if category in ['buildings','wreckage','landscape'] else 'minor'
    COLLECTION['groundAnchor']=[0.,0.,0.]
    COLLECTION['embedDepth']={'buildings':.35,'wreckage':.5,'landscape':.4}.get(category,.3)
    COLLECTION['maxVariation']={'buildings':1.2,'wreckage':.55,'landscape':.55}.get(category,.3)
    COLLECTION['maxSlope']=.12 if category=='buildings' else .24
    author()
bpy.context.scene['provenance']='32 original project-authored meshes; no external assets, textures, logos, or AI model downloads.'
bpy.context.scene.unit_settings.system='METRIC'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'scenery.blend'))
print('Saved 32 editable scenery collections')
