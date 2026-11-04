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
