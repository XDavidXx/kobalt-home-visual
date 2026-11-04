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
