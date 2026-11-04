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
  const icons=__FA_METHOD_ICONS__;
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
