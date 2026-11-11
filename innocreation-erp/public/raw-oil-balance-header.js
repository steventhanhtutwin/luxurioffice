(()=>{
 const filter=document.querySelector('.oil-balance-toolbar');if(!filter)return;
 const wrap=filter.nextElementSibling,table=wrap?.querySelector('.oil-table'),head=table?.tHead;if(!head)return;
 // A visual copy avoids changing the table's horizontal scroll container.
 const overlay=document.createElement('div');overlay.className='oil-balance-frozen-head';overlay.setAttribute('aria-hidden','true');overlay.hidden=true;
 const copy=table.cloneNode(false),copyHead=head.cloneNode(true);copy.removeAttribute('id');copy.append(copyHead);overlay.append(copy);document.body.append(overlay);
 let frame;
 function sync(){frame=null;const f=filter.getBoundingClientRect(),w=wrap.getBoundingClientRect(),t=table.getBoundingClientRect(),h=head.getBoundingClientRect();
 const top=f.bottom;const show=f.top>=0&&h.top<top&&t.bottom>top&&w.right>0&&w.left<innerWidth;
 overlay.hidden=!show;if(!show)return;
 overlay.style.top=Math.min(top,t.bottom-h.height)+'px';overlay.style.left=w.left+'px';overlay.style.width=wrap.clientWidth+'px';overlay.style.height=h.height+'px';
 copy.style.width=t.width+'px';copy.style.minWidth=t.width+'px';copy.style.marginLeft=-wrap.scrollLeft+'px';
 const originals=[...head.rows[0].cells],clones=[...copyHead.rows[0].cells];
 originals.forEach((cell,index)=>{const width=cell.getBoundingClientRect().width;clones[index].style.width=width+'px';clones[index].style.minWidth=width+'px';clones[index].style.maxWidth=width+'px';});
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(sync);}
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});wrap.addEventListener('scroll',schedule,{passive:true});
 if(window.ResizeObserver){const observer=new ResizeObserver(schedule);observer.observe(filter);observer.observe(table);observer.observe(wrap);}document.fonts?.ready.then(schedule);schedule();
})();
