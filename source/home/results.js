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
