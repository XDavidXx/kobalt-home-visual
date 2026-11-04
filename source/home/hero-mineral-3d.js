/* Kobalt: real, closed 3D geometry. No photograph, depth card or projected texture.
 * Procedural geode + individual faceted crystals + traversable cave + metal network.
 * All four scenes share one camera and are driven by native scroll position.
 */
(async () => {
  'use strict';
  const story=document.querySelector('.hero-story'),stage=story?.querySelector('.mineral-stage');
  const hero=story?.querySelector('.hero-mineral'),canvas=story?.querySelector('.mineral-scene');
  const copy=hero?.querySelector('.mineral-content'),statement=story?.querySelector('.scene-statement');
  if(!stage||!canvas||!copy||!statement)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  let alive=true,ready=false,visible=true,raf=0,resizeRAF=0,last=0,time=0,p=0,target=0,range=1,width=1,height=1;
  let renderer,composer,scene,camera,bloom,environment;
  const events=[],geometries=new Set(),materials=new Set(),pointer={x:0,y:0},mouse={x:0,y:0};
  const on=(el,event,fn,opts)=>{el.addEventListener(event,fn,opts);events.push(()=>el.removeEventListener(event,fn,opts));};
  function fallback(error){ready=false;cancelAnimationFrame(raf);story.classList.remove('is-scroll-scene');story.dataset.mineralScene='fallback';copy.style.visibility='';if(error)console.warn('Kobalt 3D: static fallback.',error.message);}
  try {
    const base=new URL('assets/hero/vendor/',document.baseURI).href;
    const [T,{EffectComposer},{RenderPass},{UnrealBloomPass},{OutputPass},{RoomEnvironment}]=await Promise.all([
      import(base+'three.module.min.js'),import(base+'examples/jsm/postprocessing/EffectComposer.js'),import(base+'examples/jsm/postprocessing/RenderPass.js'),import(base+'examples/jsm/postprocessing/UnrealBloomPass.js'),import(base+'examples/jsm/postprocessing/OutputPass.js'),import(base+'examples/jsm/environments/RoomEnvironment.js')
    ]);
    if(!alive)return;
    renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;renderer.info.autoReset=false;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    scene=new T.Scene();scene.background=new T.Color('#02050c');scene.fog=new T.FogExp2('#02050c',.012);
    camera=new T.PerspectiveCamera(42,1,.035,100);camera.position.set(0,1.05,10.8);
    const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();scene.environmentIntensity=.65;
    composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
    bloom=new UnrealBloomPass(new T.Vector2(800,600),.45,.55,1.25);composer.addPass(bloom);composer.addPass(new OutputPass());
    const geo=g=>{geometries.add(g);return g;},mat=m=>{materials.add(m);return m;};
    let seed=846231;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const fract=x=>x-Math.floor(x),hash=(x,y,z)=>fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);
    function noise(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let fx=x-ix,fy=y-iy,fz=z-iz;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);const mix=(a,b,t)=>a+(b-a)*t;return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),fx),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),fx),fy),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),fx),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),fx),fy),fz);}
    const fbm=(x,y,z)=>noise(x,y,z)*.55+noise(x*2.04,y*2.04,z*2.04)*.27+noise(x*4.2,y*4.2,z*4.2)*.12+noise(x*8.3,y*8.3,z*8.3)*.06;
    const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),up=V(0,1,0),dummy=new T.Object3D();
    const rockMaterial=mat(new T.MeshStandardMaterial({color:0x686271,roughness:.89,metalness:.12,vertexColors:true}));
    // Object-space procedural grain, shading actual rock geometry rather than a photo.
    const grainShader=`
      varying vec3 vMineralPosition;
      float mh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float mn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(mh(i),mh(i+vec3(1,0,0)),f.x),mix(mh(i+vec3(0,1,0)),mh(i+vec3(1,1,0)),f.x),f.y),mix(mix(mh(i+vec3(0,0,1)),mh(i+vec3(1,0,1)),f.x),mix(mh(i+vec3(0,1,1)),mh(i+vec3(1,1,1)),f.x),f.y),f.z);}
    `;
    rockMaterial.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 vMineralPosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMineralPosition=position;');
      shader.fragmentShader=grainShader+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=mn(vMineralPosition*95.);diffuseColor.rgb*=.58+grain*.65;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nfloat relief=mn(vMineralPosition*62.)*.014+mn(vMineralPosition*145.)*.004;vec3 qx=dFdx(vViewPosition),qy=dFdy(vViewPosition);vec3 b1=cross(qy,normal),b2=cross(normal,qx);float det=dot(qx,b1);normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*b1+dFdy(relief)*b2));');
    };
    function surface(theta,t,back=false,open=0){
      const c=Math.cos(theta),s=Math.sin(theta),edge=1+.085*Math.sin(theta*3+.4)+.035*Math.sin(theta*7);
      const rx=(.115+open*.68)*(1-t)+2.8*t*edge,ry=(.55+open*.14)*(1-t)+1.46*t*edge;
      const x=c*rx,y=s*ry;
      const rough=(fbm(x*4,y*4,t*3)-.5)*.29+(noise(x*19,y*19,2)-.5)*.055;
      const z=back?-.55-.42*Math.sin(t*Math.PI)+rough:.52+.60*Math.sin(t*Math.PI)+rough;
      return V(x,y,z);
    }
    function geodeGeometry(){
      const positions=[],opened=[],colors=[],indices=[],segments=160,rings=28;
      for(let side=0;side<2;side++)for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
        const theta=i/segments*Math.PI*2,t=j/rings,a=surface(theta,t,!!side,0),b=surface(theta,t,!!side,1);
        positions.push(a.x,a.y,a.z);opened.push(b.x,b.y,b.z);
        const n=fbm(a.x*5,a.y*5,a.z*5),shade=.36+n*.48;colors.push(shade*.9,shade*.87,shade);
      }
      const layer=(rings+1)*(segments+1);
      for(let side=0;side<2;side++)for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){
        const a=side*layer+j*(segments+1)+i,b=a+1,c=a+segments+1,d=c+1;
        if(side)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
      }
      for(let i=0;i<segments;i++)for(const ring of [0,rings]){
        const a=ring*(segments+1)+i,b=a+1,c=a+layer,d=b+layer;
        if(ring===0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
      }
      const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
      g.morphAttributes.position=[new T.Float32BufferAttribute(opened,3)];return g;
    }
    const mineral=new T.Group();mineral.rotation.z=.27;scene.add(mineral);
    const body=new T.Mesh(geodeGeometry(),rockMaterial);body.castShadow=body.receiveShadow=true;mineral.add(body);
    function crystalGeometry(sides=4,morph=false){
      const rings=[[.64,-.35],[1,-.1],[.8,.4],[.17,.73]],boxRings=[[.72,-.5],[1,-.38],[1,.38],[.72,.5]],positions=[],targetPositions=[];
      const at=(r,i,target=false)=>{const a=(i%sides)/sides*Math.PI*2+Math.PI/4,[radius,y]=(target?boxRings:rings)[r];return [Math.cos(a)*radius,y,Math.sin(a)*radius];};
      const tri=(a,b,c)=>{for(const [r,i] of [a,b,c]){positions.push(...at(r,i));targetPositions.push(...at(r,i,true));}};
      for(let r=0;r<3;r++)for(let i=0;i<sides;i++){tri([r,i],[r+1,i],[r,i+1]);tri([r,i+1],[r+1,i],[r+1,i+1]);}
      for(let i=1;i<sides-1;i++){tri([0,0],[0,i],[0,i+1]);tri([3,0],[3,i+1],[3,i]);}
      const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();
      if(morph){
        g.morphAttributes.position=[new T.Float32BufferAttribute(targetPositions,3)];
        const endGeometry=new T.BufferGeometry();endGeometry.setAttribute('position',new T.Float32BufferAttribute(targetPositions,3));endGeometry.computeVertexNormals();g.morphAttributes.normal=[endGeometry.getAttribute('normal').clone()];endGeometry.dispose();
      }return g;
    }
    const crystalGeometries=[crystalGeometry(4),crystalGeometry(5),crystalGeometry(6)];
    const crystalMaterial=mat(new T.MeshPhysicalMaterial({color:0x3874d8,metalness:.86,roughness:.20,clearcoat:.25,clearcoatRoughness:.16,envMapIntensity:.9}));
    const crystalGroups=[],crystalStates=[];let crystalTotal=0;
    for(let kind=0;kind<3;kind++){
      const count=kind===0?900:kind===1?580:360,instances=new T.InstancedMesh(crystalGeometries[kind],crystalMaterial,count),states=[];
      instances.instanceMatrix.setUsage(T.DynamicDrawUsage);instances.castShadow=instances.receiveShadow=true;
      for(let i=0;i<count;i++){
        const theta=rand()*Math.PI*2,t=.06+Math.pow(rand(),.85)*.88,back=i>count*.9;
        const pos=surface(theta,t,back),shift=surface(theta,t,back,1).sub(pos);
        let normal;
        if(back)normal=V(pos.x*.13,pos.y*.2,-1).normalize();else{
          const da=surface(theta+.003,t).sub(pos),dt=surface(theta,Math.min(.999,t+.003)).sub(pos);normal=da.cross(dt).normalize();if(normal.z<0)normal.negate();
        }
        const quat=new T.Quaternion().setFromUnitVectors(up,normal);quat.multiply(new T.Quaternion().setFromAxisAngle(up,rand()*Math.PI*2));
        const size=kind===0?.04+Math.pow(rand(),2)*.23:.025+Math.pow(rand(),2)*.13;
        const scale=V(size,size*(.65+rand()*.9),size*(.75+rand()*.5));
        dummy.position.copy(pos);dummy.quaternion.copy(quat);dummy.scale.copy(scale);dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);
        const color=new T.Color().setHSL(.57+rand()*.045,.72+rand()*.22,.24+rand()*.2);instances.setColorAt(i,color);
        states.push({pos,shift,quat,scale});
      }
      mineral.add(instances);crystalGroups.push(instances);crystalStates.push(states);crystalTotal+=count;
    }
    const veinMaterial=mat(new T.MeshBasicMaterial({color:new T.Color(.15,1.3,4),transparent:true,opacity:.14}));
    const veins=[];
    for(let i=0;i<9;i++){
      const theta=i/9*Math.PI*2+.2,pts=[];
      for(let j=0;j<18;j++){const t=.03+j/17*.86,a=surface(theta+Math.sin(j*1.8+i)*.028,t);a.z+=.034;pts.push(a);}
      const line=new T.Mesh(geo(new T.TubeGeometry(new T.CatmullRomCurve3(pts),48,.006,5,false)),veinMaterial);mineral.add(line);veins.push(line);
    }
    // A real, open tunnel extends behind the slit; the camera travels down its axis.
    const interior=new T.Group();scene.add(interior);
    const caveMaterial=rockMaterial.clone();materials.add(caveMaterial);caveMaterial.onBeforeCompile=rockMaterial.onBeforeCompile;caveMaterial.side=T.BackSide;caveMaterial.color.set(0x38436a);caveMaterial.vertexColors=false;
    function caveGeometry(){
      const pos=[],idx=[],sides=80,rings=100;
      for(let j=0;j<=rings;j++)for(let i=0;i<=sides;i++){
        const a=i/sides*Math.PI*2,z=-.5-j/rings*19,r=1.05+j/rings*.95+(noise(Math.cos(a)*4,Math.sin(a)*4,z*.5)-.5)*.24;
        pos.push(Math.cos(a)*r,Math.sin(a)*r,z);
      }
      for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){const a=j*(sides+1)+i,b=a+1,c=a+sides+1,d=c+1;idx.push(a,c,b,b,c,d);}
      const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;
    }
    const cave=new T.Mesh(caveGeometry(),caveMaterial);interior.add(cave);
    const tunnelCrystals=new T.InstancedMesh(crystalGeometries[1],crystalMaterial,300);tunnelCrystals.castShadow=false;
    for(let i=0;i<300;i++){
      const z=-.8-rand()*17.5,a=rand()*Math.PI*2,r=1.1+(-z/19)*.9;
      dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,z);dummy.quaternion.setFromUnitVectors(up,V(-Math.cos(a),-Math.sin(a),0));dummy.rotateY(rand()*6.28);dummy.scale.setScalar(.10+rand()*.21);dummy.scale.y*=1.5;dummy.updateMatrix();tunnelCrystals.setMatrixAt(i,dummy.matrix);
    }
    interior.add(tunnelCrystals);
    const caveVeinMaterial=mat(new T.MeshBasicMaterial({color:new T.Color(.04,.5,2.4)}));
    for(let k=0;k<5;k++){
      const pts=[];for(let j=0;j<=30;j++){const z=-.7-j/30*19,a=k/5*Math.PI*2+Math.sin(j*.6)*.08,r=1.01+(-z/19)*.91;pts.push(V(Math.cos(a)*r,Math.sin(a)*r,z));}
      interior.add(new T.Mesh(geo(new T.TubeGeometry(new T.CatmullRomCurve3(pts),100,.009,5,false)),caveVeinMaterial));
    }
    // End of the mineral: crystalline geometry morphs into beveled metal modules.
    const architecture=new T.Group(),architecturePivot=new T.Group();architecturePivot.position.z=-26;architecture.position.z=26;architecturePivot.add(architecture);scene.add(architecturePivot);
    const morphGeometry=crystalGeometry(4,true);
    const metalMaterial=mat(new T.MeshPhysicalMaterial({color:0x3668d9,metalness:.85,roughness:.26,clearcoat:.3,envMapIntensity:.9}));
    const modules=[];
    for(let i=0;i<32;i++){
      const angle=i/32*Math.PI*2,r=1.55+(i%3)*.13;
      const start=V(Math.cos(angle)*r,Math.sin(angle)*r,-12-(i%5)*1.3);
      const cluster=Math.floor(i/4),cell=i%4,a=cluster/8*Math.PI*2+Math.PI/8;
      const end=V(Math.cos(a)*3+(cell%2-.5)*.57,Math.sin(a)*2.1+(Math.floor(cell/2)-.5)*.57,-27+(cluster%2)*1.4);
      const mesh=new T.Mesh(morphGeometry,metalMaterial);mesh.position.copy(start);mesh.scale.setScalar(.32);mesh.quaternion.setFromUnitVectors(up,V(-Math.cos(angle),-Math.sin(angle),.15).normalize());
      architecture.add(mesh);modules.push({mesh,start,end,quat:mesh.quaternion.clone(),targetQuat:new T.Quaternion().setFromEuler(new T.Euler(.12,.25,0)),startScale:V(.32,.58,.32),endScale:V(.29,.40,.26)});
    }
    const coreMaterial=mat(new T.MeshPhysicalMaterial({color:0x1b50e0,metalness:.58,roughness:.15,clearcoat:1,emissive:0x113cc2,emissiveIntensity:.12,envMapIntensity:2}));
    const core=new T.Mesh(morphGeometry,coreMaterial);core.morphTargetInfluences[0]=1;core.position.set(0,0,-26);core.scale.set(.64,.82,.64);architecture.add(core);
    const edgeMaterial=mat(new T.LineBasicMaterial({color:0x6a9cff,transparent:true,opacity:.65}));
    const coreEdges=new T.LineSegments(geo(new T.EdgesGeometry(new T.BoxGeometry(1.42,1,1.42))),edgeMaterial);core.add(coreEdges);
    const plates=[],plateGeometry=geo(new T.BoxGeometry(1.13,1.15,.10)),plateMaterial=mat(new T.MeshStandardMaterial({color:0x102137,metalness:.75,roughness:.3}));
    for(let i=0;i<8;i++){
      const a=i/8*Math.PI*2+Math.PI/8,plate=new T.Mesh(plateGeometry,plateMaterial);
      plate.position.set(Math.cos(a)*3,Math.sin(a)*2.1,-27+(i%2)*1.4-.24);plate.rotation.set(.12,.25,0);
      const edges=new T.LineSegments(geo(new T.EdgesGeometry(plateGeometry)),edgeMaterial);plate.add(edges);architecture.add(plate);plates.push(plate);
    }
    const connectionMaterial=mat(new T.MeshBasicMaterial({color:new T.Color(.04,.2,.8),transparent:true,opacity:0}));
    const pulseMaterial=mat(new T.MeshBasicMaterial({color:new T.Color(.6,2,7)}));
    const connections=[],pulseGeometry=geo(new T.SphereGeometry(.035,8,6));
    for(const i of [0,4,8,12,16,20,24,28]){
      const b=modules[i].end,pts=[V(0,0,-26),V(b.x*.42,0,-25.8),V(b.x*.42,b.y,-26),b.clone()];
      const path=new T.CatmullRomCurve3(pts,false,'centripetal'),tube=new T.Mesh(geo(new T.TubeGeometry(path,44,.013,6,false)),connectionMaterial),pulse=new T.Mesh(pulseGeometry,pulseMaterial);
      architecture.add(tube,pulse);connections.push({pulse,path,phase:rand()});
    }
    // Lights and environment create the surface, reflections and depth in real time.
    scene.add(new T.HemisphereLight(0x96bfff,0x10111e,.24));
    const key=new T.DirectionalLight(0xe8f2ff,1.9);key.position.set(-3.5,5.5,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.5,far:20});key.shadow.bias=-.00025;key.shadow.normalBias=.025;scene.add(key);
    const rim=new T.DirectionalLight(0x377fff,1.9);rim.position.set(4,1,-2);scene.add(rim);
    const fill=new T.DirectionalLight(0x9ebdff,.45);fill.position.set(-5,-2,2);scene.add(fill);
    const portalLight=new T.PointLight(0x467fff,0,7,2);portalLight.position.set(0,.15,1.2);scene.add(portalLight);
    for(const z of [-3,-8,-13,-19,-26]){const l=new T.PointLight(z===-26?0xc5ddff:0x3c77ff,z===-26?12:3.5,9,2);l.position.set(.3,.3,z);scene.add(l);}
    const beamGroup=new T.Group();scene.add(beamGroup);
    const beamMaterial=mat(new T.MeshBasicMaterial({color:new T.Color(.8,2,6),transparent:true,opacity:.2,depthWrite:false}));
    const beamCore=new T.Mesh(geo(new T.CylinderGeometry(.009,.009,9,10)),beamMaterial);beamCore.position.set(0,4.5,1);beamGroup.add(beamCore);
    const haloMaterial=mat(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{strength:{value:.12}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float strength;void main(){float d=length((vUv-.5)*2.);float a=exp(-d*d*7.)*strength;gl_FragColor=vec4(.12,.38,1.,a);}' }));
    const halo=new T.Mesh(geo(new T.PlaneGeometry(1.8,1.8)),haloMaterial);halo.position.set(0,.05,1.23);scene.add(halo);
    const starsGeometry=geo(new T.BufferGeometry()),starPositions=[];
    for(let i=0;i<800;i++){const r=18+rand()*20,a=rand()*Math.PI*2,b=Math.acos(rand()*2-1);starPositions.push(r*Math.sin(b)*Math.cos(a),r*Math.cos(b),r*Math.sin(b)*Math.sin(a)-8);}
    starsGeometry.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));const stars=new T.Points(starsGeometry,mat(new T.PointsMaterial({color:0x7291cc,size:.018,transparent:true,opacity:.52,depthWrite:false})));scene.add(stars);
    const look=V(),startCam=V(),cameraTarget=V(),black=new T.Color('#02050c'),white=new T.Color('#ffffff'),blueMetal=new T.Color(0x3668d9),silverMetal=new T.Color(0x40546d);
    let lastOpening=-1,lastMorph=-1;
    function animation(){
      const wake=smooth(.015,.15,p),opening=smooth(.14,.37,p),enter=smooth(.15,.43,p),travel=smooth(.43,.71,p),morph=smooth(.60,.79,p),settle=smooth(.71,.85,p),wash=smooth(.84,.97,p);
      const isMobile=width<700;
      const startZ=isMobile?Math.max(17.5,3.35/(Math.tan(Math.PI*21/180)*camera.aspect)):10.8,startY=isMobile?.7:1.05;
      startCam.set(mouse.x*.20*(1-enter),startY+mouse.y*.12*(1-enter),startZ);
      cameraTarget.set(0,0,.42);
      camera.position.copy(startCam).lerp(cameraTarget,enter);
      if(p>.43)camera.position.z=.42+(-15.7-.42)*travel;
      if(p>.71){camera.position.z=-15.7+(-18+15.7)*settle;camera.position.y=.15*settle;}
      look.set(0,(isMobile?-2.1:-.8)*(1-enter),-5-23*travel);
      camera.lookAt(look);halo.quaternion.copy(camera.quaternion);
      mineral.rotation.y=(-.16+Math.sin(time*.17)*.045+mouse.x*.08)*(1-enter);
      mineral.rotation.x=(-.19+Math.sin(time*.11)*.02+mouse.y*.045)*(1-enter);
      mineral.rotation.z=.27*(1-opening);
      mineral.position.y=Math.sin(time*.35)*.035*(1-enter);
      body.morphTargetInfluences[0]=opening;
      if(Math.abs(opening-lastOpening)>.0005){
        lastOpening=opening;
        crystalGroups.forEach((instances,k)=>{crystalStates[k].forEach((s,i)=>{dummy.position.copy(s.pos).addScaledVector(s.shift,opening);dummy.quaternion.copy(s.quat);dummy.scale.copy(s.scale);dummy.updateMatrix();instances.setMatrixAt(i,dummy.matrix);});instances.instanceMatrix.needsUpdate=true;});
      }
      veinMaterial.opacity=.1+wake*.7;portalLight.intensity=(.3+wake*7)*(1-smooth(.38,.48,p));
      beamMaterial.opacity=(.14+wake*.86)*(1-smooth(.35,.44,p));haloMaterial.uniforms.strength.value=(.025+wake*.35)*(1-smooth(.39,.49,p));beamGroup.visible=p<.45;halo.visible=p<.5;
      mineral.visible=p<.53;interior.visible=p<.84;architecture.visible=p>.48;
      caveMaterial.transparent=true;caveMaterial.opacity=1-smooth(.71,.83,p);tunnelCrystals.material=crystalMaterial;tunnelCrystals.visible=p<.77;
      if(Math.abs(morph-lastMorph)>.0005){
        lastMorph=morph;metalMaterial.color.copy(blueMetal).lerp(silverMetal,morph);metalMaterial.roughness=.18+morph*.11;
        modules.forEach(s=>{s.mesh.position.copy(s.start).lerp(s.end,morph);s.mesh.quaternion.copy(s.quat).slerp(s.targetQuat,morph);s.mesh.scale.copy(s.startScale).lerp(s.endScale,morph);s.mesh.morphTargetInfluences[0]=morph;});
      }
      architecturePivot.scale.setScalar(1-(1-Math.min(1,camera.aspect*.84))*morph);architecturePivot.rotation.set(morph*.14,morph*-.27,morph*-.055);plates.forEach(plate=>{plate.visible=morph>.4;plate.scale.setScalar(smooth(.4,.95,morph));});core.rotation.set(.1,Math.PI*.23+time*.06*(1-wash),.08);core.visible=p>.48;
      const connect=smooth(.71,.81,p);connectionMaterial.opacity=connect;coreMaterial.emissiveIntensity=.2+connect*.6;
      connections.forEach(c=>{c.pulse.visible=connect>.01;c.pulse.position.copy(c.path.getPoint((time*.14+c.phase)%1));});
      stars.material.opacity=.5*(1-enter);
      scene.background.copy(black).lerp(white,wash);scene.fog.color.copy(scene.background);scene.fog.density=.012+wash*.32;
      bloom.strength=.28+wake*.12*(1-enter);bloom.threshold=1.4;
      const fade=smooth(.025,.15,p),reveal=smooth(.89,.99,p);
      story.style.setProperty('--scene-copy-opacity',(1-fade).toFixed(3));story.style.setProperty('--scene-copy-y',(-fade*24).toFixed(1)+'px');
      story.style.setProperty('--scene-statement-opacity',reveal.toFixed(3));story.style.setProperty('--scene-statement-y',((1-reveal)*24).toFixed(1)+'px');
      story.style.setProperty('--scene-white-opacity',wash.toFixed(3));story.dataset.statementVisible=String(reveal>0);
      copy.style.visibility=!reduced.matches&&p>.16?'hidden':'';
      story.dataset.scrollProgress=p.toFixed(3);story.dataset.scenePhase=p<.15?'awakening':p<.44?'entering':p<.7?'inside':p<.87?'technology':'reveal';
      story.dataset.cameraZ=camera.position.z.toFixed(2);story.dataset.sceneTime=time.toFixed(2);
    }
    function paint(){if(!ready||!alive)return;animation();renderer.info.reset();composer.render();story.dataset.triangles=String(renderer.info.render.triangles);}
    function goal(){if(!ready)return;const r=story.getBoundingClientRect();range=Math.max(1,story.offsetHeight-stage.offsetHeight);target=reduced.matches?0:clamp(-r.top/range);wake();}
    function resize(){
      if(!alive||!renderer)return;width=stage.clientWidth;height=hero.offsetHeight;camera.aspect=width/height;camera.updateProjectionMatrix();
      const ratio=Math.min(Math.max(1,devicePixelRatio||1),width<700?1.5:1.7,2000/width,1600/height);
      renderer.setPixelRatio(ratio);renderer.setSize(width,height,false);composer.setPixelRatio(ratio);composer.setSize(width,height);canvas.style.height=height+'px';
      key.shadow.mapSize.set(width<700?1024:2048,width<700?1024:2048);range=Math.max(1,story.offsetHeight-stage.offsetHeight);target=reduced.matches?0:clamp(-story.getBoundingClientRect().top/range);p=target;paint();wake();
    }
    function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
    function frame(now){
      raf=0;if(!ready||!alive||!visible||document.hidden||reduced.matches)return;
      if(!last||now-last>=(width<700?32:24)){
        const dt=last?Math.min(.1,(now-last)/1000):1/60;last=now;time+=dt;
        // Re-read the native scroll position: no wheel interception or synthetic scrolling.
        target=clamp(-story.getBoundingClientRect().top/range);p+=(target-p)*(1-Math.exp(-dt*11));if(Math.abs(target-p)<.0002)p=target;
        mouse.x+=(pointer.x-mouse.x)*(1-Math.exp(-dt*3));mouse.y+=(pointer.y-mouse.y)*(1-Math.exp(-dt*3));paint();
      }
      if(p<1||target<1)raf=requestAnimationFrame(frame);else story.dataset.sceneMotion='complete';
    }
    function wake(){if(!ready||!alive||!visible||document.hidden)return;if(reduced.matches){p=target=0;story.dataset.sceneMotion='reduced';paint();return;}story.dataset.sceneMotion='running';if(!raf){last=0;raf=requestAnimationFrame(frame);}}
    function mode(){story.classList.toggle('is-scroll-scene',ready&&!reduced.matches);copy.style.visibility='';resize();}
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){goal();wake();}else{stop();story.dataset.sceneMotion='offscreen';}},{rootMargin:'80px'});
    const sizing=new ResizeObserver(()=>{cancelAnimationFrame(resizeRAF);resizeRAF=requestAnimationFrame(resize);});
    on(window,'scroll',goal,{passive:true});on(window,'resize',resize,{passive:true});
    on(stage,'pointermove',e=>{if(!fine.matches||reduced.matches||e.pointerType!=='mouse')return;const r=stage.getBoundingClientRect();pointer.x=clamp((e.clientX-r.left)/r.width*2-1,-1,1);pointer.y=clamp((e.clientY-r.top)/r.height*2-1,-1,1);},{passive:true});
    on(stage,'pointerleave',()=>{pointer.x=pointer.y=0;});on(reduced,'change',()=>{stop();mode();});on(document,'visibilitychange',()=>{stop();if(document.hidden)story.dataset.sceneMotion='hidden';else wake();});
    on(canvas,'webglcontextlost',event=>{event.preventDefault();fallback();});on(canvas,'webglcontextrestored',()=>{ready=true;story.dataset.mineralScene='webgl';mode();wake();});
    ready=true;story.dataset.mineralScene='webgl';story.dataset.geometry='closed-geode-and-faceted-crystals';story.dataset.photoTexture='none';story.dataset.crystals=String(crystalTotal+300+32);mode();observer.observe(story);sizing.observe(stage);
    on(window,'pagehide',event=>{if(event.persisted)return;alive=false;ready=false;stop();cancelAnimationFrame(resizeRAF);observer.disconnect();sizing.disconnect();events.forEach(fn=>fn());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());environment.dispose();composer.dispose();renderer.dispose();});
  } catch(error){fallback(error);}
})();
