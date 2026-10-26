(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine=matchMedia('(pointer: fine)').matches;
  if(fine) document.documentElement.classList.add('fine');
  var hasG=!!(window.gsap&&window.ScrollTrigger);
  var animate=hasG&&!reduce;
  if(!animate) document.documentElement.classList.add('static');
  function q(id){return document.getElementById(id)}
  function pad(n){return (n<10?'0':'')+n}
  function play(v){if(v&&v.play){var p=v.play();if(p&&p.catch)p.catch(function(){})}}

  /* ---------- content ---------- */
  /* ---------- data: everything comes from the CMS (or the local seed), media through one resolver ---------- */
  var D=window.__TOJ||{},MEDIA=D.media||{},LOCAL=D.local||'/m/',HI=(innerWidth*Math.min(devicePixelRatio||1,2))>1500;
  // a name is either a local file in /m, or a CMS asset: an image on the Sanity CDN or a video on Bunny Stream
  function IMG(n,w){var m=MEDIA[n];if(!m&&/-poster$/.test(n)){var v=MEDIA[n.slice(0,-7)];if(v)return v.poster}
    if(m&&m.img)return m.img+(m.img.indexOf('?')>-1?'&':'?')+'w='+(w||(HI?2400:1600))+'&auto=format&q=80';return LOCAL+n+'.jpg'}
  function VID(n){var m=MEDIA[n];if(m&&m.mp4)return m.mp4+(HI?m.hi||'1080p':m.lo||'720p')+'.mp4';return LOCAL+n+'.mp4'}
  function HLS(n){var m=MEDIA[n];return m&&m.hls?m.hls:null}
  function PST(n){var m=MEDIA[n];if(m&&m.poster)return m.poster;return LOCAL+n+'-poster.jpg'}
  var P=D.projects||[];
  // ledes are neutral placeholder copy
  var SEL=P.map(function(p,i){return p.sel?i:-1}).filter(function(i){return i>-1});
  function poster(p){return p.video?p.stills[0]:(p.bg||p.stills[0])}

  /* ---------- smooth scroll ---------- */
  var lenis=null;
  if(window.Lenis&&animate){
    lenis=new Lenis({duration:1.2,smoothWheel:true,easing:function(t){return Math.min(1,1.001-Math.pow(2,-10*t))}});
    lenis.on('scroll',ScrollTrigger.update);gsap.ticker.add(function(t){lenis.raf(t*1000)});gsap.ticker.lagSmoothing(0);
  }
  function lockScroll(on){if(lenis){on?lenis.stop():lenis.start()}document.documentElement.classList.toggle('locked',on)}

  /* ---------- helpers: word split, wipe blocks ---------- */
  // the about sentence is set as a box: four fixed lines, sized so the widest one fills the column (and never too tall)
  function fitAb(){
    var h=document.getElementById('abHead');if(!h)return;var box=h.parentNode;
    h.style.fontSize='';var fs=parseFloat(getComputedStyle(h).fontSize),w=0;
    [].forEach.call(h.querySelectorAll('.abl'),function(l){w=Math.max(w,l.getBoundingClientRect().width)});
    if(!w)return;var cs=getComputedStyle(box),bw=box.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
    var t=Math.max(22,Math.min(fs*bw/w*.995,124));h.style.fontSize=t+'px';
    // and it never runs into the client list below it
    var cl=document.getElementById('clients'),hr=h.getBoundingClientRect();if(cl){var room=cl.getBoundingClientRect().top-hr.top-Math.max(28,innerHeight*.05);if(hr.height>room&&room>0)h.style.fontSize=Math.max(22,t*room/hr.height)+'px'}
  }
  function words(el,mask){
    var out=[];
    (function walk(node){
      [].slice.call(node.childNodes).forEach(function(n){
        if(n.nodeType===3){
          var frag=document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function(t){
            if(!t) return;
            if(/^\s+$/.test(t)){frag.appendChild(document.createTextNode(' '));return}
            var s=document.createElement('span');s.className='wd';s.textContent=t;if(mask){var w=document.createElement('span');w.className='w';w.appendChild(s);frag.appendChild(w)}else frag.appendChild(s);out.push(s);
          });
          node.replaceChild(frag,n);
        } else if(n.nodeType===1&&n.tagName!=='BR') walk(n);
      });
    })(el);
    return out;
  }
  /* ---------- selected work list ---------- */
  var rowsEl=q('rows'),active=0,rowEls=[],rowWraps=[],lyr=[q('lyrA'),q('lyrB')],front=0,homeList=false;
  function mediaEl(name,isVideo){
    var el;
    if(isVideo){el=document.createElement('video');el.crossOrigin='anonymous';el.src=VID(name);el.poster=PST(name);el.muted=true;el.loop=true;el.playsInline=true;el.setAttribute('playsinline','');el.autoplay=true;el.preload='auto'}
    else{el=document.createElement('img');el.crossOrigin='anonymous';el.src=IMG(name);el.alt=''}
    el.className='fill'+(isVideo||reduce?'':' kb');
    return el;
  }
  // calm swap (about): the new shot fades in on top once it has a frame; the old one only goes once it is covered
  function whenReady(el,cb){
    if(el.tagName!=='VIDEO'||el.readyState>=2){cb();return}
    var done=false,go=function(){if(!done){done=true;cb()}};
    el.addEventListener('loadeddata',go,{once:true});setTimeout(go,900);
  }
  function swap(layers,frontIdx,el){
    var tok=layers._tok=(layers._tok||0)+1;
    var back=layers[1-frontIdx],cur=layers[frontIdx];
    clearTimeout(layers._t);
    // whatever was half-way: the current front becomes fully solid underneath
    cur.style.transition='none';cur.style.opacity=1;cur.style.zIndex=1;
    back.style.transition='none';back.style.opacity=0;back.style.zIndex=2;
    back.innerHTML='';back.appendChild(el);if(el.tagName==='VIDEO')play(el);
    back.classList.add('show');cur.classList.remove('show');
    whenReady(el,function(){
      if(tok!==layers._tok)return;
      void back.offsetWidth;back.style.transition='opacity .9s ease';back.style.opacity=1;
      layers._t=setTimeout(function(){if(tok!==layers._tok)return;cur.style.opacity=0;var v=cur.querySelector('video');if(v)v.pause()},950);
    });
    return 1-frontIdx;
  }
  // flash cut (home + selected work): the outgoing shot blows out, the new one lands with a light leak
  var leak=null;
  function getLeak(){if(!leak){leak=document.createElement('div');leak.className='leak';q('homeBg').appendChild(leak)}return leak}
  function flashSwap(layers,frontIdx,el){
    if(!window.gsap||reduce)return swap(layers,frontIdx,el);
    if(layers._tl)layers._tl.kill();
    var back=layers[1-frontIdx],cur=layers[frontIdx],outV=cur.querySelector('video');
    gsap.set(cur,{opacity:1,filter:'none',scale:1,zIndex:1});
    gsap.set(back,{opacity:0,zIndex:2});back.style.transition=cur.style.transition='none';
    back.innerHTML='';back.appendChild(el);if(el.tagName==='VIDEO')play(el);
    back.classList.add('show');cur.classList.remove('show');
    layers._tl=gsap.timeline()
      .to(cur,{filter:'brightness(2.1)',duration:.12,ease:'power1.in'},0)
      .fromTo(back,{opacity:0,filter:'brightness(2.1)'},{opacity:1,duration:.1,ease:'none'},.1)
      .to(back,{filter:'brightness(1)',duration:.45,ease:'power2.out'},.2)
      .set(cur,{opacity:0,filter:'none'},.22)
      .add(function(){if(outV&&outV.parentNode===cur)outV.pause()},.22);
    return 1-frontIdx;
  }
  // the end of a loop: the same shot flashes over itself instead of jumping back to frame one
  function flashLoop(layer,v){
    if(!window.gsap||reduce){v.currentTime=0;play(v);return}
    gsap.timeline()
      .add(function(){v.currentTime=0;play(v)},.12)
      .to(layer,{filter:'brightness(2.1)',duration:.12,ease:'power1.in'},0)
      .to(layer,{filter:'brightness(1)',duration:.5,ease:'power2.out'},.12);
  }
  /* ---------- home: one shot per selection; a flash only on a new selection or at the end of the loop ---------- */
  var homeOn=true,hKey='reel',LAND=(D.landing&&D.landing.length?D.landing:[P[0].video]),landI=0;
  function atEnd(el){
    if(hKey==='reel'&&el.parentNode&&lyr.indexOf(el.parentNode)>-1){landI=(landI+1)%LAND.length;var n=mediaEl(LAND[landI],true);front=flashSwap(lyr,front,n);hArm(n)}
    else flashLoop(el.parentNode,el);
  }
  function hArm(el){
    if(reduce||el.tagName!=='VIDEO'){if(el.tagName==='VIDEO')el.loop=true;return}
    el.loop=false;var busy=false;
    var go=function(){if(busy||!el.parentNode||el.parentNode.style.opacity==='0')return;busy=true;atEnd(el);setTimeout(function(){busy=false},1500)};
    el.addEventListener('timeupdate',function(){if(el.duration&&el.currentTime>=el.duration-.5)go()});
    el.addEventListener('ended',go);
  }
  // between projects in the list: a quiet cross-fade, no flash (the flash is kept for the landing reel only)
  function softSwap(layers,frontIdx,el){
    if(!window.gsap||reduce)return swap(layers,frontIdx,el);
    if(layers._tl)layers._tl.kill();
    var back=layers[1-frontIdx],cur=layers[frontIdx],outV=cur.querySelector('video');
    gsap.set(cur,{opacity:1,filter:'none',zIndex:1});gsap.set(back,{opacity:0,filter:'none',zIndex:2});back.style.transition=cur.style.transition='none';
    back.innerHTML='';back.appendChild(el);if(el.tagName==='VIDEO')play(el);
    back.classList.add('show');cur.classList.remove('show');
    layers._tl=gsap.timeline().to(back,{opacity:1,duration:.6,ease:'power1.inOut'}).set(cur,{opacity:0}).add(function(){if(outV&&outV.parentNode===cur)outV.pause()});
    return 1-frontIdx;
  }
  function hShot(key,name,isV){if(key===hKey)return;var wasReel=hKey==='reel';hKey=key;var el=mediaEl(name,isV);
    if(key==='reel'){front=flashSwap(lyr,front,el);hArm(el)}else{if(el.tagName==='VIDEO')el.loop=true;front=softSwap(lyr,front,el)}}
  function pick(i){
    if(i===active) return;active=i;var p=P[i];
    hShot('p'+i,p.video||p.bg,!!p.video);
    setMeta(p);
    rowEls.forEach(function(r){r.classList.toggle('on',+r.dataset.i===i)});
  }
  function setMeta(p){q('wTitle').textContent=p.title;q('wClient').textContent=p.client+', '+p.type.toLowerCase();q('wRole').textContent=p.role+(p.place?' · '+p.place:'')+' · '+p.med.join(' + ')}
  SEL.forEach(function(i,k){
    var p=P[i],li=document.createElement('li'),w=document.createElement('span');w.className='wipe';w.style.display='block';
    var b=document.createElement('button');b.className='row'+(k===0?' on':'');b.style.display='flex';b.type='button';b.dataset.i=i;b.setAttribute('data-cursor','Open');
    b.innerHTML='<span class="n">['+pad(k+1)+']</span><span>'+p.title+'</span>';
    b.addEventListener('mouseenter',function(){if(homeList||!animate)pick(i)});b.addEventListener('focus',function(){pick(i)});
    b.addEventListener('click',function(){openProject(i,null)});
    w.appendChild(b);li.appendChild(w);rowsEl.appendChild(li);rowEls.push(b);rowWraps.push(w);
  });
  setMeta(P[0]);

  /* ---------- about: a client's frames play through the halftone ---------- */
  var CLIENTS=(D.clients||[]).map(function(c){return [c.name,c.project||null]});
  var abL=[q('abA'),q('abB')],abFront=0,about=q('about'),clist=q('clist'),reel=null,picked=-1;
  // per client: real moving clips where we have footage, otherwise stills that hold
  var CLIPS={};P.forEach(function(p){if(p.clips&&p.clips.length)CLIPS[p.id]=p.clips});
  function still(name){var d=document.createElement('img');d.crossOrigin='anonymous';d.src=IMG(name);d.alt='';d.className='fill'+(reduce?'':' zin');return d}
  function clip(name){var v=document.createElement('video');v.crossOrigin='anonymous';v.src=VID(name);v.poster=PST(name);v.muted=true;v.playsInline=true;v.setAttribute('playsinline','');v.preload='auto';v.className='fill';return v}
  hArm(q('heroVid'));
  function stopReel(){clearTimeout(reel);reel=null}
  function showClient(pi,btn){
    stopReel();
    [].forEach.call(clist.querySelectorAll('.client'),function(x){x.classList.toggle('on',x===btn)});
    if(pi<0||picked===pi){picked=-1;about.classList.remove('picking');[].forEach.call(clist.querySelectorAll('.client'),function(x){x.classList.remove('on')});var hv=still(D.settings.aboutImage);hv.classList.remove('zin');abFront=swap(abL,abFront,hv);return}
    picked=pi;about.classList.add('picking');
    var id=P[pi].id,clips=CLIPS[id],frames=(clips||P[pi].stills).slice(),k=0;
    var show=function(){
      if(picked!==pi)return;
      var n=frames[k];k=(k+1)%frames.length;
      if(clips){
        var v=clip(n);abFront=swap(abL,abFront,v);v.loop=reduce;
        if(!reduce){var done=false,go=function(){if(done)return;done=true;clearTimeout(reel);var d=(isFinite(v.duration)&&v.duration?v.duration:3.6)*1000;reel=setTimeout(show,Math.max(1800,d-700))};if(v.readyState>0)go();else{v.addEventListener('loadedmetadata',go,{once:true});reel=setTimeout(function(){go()},1500)}}
      } else {
        abFront=swap(abL,abFront,still(n));if(!reduce)reel=setTimeout(show,3400);
      }
    };
    show();
  }
  CLIENTS.forEach(function(c){
    var li=document.createElement('li'),b=document.createElement('button');b.type='button';b.className='client';
    var pi=c[1]?P.findIndex(function(p){return p.id===c[1]}):-1;
    b.textContent=c[0];
    li.appendChild(b);
    if(pi<0){b.disabled=true;b.title='No work online yet'}
    else{
      b.setAttribute('data-cursor','View');b.setAttribute('aria-pressed','false');
      b.addEventListener('click',function(){showClient(pi,b);[].forEach.call(clist.querySelectorAll('.client'),function(x){x.setAttribute('aria-pressed',x.classList.contains('on')?'true':'false')})});
    }
    clist.appendChild(li);
  });

  /* ---------- contact form ---------- */
  // inline dropdowns that read as part of the sentence
  [].forEach.call(document.querySelectorAll('.dd'),function(dd){
    var opts=dd.dataset.opts.split('|'),id=dd.id;
    var hid=document.createElement('input');hid.type='hidden';hid.name=dd.dataset.name;
    var btn=document.createElement('button');btn.type='button';btn.className='dd-btn empty';btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');btn.id=id+'-btn';
    btn.innerHTML='<span>'+dd.dataset.ph+'</span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    var ul=document.createElement('ul');ul.className='dd-list';ul.setAttribute('role','listbox');ul.id=id+'-list';ul.tabIndex=-1;ul.setAttribute('aria-labelledby',id+'-btn');
    opts.forEach(function(o,k){var li=document.createElement('li');li.setAttribute('role','option');li.id=id+'-o'+k;li.textContent=o;li.setAttribute('aria-selected','false');
      li.addEventListener('click',function(){choose(k)});ul.appendChild(li)});
    dd.appendChild(hid);dd.appendChild(btn);dd.appendChild(ul);
    var act=-1;
    function setAct(k){act=(k+opts.length)%opts.length;[].forEach.call(ul.children,function(li,i){li.classList.toggle('act',i===act)});ul.setAttribute('aria-activedescendant',id+'-o'+act)}
    function open(){document.querySelectorAll('.dd.open').forEach(function(o){if(o!==dd)o.classList.remove('open')});ul.style.left='2px';ul.style.right='auto';dd.classList.add('open');q('form').classList.add('choosing');btn.setAttribute('aria-expanded','true');var lr=ul.getBoundingClientRect(),pr=dd.closest('.letter').getBoundingClientRect();if(lr.right>pr.right){ul.style.left='auto';ul.style.right='0'}setAct(Math.max(0,opts.indexOf(hid.value)));ul.focus({preventScroll:true})}
    function close(focus){dd.classList.remove('open');if(!document.querySelector('.dd.open'))q('form').classList.remove('choosing');btn.setAttribute('aria-expanded','false');if(focus)btn.focus({preventScroll:true})}
    function choose(k){hid.value=opts[k];btn.firstChild.textContent=opts[k];btn.classList.remove('empty');[].forEach.call(ul.children,function(li,i){li.setAttribute('aria-selected',i===k?'true':'false')});close(true)}
    btn.addEventListener('click',function(){dd.classList.contains('open')?close():open()});
    btn.addEventListener('keydown',function(e){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();open()}});
    ul.addEventListener('keydown',function(e){
      if(e.key==='ArrowDown'){e.preventDefault();setAct(act+1)}else if(e.key==='ArrowUp'){e.preventDefault();setAct(act-1)}
      else if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(act)}else if(e.key==='Escape'){e.preventDefault();close(true)}else if(e.key==='Tab'){close()}
    });
    document.addEventListener('click',function(e){if(!dd.contains(e.target))close()});
  });
  // the letter opens with the visitor's own time of day
  (function(){var h=new Date().getHours();q('greet').textContent=h<5?'Hello night owl':h<8?'Hello early riser':h<12?'Good morning':h<18?'Good afternoon':h<23?'Good evening':'Hello night owl'})();
  // each field is exactly as wide as what is in it, so the sentence reflows while you type
  var meas=document.createElement('span');meas.style.cssText='position:absolute;visibility:hidden;white-space:pre;left:-9999px;top:0';document.body.appendChild(meas);
  function fit(inp){
    var cs=getComputedStyle(inp),empty=!inp.value;
    meas.style.fontFamily=cs.fontFamily;meas.style.fontStyle=cs.fontStyle;meas.style.letterSpacing=cs.letterSpacing;
    var fs=parseFloat(cs.fontSize);meas.style.fontSize=fs+'px';meas.textContent=empty?inp.placeholder:inp.value;
    inp.style.width=Math.ceil(meas.getBoundingClientRect().width+fs*.35)+'px';
  }
  ['f-name','f-org','f-mail'].forEach(function(id){var i=q(id);i.addEventListener('input',function(){fit(i)});fit(i)});
  addEventListener('resize',function(){['f-name','f-org','f-mail'].forEach(function(id){fit(q(id))})});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){['f-name','f-org','f-mail'].forEach(function(id){fit(q(id))})});
  q('form').addEventListener('submit',function(e){
    e.preventDefault();
    var err=q('formErr'),n=q('f-name').value.trim(),m=q('f-mail').value.trim();
    if(!n||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)){err.hidden=false;err.textContent=!n?'Add your name so Justin knows who to reply to.':'That email address looks incomplete. Check it and send again.';(!n?q('f-name'):q('f-mail')).focus();return}
    err.hidden=true;var f=q('form'),btn=f.querySelector('.cta'),data={};
    new FormData(f).forEach(function(v,k){data[k]=v});btn.disabled=true;f.classList.add('sending');
    fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
      .then(function(r){if(!r.ok)throw 0;f.hidden=true;q('sent').hidden=false})
      .catch(function(){err.hidden=false;err.textContent='That didn\u2019t go through. Try again, or mail '+(D.settings.email||'hello@talesofjustin.com')+'.'})
      .then(function(){btn.disabled=false;f.classList.remove('sending')});
  });

  /* ---------- the pixel screen: dots everywhere except under the difference type ---------- */
  /* the about picture, sampled small: what lies under the type */
  var smp=document.createElement('canvas'),sctx=smp.getContext('2d',{willReadFrequently:true}),sData=null;
  function sampleAbout(){
    var W=480,H=Math.max(2,Math.round(W*innerHeight/innerWidth)),k=W/innerWidth;
    if(smp.width!==W||smp.height!==H){smp.width=W;smp.height=H}
    sctx.globalAlpha=1;sctx.filter='none';sctx.fillStyle='#000';sctx.fillRect(0,0,W,H);
    if('filter' in sctx)sctx.filter='grayscale(1) contrast(1.5) brightness(.98)';
    // paint the layers in the order they stack, so a fading-in shot is never hidden behind the one it replaces
    abL.slice().sort(function(a,b){return (parseInt(a.style.zIndex)||0)-(parseInt(b.style.zIndex)||0)}).forEach(function(layer){
      var o=parseFloat(getComputedStyle(layer).opacity);var el=layer.querySelector('img,video');if(!el||!(o>.01))return;
      var nw=el.naturalWidth||el.videoWidth,nh=el.naturalHeight||el.videoHeight;if(!nw||!nh)return;
      var r=el.getBoundingClientRect(),sc=Math.max(r.width/nw,r.height/nh),dw=nw*sc,dh=nh*sc;
      sctx.globalAlpha=Math.min(1,o);
      try{sctx.drawImage(el,(r.left+(r.width-dw)/2)*k,(r.top+(r.height-dh)/2)*k,dw*k,dh*k)}catch(e){}
    });
    sctx.filter='none';sctx.globalAlpha=1;
    try{sData=sctx.getImageData(0,0,W,H)}catch(e){sData=null}
  }
  function lumAt(rect){
    if(!sData)return .3;var W=sData.width,H=sData.height,k=W/innerWidth,x0=Math.max(0,Math.floor(rect.left*k)),x1=Math.min(W-1,Math.ceil(rect.right*k)),y0=Math.max(0,Math.floor(rect.top*k)),y1=Math.min(H-1,Math.ceil(rect.bottom*k)),t=0,n=0;
    for(var y=y0;y<=y1;y++)for(var x=x0;x<=x1;x++){var i=(y*W+x)*4;t+=sData.data[i];n++}
    return n?t/n/255:.3;
  }

  /* the pixel screen: dots everywhere; under the difference type the picture shows through softly */
  function DotLayer(cv,getEls,fallback,soft){
    var ctx=cv.getContext('2d'),on=false,pat=null,pd=0,raf=0,mcv=document.createElement('canvas'),mctx=mcv.getContext('2d');
    if(!('fontStretch' in ctx)){var d=document.createElement('div');d.className='ab-dots '+fallback;cv.parentNode.replaceChild(d,cv);return}
    function pattern(d){
      var t=document.createElement('canvas'),n=Math.round(4*d);t.width=t.height=n;var c=t.getContext('2d');
      var g=c.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2*1.42);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.35,'rgba(0,0,0,0)');g.addColorStop(.6,'rgba(0,0,0,.6)');g.addColorStop(1,'rgba(0,0,0,.6)');
      c.fillStyle=g;c.fillRect(0,0,n,n);return ctx.createPattern(t,'repeat');
    }
    function op(node,stop){var o=1;for(var e=node;e&&e!==document.body;e=e.parentElement){var v=parseFloat(getComputedStyle(e).opacity);if(!isNaN(v))o*=v;if(e===stop)break}return o}
    function letters(c,cr,mode){
      c.fillStyle=c.strokeStyle='#000';c.lineWidth=1.2;c.lineJoin='round';
      getEls().forEach(function(el){
        if(!el)return;var r0=el.getBoundingClientRect();if(r0.bottom<cr.top||r0.top>cr.bottom||r0.right<cr.left||r0.left>cr.right)return;
        var tw=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),node;
        while((node=tw.nextNode())){
          var txt=node.textContent;if(!/\S/.test(txt))continue;
          var par=node.parentElement,cs=getComputedStyle(par);if(cs.visibility==='hidden')continue;
          var a=op(par,el);if(a<.02)continue;
          c.globalAlpha=Math.min(1,a);
          c.font=cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
          var fs=parseFloat(cs.fontStretch)||100;c.fontStretch=fs<56?'ultra-condensed':fs<69?'extra-condensed':fs<81?'condensed':fs<94?'semi-condensed':'normal';
          if('fontKerning' in c)c.fontKerning='normal';
          if('letterSpacing' in c)c.letterSpacing=cs.letterSpacing==='normal'?'0px':cs.letterSpacing;
          var up=cs.textTransform==='uppercase',re=/\S+/g,m;
          while((m=re.exec(txt))){
            var rg=document.createRange();rg.setStart(node,m.index);rg.setEnd(node,m.index+m[0].length);
            var rr=rg.getBoundingClientRect();if(!rr.width)continue;
            var t=up?m[0].toUpperCase():m[0],mt=c.measureText(t),asc=mt.fontBoundingBoxAscent||parseFloat(cs.fontSize)*.8;
            var sx=mt.width?rr.width/mt.width:1;
            c.save();c.translate(rr.left-cr.left,rr.top-cr.top+asc);c.scale(sx,1);if(mode==='stroke')c.strokeText(t,0,0);else c.fillText(t,0,0);c.restore();
          }
        }
      });
      c.globalAlpha=1;
    }
    function draw(){
      var d=Math.min(devicePixelRatio||1,2),cr=cv.getBoundingClientRect(),w=Math.round(cr.width*d),h=Math.round(cr.height*d);
      if(!w||!h)return;
      if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;mcv.width=w;mcv.height=h}
      if(!pat||pd!==d){pat=pattern(d);pd=d}
      if(soft)sampleAbout();
      ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.clearRect(0,0,w,h);ctx.fillStyle=pat;ctx.fillRect(0,0,w,h);
      // the letter shapes, eroded by about half a pixel so the cut-out always sits inside the real glyph
      mctx.setTransform(1,0,0,1,0,0);mctx.globalCompositeOperation='source-over';mctx.filter='none';mctx.clearRect(0,0,w,h);
      mctx.setTransform(d,0,0,d,0,0);letters(mctx,cr,'fill');
      mctx.globalCompositeOperation='destination-out';letters(mctx,cr,'stroke');
      ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='destination-out';ctx.drawImage(mcv,0,0);
      if(soft&&sData){
        // inside the letters: the same picture, so the difference reacts to it
        mctx.setTransform(1,0,0,1,0,0);mctx.globalCompositeOperation='source-in';if('filter' in mctx)mctx.filter='blur(1.5px)';
        mctx.drawImage(smp,-cr.left*d-20,-cr.top*d-20,innerWidth*d+40,innerHeight*d+40);mctx.filter='none';
        ctx.globalCompositeOperation='source-over';ctx.drawImage(mcv,0,0);
      }
      if(soft)tintChrome();
    }
    function loop(){draw();if(on)raf=requestAnimationFrame(loop)}
    new IntersectionObserver(function(es){es.forEach(function(e){var was=on;on=e.isIntersecting;if(on&&!was)loop();if(!on&&soft)untintChrome()})}).observe(cv);
    return {draw:draw};
  }
  // over About the menu doesn't invert pixel by pixel: each item turns black or white for what lies under it
  var CHROME_ITEMS=function(){return [].slice.call(document.querySelectorAll('.chrome .brand,.chrome .menu a,.chrome .menu button,.chrome .tc > *,.chrome .hint'))};
  var tinted=false;
  function tintChrome(){
    if(curLbl!==2){if(tinted)untintChrome();return}
    tinted=true;document.body.classList.add('chrome-solid');
    
  }
  function untintChrome(){tinted=false;document.body.classList.remove('chrome-solid');CHROME_ITEMS().forEach(function(el){el.style.color=''})}
  var CHROME=function(){return [].slice.call(document.querySelectorAll('.chrome .brand,.chrome .menu,.chrome .tc,.chrome .hint'))};
  // About: picture, pixel screen and type are drawn in one pass, so the type can never misalign with its cut-out.
  // Inside the letters the picture is inverted (that is what difference with white does), everywhere else it gets the dots.
  (function AboutCanvas(cv){
    var ctx=cv.getContext('2d');if(!ctx)return;
    var base=document.createElement('canvas'),bctx=base.getContext('2d'),tx=document.createElement('canvas'),tctx=tx.getContext('2d');
    var pat=null,pd=0,on=false;
    q('about').classList.add('ab-painted');
    function pattern(d){
      var t=document.createElement('canvas'),n=Math.round(4*d);t.width=t.height=n;var c=t.getContext('2d');
      var g=c.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2*1.42);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.35,'rgba(0,0,0,0)');g.addColorStop(.6,'rgba(0,0,0,.6)');g.addColorStop(1,'rgba(0,0,0,.6)');
      c.fillStyle=g;c.fillRect(0,0,n,n);return ctx.createPattern(t,'repeat');
    }
    function op(node,stop){var o=1;for(var e=node;e&&e!==document.body;e=e.parentElement){var v=parseFloat(getComputedStyle(e).opacity);if(!isNaN(v))o*=v;if(e===stop)break}return o}
    function type(c,cr){
      var el=q('abHead');c.fillStyle='#fff';
      var tw=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),node;
      while((node=tw.nextNode())){
        var txt=node.textContent;if(!/\S/.test(txt))continue;
        var par=node.parentElement,cs=getComputedStyle(par);var a=op(par,el);if(a<.02)continue;
        c.globalAlpha=Math.min(1,a);
        c.font=cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;
        if('fontStretch' in c){var fs=parseFloat(cs.fontStretch)||100;c.fontStretch=fs<56?'ultra-condensed':fs<69?'extra-condensed':fs<81?'condensed':fs<94?'semi-condensed':'normal'}
        if('letterSpacing' in c)c.letterSpacing=cs.letterSpacing==='normal'?'0px':cs.letterSpacing;
        var up=cs.textTransform==='uppercase',re=/\S+/g,m;
        while((m=re.exec(txt))){
          var rg=document.createRange();rg.setStart(node,m.index);rg.setEnd(node,m.index+m[0].length);
          var rr=rg.getBoundingClientRect();if(!rr.width)continue;
          var t=up?m[0].toUpperCase():m[0],mt=c.measureText(t),asc=mt.fontBoundingBoxAscent||parseFloat(cs.fontSize)*.8;
          c.save();c.translate(rr.left-cr.left,rr.top-cr.top+asc);c.scale(mt.width?rr.width/mt.width:1,1);c.fillText(t,0,0);c.restore();
        }
      }
      c.globalAlpha=1;
    }
    function draw(){
      var d=Math.min(devicePixelRatio||1,2),cr=cv.getBoundingClientRect(),w=Math.round(cr.width*d),h=Math.round(cr.height*d);
      if(!w||!h)return;
      if(cv.width!==w||cv.height!==h){cv.width=base.width=tx.width=w;cv.height=base.height=tx.height=h}
      if(!pat||pd!==d){pat=pattern(d);pd=d}
      // 1. the picture, layers in stacking order, graded black and white
      bctx.setTransform(1,0,0,1,0,0);bctx.globalAlpha=1;bctx.filter='none';bctx.fillStyle='#000';bctx.fillRect(0,0,w,h);
      if('filter' in bctx)bctx.filter='grayscale(1) contrast(1.5) brightness(.98)';
      abL.slice().sort(function(a,b){return (parseInt(a.style.zIndex)||0)-(parseInt(b.style.zIndex)||0)}).forEach(function(layer){
        var o=parseFloat(getComputedStyle(layer).opacity),el=layer.querySelector('img,video');if(!el||!(o>.01))return;
        var nw=el.naturalWidth||el.videoWidth,nh=el.naturalHeight||el.videoHeight;if(!nw||!nh)return;
        var r=el.getBoundingClientRect(),sc=Math.max(r.width/nw,r.height/nh),dw=nw*sc,dh=nh*sc;
        bctx.globalAlpha=Math.min(1,o);
        try{bctx.drawImage(el,(r.left+(r.width-dw)/2-cr.left)*d,(r.top+(r.height-dh)/2-cr.top)*d,dw*d,dh*d)}catch(e){}
      });
      bctx.filter='none';bctx.globalAlpha=1;
      // 2. picture + pixel screen
      ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.drawImage(base,0,0);ctx.fillStyle=pat;ctx.fillRect(0,0,w,h);
      // 3. the type: the same picture, inverted, cut to the letters
      tctx.setTransform(1,0,0,1,0,0);tctx.globalCompositeOperation='source-over';tctx.filter='none';tctx.clearRect(0,0,w,h);
      tctx.setTransform(d,0,0,d,0,0);type(tctx,cr);
      tctx.setTransform(1,0,0,1,0,0);tctx.globalCompositeOperation='source-in';if('filter' in tctx)tctx.filter='invert(1)';tctx.drawImage(base,0,0);tctx.filter='none';
      ctx.drawImage(tx,0,0);
      tintChrome();
    }
    function loop(){draw();if(on)requestAnimationFrame(loop)}
    new IntersectionObserver(function(es){es.forEach(function(e){var was=on;on=e.isIntersecting;if(on&&!was)loop();if(!on)untintChrome()})}).observe(cv);
  })(q('abDots'));


  /* ---------- behind the scenes ---------- */
  // [image, caption, left %, top %, rotation]
  var SLOTS=[[6,3,8,1],[31,9,-11,.88],[61,1,6,1.1],[83,14,-5,.86],[17,23,-7,1.14],[46,20,13,.94],[70,32,-9,1.04],[1,44,5,.9],[35,40,-14,1.1],[57,51,7,.84],[84,56,-6,1],[21,65,10,1]];
  var BTS=(D.bts||[]).slice(0,SLOTS.length).map(function(b,k){return [b.img,b.caption].concat(SLOTS[k])});

  /* ---------- kind words: real Trustpilot reviews ---------- */
  var REV=D.reviews||[];
  REV.forEach(function(r,k){var l=document.createElement('div');l.className='w-l'+(k===0?' on':'');l.innerHTML='<img class="fill" src="'+IMG(r.bg)+'" alt="" loading="lazy">';q('wBg').insertBefore(l,q('wBg').firstChild)});
  // every review becomes a run of subtitles. A sentence too long for two lines is cut at the comma or "and" nearest its middle.
  function chunk(sent){
    if(sent.length<=118)return [sent];
    var mid=sent.length/2,best=-1,bd=1e9,re=/(, | and | but | which | that )/g,m;
    while((m=re.exec(sent))){var at=m.index+(m[0].charAt(0)===','?1:0),d=Math.abs(at-mid);if(d<bd&&at>sent.length*.3&&at<sent.length*.72){bd=d;best=at}}
    if(best<0)return [sent];
    return chunk(sent.slice(0,best).trim()).concat(chunk(sent.slice(best).trim()));
  }
  REV.forEach(function(r){r.sents=r.text.match(/[^.!?]+[.!?]+["”]?\s*/g).map(function(x){return x.trim()});r.lines=[];r.of=[];
    r.sents.forEach(function(s,si){chunk(s).forEach(function(c){r.lines.push(c);r.of.push(si)})})});
  var wi=0,wl=0,wTimer=null,wOn=false,wHold=false,wLine=q('wLine'),tabs=[];
  REV.forEach(function(r,k){
    var b=document.createElement('button');b.type='button';b.className='w-tab';b.setAttribute('role','tab');
    b.innerHTML='<span class="bar"><i></i></span><b>'+r.name.split(' ')[0]+'</b><small>'+r.co+'</small>';
    b.addEventListener('click',function(){wPlay(k,0,true)});q('wReel').appendChild(b);tabs.push(b);
  });
  function wDur(t){return Math.max(2600,t.split(/\s+/).length*360)}
  function wShow(txt,first,dir){
    var d=dir||1;
    var go=function(){wLine.innerHTML='<span>'+txt+'</span>';if(window.gsap&&!reduce)gsap.fromTo(wLine.firstChild,{opacity:0,y:14*d,filter:'blur(6px)'},{opacity:1,y:0,filter:'blur(0px)',duration:.6,ease:'power3.out'})};
    if(!first&&wLine.firstChild&&window.gsap&&!reduce)gsap.to(wLine.firstChild,{opacity:0,y:-10*d,filter:'blur(6px)',duration:.28,ease:'power2.in',onComplete:go});else go();
  }
  function wPlay(k,l,user,dir){
    clearTimeout(wTimer);var nk=(k+REV.length)%REV.length,changed=nk!==wi||user===undefined;wi=nk;wl=l;var r=REV[wi];
    if(changed||user){[].forEach.call(document.querySelectorAll('.w-l'),function(x){x.classList.remove('on')});[].slice.call(document.querySelectorAll('.w-l')).reverse()[wi].classList.add('on');
      q('wWho').innerHTML=r.name+'<i>'+r.ctx+'</i>';tabs.forEach(function(t,i){t.setAttribute('aria-selected',i===wi?'true':'false');if(window.gsap)gsap.killTweensOf(t);t.style.setProperty('--p',i<wi?1:0)})}
    wShow(r.lines[wl],false,dir);
    wTicks();
    if(!q('wFull').hidden)wFullFill();
    var bar=tabs[wi],d=wDur(r.lines[wl]),p0=wl/r.lines.length,p1=(wl+1)/r.lines.length;
    if(window.gsap&&!reduce&&wOn&&!wHold){gsap.killTweensOf(bar);gsap.fromTo(bar,{'--p':p0},{'--p':p1,duration:d/1000,ease:'none'})}else bar.style.setProperty('--p',p1);
    if(wOn&&!wHold)wTimer=setTimeout(function(){if(wl+1<r.lines.length)wPlay(wi,wl+1,false);else wPlay(wi+1,0)},d);
  }
  // skipping: a line forward or back, across reviews
  function wStep(n){var r=REV[wi],l=wl+n;if(l>=r.lines.length)wPlay(wi+1,0,true,1);else if(l<0){var pr=REV[(wi-1+REV.length)%REV.length];wPlay(wi-1,pr.lines.length-1,true,-1)}else wPlay(wi,l,true,n)}
  function wStart(){if(wOn)return;wOn=true;wPlay(wi,wl,true)}
  function wStop(){wOn=false;clearTimeout(wTimer);tabs.forEach(function(t){if(window.gsap)gsap.killTweensOf(t)})}
  q('wPrev').addEventListener('click',function(){wStep(-1)});q('wNext').addEventListener('click',function(){wStep(1)});
  wLine.addEventListener('click',function(){wStep(1)});
  // the whole review, with the line you were on lit
  // one small tick per subtitle line, right under the line: it says where you are in this review, not which review
  var tickFor=-1;
  function wTicks(){var r=REV[wi],box=q('wTicks');
    if(tickFor!==wi){tickFor=wi;box.innerHTML='';r.lines.forEach(function(x,k){var b=document.createElement('button');b.type='button';b.tabIndex=-1;b.addEventListener('click',function(){wPlay(wi,k,true,k<wl?-1:1)});box.appendChild(b)})}
    [].forEach.call(box.children,function(b,k){b.className=k<wl?'past':k===wl?'now':''})}
  function wFullFill(){var r=REV[wi],si=r.of[wl];q('wFullTxt').innerHTML=r.sents.map(function(s,i){return '<span'+(i===si?' class="now"':'')+'>'+s+'</span>'}).join(' ');q('wFullWho').innerHTML=r.name+'<i>'+r.ctx+'</i>'}
  // reading it all: the subtitles fade back and the whole review fades up around the line you were on.
  // It keeps playing: the lit sentence moves on at the same pace and, at the end, the next review takes over.
  var fullFor=-1;
  function wFullFill(){var r=REV[wi],si=r.of[wl],box=q('wFullTxt');
    if(fullFor!==wi){fullFor=wi;box.innerHTML=r.sents.map(function(s){return '<span>'+s+'</span>'}).join(' ');q('wFullWho').innerHTML=r.name+'<i>'+r.ctx+'</i>';
      if(window.gsap&&!reduce&&!q('wFull').hidden)gsap.fromTo([box,q('wFullWho')],{opacity:0,y:10},{opacity:1,y:0,duration:.8,ease:'power2.out'})}
    [].forEach.call(box.children,function(x,i){x.classList.toggle('now',i===si);x.classList.toggle('read',i<si)})}
  function wFullOpen(){
    var f=q('wFull');fullFor=-1;wFullFill();q('wMore').setAttribute('aria-expanded','true');f.hidden=false;
    if(!window.gsap||reduce){q('words').classList.add('reading');return}
    gsap.timeline().to('.w-sub, .w-title',{opacity:0,duration:.45,ease:'power2.in'},0).add(function(){q('words').classList.add('reading')},.45)
      .fromTo(f,{opacity:0},{opacity:1,duration:.7,ease:'power2.out'},.25)
      .fromTo('#wFullTxt span',{opacity:0},{opacity:function(i,e){return e.classList.contains('now')?1:.42},duration:.9,ease:'power2.out',stagger:.03,clearProps:'opacity'},.35)
      .fromTo('#wFullWho, #wFullX',{opacity:0,y:8},{opacity:1,y:0,duration:.6,stagger:.08,ease:'power2.out'},.7);
  }
  function wFullClose(){
    var f=q('wFull');q('wMore').setAttribute('aria-expanded','false');
    var done=function(){f.hidden=true;q('words').classList.remove('reading')};
    if(!window.gsap||reduce){done();return}
    gsap.timeline().to(f,{opacity:0,duration:.45,ease:'power2.in'},0).add(done,.45).to('.w-sub, .w-title',{opacity:1,duration:.6,ease:'power2.out'},.45);
  }
  q('wMore').addEventListener('click',function(){q('wFull').hidden?wFullOpen():wFullClose()});q('wFullX').addEventListener('click',wFullClose);
  q('wFullTxt').addEventListener('click',function(e){var sp=e.target.closest('span');if(!sp)return;var si=[].indexOf.call(this.children,sp),r=REV[wi];wPlay(wi,r.of.indexOf(si),true)});
  var wIn=false;
  addEventListener('keydown',function(e){if(!wIn||project.classList.contains('open')||archive.classList.contains('open'))return;if(e.key==='ArrowRight'){e.preventDefault();wStep(1)}else if(e.key==='ArrowLeft'){e.preventDefault();wStep(-1)}else if(e.key==='Escape'&&!q('wFull').hidden)wFullClose()});
  new IntersectionObserver(function(es){es.forEach(function(e){wIn=e.isIntersecting;if(e.isIntersecting){if(e.target.classList.contains('wv'))wStart()}else wStop()})},{threshold:.5}).observe(document.querySelector('.words'));
  wShow(REV[0].lines[0],true);q('wWho').innerHTML=REV[0].name+'<i>'+REV[0].ctx+'</i>';tabs[0].setAttribute('aria-selected','true');wTicks();

  /* =========================================================
     THE FILM: one pinned stage, one scrubbed timeline
     ========================================================= */
  var LBL=[['Reel'],['Selected work'],['About'],['Off the record'],['Said on set'],['Contact']];
  var heroVid=q('heroVid'),seaVid=q('seaVid'),masterST=null;
  function setLabel(k){
    q('scLbl').textContent='SC '+pad(k+1)+' / '+pad(LBL.length)+' '+LBL[k][0];
    q('hint').style.opacity=k===5?0:1;
    [].forEach.call(document.querySelectorAll('.menu [data-to]'),function(a){a.setAttribute('aria-current',(a.dataset.to==='work'&&k===1)||(a.dataset.to==='about'&&k===2)||(a.dataset.to==='contact'&&k===5)?'true':'false')});
    document.body.classList.toggle('on-paper',k===5&&innerWidth>760);
    homeList=k===1;q('home').classList.toggle('home-list',k>=1);
    homeOn=k<=1;if(k===0&&hKey!=='reel'){active=-1;hShot('reel',LAND[landI],true)}
    if(k===5)play(seaVid);else seaVid.pause();
  }
  var curLbl=-1;function label(k){if(k!==curLbl){curLbl=k;setLabel(k)}}
  label(0);
  // the form only captures the wheel when it is taller than the screen
  function sayFit(){var s=q('say');if(s.scrollHeight>s.clientHeight+2)s.setAttribute('data-lenis-prevent','');else s.removeAttribute('data-lenis-prevent')}
  sayFit();addEventListener('resize',sayFit);

  var XF=animate&&innerWidth>760;
  if(XF)document.documentElement.classList.add('xf');
  fitAb();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitAb);if(!animate)addEventListener('resize',fitAb);
  if(animate){
    gsap.registerPlugin(ScrollTrigger);
    var openW=words(q('openHead'),true);
    var abW=words(q('abHead'));
    var sayW=words(q('sayHead'),false);
    var selBits=[q('chipW')].concat(rowWraps,[q('archW')]);
    gsap.set(selBits,{opacity:0,filter:'blur(18px)',x:90,letterSpacing:'.2em'});
    gsap.set('.meta .ln > span',{yPercent:110});
    // group the words into their visual lines once laid out
    var abLine=[],abPos=[];
    function groupLines(){
      // words on the same visual line share a line index, whatever their font
      var line=-1,lastMid=-1e9,pos=0,lh=parseFloat(getComputedStyle(q('abHead')).fontSize)*.88;
      abW.forEach(function(w,k){var r=w.getBoundingClientRect(),mid=r.top+r.height/2;
        if(mid-lastMid>lh*.55){line++;pos=0;lastMid=mid}
        abLine[k]=line;abPos[k]=pos++;});
    }
    fitAb();groupLines();
    function regroup(){fitAb();groupLines();if(abTw)abTw.forEach(function(t,k){t.startTime(tl.labels.aboutIn+2.1+abLine[k]*.34)});if(masterST){masterST.refresh()}}
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){regroup()});
    addEventListener('resize',function(){clearTimeout(window._rg);window._rg=setTimeout(regroup,200)});
    // each word starts far left, and every next word in a line starts a big step further right:
    // mid-flight the line is wide apart, then it closes up into the sentence
    function abStart(k){return -innerWidth*1.05+abPos[k]*innerWidth*.16}
    gsap.set(abW,{x:abStart,opacity:0});
    gsap.set('#about',{xPercent:100});
    gsap.set('.clients .ccol',{x:-60,opacity:0});
    gsap.set(sayW,{y:function(){return innerHeight*.22},opacity:0});
    gsap.set('#form .ltr, #form .more, #form .cta, .elsewhere, .say .foot',{y:30,opacity:0});

    // opening headline arrives word by word on load
    gsap.from(openW,{yPercent:120,duration:1.1,ease:'expo.out',stagger:.04,delay:.25});

    var tl=gsap.timeline({defaults:{ease:'none'}});
    tl.addLabel('reel',0)
      // 1. home -> selected work: the frame holds, the words change. The list racks into focus line by line.
      .add(function(){},0)
      .to(selBits,{opacity:1,filter:'blur(0px)',x:0,letterSpacing:'0em',duration:.8,stagger:.11,ease:'power2.out'},.95)
      .to('.meta .ln > span',{yPercent:0,duration:.7,stagger:.12,ease:'power3.out'},1.7)
      .addLabel('work',2.6)
      .to({},{duration:1.2})
      // 2. selected work -> about: the list leaves left, About slides in from the right, its sentence flies in word by word
      .addLabel('aboutIn')
      .to(selBits,{x:function(){return -innerWidth*1.2},duration:1.3,stagger:.04,ease:'power2.in'},'aboutIn')
      .to('.meta',{x:function(){return -innerWidth*1.2},duration:1.3,ease:'power2.in'},'aboutIn+=0.15')
      .to('#homeBg',{xPercent:-12,duration:2.2},'aboutIn+=0.4')
      .fromTo('#about',{xPercent:100},{xPercent:0,duration:2},'aboutIn+=0.6')
      .fromTo('#aboutBg',{xPercent:12},{xPercent:0,duration:2.2},'aboutIn+=0.6')
      .to('.clients .ccol',{x:0,opacity:1,duration:.7,stagger:.15,ease:'power3.out'},'aboutIn+=3.5')
      .addLabel('about','aboutIn+=4.3')
      .to({},{duration:1.4})
      .addLabel('aboutEnd');
    // each word gets its own tween, timed by the line it ends up on, so the lines can be re-timed whenever the layout changes
    var abTw=abW.map(function(w,k){var t=gsap.fromTo(w,{x:function(){return abStart(k)},opacity:0},{x:0,opacity:1,duration:1.3,ease:'power2.out',immediateRender:false});tl.add(t,tl.labels.aboutIn+2.1+abLine[k]*.34);return t});

    // 1. landing -> selected work: a white block (a negative of the shot, through the difference blend) wipes each line from the right,
    //    swallows it, and is yanked off to the left, taking the line with it
    [].forEach.call(document.querySelectorAll('#openHead .oln'),function(ln,k){
      var b=.08+k*.17,bar=ln.querySelector('.obar'),inn=ln.querySelector('.oin');
      tl.to(bar,{scaleX:1,duration:.36,ease:'power3.in'},b)
        .set(inn,{opacity:0},b+.37)
        .set(bar,{transformOrigin:'0% 50%'},b+.37)
        .to(bar,{scaleX:0,duration:.5,ease:'power3.in'},b+.4)
        .to(ln,{x:function(){return -innerWidth*.55},skewX:-12,duration:.55,ease:'power3.in'},b+.4);
    });
    var total=tl.duration();
    masterST=ScrollTrigger.create({
      trigger:'#film',start:'top top',end:function(){return '+='+Math.round(innerHeight*total*.5)},
      pin:true,scrub:1.2,animation:tl,anticipatePin:1,invalidateOnRefresh:true,
      onUpdate:function(st){
        var t=st.progress*tl.duration();
        label(t<1.4?0:t<tl.labels.aboutIn+1.4?1:2);
        q('clients').classList.toggle('ready',t>=tl.labels.about-0.15);
        if(t<tl.labels.aboutIn){if(picked>-1){var on=clist.querySelector('.client.on');showClient(picked,on)}}
        if(t<tl.labels.aboutIn+1.8)play(lyr[front].querySelector('video'));else{var v=lyr[front].querySelector('video');if(v)v.pause()}
      }
    });
    function scrollToLabel(name){
      if(name==='contact'){if(lenis)lenis.scrollTo('#'+name,{duration:2.4});else q(name).scrollIntoView({behavior:'smooth'});return}
      var y=name==='0'?0:masterST.labelToScroll(name);
      if(lenis)lenis.scrollTo(y,{duration:2});else scrollTo({top:y,behavior:'smooth'});
    }
    [].forEach.call(document.querySelectorAll('[data-to]'),function(a){a.addEventListener('click',function(e){e.preventDefault();closeAllPages();scrollToLabel(a.dataset.to)})});

    // off the record: polaroids drift past the title at three speeds
    BTS.forEach(function(b,k){
      var li=document.createElement('li');li.className='pol';li.style.left=b[2]+'%';li.style.top=b[3]+'%';li.style.setProperty('--r',b[4]+'deg');li.style.setProperty('--s',b[5]);
      li.innerHTML='<figure><div><img crossorigin="anonymous" src="'+IMG(b[0])+'" alt="'+b[1]+'" loading="lazy"></div><figcaption>'+b[1]+'</figcaption></figure>';
      q('pols').appendChild(li);
      if(innerWidth>760)gsap.fromTo(li,{rotation:(k%2?-1:1)*5,x:(k%2?1:-1)*24},{rotation:(k%2?1:-1)*4,x:(k%2?-1:1)*18,ease:'none',scrollTrigger:{trigger:'#bts',start:'top bottom',end:'bottom top',scrub:1.4}});
      if(innerWidth>760)gsap.fromTo(li,{y:0},{y:function(){return -innerHeight*[.22,.5,.32,.62,.15,.42,.28,.55,.36,.2,.48,.3][k]},ease:'none',scrollTrigger:{trigger:'#bts',start:'top bottom',end:'bottom top',scrub:1+(k%4)*.35}});
    });

    var btsW=words(q('btsHead').querySelector('.serif'),true);
    // off the record: the heading starts "on the record" with the camera rolling; scrolling in cuts the camera,
    // strikes "on" out by hand and drops "off" in its place
    // about -> off the record: as the stage scrolls away its lower edge sinks into black, so the seam lies in black
    gsap.fromTo('#abSink',{opacity:0},{opacity:1,ease:'none',scrollTrigger:{trigger:'#bts',start:'top bottom',end:'top 40%',scrub:true}});
    gsap.timeline({scrollTrigger:{trigger:'#bts',start:'top 8%',end:'top -85%',scrub:1.6,
        onUpdate:function(st){q('otrRec').classList.toggle('cut',st.progress>.48)}}})
      .to('.otr-on',{yPercent:105,duration:.3,ease:'power3.in'},.35)
      .fromTo('.otr-off',{yPercent:-105,visibility:'visible'},{yPercent:0,duration:.35,ease:'power3.out',immediateRender:true},.5)
      .fromTo('.otr-the',{width:0},{width:function(){return document.querySelector('.otr-the > span').offsetWidth},duration:.4,ease:'power3.inOut'},.48)
      .fromTo('.otr-sub',{y:18,opacity:0},{y:0,opacity:1,duration:.25,ease:'power2.out'},.95)
      .to({},{duration:.1});
    if(XF){
      // 5. off the record -> kind words: the last print comes up, and you fall into it. Its picture becomes the review's background.
      var xf=q('xfer');xf.innerHTML='<div class="xpol"><div class="xi"><img alt=""><span class="w-shade"></span></div><span class="xc"></span></div>';
      var xp=xf.querySelector('.xpol'),xi=xp.querySelector('.xi'),xim=xp.querySelector('img'),xsh=xp.querySelector('.w-shade'),xc=xp.querySelector('.xc');
      function xfSet(){var r=REV[wi],src=IMG(r.bg);if(xim.getAttribute('src')!==src)xim.src=src;xc.textContent=r.co}
      xfSet();
      var xs={p:0},polsEl=q('pols');
      function xfDraw(){
        var p=xs.p,W=innerWidth,H=innerHeight,pw=Math.min(430,Math.max(250,W*.25))*1.05,ph=pw*1.22;
        var rise=Math.min(1,p/.5),grow=Math.max(0,(p-.5)/.5),e=grow<.5?4*grow*grow*grow:1-Math.pow(-2*grow+2,3)/2,er=1-Math.pow(1-rise,3);
        var w=pw+(W-pw)*e,h=ph+(H-ph)*e,pad=pw*.056*(1-e),bot=ph*.2*(1-e);
        // the other prints clear off the table as this one comes up
        polsEl.style.transform='translateY('+(-rise*innerHeight*.45)+'px)';
        xp.style.width=w+'px';xp.style.height=h+'px';xp.style.borderRadius=(8*(1-e))+'px';
        xp.style.transform='translate(-50%,-50%) translateY('+((1-er)*H*.85)+'px) rotate('+((1-er)*-9+(1-e)*-3)+'deg)';
        xi.style.left=xi.style.right=pad+'px';xi.style.top=pad+'px';xi.style.bottom=bot+'px';
        xc.style.bottom=(bot*.28)+'px';xc.style.fontSize=(pw*.09)+'px';xc.style.opacity=1-e*2.2;
        xim.style.filter='grayscale('+(.1*e)+') brightness('+(1-.38*e)+') saturate('+(1-.1*e)+')';xsh.style.opacity=e;
        xp.style.boxShadow='0 '+(30*(1-e))+'px '+(40*(1-e))+'px rgba(0,0,0,'+(.3*(1-e))+')';
      }
      gsap.to(xs,{p:1,ease:'none',onUpdate:xfDraw,scrollTrigger:{trigger:'#words',start:'top 180%',end:'top top',scrub:true,
          onUpdate:function(st){xf.style.visibility=st.progress>0&&st.progress<1?'visible':'hidden'},
          onToggle:function(st){if(st.isActive)xfSet()},
          onLeave:function(){document.querySelector('.words').classList.add('wv');wIntro.restart(true)},
          onEnterBack:function(){document.querySelector('.words').classList.remove('wv');wIntro.pause(0);wStop()}}});
      xfDraw();addEventListener('resize',xfDraw);
      // 6. kind words -> contact (after Production Portugal's "brands -> skip the hesitation"):
      //    the contact screen rises like a curtain, the reviews sink back under it, the sea settles from a close-up, the heading rises line by line
      gsap.timeline({scrollTrigger:{trigger:'#contact',start:'top bottom',end:'top top',scrub:true}})
        .to('.words .w-title, .words .w-sub, .words .w-reel, .words .w-srcs',{y:function(){return -innerHeight*.16},opacity:.25,ease:'none',duration:1},0)
        .fromTo('#seaVid',{scale:2,yPercent:-18},{scale:1,yPercent:0,ease:'power2.out',duration:1},0);
    } else {
      document.querySelector('.words').classList.add('wv');
    }
    // the reviews: the picture pushes in slowly while you scroll through them
    gsap.fromTo('.w-bg',{scale:1},{scale:1.06,ease:'none',scrollTrigger:{trigger:'#words',start:'top top',end:'bottom bottom',scrub:true}});

    // after the landing, things arrive one after the other: the title, then the subtitle starts talking, then the rest
    var whW=words(q('wHead'),true);
    var wIntro=gsap.timeline({paused:true,delay:.25})
      .fromTo(whW,{yPercent:110},{yPercent:0,duration:1.2,stagger:.08,ease:'expo.out'},0)
      .fromTo('.w-sub',{y:24,opacity:0},{y:0,opacity:1,duration:1.1,ease:'expo.out'},.55)
      .add(function(){wStart()},.6)
      .fromTo('.w-reel, .w-srcs',{y:16,opacity:0},{y:0,opacity:1,duration:1,stagger:.12,ease:'expo.out'},.95);
    if(XF){gsap.set(whW,{yPercent:110});gsap.set('.w-sub, .w-reel, .w-srcs',{opacity:0})}
    else ScrollTrigger.create({trigger:'#words',start:'top 65%',onEnter:function(){wIntro.restart(true)},onLeaveBack:function(){wIntro.pause(0)}});

    ScrollTrigger.create({trigger:'#contact',start:'top bottom',onEnter:function(){play(seaVid)},onEnterBack:function(){play(seaVid)}});
    // contact rises in as the last screen
    gsap.fromTo('#contactBg',{yPercent:-12},{yPercent:0,ease:'none',scrollTrigger:{trigger:'#contact',start:'top bottom',end:'top top',scrub:true}});
    gsap.timeline({scrollTrigger:{trigger:'#contact',start:XF?'top 55%':'top 60%',toggleActions:'play none none reverse'}})
      .to(sayW,{y:0,opacity:1,duration:1.5,stagger:.06,ease:'expo.out'})
      .to('#form .ltr, #form .more, #form .cta, .elsewhere, .say .foot',{y:0,opacity:1,duration:.9,stagger:.08,ease:'expo.out'},.5);

    // scene labels for the free-scrolling part of the page
    // off the record lasts until the reviews have taken the screen; the reviews last until contact is half way up
    ScrollTrigger.create({trigger:'#bts',start:'top 50%',endTrigger:'#words',end:XF?'top top':'top 50%',onToggle:function(st){if(st.isActive)label(3)},onLeaveBack:function(){label(2)}});
    ScrollTrigger.create({trigger:'#words',start:XF?'top top':'top 50%',endTrigger:'#contact',end:'top 50%',onToggle:function(st){if(st.isActive)label(4)}});
    ScrollTrigger.create({trigger:'#contact',start:'top 50%',onToggle:function(st){if(st.isActive)label(5)},onLeaveBack:function(){label(4)}});
    ScrollTrigger.create({trigger:'#bts',start:'top 80%',onEnter:function(){if(picked>-1){showClient(picked,clist.querySelector('.client.on'))}}});

    ScrollTrigger.refresh();
  } else {
    var SCN={home:0,about:2,bts:3,words:4,contact:5};
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)label(SCN[e.target.id])})},{threshold:.4});
    Object.keys(SCN).forEach(function(id){io.observe(q(id))});
    BTS.forEach(function(b){var li=document.createElement('li');li.className='pol';li.style.left=b[2]+'%';li.style.top=b[3]+'%';li.style.setProperty('--r',b[4]+'deg');li.innerHTML='<figure><div><img crossorigin="anonymous" src="'+IMG(b[0])+'" alt="'+b[1]+'" loading="lazy"></div><figcaption>'+b[1]+'</figcaption></figure>';q('pols').appendChild(li)});
    [].forEach.call(document.querySelectorAll('[data-to]'),function(a){a.addEventListener('click',function(e){e.preventDefault();closeAllPages();var id={'0':'home',work:'home',about:'about',contact:'contact'}[a.dataset.to];q(id).scrollIntoView()})});
  }

  /* ---------- pages ---------- */
  var archive=q('archive'),project=q('project'),zoom=q('zoom'),grid=q('grid');
  function openPage(el){
    el.classList.add('open');el.setAttribute('aria-hidden','false');lockScroll(true);
    if(!animate){el.style.clipPath='inset(0 0 0 0)';return}
    gsap.fromTo(el,{clipPath:'inset(100% 0% 0% 0%)'},{clipPath:'inset(0% 0% 0% 0%)',duration:1.1,ease:'expo.inOut'});
  }
  function pageDone(el){
    if(el===archive)document.body.classList.remove('in-archive');
    if(el===project){document.body.classList.remove('proj');giveBack();setUrl(null)}
    if(window.gsap)gsap.set(el,{opacity:1,scale:1,clearProps:'transform'});
    el.classList.remove('open');el.setAttribute('aria-hidden','true');el.querySelectorAll('video').forEach(function(v){v.pause()});
    if(!archive.classList.contains('open')&&!project.classList.contains('open'))lockScroll(false);
  }
  function closePage(el){
    if(!el.classList.contains('open')) return;
    el.setAttribute('aria-hidden','true');
    if(!animate){el.style.clipPath='inset(100% 0 0 0)';pageDone(el);return}
    gsap.to(el,{clipPath:'inset(0% 0% 100% 0%)',duration:.9,ease:'expo.inOut',onComplete:function(){pageDone(el)}});
  }
  function closeAllPages(){closePage(project);closePage(archive)}

  // archive: two single choices instead of a wall of toggles
  var KINDS=['Brand & social','Music video','Event','Travel','Corporate','Personal'];
  var sel={med:'',kind:''},cards=[];
  function kindOf(p,k){return k==='Personal'?p.work==='Personal':p.kind===k}
  function matches(p,s){s=s||sel;return (!s.med||p.med.indexOf(s.med)>-1)&&(!s.kind||kindOf(p,s.kind))}
  function tagsOf(p){var t=[p.type];if(p.role.toLowerCase()!==p.type.toLowerCase())t.push(p.role);if(p.place&&p.title.indexOf(p.place)<0)t.push(p.place);return t.join(' · ')}
  function cardHTML(i){var p=P[i];return '<div class="cedge"><span>'+pad(i+1)+'</span><span>▸ '+pad(i+1)+'A</span></div><div class="cimg">'+(p.video?'<video crossorigin="anonymous" src="'+VID(p.video)+'" poster="'+IMG(poster(p))+'" muted loop playsinline preload="none"></video>':'<img crossorigin="anonymous" src="'+IMG(poster(p))+'" alt="" loading="lazy">')+'</div><div class="cmeta"><b>'+p.title+'</b><span>'+p.client+'</span></div><div class="ctags">'+tagsOf(p)+'</div>'}
  P.forEach(function(p,i){
    var c=document.createElement('button');c.type='button';c.className='card';c.innerHTML=cardHTML(i);
    c.addEventListener('mouseenter',function(){play(c.querySelector('video'))});
    c.addEventListener('mouseleave',function(){var v=c.querySelector('video');if(v)v.pause()});
    c.addEventListener('click',function(){openProject(i,c.querySelector('.cimg'))});
    grid.appendChild(c);cards.push(c);
  });
  var empty=document.createElement('p');empty.className='a-empty';empty.textContent='Nothing here yet. Try another one.';empty.hidden=true;grid.appendChild(empty);
  var medBtns=[],kindBtns=[];
  [['','Film & photo'],['Film','Film'],['Photo','Photo']].forEach(function(m){var b=document.createElement('button');b.type='button';b.setAttribute('role','radio');b.textContent=m[1];b.addEventListener('click',function(){sel.med=m[0];applyFilters(true)});q('fmed').appendChild(b);medBtns.push([m[0],b])});
  [''].concat(KINDS).forEach(function(k){var b=document.createElement('button');b.type='button';b.setAttribute('role','radio');b.innerHTML=(k||'All work')+'<sup></sup>';b.addEventListener('click',function(){sel.kind=(sel.kind===k?'':k);applyFilters(true)});q('fkind').appendChild(b);kindBtns.push([k,b])});
  function applyFilters(anim){
    var before=new Map();
    if(anim&&!reduce)cards.forEach(function(c){if(!c.classList.contains('gone'))before.set(c,c.getBoundingClientRect())});
    var n=0;P.forEach(function(p,i){var on=matches(p);cards[i].classList.toggle('gone',!on);if(on)n++});
    q('fcount').textContent=pad(n);empty.hidden=n>0;
    medBtns.forEach(function(x){x[1].setAttribute('aria-checked',x[0]===sel.med?'true':'false')});
    kindBtns.forEach(function(x){var c=P.filter(function(p){return matches(p,{med:sel.med,kind:x[0]})}).length;x[1].querySelector('sup').textContent=c;x[1].disabled=!c&&x[0]!=='';x[1].setAttribute('aria-checked',x[0]===sel.kind?'true':'false')});
    if(!anim||reduce)return;
    var k=0;cards.forEach(function(c){if(c.classList.contains('gone'))return;var a=c.getBoundingClientRect(),b=before.get(c);
      if(b){var dx=b.left-a.left,dy=b.top-a.top;if(dx||dy)c.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'none'}],{duration:700,easing:'cubic-bezier(.2,.7,.2,1)'})}
      else c.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:550,delay:90+(k++)*45,easing:'cubic-bezier(.2,.7,.2,1)',fill:'backwards'})});
  }
  applyFilters(false);
  function openArchive(){
    archive.scrollTop=0;openPage(archive);document.body.classList.add('in-archive');
    if(animate){var vis=cards.filter(function(c){return !c.classList.contains('gone')});gsap.fromTo(vis,{y:70,opacity:0},{y:0,opacity:1,duration:1,ease:'expo.out',stagger:.06,delay:.55});gsap.fromTo('#archive h2',{x:-80,opacity:0},{x:0,opacity:1,duration:1,ease:'expo.out',delay:.45})}
  }
  [].forEach.call(document.querySelectorAll('[data-archive]'),function(b){b.addEventListener('click',function(e){e.preventDefault();closePage(project);openArchive()})});
  q('archBack').addEventListener('click',function(){closePage(archive)});

  // project page
  var SCRIPT={
    btp:['EXT. SAND QUARRY, DAY','A man stands where the conveyor belt ends. The band is somewhere behind him. Nobody explains anything.','CUT TO: UNDERWATER.'],
    rgn:['EXT. SWEDISH LAKE, FIRST LIGHT','Fog on the water. Canoes, no signal. Someone is already making coffee on a stove the size of a fist.','DISSOLVE TO: CAMP.'],
    ram:['EXT. MOUNTAIN PASS, DAY','A rider, a phone on the handlebars, a flock of sheep that will not move. The phone does not budge either.','SMASH CUT TO: GRAVEL.'],
    hav:['EXT. BALKAN RIDGE, GOLDEN HOUR','The tent goes up, the bike cools down. Nobody wants to go inside yet.','HOLD ON: THE VALLEY.'],
    end:['EXT. SWEDISH FOREST, DUSK','Everything you need, strapped to the back of a motorbike. Camp is wherever the road gives up.','CUT TO: MORNING.'],
    ice:['EXT. ICELAND, ALL DAY (IT NEVER GETS DARK)','One van, one hiker, a lot of wind. Made for nobody but ourselves.','FADE OUT.'],
    tgm:['EXT. OPEN FIELD, SUMMER','Grown men wrestle in the grass, then sit in a circle and talk. Both are the point.','CUT TO: THE CIRCLE.'],
    jt:['EXT. JULIANATOREN, OPENING TIME','Candy floss, a hundred kids and one photographer trying to stay out of the queue.','CUT TO: THE NEXT RIDE.'],
    sg:['EXT. CAMBUUR STADIUM, BUILD DAY','Sparks, cranes and a pitch without a crowd. The loudest part of a stadium is building it.','CUT TO: STEEL.'],
    ltm:['EXT. CAMP, EVENING','One tool, a dozen small jobs and a fire that needs a little help.','CUT TO: EMBERS.']
  };
  var cur=-1,plenis=null,pItems=[],stripItems=[],from='home',typing=null;
  function projMedia(p){var l=[];if(p.video)l.push([p.video,1]);if(p.video2)l.push([p.video2,1]);(CLIPS[p.id]||[]).forEach(function(c){l.push([c,1])});p.stills.forEach(function(x){if(l.every(function(y){return y[0]!==x}))l.push([x,0])});return l}
  function cardFor(i,cls){var c=document.createElement('button');c.type='button';c.className='card '+(cls||'');c.innerHTML=cardHTML(i).replace(/<video[^>]*><\/video>/,'<img crossorigin="anonymous" src="'+IMG(poster(P[i]))+'" alt="" loading="lazy">');return c}
  function frameBtn(it,k){var f=document.createElement('button');f.type='button';f.className='ps-f'+(it[1]?' wide':'');
    f.innerHTML=(it[1]?'<video crossorigin="anonymous" src="'+VID(it[0])+'" poster="'+PST(it[0])+'" muted loop playsinline preload="metadata"></video>':'<img crossorigin="anonymous" src="'+IMG(it[0])+'" alt="" loading="lazy">')+'<span>'+pad(k+1)+'</span>';
    f.addEventListener('click',function(){lbOpen(k)});return f}
  // each project told like a case: what it was, what was asked, how it was approached, the frames, how it happened, the set
  var PLAY='<svg viewBox="0 0 12 14"><path d="M1 1l10 6-10 6z"/></svg>';
  function fmtDur(d){if(!isFinite(d)||!d)return '';var m=Math.floor(d/60),s=Math.round(d%60);if(!m)return ':'+(s<10?'0':'')+s;return m+':'+(s<10?'0':'')+s}
  function filmsOf(p){if(p.films&&p.films.length)return p.films;var l=[];if(p.video)l.push([p.video,'The film']);if(p.video2)l.push([p.video2,'Second take']);(CLIPS[p.id]||[]).forEach(function(c,k){l.push([c,'Cut-down '+pad(k+1)])});return l}
  function didOf(p){var r=p.role.replace(/ & /g,', ').split(/,\s*/).map(function(x){x=x.trim();return x.charAt(0).toUpperCase()+x.slice(1)});if(p.role==='Everything')r=['Concept','Direction','Camera','Edit','Color'];if(r.indexOf('Edit')>-1&&r.indexOf('Color')<0)r.push('Color');return r}
  function reviewFor(p){for(var k=0;k<REV.length;k++){if(REV[k].co&&(p.client.indexOf(REV[k].co)>-1||REV[k].co.indexOf(p.client)>-1))return REV[k]}return null}
  var PA2=null,PAP=null;
  function fillProject(i,keepFrame){
    cur=i;var p=P[i];var off=function(k){return !!(p.off&&p.off[k])};
    var fm=q('pFrame');
    if(!keepFrame){giveBack();fm.innerHTML='';var ho=heroOverride;var fel=ho?mediaEl(ho.name,ho.v):mediaEl(p.video||p.bg||p.stills[0],!!p.video);
      if(ho&&ho.v&&ho.t){var sk=function(){try{fel.currentTime=ho.t+.25}catch(e){}};fel.addEventListener('loadedmetadata',sk,{once:true})}fel.classList.remove('kb');if(fel.tagName==='VIDEO')fel.loop=true;fm.appendChild(fel)}
    q('pTitle').textContent=p.title;var tw=words(q('pTitle'),true);
    q('pCount').textContent='Project '+pad(i+1)+' / '+pad(P.length);
    // short and to the point: what it is, for whom
    q('pLog').textContent=p.lede.replace(/\.$/,'')+'.'+(p.desc?' '+p.desc:'');
    q('pClient').innerHTML='<span>Client:</span> '+p.client;
    // deliverables: every cut you can watch, each with its own length
    var films=off('deliverables')?[]:filmsOf(p),fr=q('pfRow');fr.innerHTML='';q('pFilms').hidden=!films.length;q('pPlay').hidden=!filmsOf(p).length;
    q('pSlug').textContent=films.length>1?'The film and the cut-downs made from it. Click one to watch it.':'Click to watch the film.';
    films.forEach(function(f){var b=document.createElement('button');b.type='button';b.className='pjf';
      b.innerHTML='<div class="pjf-im"><video crossorigin="anonymous" src="'+VID(f[0])+'" poster="'+PST(f[0])+'" muted loop playsinline preload="metadata"></video><i>'+PLAY+'</i></div><b>'+f[1]+'</b><small>&nbsp;</small>';
      var v=b.querySelector('video');v.addEventListener('loadedmetadata',function(){b.querySelector('small').textContent=fmtDur(v.duration)});
      b.addEventListener('mouseenter',function(){play(v)});b.addEventListener('mouseleave',function(){v.pause()});
      b.addEventListener('click',function(){vpOpen(f[0])});fr.appendChild(b)});
    var film=p.med.indexOf('Film')>-1,photo=p.med.indexOf('Photo')>-1,tbd='<dd class="tbd">to add</dd>';
    // the ask
    q('paDid').innerHTML=didOf(p).map(function(x){return '<li>'+x+'</li>'}).join('');
    q('paTxt').textContent=p.brief||(p.lede.replace(/\.$/,'')+'. The brief in two or three sentences goes here: who it was for and what they needed.');
    if(PA2==null)PA2=q('paTxt2').textContent;q('paTxt2').textContent=p.brief2||PA2;
    q('pMeta').innerHTML=[p.type,p.work==='Personal'?'Personal work':p.kind,p.place||'',(film?'Film':'')+(film&&photo?' & ':'')+(photo?'Photo':'')].filter(Boolean).map(function(x){return '<div><dd>'+x+'</dd></div>'}).join('');
    if(PAP==null)PAP=q('papTxt').innerHTML;
    q('papTxt').innerHTML=p.approachText&&p.approachText.length?'<p id="papLead"></p>'+p.approachText.map(function(t){var e=document.createElement('p');e.textContent=t;return e.outerHTML}).join(''):PAP;
    q('papLead').textContent=p.approachLead||'The one idea that steered the whole '+p.type.toLowerCase()+' goes here, in a sentence or two.';
    // stills: a real grid of frames from the film (or the series), each opens large
    var still=p.stills.slice();(CLIPS[p.id]||[]).forEach(function(c){still.push(c+'-poster')});if(p.video)still.unshift(p.video+'-poster');
    still=still.filter(function(x,k){return still.indexOf(x)===k});
    pItems=still.map(function(x){return [x,0]});
    var sg=q('pstGrid');sg.innerHTML='';sg.parentNode.hidden=off('stills');sg.classList.toggle('photo',!film);
    pItems.forEach(function(it,k){var b=document.createElement('button');b.type='button';b.innerHTML='<img crossorigin="anonymous" src="'+IMG(it[0])+'" alt="" loading="lazy">';b.addEventListener('click',function(){lbOpen(k)});sg.appendChild(b)});
    q('psCount').textContent=pad(pItems.length)+' frames';
    var pic=function(n){return '<img crossorigin="anonymous" src="'+IMG(n)+'" alt="" loading="lazy">'};
    q('paImg').innerHTML=pic(p.askImage||p.stills[1]||p.stills[0]);q('papImg').innerHTML=pic(p.approachImage||p.stills[2]||p.stills[p.stills.length-1]);
    // how it happened: a picture or a clip per topic, a short text beside it
    var place=p.place||'the location';
    var hm=films.slice(1).map(function(f){return [f[0],1]}).concat(p.stills.slice(3).map(function(x){return [x,0]})).concat(p.stills.map(function(x){return [x,0]}));
    var HOW=p.how&&p.how.length?p.how.map(function(h){return [h.title,h.text,h.media?[h.media,h.video?1:0]:null]}):[['Location','Why '+place+', and what the place itself added to the story. One short paragraph.'],['Visual approach','The look and how it was built: light, movement, the rules for the camera and the grade.'],['Gear choices','What went into the bag and why: the camera, the lenses, the rigs that made the shots possible.']];
    var esc=function(t){var e=document.createElement('p');e.textContent=t||'';return e.innerHTML};
    q('phGrid').innerHTML=HOW.map(function(x,k){var m=x[2]||hm[k]||[p.stills[0],0];
      return '<div class="pj-how-i"><h3>'+esc(x[0])+'</h3><figure class="pj-img">'+(m[1]?'<video crossorigin="anonymous" src="'+VID(m[0])+'" poster="'+PST(m[0])+'" muted loop playsinline autoplay preload="metadata"></video>':'<img crossorigin="anonymous" src="'+IMG(m[0])+'" alt="" loading="lazy">')+'</figure><div class="pj-txt"><p>'+esc(x[1])+'</p></div></div>'}).join('');
    // the client's own words, when there are any
    var rv=p.quote!=null?REV[p.quote]:reviewFor(p);if(off('quote'))rv=null;q('pQuote').hidden=!rv;if(rv){q('pqTxt').textContent=rv.sents.slice(0,3).join(' ');q('pqWho').innerHTML=rv.name+'<i>'+rv.ctx.split(',')[0]+'</i>';q('pqImg').innerHTML=pic(rv.bg)}
    // behind the scenes: a long, big, moving rail
    var bt=q('pbTrack');bt.innerHTML='';var BIM=p.btsImages||[];q('pBts').hidden=!BIM.length||off('bts');var SZ=['t','w','m','w','t','m','w','t','m','w','t','w','m','t'];
    var seq=BIM.slice(i%BIM.length).concat(BIM.slice(0,i%BIM.length));
    seq.concat(seq).forEach(function(n,k){var d=document.createElement('div');d.className='pb-f '+SZ[k%SZ.length];d.innerHTML='<img crossorigin="anonymous" src="'+IMG(n)+'" alt="" loading="lazy">';bt.appendChild(d)});
    // credits
    var cr=[['Director','Justin Nederkoorn'],['Camera','Justin Nederkoorn'],['Edit & color','Justin Nederkoorn'],['Producer',null],['Sound',null],['Assistant',null]];
    if(!film)cr=[['Photography','Justin Nederkoorn'],['Edit','Justin Nederkoorn'],['Assistant',null],['Styling',null]];
    if(p.credits&&p.credits.length)cr=p.credits;q('pCred').hidden=off('credits');
    q('pcList').innerHTML=cr.map(function(r){return '<div><dt>'+r[0]+'</dt>'+(r[1]?'<dd>'+r[1]+'</dd>':tbd)+'</div>'}).join('');
    // more work: four others
    var g=q('pmGrid');g.innerHTML='';
    for(var k=1;k<=4;k++){(function(n){var c=cardFor(n);c.addEventListener('click',function(){openProject(n,c.querySelector('.cimg'))});g.appendChild(c)})((i+k)%P.length)}
    project.scrollTop=0;if(plenis)plenis.scrollTo(0,{immediate:true});
    approachIn();
    if(animate&&!quietIntro){
      gsap.fromTo(tw,{yPercent:110},{yPercent:0,duration:1,ease:'expo.out',stagger:.06,delay:.15});
      gsap.fromTo('#pLog, #pClient',{y:16,opacity:0},{y:0,opacity:1,duration:.9,ease:'expo.out',stagger:.08,delay:.4});
      gsap.fromTo('#pPlay, .pj-dive',{opacity:0},{opacity:1,duration:.8,delay:.9});
    }
    play(fm.querySelector('video'));
  }
  // the ask -> approach: the approach slides in from the right, the way About does on the home page:
  // the heading's words start far apart and close up, the picture glides in after them, the text last
  var appST=null;
  function approachIn(){}

  // the bts rail drifts on its own, speeds up with the scroll, and can be dragged
  var pbX=0,pbV=0,pbLast=0,pbDrag=false,pbFling=0;
  (function pbLoop(){requestAnimationFrame(pbLoop);if(!project.classList.contains('open'))return;var t=q('pbTrack');if(!t.firstChild)return;
    var sy=project.scrollTop,dv=sy-pbLast;pbLast=sy;pbV+=(dv*.6-pbV)*.08;
    if(!pbDrag){pbX-=.5+Math.max(-6,Math.min(14,pbV))-pbFling;pbFling*=.94}
    var half=t.scrollWidth/2;if(-pbX>half)pbX+=half;if(pbX>0)pbX-=half;t.style.transform='translate3d('+pbX+'px,0,0)'})();
  (function(){var rail=q('pbRail'),x0=0,last=0,lt=0;
    rail.addEventListener('pointerdown',function(e){pbDrag=true;x0=e.clientX;last=e.clientX;lt=performance.now();pbFling=0;rail.classList.add('drag');rail.setPointerCapture(e.pointerId)});
    rail.addEventListener('pointermove',function(e){if(!pbDrag)return;var dx=e.clientX-last;pbX+=dx;var now=performance.now();pbFling=dx/Math.max(8,now-lt)*16;last=e.clientX;lt=now});
    var up=function(){if(!pbDrag)return;pbDrag=false;rail.classList.remove('drag');pbFling=Math.max(-40,Math.min(40,pbFling))};
    rail.addEventListener('pointerup',up);rail.addEventListener('pointercancel',up);
  })();
  function barTick(){}
  // the film player
  var hlsP=null,hlsI=null;
  // the full film streams adaptively (HLS): the quality follows the screen and the connection
  function loadHls(){if(!hlsP)hlsP=new Promise(function(ok,no){var t=document.createElement('script');t.src='/vendor/hls.light.min.js';t.onload=function(){ok(window.Hls)};t.onerror=no;document.head.appendChild(t)});return hlsP}
  function vpOpen(name){var v=q('vpVid'),h=HLS(name);if(hlsI){hlsI.destroy();hlsI=null}v.muted=false;q('vp').hidden=false;
    if(h&&!v.canPlayType('application/vnd.apple.mpegurl'))loadHls().then(function(Hls){if(Hls&&Hls.isSupported()){hlsI=new Hls({capLevelToPlayerSize:true});hlsI.loadSource(h);hlsI.attachMedia(v);play(v)}else{v.src=VID(name);play(v)}},function(){v.src=VID(name);play(v)});
    else{v.src=h||VID(name);play(v)}if(animate)gsap.fromTo('#vp',{opacity:0},{opacity:1,duration:.4})}
  function vpClose(){var v=q('vpVid');v.pause();var done=function(){q('vp').hidden=true;if(hlsI){hlsI.destroy();hlsI=null}v.removeAttribute('src');v.load()};if(animate)gsap.to('#vp',{opacity:0,duration:.3,onComplete:done});else done()}
  q('vpX').addEventListener('click',vpClose);q('vp').addEventListener('click',function(e){if(e.target===this)vpClose()});
  addEventListener('keydown',function(e){if(e.key==='Escape'&&!q('vp').hidden){e.stopImmediatePropagation();vpClose()}},true);
  q('pPlay').addEventListener('click',function(){var f=filmsOf(P[cur]);if(f.length)vpOpen(f[0][0])});
  function sizeStrip(){if(window.ScrollTrigger)requestAnimationFrame(function(){ScrollTrigger.refresh()})}
  function stripTick(){if(!project.classList.contains('open'))return;barTick();
    [].forEach.call(project.querySelectorAll('.pf video'),function(v){var r=v.getBoundingClientRect();if(!(r.bottom>0&&r.top<innerHeight))v.pause()});
  }
  if(window.Lenis&&animate){
    plenis=new Lenis({wrapper:project,content:q('pInner'),duration:1.15,easing:function(t){return Math.min(1,1.001-Math.pow(2,-10*t))}});
    plenis.on('scroll',function(){stripTick();ScrollTrigger.update()});gsap.ticker.add(function(t){if(project.classList.contains('open'))plenis.raf(t*1000)});
  } else project.addEventListener('scroll',stripTick,{passive:true});
  addEventListener('resize',function(){if(project.classList.contains('open'))sizeStrip()});

  // lightbox: big, and any click outside the arrows closes it
  var lbI=0;
  function lbShow(k){lbI=(k+pItems.length)%pItems.length;var it=pItems[lbI],st=q('lbStage');st.innerHTML=it[1]?'<video crossorigin="anonymous" src="'+VID(it[0])+'" muted loop playsinline autoplay></video>':'<img crossorigin="anonymous" src="'+IMG(it[0])+'" alt="">';play(st.querySelector('video'));q('lbN').textContent=pad(lbI+1)+' / '+pad(pItems.length)+' · '+P[cur].title;
    if(animate)gsap.fromTo(st.firstChild,{opacity:0,scale:.97},{opacity:1,scale:1,duration:.5,ease:'expo.out'})}
  function lbOpen(k){q('lb').hidden=false;lbShow(k);if(animate)gsap.fromTo('#lb',{opacity:0},{opacity:1,duration:.35})}
  function lbClose(){if(q('lb').hidden)return;if(animate)gsap.to('#lb',{opacity:0,duration:.3,onComplete:function(){q('lb').hidden=true;q('lbStage').innerHTML=''}});else{q('lb').hidden=true;q('lbStage').innerHTML=''}}
  q('lb').addEventListener('click',function(e){if(e.target.closest('#lbPrev,#lbNext'))return;lbClose()});
  q('lbPrev').addEventListener('click',function(){lbShow(lbI-1)});q('lbNext').addEventListener('click',function(){lbShow(lbI+1)});
  addEventListener('keydown',function(e){if(q('lb').hidden)return;if(e.key==='ArrowLeft')lbShow(lbI-1);else if(e.key==='ArrowRight')lbShow(lbI+1);else if(e.key==='Escape'){e.stopImmediatePropagation();lbClose()}},true);

  // opening: the picture fills the screen first, then settles into its place on the page.
  // Works from the archive, from the home list and from "more work" on a project page.
  var busy=false,borrowed=null,heroOverride=null,quietIntro=false;
  // the home film lent to a project goes back to its own layer
  function giveBack(){if(!borrowed)return;var b=borrowed;borrowed=null;if(b.el.parentNode!==b.from){b.from.appendChild(b.el);play(b.el)}}
  function openProject(i,sourceEl){
    if(busy)return;setUrl(i);
    var already=project.classList.contains('open');
    if(!already)from=archive.classList.contains('open')?'archive':'home';
    q('projBackT').textContent=from==='archive'?'Archive':'Back';
    if(!animate){fillProject(i);document.body.classList.add('proj');openPage(project);return}
    busy=true;smooth(true);
    var fm=q('pFrame');
    function show(){document.body.classList.add('proj');project.classList.add('open');project.setAttribute('aria-hidden','false');project.style.clipPath='inset(0% 0% 0% 0%)';lockScroll(true)}
    var done=function(){busy=false;setTimeout(function(){smooth(false)},800)};
    if(!sourceEl){
      // from the selected work list: the picture stays exactly as it is (the page is see-through until its own copy of the
      // shot has caught up), and the title that was on screen fills in white and slides up to make room for the description
      var holder=lyr[front],he=holder&&holder.firstElementChild,hv=holder&&holder.querySelector('video'),hb=q('homeBg');heroOverride=null;
      if(hv){var src=hv.getAttribute('src'),nm=[P[i].video].concat(P[i].landing||[]).filter(Boolean),ok=nm.map(VID),ix=ok.indexOf(src);if(ix>-1)heroOverride={name:nm[ix],v:1,t:hv.currentTime}}
      quietIntro=true;fillProject(i);quietIntro=false;heroOverride=null;
      project.classList.add('see');gsap.set(fm,{opacity:0});
      var home=q('wTitle').closest('h2'),hr=home.getBoundingClientRect(),pt=q('pTitle');
      show();gsap.set(project,{opacity:1});
      var pr=pt.getBoundingClientRect();
      gsap.set(pt,{x:hr.left-pr.left,y:hr.top-pr.top,opacity:0});gsap.set('#pLog, #pClient, #pPlay, .pj-dive, #project .p-bar',{opacity:0});
      // the home shot is a touch zoomed in (its stage is oversized, stills drift): it eases out to exactly the project's framing,
      // and only then does the project's own copy take over, on the same frame, so nothing visibly changes
      if(he){var m=getComputedStyle(he).transform;he.style.animation='none';he.style.transform=(m&&m!=='none')?m:''}
      var ready=false,zoomed=false,el=fm.firstChild;
      function reveal(){if(!ready||!zoomed)return;
        var fin=function(){gsap.to(fm,{opacity:1,duration:.25,ease:'none',onComplete:function(){project.classList.remove('see');
          gsap.set(hb,{clearProps:'top,bottom,left,right'});if(he){gsap.set(he,{clearProps:'transform'});he.style.animation=''}}})};
        if(hv&&el&&el.tagName==='VIDEO'){var d=false,g=function(){if(!d){d=true;fin()}};el.addEventListener('seeked',g,{once:true});try{el.currentTime=hv.currentTime+.04}catch(e){g()}setTimeout(g,450)}else fin()}
      if(el)whenReady(el,function(){ready=true;reveal()});else ready=true;
      var zt=gsap.timeline({onComplete:function(){zoomed=true;reveal()}});
      zt.to(hb,{top:0,bottom:0,left:0,right:0,duration:1.25,ease:'power3.inOut'},0);
      if(he)zt.to(he,{scale:1,x:0,y:0,duration:1.25,ease:'power3.inOut'},0);
      if(holder)zt.to(holder,{scale:1,duration:1.25,ease:'power3.inOut'},0);
      gsap.timeline({onComplete:done})
        .to(pt,{opacity:1,duration:.4,ease:'power1.out'},0)
        .to('.sel, .meta',{opacity:0,duration:.4,ease:'power1.out'},.05)
        .to(pt,{x:0,y:0,duration:1,ease:'power3.inOut'},.4)
        .fromTo('#pLog',{y:18,opacity:0},{y:0,opacity:1,duration:.8,ease:'expo.out'},1)
        .to('#pClient, #project .p-bar',{opacity:1,duration:.6},1.1)
        .to('#pPlay, .pj-dive',{opacity:1,duration:.6},1.25)
        .set('.sel, .meta',{opacity:1},2);
      return;
    }
    // from the archive or "more work": the picture grows to fill the screen, and that is where the project opens
    var r=sourceEl.getBoundingClientRect();
    zoom.src=IMG(poster(P[i]));
    gsap.set(zoom,{display:'block',left:r.left,top:r.top,width:r.width,height:r.height,opacity:1,scale:1,filter:already?'none':'grayscale(1)'});
    gsap.timeline({onComplete:done})
      .to(zoom,{left:0,top:0,width:innerWidth,height:innerHeight,filter:'grayscale(0)',duration:.9,ease:'expo.inOut'},0)
      .add(function(){fillProject(i);show();gsap.set(project,{opacity:1});var el=fm.firstChild;
        var off=function(){gsap.to(zoom,{opacity:0,duration:.35,delay:.1,onComplete:function(){zoom.style.display='none'}})};
        if(el)whenReady(el,off);else off()},.92);
  }
  // back to the list: the description steps aside, the title slides down to where it sits on the home screen and lets go of its white,
  // and the page clears to show the shot that never stopped playing underneath
  function canFlyHome(){return animate&&project.scrollTop<innerHeight*.5&&active===cur&&!busy}
  function flyHome(){
    busy=true;var pt=q('pTitle'),fm=q('pFrame');
    gsap.set('.sel, .meta',{opacity:0});
    // underneath, the home shot is set to the project's framing (and the same moment), then eases back into its own zoom
    var hb=q('homeBg'),he=lyr[front]&&lyr[front].firstElementChild,kb=he&&he.classList.contains('kb'),cv=fm.querySelector('video');
    gsap.set(hb,{top:0,bottom:0,left:0,right:0});
    if(he){he.style.animation='none';gsap.set(he,{scale:1,x:0,y:0});if(cv&&he.tagName==='VIDEO'){try{he.currentTime=cv.currentTime}catch(e){}}}
    var hr=q('wTitle').closest('h2').getBoundingClientRect(),pr=pt.getBoundingClientRect();
    project.classList.add('see');
    var H=innerHeight,W=innerWidth;
    gsap.timeline({onComplete:function(){pageDone(project);project.classList.remove('see');gsap.set([pt,fm,'#pLog','#pClient','#pPlay','.pj-dive','#project .p-bar'],{clearProps:'opacity,transform'});
        gsap.set(hb,{clearProps:'top,bottom,left,right'});if(he){gsap.set(he,{clearProps:'transform'});he.style.animation=''}busy=false}})
      .to('#pLog, #pClient, #pPlay, .pj-dive, #project .p-bar',{opacity:0,duration:.35,ease:'power1.in'},0)
      .to(fm,{opacity:0,duration:.3,ease:'none'},.1)
      .to(hb,{top:-.12*H,bottom:-.12*H,left:-.18*W,right:-.18*W,duration:1.15,ease:'power3.inOut'},.45)
      .to(he||{},{scale:kb?1.03:1,duration:1.15,ease:'power3.inOut'},.45)
      .to(pt,{x:hr.left-pr.left,y:hr.top-pr.top,duration:.9,ease:'power3.inOut'},.15)
      .to('.sel, .meta',{opacity:1,duration:.45},.9)
      .to(pt,{opacity:0,duration:.4},.95);
  }
  // zooming out: the project steps back and its picture drops into its own slot on the contact sheet
  function toArchive(){
    if(busy)return;
    var card=cards[cur];
    if(!animate||cur<0){if(!archive.classList.contains('open')){archive.classList.add('open');archive.setAttribute('aria-hidden','false');archive.style.clipPath='inset(0 0 0 0)';document.body.classList.add('in-archive')}from='archive';closePage(project);return}
    busy=true;
    if(card.classList.contains('gone')){sel={med:'',kind:''};applyFilters(false)}
    // the archive is put back underneath, already scrolled to the right row
    archive.classList.add('open');archive.setAttribute('aria-hidden','false');archive.style.clipPath='inset(0% 0% 0% 0%)';document.body.classList.add('in-archive');
    gsap.set(cards,{clearProps:'opacity,transform'});
    archive.scrollTop=Math.max(0,card.offsetTop-innerHeight*.42);
    var slot=card.querySelector('.cimg'),fm=q('pFrame'),onHero=project.scrollTop<innerHeight*.6;
    slot.style.visibility='hidden';
    // the picture that leaves is the frame you were looking at, not a different poster
    var v=fm.querySelector('video'),src=IMG(poster(P[cur]));
    if(onHero&&v&&v.readyState>=2){try{var c=document.createElement('canvas');c.width=Math.min(1100,v.videoWidth||1100);c.height=Math.round(c.width*(v.videoHeight||900)/(v.videoWidth||1600));c.getContext('2d').drawImage(v,0,0,c.width,c.height);src=c.toDataURL('image/jpeg',.82)}catch(e){}}
    else if(onHero){var im=fm.querySelector('img');if(im)src=im.currentSrc||im.src}
    zoom.src=src;
    gsap.set(zoom,{display:'block',left:0,top:0,width:innerWidth,height:innerHeight,opacity:onHero?1:0,scale:1,filter:'none'});
    smooth(true);var tl=gsap.timeline({paused:true,onComplete:function(){slot.style.visibility='';zoom.style.display='none';card.classList.remove('landed');void card.offsetWidth;card.classList.add('landed');busy=false;from='archive';smooth(false)}});
    var b=slot.getBoundingClientRect();
    // the picture covers the screen, the project is put away behind it, and the picture flies home into its own slot
    tl.to(zoom,{opacity:1,duration:onHero?0:.25},0)
      .add(function(){pageDone(project);project.style.clipPath='inset(100% 0 0 0)';gsap.set(archive,{opacity:1})},onHero?.02:.27)
      .to(zoom,{left:b.left,top:b.top,width:b.width,height:b.height,duration:1.05,ease:'expo.inOut'},onHero?.08:.32)
      .to(zoom,{filter:'grayscale(1) brightness(.78)',duration:.6,ease:'power1.inOut'},onHero?.5:.75);
    // let the sheet underneath paint once before anything moves
    // and only once the leaving picture is decoded: otherwise the first frames show an empty (black) image
    var go=function(){requestAnimationFrame(function(){requestAnimationFrame(function(){tl.play()})})},gone=false,once=function(){if(!gone){gone=true;go()}};
    if(zoom.decode)zoom.decode().then(once,once);else once();setTimeout(once,600);
  }
  // page moves may hit a slow first frame; smooth those over instead of skipping ahead
  function smooth(on){if(window.gsap)gsap.ticker.lagSmoothing(on?400:0,on?33:0)}
  q('projBack').addEventListener('click',function(){if(from==='home'&&canFlyHome()){flyHome();return}if(from==='archive'&&!archive.classList.contains('open')){archive.classList.add('open');archive.setAttribute('aria-hidden','false');archive.style.clipPath='inset(0 0 0 0)';document.body.classList.add('in-archive')}closePage(project)});
  q('pCountBtn').addEventListener('click',toArchive);
  q('pmAll').addEventListener('click',toArchive);
  addEventListener('keydown',function(e){if(e.key==='Escape'){if(project.classList.contains('open'))closePage(project);else closePage(archive)}});

  /* ---------- addresses: every project has its own url (/work/slug), back and forward work ---------- */
  var BASE_T=document.title.split(' \u2014 ').pop().split(' — ').pop();
  function setUrl(i,replace){var path=i==null?'/':'/work/'+P[i].slug;document.title=i==null?BASE_T:P[i].title+' \u2014 '+BASE_T;
    if(location.pathname!==path)history[replace?'replaceState':'pushState']({p:i},'',path)}
  function idxOf(path){var m=/^\/work\/([^\/]+)\/?$/.exec(path);if(!m)return -1;for(var k=0;k<P.length;k++)if(P[k].slug===m[1])return k;return -1}
  // a link straight to a project: it is open from the first frame
  function openDirect(i){from='home';q('projBackT').textContent='Back';fillProject(i);document.body.classList.add('proj');
    project.classList.add('open');project.setAttribute('aria-hidden','false');project.style.clipPath='inset(0% 0% 0% 0%)';if(window.gsap)gsap.set(project,{opacity:1});lockScroll(true);document.title=P[i].title+' \u2014 '+BASE_T}
  addEventListener('popstate',function(){var i=idxOf(location.pathname);
    if(i>-1){if(!(project.classList.contains('open')&&cur===i))openProject(i)}
    else if(project.classList.contains('open')){document.title=BASE_T;closePage(project)}});
  (function(){var i=idxOf(location.pathname);if(i>-1)openDirect(i)})();

  /* ---------- timecode ---------- */
  var t0=performance.now(),tcEl=q('tc');
  (function loop(now){
    var dt=new Date();tcEl.textContent='TC '+pad(dt.getHours())+':'+pad(dt.getMinutes())+':'+pad(dt.getSeconds())+':'+pad(Math.floor(dt.getMilliseconds()/40));
    requestAnimationFrame(loop);
  })(performance.now());
})();
