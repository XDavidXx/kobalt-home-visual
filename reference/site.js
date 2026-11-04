(() => {
  ['.build-grid', '.capability-grid', '.faq-list'].forEach(selector => {
    const group = document.querySelector(selector);
    if (!group) return;
    const disclosures = [...group.querySelectorAll('details')];
    disclosures.forEach(disclosure => {
      disclosure.addEventListener('toggle', () => {
        if (disclosure.open) disclosures.forEach(other => { if (other !== disclosure) other.open = false; });
      });
    });
  });
})();

/* The scroll sequence and statement reveal are coordinated by hero-mineral-3d.js. */

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

/* Kobalt lifecycle and layout for the adapted Laser Flow shader. */
(() => {
  'use strict';
  const root = document.querySelector('.footer-forge');
  if (!root) return;
  const canvas = root.querySelector('canvas');
  const player = root.querySelector('.footer-content');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const dispose = [];
  const on = (element, event, fn, options) => {
    element.addEventListener(event, fn, options);
    dispose.push(() => element.removeEventListener(event, fn, options));
  };
  /*!
Laser Flow shader adapted for the Kobalt website.
Source: https://github.com/DavidHDev/react-bits
MIT + Commons Clause License Condition v1.0

Copyright (c) 2026 David Haz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, and distribute the Software **as part of an application, website, or product**, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

## Commons Clause Restriction

You may use this Software, including for any commercial purpose, **so long as you do not sell, sublicense, or redistribute the components themselves-whether alone, in a bundle, or as a ported version.**

The same restriction covers the React Bits tools (Background Studio, Texture Lab, Shape Magic, Center Stage, Sound Lab and any tools added later) and the sounds in the sound library. **You may not sell, sublicense, or redistribute the tools or the sounds themselves, or offer the tools or a substantially similar copy of them as a hosted service-whether alone, in a bundle, or as a ported version.**

What you make with the tools is yours to use. You can use exported code, images, videos, and audio files in any personal or commercial application, website, or product, including paid ones. **You may not sell or redistribute the exports on their own, either individually or as the product itself, such as a sound, texture, background, or template pack.**

## No Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uDpr;
uniform float uScale;
uniform float uTime;
uniform float uBeamX;
uniform vec4 uSurface;
uniform float uRadius;
uniform vec3 uIntro;
uniform vec4 uPour;
uniform vec2 uRun;
uniform vec4 uLens;
uniform sampler2D uReveal;
uniform vec4 uRevealMap;
uniform vec2 uRevealInfo;
uniform float uAtmosphere;
uniform vec4 uAmount;
uniform vec4 uShape;
uniform vec4 uExtra;
uniform float uTheme;
uniform vec3 uTint[16];

#define BEAM uTint[0]
#define LEFT uTint[1]
#define RIGHT uTint[2]
#define CYAN uTint[3]
#define PINK uTint[4]
#define LILAC uTint[5]
#define SKY uTint[6]
#define PURPLE uTint[7]
#define DEEP uTint[8]
#define MIST uTint[9]
#define NAVY uTint[10]
#define WARM uTint[11]
#define EMBER uTint[12]
#define WHITE uTint[13]
#define HAZE uTint[14]
#define LAVENDER uTint[15]

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

float sq(float x) {
  return x * x;
}

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 spill(float e, float fall, float strength, float front, float t, out vec3 glow) {
  glow = vec3(0.0);
  if (strength < 0.0005) return vec3(0.0);
  float f = max(fall, 0.0);
  float d = max(e, 0.0);
  float u = d / (6.0 + 0.28 * f);
  float start = smoothstep(-6.0, 12.0, fall);
  float fade = exp(-sq(max(f - 125.0, 0.0) / 40.0));
  float streak = 0.88 + 0.24 * noise(vec2(u * 6.0, f / 22.0 - t * 1.7));
  float bright = pow(strength, 1.5);
  float soft = sqrt(strength);
  float warmth = smoothstep(90.0, 130.0, f);
  vec3 coreK = mix(WHITE, WARM, warmth * exp(-d / 9.0));
  float core = mix(9.0, 2.6, warmth) * exp(-sq(d / (3.5 + 0.04 * f))) * exp(-sq(max(f - 130.0, 0.0) / 38.0));
  float wall = 24.0 * exp(-sq(d / 1.1)) * exp(-sq(max(f - 100.0, 0.0) / 30.0));
  float bandCenter = 0.7 - 0.3 * smoothstep(30.0, 110.0, f);
  float offset = u - bandCenter;
  float decay = (1.05 - bandCenter) / 1.31;
  float profile = offset < 0.0 ? exp(-sq(offset / 0.3)) : exp(-offset / decay);
  profile *= 1.0 - smoothstep(1.0, 1.4, u);
  vec3 bandA = mix(CYAN, PINK, smoothstep(50.0, 75.0, f));
  bandA = mix(bandA, LILAC, smoothstep(100.0, 125.0, f));
  vec3 bandB = mix(SKY, PURPLE, smoothstep(50.0, 75.0, f));
  vec3 fanK = mix(bandA, bandB, smoothstep(0.06, 0.18, offset));
  fanK = mix(fanK, DEEP, smoothstep(0.22, 0.42, offset));
  vec3 thread = WHITE * wall * bright + coreK * core * streak * bright;
  glow += fanK * 4.5 * profile * fade * streak * bright;
  glow += MIST * 0.7 * exp(-max(u - 1.0, 0.0) / 0.9) * smoothstep(0.7, 1.2, u) * fade * soft;
  glow += EMBER * 0.35 * exp(-sq((f - 165.0) / 22.0)) * exp(-d / 25.0) * bright;
  float lag = u * (6.0 + 0.28 * f) * 0.35;
  float reveal = 1.0 - smoothstep(front - 70.0, front + 8.0, f + lag);
  glow *= start * reveal;
  return thread * start * reveal;
}

vec3 easeLight(vec3 light, float amount) {
  return -log(max(1.0 - amount * (1.0 - exp(-light)), vec3(0.0001)));
}

// Kobalt material: a low-frequency moving height field, lit as polished blue steel.
float smoothMetalNoise(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 turn = mat2(1.6, 1.2, -1.2, 1.6);
  for (int octave = 0; octave < 3; octave++) {
    value += amplitude * noise(p);
    p = turn * p;
    amplitude *= 0.5;
  }
  return value;
}
float liquidHeight(vec2 q, float t) {
  vec2 drift = vec2(t * 0.10, -t * 0.22);
  vec2 warp = 0.30 * vec2(sin(q.y * 1.3 - t * 0.55), cos(q.x * 0.8 + t * 0.35));
  float body = smoothMetalNoise(q + warp + drift);
  float radius = length(vec2(q.x * 0.78, q.y * 1.3));
  float wave = sin(radius * 4.5 - t * 2.3 + body * 4.0);
  return body * 0.56 + wave * 0.12 * exp(-max(q.y, 0.0) * 0.15)
    + 0.08 * sin(q.x * 1.5 + q.y * 2.0 - t * 0.7);
}

vec3 steelEnvironment(vec3 direction) {
  vec3 base = mix(vec3(0.012, 0.025, 0.065), vec3(0.045, 0.13, 0.34), 0.5 + 0.5 * direction.y);
  float softbox = exp(-sq((direction.z - 0.22) / 0.28));
  float bluePanel = exp(-sq((direction.x - 0.35) / 0.35));
  float silverPanel = exp(-sq((direction.x + 0.38 + direction.z * 0.25) / 0.19));
  base += vec3(0.58, 0.73, 0.94) * softbox * 0.72;
  base += vec3(0.025, 0.13, 0.72) * bluePanel * 0.72;
  base += vec3(0.70, 0.83, 1.0) * silverPanel * 0.85;
  return base;
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uResolution.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 p = frag / uScale;
  float t = uTime;
  float bx = uBeamX / uScale;
  float sl = uSurface.x / uScale;
  float sy = uSurface.y / uScale;
  float sr = uSurface.z / uScale;
  float sb = uSurface.w / uScale;
  float radius = uRadius / uScale;
  float dx = p.x - bx;
  float adx = abs(dx);
  float h = sy - p.y;
  float hp = max(h, 0.0);
  float above = smoothstep(-0.5, 0.5, h);
  float side = smoothstep(-24.0, 24.0, dx);
  vec3 sideK = mix(mix(LAVENDER, LEFT, smoothstep(40.0, 140.0, adx)), RIGHT, side);
  float beamWidth = uShape.x;
  float flare = uShape.y;
  float spread = 250.0 * uShape.z;
  float reachL = max(bx - sl, 1.0);
  float reachR = max(sr - bx, 1.0);
  float reach = dx < 0.0 ? reachL : reachR;
  float layerLen = clamp(0.29 * reach, 20.0, 100.0) * sqrt(uShape.z);
  float run = uRun.x;
  float runMask = 1.0 - smoothstep(run - 34.0, run + 6.0, adx);
  float bead = exp(-sq((adx - run + 16.0) / (18.0 + 0.04 * run))) * uRun.y;
  float flowMask = (1.0 - smoothstep(0.75 * spread, 1.1 * spread, adx)) * runMask;
  float edgeMask = (1.0 - smoothstep(0.8 * spread, 1.25 * spread, adx)) * runMask;
  float bloom = uIntro.y;
  vec2 center = vec2((sl + sr) * 0.5, (sy + sb) * 0.5);
  vec2 halfSize = vec2((sr - sl) * 0.5, (sb - sy) * 0.5);
  float sd = roundBox(p - center, halfSize, radius);
  float outline = max(sd, 0.0);
  float below = max(p.y - sy - radius, 0.0);
  float hug = smoothstep(-3.0, 3.0, sd) * exp(-sq(below / 14.0));
  float hugWide = smoothstep(-5.0, 5.0, sd) * exp(-sq(below / 40.0));

  vec3 col = vec3(0.0);

  float breathe = 1.0 + uExtra.x * (0.12 * sin(t * 1.5708) + 0.08 * (noise(vec2(t * 0.5, 3.0)) - 0.5));

  float front = uIntro.x / uScale;
  float drop = 1.0 - smoothstep(front - 110.0, front + 10.0, p.y);
  float falling = 1.0 - smoothstep(sy - 24.0, sy, front);
  float top = mix(0.3, 1.0, smoothstep(0.0, 0.3 * sy, p.y));
  float riverWave = 1.25 * sin(p.y * 0.035 - t * 1.7) + 0.75 * sin(p.y * 0.071 - t * 2.15);
  float riverCenter = dx - riverWave * beamWidth * 0.20;
  float riverRadius = beamWidth * (5.4 + 1.15 * sin(p.y * 0.026 - t * 1.4))
    + 3.0 * exp(-hp / 65.0);
  float riverMask = 1.0 - smoothstep(riverRadius - 0.8, riverRadius + 0.8, abs(riverCenter));
  float riverU = clamp(riverCenter / max(riverRadius, 0.1), -1.0, 1.0);
  float fallingRivulet = noise(vec2(riverU * 3.6, p.y * 0.025 - t * 0.95));
  float silverStreak = exp(-sq((riverU + 0.32 + (fallingRivulet - 0.5) * 0.42) / 0.15));
  float blueStreak = exp(-sq((riverU - 0.28 + fallingRivulet * 0.15) / 0.29));
  float sideRim = pow(abs(riverU), 7.0);
  vec3 riverMetal = vec3(0.09, 0.20, 0.40) + vec3(0.06, 0.26, 0.86) * blueStreak * 1.4
    + vec3(0.74, 0.86, 1.0) * silverStreak * 3.0
    + vec3(0.22, 0.43, 0.91) * sideRim * 1.4;
  float beamHalo = 0.7 * exp(-adx / (11.0 * beamWidth)) + 0.24 * exp(-adx / (35.0 * beamWidth));
  vec3 haloK = mix(BEAM, sideK, exp(-hp / 80.0));
  col += (riverMetal * riverMask + haloK * beamHalo) * top * above * drop;
  float head = exp(-sq((p.y - front) / 24.0)) * falling;
  col += mix(WHITE, BEAM, 0.35) * head * (7.0 * exp(-adx / (2.6 * beamWidth)) + 1.0 * exp(-adx / (14.0 * beamWidth)));

  float psi = adx * (outline + 1.0);
  float rise = max(hp - 17.9 * flare, 0.0);
  float skirtAmp = 16.6 * (exp(-sq(rise / (11.8 * flare))) + 0.3 * exp(-rise / (60.0 * flare)));
  float skirtSpread = mix(134.0, 155.0, side) * breathe * flare * flare * mix(0.35, 1.0, min(bloom, 1.0)) * max(bloom, 1.0);
  float skirt = skirtAmp * exp(-psi / skirtSpread) * exp(-sq(adx / (max(layerLen, 60.0 * sqrt(uShape.z)) * 1.48))) * hug;
  col += sideK * skirt * flowMask * min(bloom, 1.0);

  float layer = 12.0 * exp(-adx / layerLen) * exp(-outline / (0.19 * layerLen)) * (1.0 + 0.4 * bead);
  col += sideK * layer * hug * flowMask * min(bloom, 1.0);
  float washMask = smoothstep(sl - 60.0, sl + 6.0, p.x) * (1.0 - smoothstep(sr - 6.0, sr + 45.0, p.x));
  float wash = 1.4 * exp(-adx / 100.0) * exp(-outline / 30.0);
  col += mix(BEAM, sideK, 0.25) * wash * hugWide * washMask * flowMask * min(bloom, 1.0);
  float highWash = 0.7 * exp(-adx / 140.0) * exp(-outline / 60.0);
  col += mix(BEAM, NAVY, 0.5) * highWash * hugWide * washMask * runMask * min(bloom, 1.0);

  float sideSign = dx < 0.0 ? 0.0 : 1.0;
  float along = 0.5 * log((hp + 1.0) / (adx + 1.0));
  float lineScale = 6.0;
  float lp = log(max(psi, 1.0) / (120.0 * flare * flare)) * lineScale;
  float lineIndex = floor(lp) + sideSign * 97.0;
  float wobble = 0.22 * (noise(vec2(lineIndex * 3.7, t * 0.4 + along)) - 0.5);
  float lf = fract(lp + wobble) - 0.5;
  float gradient = lineScale * length(vec2(hp + 1.0, adx)) / max(psi, 1.0) / uScale;
  float halfWidth = max(0.35 * gradient, 0.0001);
  float drawWidth = max(halfWidth, 0.6 * gradient);
  float lineShape = exp(-lf * lf / (drawWidth * drawWidth)) * (halfWidth / drawWidth);
  float lineOn = step(0.3, hash(vec2(lineIndex, 1.3)));
  float lineFlow = smoothstep(0.25, 0.85, noise(vec2(lineIndex * 5.3 + 2.0, along * 3.0 + t * 1.1)));
  float flareArea = 120.0 * flare * flare;
  float lineEnvelope = smoothstep(0.85 * flareArea, 1.4 * flareArea, psi) * (1.0 - smoothstep(3.2 * flareArea, 7.5 * flareArea, psi));
  lineEnvelope *= exp(-adx / (layerLen * 1.5)) * hug * flowMask * (1.0 - smoothstep(35.0 * flare, 80.0 * flare, hp));
  float lineBright = mix(0.35, 1.0, hash(vec2(lineIndex, 4.0)));
  col += mix(sideK, WHITE, 0.6) * lineShape * lineOn * lineFlow * lineEnvelope * lineBright * 2.6 * uAmount.w * min(bloom, 1.0);

  float edgeGlow = 22.8 * exp(-sq(adx / (150.0 * uShape.z))) * edgeMask * (1.0 + 0.9 * bead);
  float onTop = 1.0 - smoothstep(sy + radius, sy + radius + 10.0, p.y);
  float edgeLine = (exp(-sq(max(sd, 0.0) / 0.9)) + 0.12 * exp(-max(sd, 0.0) / 3.0)) * edgeGlow * onTop;
  // Contact follows the actual rounded video frame, including its corner.
  col += mix(sideK, WHITE, 0.35) * edgeLine * 0.16 * min(bloom, 1.0);

  float pour = uShape.w;
  float baseline = exp(-sq(130.0 / 150.0));
  float strengthR = exp(-sq(reachR / (150.0 * uShape.z))) * (1.0 - smoothstep(0.8 * spread, 1.25 * spread, reachR)) / baseline * pour;
  float strengthL = exp(-sq(reachL / (150.0 * uShape.z))) * (1.0 - smoothstep(0.8 * spread, 1.25 * spread, reachL)) / baseline * pour;
  float fallY = p.y - sy - 0.3 * radius;
  float rightHalf = smoothstep(center.x - 4.0, center.x + 4.0, p.x);
  float haloR = exp(-length(p - vec2(sr - 0.3 * radius, sy + 0.3 * radius)) / 40.0) * sqrt(strengthR);
  float haloL = exp(-length(p - vec2(sl + 0.3 * radius, sy + 0.3 * radius)) / 40.0) * sqrt(strengthL);
  vec3 glowR;
  vec3 glowL;
  col += spill(sd, fallY, strengthR, uPour.y, t, glowR) * rightHalf;
  col += spill(sd, fallY, strengthL, uPour.x, t, glowL) * (1.0 - rightHalf);
  col += easeLight(glowR * rightHalf + NAVY * 0.9 * haloR, uPour.w);
  col += easeLight(glowL * (1.0 - rightHalf) + NAVY * 0.9 * haloL, uPour.z);

  vec2 toLens = frag - uLens.xy;
  float lens = exp(-dot(toLens, toLens) / sq(uLens.z)) * uLens.w;
  col *= 1.0 + 0.35 * lens * hug;
  float fogAmount = uAmount.y * uAtmosphere;
  float near = exp(-sq(adx / 230.0));
  float envelope = near * (0.35 + 0.55 * exp(-hp / 140.0) + 0.25 * exp(-p.y / 200.0));
  if (fogAmount > 0.001 && h > -2.0 && envelope * max(0.25, 6.0 * exp(-adx / 50.0)) > 0.002) {
    vec2 fq = vec2(dx / 1.45, h) / 95.0 + vec2(t * 0.055, -t * 0.10) + uExtra.zw;
    vec2 fw = vec2(fbm(fq * 1.15 + vec2(1.7, 9.2) + t * 0.14), fbm(fq * 1.2 + vec2(8.3, 2.8) - t * 0.12));
    float cloud = fbm(fq + 1.8 * fw);
    float density = smoothstep(0.30, 0.72, cloud);
    float lit = exp(-adx / 90.0);
    float fogMask = smoothstep(-2.0, 20.0, h);
    float reached = smoothstep(front + 80.0, front - 40.0, p.y);
    float cloudRim = smoothstep(0.46, 0.67, cloud) * (1.0 - smoothstep(0.67, 0.82, cloud));
    vec3 fog = (HAZE * 0.35 + BEAM * 1.7 * lit * reached) * density * envelope * fogMask;
    fog += vec3(0.17, 0.23, 0.36) * cloudRim * envelope * fogMask * 0.42;
    float surfaceLit = exp(-adx / (layerLen * 1.3)) * exp(-outline / 28.0) * hugWide * flowMask * washMask * min(bloom, 1.0);
    fog += sideK * 2.2 * surfaceLit * (smoothstep(0.38, 0.72, cloud) - 0.35) * fogMask;
    float smoke = smoothstep(0.3, 0.75, cloud);
    fog += BEAM * 0.35 * exp(-adx / (22.0 * beamWidth)) * (0.35 + 0.9 * smoke) * fogMask * top * drop;
    col += fog * fogAmount * (1.0 + 1.2 * lens) * mix(1.0, 0.45, uTheme);
  }

  if (uRevealInfo.y > 0.001 && uLens.w > 0.002) {
    vec2 toReveal = frag - uLens.xy;
    float reveal = exp(-dot(toReveal, toReveal) / sq(uRevealInfo.x)) * uLens.w;
    vec2 uv = frag * uRevealMap.xy + uRevealMap.zw;
    float onImage = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    vec4 ui = texture(uReveal, uv);
    float ink = max(ui.r, max(ui.g, ui.b)) * onImage;
    float lit = clamp(col.b * 0.9, 0.0, 1.0) * (1.0 - smoothstep(0.9, 2.2, col.b));
    float clearance = smoothstep(60.0 * sqrt(beamWidth), 150.0 * sqrt(beamWidth), adx);
    col += mix(BEAM, WHITE, 0.4) * ink * reveal * lit * clearance * uRevealInfo.y * 2.2;
  }

  float haze = col.b;
  float dotGrid = 1.0 - smoothstep(0.16, 0.32, length(fract(frag / 3.0) - 0.5));
  col += BEAM * dotGrid * clamp(haze, 0.0, 1.5) * (1.0 - smoothstep(1.5, 4.0, haze)) * (0.18 + 0.3 * lens) * uExtra.y;
  if (lens > 0.002) {
    vec2 drift = frag - vec2(0.0, t * 14.0);
    vec2 sparkCell = floor(drift / 7.0);
    vec2 sparkPos = (sparkCell + 0.2 + 0.6 * vec2(hash(sparkCell + 5.1), hash(sparkCell + 2.3))) * 7.0;
    float sparkDist = length(drift - sparkPos);
    float sparkOn = step(0.8, hash(sparkCell + 8.8));
    float sparkTwinkle = 0.5 + 0.5 * sin(t * 5.0 + hash(sparkCell + 3.7) * 6.283);
    col += WHITE * exp(-sparkDist * sparkDist / 0.35) * sparkOn * sparkTwinkle * lens * clamp(haze * 1.5, 0.0, 1.0) * 1.6 * uAmount.z;
  }

  float dustAmount = uAmount.z;
  if (dustAmount > 0.001) {
    float dustLp = log(max(psi, 1.0) / (120.0 * flare * flare)) * 2.2;
    vec2 flowCell = vec2(dustLp / 1.1, (along + t * 0.22) / 0.06);
    vec2 cellId = floor(flowCell) + vec2(sideSign * 131.0, 0.0);
    vec2 cellJitter = vec2(hash(cellId + 1.7), hash(cellId + 8.3));
    vec2 particleFlow = (floor(flowCell) + 0.1 + cellJitter * 0.8) * vec2(1.1, 0.06);
    float particlePsi = 120.0 * flare * flare * exp(particleFlow.x / 2.2);
    float particleAlong = particleFlow.y - t * 0.22;
    float particleX = sqrt(particlePsi * exp(-2.0 * particleAlong)) - 1.0;
    float particleH = sqrt(particlePsi * exp(2.0 * particleAlong)) - 1.0;
    float particleDist = length(vec2(adx - particleX, hp - particleH)) * uScale;
    float particleOn = step(0.62, hash(cellId + 3.1));
    float particleTwinkle = 0.5 + 0.5 * sin(t * 5.0 + hash(cellId + 9.2) * 6.283);
    float dustZone = exp(-sq(log(max(psi, 1.0) / (200.0 * flare * flare)) / 0.55)) * hug * flowMask * smoothstep(0.0, 6.0, outline);
    col += WHITE * exp(-particleDist * particleDist / 0.3) * particleOn * particleTwinkle * dustZone * 3.0 * dustAmount * min(bloom, 1.0);

    vec2 glitterCell = vec2(dx / 3.0, (p.y - t * 26.0) / 9.0);
    vec2 glitterId = floor(glitterCell);
    vec2 glitterJitter = vec2(hash(glitterId + 4.4), hash(glitterId + 2.9));
    vec2 glitterPos = (glitterId + 0.15 + glitterJitter * 0.7) * vec2(3.0, 9.0);
    float glitterDist = length(vec2(dx, p.y - t * 26.0) - glitterPos) * uScale;
    float glitterOn = step(0.7, hash(glitterId + 6.6));
    float glitterTwinkle = 0.5 + 0.5 * sin(t * 6.0 + hash(glitterId + 1.1) * 6.283);
    float glitterZone = exp(-adx / (5.0 * beamWidth)) * smoothstep(1.5, 4.0, adx / beamWidth) * above * smoothstep(25.0, 70.0, hp) * top * drop;
    col += WHITE * exp(-glitterDist * glitterDist / 0.25) * glitterOn * glitterTwinkle * glitterZone * 2.2 * dustAmount * uAtmosphere;
  }

  col *= uAmount.x * (1.0 + uIntro.z * 0.9 * exp(-length(vec2(dx, h * 1.6)) / 70.0));
  col *= smoothstep(-0.75, 0.25, sd * uScale);
  // Fade the outer glow before the dark hero ends; the video remains fully visible.
  col *= 1.0 - smoothstep(uResolution.y - 72.0, uResolution.y, frag.y);

  // One cool Kobalt palette: slow tonal movement, with brief violet/lilac accents.
  // No fixed split into two colors; keep the blue channel dominant throughout.
  float blueDrift = 0.5 + 0.5 * sin(t * 0.19 + dx * 0.002 - hp * 0.0015);
  vec3 materialTint = mix(vec3(0.035, 0.13, 0.90), vec3(0.13, 0.43, 1.0), 0.22 + 0.62 * blueDrift);
  float violetPass = pow(0.5 + 0.5 * sin(t * 0.16 - dx * 0.0018 + hp * 0.001), 4.0) * 0.52;
  float rosePass = pow(0.5 + 0.5 * sin(t * 0.11 + 2.3 + dx * 0.0012), 9.0) * 0.16;
  materialTint = mix(materialTint, vec3(0.34, 0.15, 1.0), violetPass);
  materialTint = mix(materialTint, vec3(0.72, 0.18, 1.0), rosePass);
  float materialLight = max(col.r, max(col.g, col.b));
  // Preserve the silver in the specular reflections while grading the atmosphere blue.
  col = mix(col, materialTint * materialLight, 0.24);
  col.r = min(col.r, col.b * 0.96);
  col.g = min(col.g, col.b);
  vec3 emit = 1.0 - exp(-col * mix(1.0, 0.6, uTheme));
  float peak = max(emit.r, max(emit.g, emit.b));
  if (uTheme > 0.5) {
    float low = min(emit.r, min(emit.g, emit.b));
    float chroma = peak - low;
    vec3 hue = (emit - low) / max(chroma, 0.0001);
    float alpha = clamp(pow(chroma, 1.35) * 1.3, 0.0, 1.0) * 0.9;
    outColor = vec4((hue * 0.82 + 0.06) * alpha, alpha);
  } else {
    outColor = vec4(emit, peak);
  }
}`;

const TINTS = [
  [0, 1],
  [-11.5, 0.77],
  [9.5, 0.95],
  [-53.5, 0.79],
  [39.5, 0.77],
  [16, 0.81],
  [-16.3, 0.92],
  [13.3, 0.96],
  [3, 1.01],
  [1, 0.68],
  [1, 1.15],
  [142.5, 0.51],
  [113.6, 0.28],
  [-7.5, 0.13],
  [-2.7, 0.32],
  [7.5, 0.81]
];

const BASE_SATURATION = 0.78;
const MAX_RENDER_DIM = 1600;
const INTRO_DROP = 1.25;
const INTRO_END = 5;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const easeOut = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const spring = time => {
  const omega = 8;
  const zeta = 0.62;
  const damped = omega * Math.sqrt(1 - zeta * zeta);
  return (
    1 - Math.exp(-zeta * omega * time) * (Math.cos(damped * time) + ((zeta * omega) / damped) * Math.sin(damped * time))
  );
};

const toHsv = ([r, g, b]) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  return [(hue * 60 + 360) % 360, max > 0 ? delta / max : 0];
};

const fromHsv = (hue, saturation) => {
  const h = (((hue % 360) + 360) % 360) / 60;
  const c = saturation;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = 1 - c;
  const [r, g, b] =
    h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
};

const buildTints = rgb => {
  const [hue, saturation] = toHsv(rgb);
  const strength = saturation / BASE_SATURATION;
  const data = new Float32Array(TINTS.length * 3);
  TINTS.forEach(([shift, scale], index) => {
    data.set(fromHsv(hue + shift, clamp(BASE_SATURATION * scale * strength, 0, 1)), index * 3);
  });
  return data;
};

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.warn('Kobalt hero material:', gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
};

const link = (gl, vertexSource, fragmentSource) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
};

const locate = (gl, program, names) => {
  const result = {};
  for (const name of names) result[name] = gl.getUniformLocation(program, name);
  return result;
};


  let gl, program, vao, buffer, texture, uniforms;
  let width = 1, height = 1, ratio = 1, frameId = 0, last = 0;
  const surface = {left:0,top:1,right:1,bottom:2,radius:16};
  let visible = true, alive = true, ready = false, time = 0, introTime = reduce.matches ? INTRO_END : 0;
  const pointer = { x:0, y:0, inside:false };
  const lens = { x:0, y:0, vx:0, vy:0, strength:0, placed:false };
  const tints = buildTints([.16, .34, 1]);
  function render() {
    if (!ready || !alive) return;
    const small = width < 581;
    const scale = Math.max(.2, Math.min(width/585, height/507));
    const bx = width*(small ? .86 : width < 851 ? .87 : .76);
    const surfaceY = surface.top;
    const startY = -.15*height, span = surfaceY-startY+.3*height;
    const settled = introTime >= INTRO_END;
    const front = settled ? surfaceY+.3*height : startY+span*Math.pow(clamp(introTime/INTRO_DROP,0,1),1.3);
    const impact = INTRO_DROP*Math.pow(Math.max(0,surfaceY-startY)/span,1/1.3);
    const tau = introTime-impact;
    const bloom = settled ? 1 : tau <= 0 ? 0 : spring(tau);
    const flash = settled || tau <= 0 ? 0 : Math.exp(-tau/.35)*(1-Math.exp(-tau/.05));
    const runRange = 1.8*250*1.3+80;
    const runFront = settled ? 100000 : tau <= 0 ? -40 : runRange*(1-Math.exp(-1.15*tau));
    const bead = settled || tau <= 0 ? 0 : Math.exp(-1.15*tau)*(1-Math.exp(-tau/.08));
    const atmosphere = settled ? 1 : tau <= 0 ? .3*easeOut(introTime/INTRO_DROP) : .3+.7*(1-Math.exp(-1.3*tau));
    gl.viewport(0,0,canvas.width,canvas.height); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform2f(uniforms.uResolution,width,height);
    gl.uniform1f(uniforms.uDpr,ratio); gl.uniform1f(uniforms.uScale,scale);
    gl.uniform1f(uniforms.uTime,time); gl.uniform1f(uniforms.uBeamX,bx);
    gl.uniform4f(uniforms.uSurface,surface.left,surface.top,surface.right,surface.bottom);
    gl.uniform1f(uniforms.uRadius,surface.radius); gl.uniform3f(uniforms.uIntro,front,bloom,flash);
    gl.uniform4f(uniforms.uPour,1000,1000,.50,.60); gl.uniform2f(uniforms.uRun,runFront,bead);
    gl.uniform4f(uniforms.uLens,lens.x,lens.y,95*scale,lens.strength*.55);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.uniform1i(uniforms.uReveal,0); gl.uniform4f(uniforms.uRevealMap,1,1,0,0); gl.uniform2f(uniforms.uRevealInfo,1,0);
    gl.uniform1f(uniforms.uAtmosphere,atmosphere);
    gl.uniform4f(uniforms.uAmount,1.00,.60,0,.45);
    gl.uniform4f(uniforms.uShape,1.30,1.60,1.80,.40);
    gl.uniform4f(uniforms.uExtra,.55,0,56.27,21.09);
    gl.uniform1f(uniforms.uTheme,0); gl.uniform3fv(uniforms.uTint,tints);
    gl.bindVertexArray(vao); gl.drawArrays(gl.TRIANGLES,0,3); gl.bindVertexArray(null);
  }
  function frame(now) {
    frameId = 0;
    if (!alive || !ready || !visible || document.hidden || reduce.matches) return;
    const interval = width < 600 ? 32 : 22;
    if (now-last >= interval || !last) {
      const dt = last ? Math.min(.06,(now-last)/1000) : 1/60; last = now;
      time += dt*.72; introTime = Math.min(INTRO_END,introTime+dt);
      const active = pointer.inside && fine.matches;
      if (active && !lens.placed) {lens.x=pointer.x;lens.y=pointer.y;lens.vx=lens.vy=0;lens.placed=true;}
      if (active) {
        lens.vx += (120*(pointer.x-lens.x)-19*lens.vx)*dt;
        lens.vy += (120*(pointer.y-lens.y)-19*lens.vy)*dt;
        lens.x += lens.vx*dt; lens.y += lens.vy*dt;
      }
      lens.strength += ((active ? 1 : 0)-lens.strength)*(1-Math.exp(-dt/.4));
      if (!active && lens.strength<.001) lens.placed=false;
      render();
    }
    frameId=requestAnimationFrame(frame);
  }
  function wake() {
    if (!alive || !ready || !visible || document.hidden) return;
    if (reduce.matches) {introTime=INTRO_END;time=2;lens.strength=0;render();return;}
    if (!frameId) {last=0;frameId=requestAnimationFrame(frame);}
  }
  function resize() {
    width=Math.max(1,root.clientWidth);height=Math.max(1,root.clientHeight);
    const heroRect=root.getBoundingClientRect();
    const playerRect=player?.getBoundingClientRect();
    surface.left=playerRect ? playerRect.left-heroRect.left : width*.08;
    surface.top=playerRect ? playerRect.top-heroRect.top : height*.80;
    surface.right=playerRect ? playerRect.right-heroRect.left : width*.92;
    surface.bottom=playerRect ? playerRect.bottom-heroRect.top : height*1.5;
    surface.radius=player ? Number.parseFloat(getComputedStyle(player).borderTopLeftRadius)||16 : 16;
    const beamX=width*(width<581 ? .86 : width<851 ? .87 : .76);
    root.style.setProperty('--forge-impact-x',`${beamX.toFixed(2)}px`);
    root.style.setProperty('--forge-impact-y',`${surface.top.toFixed(2)}px`);
    root.style.setProperty('--forge-player-left',`${surface.left.toFixed(2)}px`);
    root.style.setProperty('--forge-player-right',`${(width-surface.right).toFixed(2)}px`);
    root.dataset.impactY=surface.top.toFixed(2);
    const dpr=Math.min(devicePixelRatio||1,width<600 ? 1.25 : 1.5);
    const longest=Math.max(width,height)*dpr;
    const renderLimit=width<600 ? 1100 : MAX_RENDER_DIM;
    ratio=longest>renderLimit ? dpr*renderLimit/longest : dpr;
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ratio=canvas.width/width;
    render();wake();
  }
  on(root,'pointermove',event=>{
    if (event.pointerType!=='mouse'||reduce.matches||!fine.matches) return;
    const rect=root.getBoundingClientRect();pointer.x=event.clientX-rect.left;pointer.y=event.clientY-rect.top;pointer.inside=true;wake();
  },{passive:true});
  on(root,'pointerleave',()=>{pointer.inside=false;wake();});
  on(document,'visibilitychange',()=>{cancelAnimationFrame(frameId);frameId=0;last=0;wake();});
  on(reduce,'change',()=>{cancelAnimationFrame(frameId);frameId=0;introTime=INTRO_END;lens.strength=0;wake();});
  on(canvas,'webglcontextlost',event=>{event.preventDefault();ready=false;cancelAnimationFrame(frameId);frameId=0;root.dataset.flowState='fallback';});
  const sizeObserver=new ResizeObserver(resize);
  const intersection=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if (visible) wake();else {cancelAnimationFrame(frameId);frameId=0;last=0;}
  });
  try {
    gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
    if (!gl) throw new Error('WebGL2 unavailable');
    program=link(gl,VERTEX,FRAGMENT);if (!program) throw new Error('Shader unavailable');
    uniforms=locate(gl,program,['uResolution','uDpr','uScale','uTime','uBeamX','uSurface','uRadius','uIntro','uPour','uRun','uLens','uReveal','uRevealMap','uRevealInfo','uAtmosphere','uAmount','uShape','uExtra','uTheme','uTint']);
    vao=gl.createVertexArray();buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
    texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    ready=true;root.dataset.flowState='webgl';
  } catch (_) {ready=false;root.dataset.flowState='fallback';}
  resize();sizeObserver.observe(root);if(player)sizeObserver.observe(player);intersection.observe(root);
  on(window,'resize',resize,{passive:true});
  function cleanup() {
    if (!alive) return;
    alive=false;cancelAnimationFrame(frameId);sizeObserver.disconnect();intersection.disconnect();dispose.forEach(fn=>fn());
    if (gl) {if (texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(vao)gl.deleteVertexArray(vao);if(program)gl.deleteProgram(program);}
  }
  on(window,'pagehide',event=>{if(!event.persisted)cleanup();});
})();

(() => {
  const track=document.querySelector('.workflow-track');
  const svg=track?.querySelector('.workflow-connections');
  if(!svg) return;
  const nodes=[...track.querySelectorAll('.workflow-node')];
  const motion=window.matchMedia('(prefers-reduced-motion:reduce)');
  const colors=['#70d9f4','#7c99ff','#b59aff','#6cddc0'];
  const ns='http://www.w3.org/2000/svg';
  const links=[];
  const stepDuration=2600,transferStart=1700;
  const sequenceDuration=nodes.length*stepDuration,holdDuration=1400,resetDuration=900;
  const cycleDuration=sequenceDuration+holdDuration+resetDuration;
  let elapsed=0,lastFrame=0,frameId=0,visible=false,lastStep=-2,lastLit=-1;

  function element(tag,attributes,parent=svg) {
    const item=document.createElementNS(ns,tag);
    Object.entries(attributes).forEach(([key,value])=>item.setAttribute(key,value));
    parent.append(item);return item;
  }
  const defs=element('defs',{});
  for(let i=0;i<nodes.length-1;i++) {
    const gradient=element('linearGradient',{id:'workflow-color-'+i,gradientUnits:'userSpaceOnUse'},defs);
    element('stop',{offset:'0%','stop-color':colors[i]},gradient);
    element('stop',{offset:'100%','stop-color':colors[i+1]},gradient);
    const base=element('path',{class:'workflow-link-base'});
    const signal=element('path',{class:'workflow-transfer',pathLength:1,stroke:'url(#workflow-color-'+i+')'});
    const packet=element('circle',{class:'workflow-packet',r:3,fill:colors[i+1],color:colors[i+1]});
    links.push({base,signal,packet,gradient,length:0});
  }

  function render() {
    const time=elapsed%cycleDuration;
    const resetting=time>=sequenceDuration+holdDuration;
    const step=resetting?-1:Math.min(nodes.length-1,Math.floor(time/stepDuration));
    const lit=motion.matches?nodes.length:resetting?0:step+1;
    if(step!==lastStep||lit!==lastLit) {
      nodes.forEach((node,i)=>{
        node.classList.toggle('is-active',i<lit);
      });
      track.dataset.activeStep=motion.matches?'all':String(step+1);
      track.dataset.litCount=String(lit);
      lastStep=step;lastLit=lit;
    }
    track.dataset.phase=motion.matches?'static':resetting?'reset':time>=sequenceDuration?'hold':'running';
    links.forEach((link,i)=>{
      const local=time-i*stepDuration;
      const progress=motion.matches?1:resetting?0:Math.max(0,Math.min(1,(local-transferStart)/(stepDuration-transferStart)));
      const transferring=!motion.matches&&!resetting&&step===i&&progress>0&&progress<1;
      link.signal.style.strokeDashoffset=String(1-progress);
      link.signal.style.opacity=progress?(transferring?'1':'.85'):'0';
      link.packet.style.opacity=transferring?'1':'0';
      if(transferring&&link.length) {
        const point=link.signal.getPointAtLength(link.length*progress);
        link.packet.setAttribute('cx',point.x);link.packet.setAttribute('cy',point.y);
      }
    });
  }

  function layout() {
    const box=track.getBoundingClientRect();
    svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    links.forEach((link,i)=>{
      const from=nodes[i].getBoundingClientRect(),to=nodes[i+1].getBoundingClientRect();
      const vertical=Math.abs(from.top-to.top)>10;
      const start=vertical?{x:from.left+from.width/2-box.left,y:from.bottom-box.top+1}:{x:from.right-box.left+1,y:from.top+from.height/2-box.top};
      const end=vertical?{x:to.left+to.width/2-box.left,y:to.top-box.top-1}:{x:to.left-box.left-1,y:to.top+to.height/2-box.top};
      const path=`M${start.x} ${start.y} L${end.x} ${end.y}`;
      link.base.setAttribute('d',path);link.signal.setAttribute('d',path);
      link.gradient.setAttribute('x1',start.x);link.gradient.setAttribute('y1',start.y);
      link.gradient.setAttribute('x2',end.x);link.gradient.setAttribute('y2',end.y);
      link.length=link.signal.getTotalLength();
    });
    render();
  }

  function frame(now) {
    frameId=0;
    if(!visible||document.hidden||motion.matches) return;
    if(now-lastFrame>=1000/30) {
      elapsed+=Math.min(now-lastFrame,100);lastFrame=now;render();
    }
    frameId=requestAnimationFrame(frame);
  }
  function sync() {
    if(frameId) cancelAnimationFrame(frameId);
    frameId=0;lastFrame=performance.now();
    if(visible&&!document.hidden&&!motion.matches) frameId=requestAnimationFrame(frame);
    render();
  }
  motion.addEventListener('change',()=>{lastStep=-2;sync();});
  document.addEventListener('visibilitychange',sync);
  new ResizeObserver(layout).observe(track);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.12}).observe(track);
  layout();
})();

(() => {
  const tabs=[...document.querySelectorAll('[data-case]')];
  if(!tabs.length) return;
  function selectCase(button,focus=false) {
    tabs.forEach(tab=>{
      const selected=tab===button;
      tab.setAttribute('aria-selected',String(selected));
      tab.tabIndex=selected?0:-1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;
    });
    if(focus) button.focus({preventScroll:true});
    const strip=button.parentElement;
    if(strip.scrollWidth>strip.clientWidth+2) {
      const item=button.getBoundingClientRect(),container=strip.getBoundingClientRect();
      const delta=item.left<container.left?item.left-container.left:item.right>container.right?item.right-container.right:0;
      if(delta) strip.scrollTo({left:strip.scrollLeft+delta,behavior:'auto'});
    }
  }
  tabs.forEach((button,index)=>{
    button.addEventListener('click',()=>selectCase(button));
    button.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight') next=(index+1)%tabs.length;
      else if(event.key==='ArrowLeft') next=(index+tabs.length-1)%tabs.length;
      else if(event.key==='Home') next=0;
      else if(event.key==='End') next=tabs.length-1;
      if(next!==undefined){event.preventDefault();selectCase(tabs[next],true);}
    });
  });
})();

(() => {
  const section=document.querySelector('.method-accordion-section');
  if(!section) return;
  const steps=JSON.parse(document.getElementById('method-data').textContent);
  const accordion=section.querySelector('.method-accordion');
  const buttons=[...accordion.querySelectorAll('[data-step]')];
  const items=buttons.map(button=>button.closest('.method-accordion-item'));
  const panels=buttons.map(button=>document.getElementById(button.getAttribute('aria-controls')));
  const viewport=section.querySelector('.method-viewport');
  const world=section.querySelector('.lab-world');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const icons={"routine": "<svg class=\"fa-icon fa-sliders \" data-icon=\"sliders\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M0 416c0 17.7 14.3 32 32 32l54.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 448c17.7 0 32-14.3 32-32s-14.3-32-32-32l-246.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 384c-17.7 0-32 14.3-32 32zm128 0a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zM320 256a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm32-80c-32.8 0-61 19.7-73.3 48L32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l246.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48l54.7 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-54.7 0c-12.3-28.3-40.5-48-73.3-48zM192 128a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm73.3-64C253 35.7 224.8 16 192 16s-61 19.7-73.3 48L32 64C14.3 64 0 78.3 0 96s14.3 32 32 32l86.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 128c17.7 0 32-14.3 32-32s-14.3-32-32-32L265.3 64z\"/></svg>", "people": "<svg class=\"fa-icon fa-users \" data-icon=\"users\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 512\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M144 0a80 80 0 1 1 0 160A80 80 0 1 1 144 0zM512 0a80 80 0 1 1 0 160A80 80 0 1 1 512 0zM0 298.7C0 239.8 47.8 192 106.7 192l42.7 0c15.9 0 31 3.5 44.6 9.7c-1.3 7.2-1.9 14.7-1.9 22.3c0 38.2 16.8 72.5 43.3 96c-.2 0-.4 0-.7 0L21.3 320C9.6 320 0 310.4 0 298.7zM405.3 320c-.2 0-.4 0-.7 0c26.6-23.5 43.3-57.8 43.3-96c0-7.6-.7-15-1.9-22.3c13.6-6.3 28.7-9.7 44.6-9.7l42.7 0C592.2 192 640 239.8 640 298.7c0 11.8-9.6 21.3-21.3 21.3l-213.3 0zM224 224a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zM128 485.3C128 411.7 187.7 352 261.3 352l117.3 0C452.3 352 512 411.7 512 485.3c0 14.7-11.9 26.7-26.7 26.7l-330.7 0c-14.7 0-26.7-11.9-26.7-26.7z\"/></svg>", "data": "<svg class=\"fa-icon fa-database \" data-icon=\"database\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 448 512\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M448 80l0 48c0 44.2-100.3 80-224 80S0 172.2 0 128L0 80C0 35.8 100.3 0 224 0S448 35.8 448 80zM393.2 214.7c20.8-7.4 39.9-16.9 54.8-28.6L448 288c0 44.2-100.3 80-224 80S0 332.2 0 288L0 186.1c14.9 11.8 34 21.2 54.8 28.6C99.7 230.7 159.5 240 224 240s124.3-9.3 169.2-25.3zM0 346.1c14.9 11.8 34 21.2 54.8 28.6C99.7 390.7 159.5 400 224 400s124.3-9.3 169.2-25.3c20.8-7.4 39.9-16.9 54.8-28.6l0 85.9c0 44.2-100.3 80-224 80S0 476.2 0 432l0-85.9z\"/></svg>", "rules": "<svg class=\"fa-icon fa-shield-halved \" data-icon=\"shield-halved\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M256 0c4.6 0 9.2 1 13.4 2.9L457.7 82.8c22 9.3 38.4 31 38.3 57.2c-.5 99.2-41.3 280.7-213.6 363.2c-16.7 8-36.1 8-52.8 0C57.3 420.7 16.5 239.2 16 140c-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.8 1 251.4 0 256 0zm0 66.8l0 378.1C394 378 431.1 230.1 432 141.4L256 66.8s0 0 0 0z\"/></svg>", "ai": "<svg class=\"fa-icon fa-microchip \" data-icon=\"microchip\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M176 24c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40c-35.3 0-64 28.7-64 64l-40 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l40 0 0 56-40 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l40 0 0 56-40 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l40 0c0 35.3 28.7 64 64 64l0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40 56 0 0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40 56 0 0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40c35.3 0 64-28.7 64-64l40 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-40 0 0-56 40 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-40 0 0-56 40 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-40 0c0-35.3-28.7-64-64-64l0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40-56 0 0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40-56 0 0-40zM160 128l192 0c17.7 0 32 14.3 32 32l0 192c0 17.7-14.3 32-32 32l-192 0c-17.7 0-32-14.3-32-32l0-192c0-17.7 14.3-32 32-32zm192 32l-192 0 0 192 192 0 0-192z\"/></svg>", "systems": "<svg class=\"fa-icon fa-laptop-code \" data-icon=\"laptop-code\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 512\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M64 96c0-35.3 28.7-64 64-64l384 0c35.3 0 64 28.7 64 64l0 256-64 0 0-256L128 96l0 256-64 0L64 96zM0 403.2C0 392.6 8.6 384 19.2 384l601.6 0c10.6 0 19.2 8.6 19.2 19.2c0 42.4-34.4 76.8-76.8 76.8L76.8 480C34.4 480 0 445.6 0 403.2zM281 209l-31 31 31 31c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-48-48c-9.4-9.4-9.4-24.6 0-33.9l48-48c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9zM393 175l48 48c9.4 9.4 9.4 24.6 0 33.9l-48 48c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l31-31-31-31c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0z\"/></svg>", "interfaces": "<svg class=\"fa-icon fa-window-maximize \" data-icon=\"window-maximize\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zM96 96l320 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L96 160c-17.7 0-32-14.3-32-32s14.3-32 32-32z\"/></svg>", "connections": "<svg class=\"fa-icon fa-link \" data-icon=\"link\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 640 512\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l1.1-1.6c10.3-14.4 6.9-34.4-7.4-44.6s-34.4-6.9-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372 74 321 105.5 289.5L217.7 177.2c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.9l-1.1 1.6c-10.3 14.4-6.9 34.4 7.4 44.6s34.4 6.9 44.6-7.4l1.1-1.6C433.5 260.8 427 182 377 132c-56.5-56.5-148-56.5-204.5 0L60.2 244.3z\"/></svg>", "check": "<svg class=\"fa-icon fa-circle-check \" data-icon=\"circle-check\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z\"/></svg>", "use": "<svg class=\"fa-icon fa-chart-line \" data-icon=\"chart-line\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M64 64c0-17.7-14.3-32-32-32S0 46.3 0 64L0 400c0 44.2 35.8 80 80 80l400 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 416c-8.8 0-16-7.2-16-16L64 64zm406.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L320 210.7l-57.4-57.4c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L240 221.3l57.4 57.4c12.5 12.5 32.8 12.5 45.3 0l128-128z\"/></svg>", "results": "<svg class=\"fa-icon fa-chart-column \" data-icon=\"chart-column\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M32 32c17.7 0 32 14.3 32 32l0 336c0 8.8 7.2 16 16 16l400 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L80 480c-44.2 0-80-35.8-80-80L0 64C0 46.3 14.3 32 32 32zM160 224c17.7 0 32 14.3 32 32l0 64c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32zm128-64l0 160c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-160c0-17.7 14.3-32 32-32s32 14.3 32 32zm64 32c17.7 0 32 14.3 32 32l0 96c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-96c0-17.7 14.3-32 32-32zM480 96l0 224c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-224c0-17.7 14.3-32 32-32s32 14.3 32 32z\"/></svg>", "evolution": "<svg class=\"fa-icon fa-arrows-rotate \" data-icon=\"arrows-rotate\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><!--! Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2024 Fonticons, Inc. --><path d=\"M105.1 202.6c7.7-21.8 20.2-42.3 37.8-59.8c62.5-62.5 163.8-62.5 226.3 0L386.3 160 352 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l111.5 0c0 0 0 0 0 0l.4 0c17.7 0 32-14.3 32-32l0-112c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 35.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5zM39 289.3c-5 1.5-9.8 4.2-13.7 8.2c-4 4-6.7 8.8-8.1 14c-.3 1.2-.6 2.5-.8 3.8c-.3 1.7-.4 3.4-.4 5.1L16 432c0 17.7 14.3 32 32 32s32-14.3 32-32l0-35.1 17.6 17.5c0 0 0 0 0 0c87.5 87.4 229.3 87.4 316.7 0c24.4-24.4 42.1-53.1 52.9-83.8c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.5 62.5-163.8 62.5-226.3 0l-.1-.1L125.6 352l34.4 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L48.4 288c-1.6 0-3.2 .1-4.8 .3s-3.1 .5-4.6 1z\"/></svg>"};
  const stageIcons=[['routine','people','data','rules'],['ai','systems','interfaces','rules'],['connections','check','routine','people'],['use','results','routine','evolution']];
  const PERIOD=7000;
  let active=-1,sceneVisible=false,accordionVisible=false;
  let hovering=false,keyboardFocus=false,timerId=0,startedAt=0,remaining=PERIOD,progressAnimation=null;
  let frameId=0,lastFrame=0,x=0,y=0,tx=0,ty=0;

  const canRotate=()=>((sceneVisible||accordionVisible)&&!document.hidden&&!reduced.matches&&!hovering&&!keyboardFocus);
  const canInteract=()=>sceneVisible&&!document.hidden&&!reduced.matches&&fine.matches;

  function pauseClock(){
    if(!timerId) return;
    remaining=Math.max(1,remaining-(performance.now()-startedAt));
    clearTimeout(timerId);timerId=0;
  }
  function syncRotation(){
    const running=canRotate();
    section.dataset.rotation=running?'running':'paused';
    if(running){
      if(!timerId){startedAt=performance.now();timerId=setTimeout(()=>{timerId=0;select((active+1)%steps.length);},remaining);}
      progressAnimation?.play();
    }else{pauseClock();progressAnimation?.pause();}

  }
  function select(index){
    if(index===active) return;
    pauseClock();remaining=PERIOD;active=index;
    const step=steps[index];
    buttons.forEach((button,i)=>{
      const isActive=i===index;
      button.setAttribute('aria-expanded',String(isActive));
      button.setAttribute('aria-disabled',String(isActive));
      items[i].classList.toggle('is-active',isActive);
      panels[i].hidden=!isActive;
    });
    section.dataset.stage=String(index);
    section.querySelectorAll('.lab-module-label').forEach((label,i)=>{label.textContent=step.modules[i];});
    section.querySelectorAll('.lab-module-surface>svg').forEach((svg,i)=>{svg.outerHTML=icons[stageIcons[index][i]];});
    viewport.setAttribute('aria-label','Representação conceitual em 3D: '+step.title+'. '+step.modules.join(', ')+'.');
    progressAnimation?.cancel();
    progressAnimation=items[index].querySelector('.method-progress').animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:PERIOD,easing:'linear',fill:'forwards'});
    progressAnimation.pause();
    syncRotation();
  }
  buttons.forEach((button,index)=>{
    button.addEventListener('click',()=>{if(button.getAttribute('aria-disabled')!=='true') select(index);});
    button.addEventListener('keydown',event=>{
      let next=index;
      if(event.key==='ArrowDown'||event.key==='ArrowRight') next=(index+1)%buttons.length;
      else if(event.key==='ArrowUp'||event.key==='ArrowLeft') next=(index+buttons.length-1)%buttons.length;
      else if(event.key==='Home') next=0;
      else if(event.key==='End') next=buttons.length-1;
      else return;
      event.preventDefault();buttons[next].focus();
    });
  });
  accordion.addEventListener('pointerenter',event=>{hovering=fine.matches&&event.pointerType!=='touch';syncRotation();});
  accordion.addEventListener('pointerleave',()=>{hovering=false;syncRotation();});
  accordion.addEventListener('focusin',event=>{keyboardFocus=event.target.matches(':focus-visible');syncRotation();});
  accordion.addEventListener('focusout',()=>queueMicrotask(()=>{keyboardFocus=accordion.contains(document.activeElement)&&document.activeElement.matches(':focus-visible');syncRotation();}));

  function reset(){
    if(frameId) cancelAnimationFrame(frameId);
    frameId=0;x=y=tx=ty=0;
    world.style.setProperty('--lab-pitch','56deg');world.style.setProperty('--lab-yaw','-32deg');
  }
  function syncMotion(){
    section.dataset.motion=sceneVisible&&!document.hidden&&!reduced.matches?'running':'paused';
    if(!canInteract()) reset();
    syncRotation();
  }
  function frame(now){
    frameId=0;if(!canInteract()) return;
    const ease=1-Math.exp(-Math.min((now-lastFrame)/1000,.05)*5.5);lastFrame=now;
    x+=(tx-x)*ease;y+=(ty-y)*ease;
    world.style.setProperty('--lab-pitch',(56+y).toFixed(2)+'deg');
    world.style.setProperty('--lab-yaw',(-32+x).toFixed(2)+'deg');
    if(Math.abs(tx-x)+Math.abs(ty-y)>.005) frameId=requestAnimationFrame(frame);
  }
  function start(){if(!frameId&&canInteract()){lastFrame=performance.now();frameId=requestAnimationFrame(frame);}}
  viewport.addEventListener('pointermove',event=>{
    if(!canInteract()||event.pointerType==='touch') return;
    const rect=viewport.getBoundingClientRect();
    tx=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1))*12;
    ty=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1))*-7;
    start();
  },{passive:true});
  viewport.addEventListener('pointerleave',()=>{tx=ty=0;start();});
  new ResizeObserver(()=>{viewport.style.setProperty('--lab-scale',String(Math.min(1,viewport.clientWidth/690)));reset();}).observe(viewport);
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      const onScreen=entry.isIntersecting&&entry.intersectionRatio>=.06;
      if(entry.target===viewport) sceneVisible=onScreen;
      if(entry.target===accordion) accordionVisible=onScreen;
    });
    syncMotion();
  },{threshold:[0,.06]});
  observer.observe(viewport);observer.observe(accordion);
  document.addEventListener('visibilitychange',syncMotion);
  reduced.addEventListener('change',syncMotion);
  fine.addEventListener('change',()=>{hovering=false;syncMotion();});
  select(0);syncMotion();
})();

/* Shared home / design-system component. No carousel library or continuous JS render loop. */
(() => {
  const marquees=[...document.querySelectorAll('.kb-logo-marquee')];
  if(!marquees.length)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const visibility=new Map();
  const update=()=>marquees.forEach(strip=>{strip.dataset.logoState=visibility.get(strip)&&!document.hidden&&!reduced.matches?'playing':'paused';});
  const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>visibility.set(entry.target,entry.isIntersecting));update();},{threshold:.1});
  marquees.forEach(strip=>{
    const track=strip.querySelector('.kb-logo-track');
    const group=track?.querySelector('.kb-logo-group');
    if(!group||strip.hasAttribute('data-logo-ready'))return;
    strip.style.setProperty('--kb-logo-count',String(group.children.length));
    const copy=group.cloneNode(true);
    copy.classList.add('kb-logo-copy');copy.setAttribute('aria-hidden','true');copy.setAttribute('inert','');copy.removeAttribute('role');copy.removeAttribute('aria-label');
    copy.querySelectorAll('img').forEach(image=>image.alt='');
    copy.querySelectorAll('[role]').forEach(item=>item.removeAttribute('role'));
    track.append(copy);strip.dataset.logoReady='';observer.observe(strip);
  });
  document.addEventListener('visibilitychange',update);reduced.addEventListener('change',update);
})();
