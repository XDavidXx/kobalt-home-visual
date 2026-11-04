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
  __FORGE_SHADERS__
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
