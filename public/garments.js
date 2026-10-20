/* Garment and fabric drawing. Renders each product as an SVG with fabric texture, folds and stitching. */
(function(){
  'use strict';
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  /* colour helpers */
  function h2r(h){var n=parseInt(h.slice(1),16);return [n>>16&255,n>>8&255,n&255]}
  function r2h(r){return '#'+r.map(function(v){return ('0'+Math.round(v).toString(16)).slice(-2)}).join('')}
  function mix(a,b,t){var A=h2r(a),B=h2r(b);return r2h([0,1,2].map(function(i){return A[i]+(B[i]-A[i])*t}))}
  function lum(h){var c=h2r(h);return .299*c[0]+.587*c[1]+.114*c[2]}
  function tone(c,t){return t==='light'?mix(c,'#ffffff',.12):t==='mid'?mix(c,'#000000',.12):t==='dark'?mix(c,'#000000',.5):c}

  /* fabric texture layers */
  function tex(t,w,h){
    var r=function(f){return '<rect width="'+w+'" height="'+h+'" fill="'+f+'"/>'};
    var rf=function(id){return '<rect width="'+w+'" height="'+h+'" fill="#fff" filter="url(#'+id+')"/>'};
    if(t==='oxford')return r('url(#pat-oxford)')+rf('tx-cotton');
    if(t==='linen')return rf('tx-linen');
    if(t==='jersey')return r('url(#pat-jersey)')+rf('tx-cotton');
    if(t==='fleece')return rf('tx-fleece');
    if(t==='knit')return r('url(#pat-knit)')+rf('tx-cotton');
    if(t==='denim')return r('url(#pat-denim)')+rf('tx-cotton');
    if(t==='twill')return r('url(#pat-twill)')+rf('tx-cotton');
    return rf('tx-wool')+r('url(#pat-twill)');
  }

  /* drawing helpers */
  function ST(d,col,w){return '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+(w||1.3)+'" stroke-dasharray="4 3" stroke-opacity=".8" stroke-linecap="round"/>'}
  function LN(d,col,op,w){return '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-opacity="'+op+'" stroke-width="'+(w||1.3)+'" stroke-linecap="round"/>'}
  function BTN(x,y,col){return '<circle cx="'+x+'" cy="'+y+'" r="4.6" fill="'+col+'" stroke="rgba(0,0,0,.45)" stroke-width="1"/><circle cx="'+(x-1.4)+'" cy="'+(y-1.2)+'" r=".9" fill="rgba(0,0,0,.45)"/><circle cx="'+(x+1.4)+'" cy="'+(y+1.2)+'" r=".9" fill="rgba(0,0,0,.45)"/>'}
  function RIB(d){return '<path d="'+d+'" fill="url(#pat-rib)"/>'}

  var SH={
    tee:{
      body:'M165 62 L108 84 L58 172 L100 198 L124 156 L126 414 Q200 424 274 414 L276 156 L300 198 L342 172 L292 84 L235 62 Q200 100 165 62 Z',
      parts:[{d:'M165 62 Q200 48 235 62 Q200 100 165 62 Z',t:'dark'}],
      dark:['M150 190 C158 270 146 350 152 408','M252 190 C246 280 256 350 250 408','M92 118 C84 148 78 162 74 176','M308 118 C316 148 322 162 326 176','M178 240 C190 300 186 340 192 390'],
      light:['M166 190 C172 270 162 350 168 408','M236 190 C232 270 240 350 236 408','M190 120 C198 180 196 220 200 260'],
      det:function(c,s,o){
        var x='<path d="M165 62 Q200 100 235 62" fill="none" stroke="'+tone(c,'mid')+'" stroke-width="9" stroke-linecap="round"/><path d="M165 62 Q200 100 235 62" fill="none" stroke="url(#pat-rib)" stroke-width="9" stroke-linecap="round"/>';
        x+=ST('M168 71 Q200 107 232 71',s)+ST('M128 398 Q200 408 272 398',s)+ST('M62 165 L104 191',s)+ST('M338 165 L296 191',s)+ST('M108 86 Q124 120 124 156',s)+ST('M292 86 Q276 120 276 156',s);
        if(o.pocket)x+='<path d="M146 150 H192 V200 H146 Z" fill="rgba(0,0,0,.06)" stroke="'+tone(c,'dark')+'" stroke-opacity=".5" stroke-width="1.3"/>'+ST('M150 154 H188 V196 H150 Z',s,1);
        return x;
      }
    },
    shirt:{
      body:'M165 58 L110 82 L58 346 L102 362 L128 172 L130 426 Q200 436 270 426 L272 172 L298 362 L342 346 L290 82 L235 58 Q200 74 165 58 Z',
      parts:[
        {d:'M163 52 Q200 40 237 52 Q200 70 163 52 Z',t:'dark'},
        {d:'M165 58 Q200 74 235 58 L237 50 Q200 66 163 50 Z',t:'light'},
        {d:'M193 98 H207 V428 H193 Z',t:'light'},
        {d:'M58 346 L102 362 L98 392 L54 376 Z',t:'mid'},
        {d:'M342 346 L298 362 L302 392 L346 376 Z',t:'mid'},
        {d:'M163 52 L200 98 L184 124 L142 78 Z',t:'light'},
        {d:'M237 52 L200 98 L216 124 L258 78 Z',t:'light'}
      ],
      dark:['M96 110 C86 180 78 260 70 340','M304 110 C314 180 322 260 330 340','M156 200 C162 290 150 360 158 420','M248 200 C242 290 254 360 246 420','M134 300 C170 312 186 308 192 300','M80 250 C95 258 108 256 118 250'],
      light:['M170 180 C176 280 170 360 176 420','M230 180 C226 280 232 360 226 420','M104 130 C98 200 92 280 86 330'],
      det:function(c,s,o){
        var bc=o.btn||'#E9E3D3', x='';
        x+=ST('M110 84 Q130 126 128 172',s)+ST('M290 84 Q270 126 272 172',s);
        x+=LN('M193 100 V426',tone(c,'dark'),.4)+LN('M207 100 V426',tone(c,'dark'),.4)+ST('M197 104 V424',s,1)+ST('M203 104 V424',s,1);
        [142,192,242,292,342,392].forEach(function(y){x+=BTN(200,y,bc)});
        x+=ST('M56 361 L100 377',s)+ST('M344 361 L300 377',s)+BTN(88,376,bc)+BTN(312,376,bc);
        x+=ST('M132 412 Q200 422 268 412',s)+ST('M158 58 L198 100',s)+ST('M242 58 L202 100',s);
        var pk=function(x0){
          var d='M'+x0+' 170 H'+(x0+48)+' V218 L'+(x0+24)+' 228 L'+x0+' 218 Z';
          var r='<path d="'+d+'" fill="rgba(0,0,0,.07)" stroke="'+tone(c,'dark')+'" stroke-opacity=".55" stroke-width="1.4"/>';
          r+=ST('M'+(x0+4)+' 174 H'+(x0+44)+' V214 L'+(x0+24)+' 222 L'+(x0+4)+' 214 Z',s,1);
          if(o.flap)r+='<path d="M'+x0+' 170 H'+(x0+48)+' V188 L'+(x0+24)+' 196 L'+x0+' 188 Z" fill="'+tone(c,'mid')+'" stroke="'+tone(c,'dark')+'" stroke-opacity=".6" stroke-width="1.4"/>'+BTN(x0+24,186,bc);
          return r;
        };
        if(o.pocket)x+=pk(136);
        if(o.pocket2)x+=pk(216);
        return x;
      }
    },
    hoodie:{
      body:'M158 74 L104 98 L50 352 L98 372 L124 186 L124 420 Q200 430 276 420 L276 186 L302 372 L350 352 L296 98 L242 74 Q200 120 158 74 Z',
      parts:[
        {d:'M146 80 Q150 20 200 14 Q250 20 254 80 Q228 110 200 118 Q172 110 146 80 Z',t:'base'},
        {d:'M160 76 Q166 40 200 36 Q234 40 240 76 Q220 98 200 102 Q180 98 160 76 Z',t:'dark'},
        {d:'M124 394 Q200 404 276 394 L276 420 Q200 430 124 420 Z',t:'mid'},
        {d:'M50 352 L98 372 L94 402 L44 384 Z',t:'mid'},
        {d:'M350 352 L302 372 L306 402 L356 384 Z',t:'mid'}
      ],
      dark:['M92 120 C80 200 70 280 62 350','M308 120 C320 200 330 280 338 350','M150 200 C160 270 148 340 154 392','M250 200 C240 270 252 340 246 392','M176 50 C170 70 172 90 180 108'],
      light:['M164 200 C172 270 160 340 166 392','M104 140 C96 210 86 280 78 340','M214 40 C226 60 230 80 224 100'],
      det:function(c,s,o){
        var x=RIB('M124 394 Q200 404 276 394 L276 420 Q200 430 124 420 Z')+RIB('M50 352 L98 372 L94 402 L44 384 Z')+RIB('M350 352 L302 372 L306 402 L356 384 Z');
        x+=ST('M104 100 Q122 142 124 186',s)+ST('M296 100 Q278 142 276 186',s);
        x+='<path d="M146 300 L254 300 L272 386 L128 386 Z" fill="rgba(0,0,0,.06)" stroke="'+tone(c,'dark')+'" stroke-opacity=".55" stroke-width="1.4"/>'+ST('M152 306 L248 306 L264 380 L136 380 Z',s,1);
        x+=LN('M184 100 L180 192','#E6E2D6',1,3.6)+LN('M216 100 L220 192','#E6E2D6',1,3.6);
        x+='<rect x="176.5" y="190" width="7" height="15" rx="2" fill="#B9B4A6" stroke="rgba(0,0,0,.4)"/><rect x="216.5" y="190" width="7" height="15" rx="2" fill="#B9B4A6" stroke="rgba(0,0,0,.4)"/>';
        x+='<circle cx="184" cy="100" r="3.2" fill="#2a2a2a"/><circle cx="216" cy="100" r="3.2" fill="#2a2a2a"/>';
        return x;
      }
    },
    sweater:{
      body:'M162 64 L108 90 L52 350 L98 370 L124 184 L124 418 Q200 428 276 418 L276 184 L302 370 L348 350 L292 90 L238 64 Q200 92 162 64 Z',
      parts:[
        {d:'M162 64 Q200 50 238 64 Q200 92 162 64 Z',t:'dark'},
        {d:'M124 392 Q200 402 276 392 L276 418 Q200 428 124 418 Z',t:'mid'},
        {d:'M52 350 L98 370 L94 400 L46 382 Z',t:'mid'},
        {d:'M348 350 L302 370 L306 400 L354 382 Z',t:'mid'}
      ],
      dark:['M94 118 C82 200 72 280 64 346','M306 118 C318 200 328 280 336 346','M150 200 C160 270 148 340 154 388','M250 200 C240 270 252 340 246 388'],
      light:['M164 200 C172 270 160 340 166 388','M106 140 C98 210 88 280 80 336','M212 150 C220 220 214 300 220 380'],
      det:function(c,s,o){
        var x='<path d="M160 66 Q200 98 240 66" fill="none" stroke="'+tone(c,'mid')+'" stroke-width="12" stroke-linecap="round"/><path d="M160 66 Q200 98 240 66" fill="none" stroke="url(#pat-rib)" stroke-width="12" stroke-linecap="round"/>';
        x+=RIB('M124 392 Q200 402 276 392 L276 418 Q200 428 124 418 Z')+RIB('M52 350 L98 370 L94 400 L46 382 Z')+RIB('M348 350 L302 370 L306 400 L354 382 Z');
        x+=LN('M110 92 Q128 140 124 184',tone(c,'dark'),.35)+LN('M290 92 Q272 140 276 184',tone(c,'dark'),.35);
        return x;
      }
    },
    chino:{
      body:'M136 40 H264 L288 446 H206 L200 176 L194 446 H112 Z',
      parts:[{d:'M136 40 H264 V62 H136 Z',t:'mid'}],
      dark:['M150 150 C158 250 140 350 134 430','M250 150 C242 250 260 350 266 430','M126 330 C140 338 160 338 186 330','M274 330 C260 338 240 338 214 330'],
      light:['M162 100 C172 200 160 300 152 400','M238 100 C228 200 240 300 248 400'],
      det:function(c,s,o){
        var x='';
        [150,196,246].forEach(function(lx){x+='<rect x="'+lx+'" y="36" width="8" height="34" rx="2" fill="'+tone(c,'mid')+'" stroke="'+tone(c,'dark')+'" stroke-opacity=".55"/>'});
        x+=LN('M136 62 H264',tone(c,'dark'),.5)+ST('M200 66 V150 Q200 170 188 172',s)+BTN(200,51,o.jeans?'#B87333':'#D9D3C3');
        x+=LN('M138 68 Q176 74 188 130',tone(c,'dark'),.55,1.6)+LN('M262 68 Q224 74 212 130',tone(c,'dark'),.55,1.6);
        x+=ST('M141 72 Q173 78 184 128',s)+ST('M259 72 Q227 78 216 128',s);
        if(o.pleat)x+=LN('M170 66 L166 160',tone(c,'dark'),.5,1.8)+LN('M230 66 L234 160',tone(c,'dark'),.5,1.8);
        x+=ST('M114 432 H193',s)+ST('M207 432 H286',s);
        return x;
      }
    },
    jeans:{
      body:'M136 40 H264 L288 446 H206 L200 176 L194 446 H112 Z',
      parts:[{d:'M136 40 H264 V62 H136 Z',t:'mid'}],
      dark:['M150 150 C158 250 140 350 134 430','M250 150 C242 250 260 350 266 430','M126 330 C140 338 160 338 186 330','M274 330 C260 338 240 338 214 330','M150 360 C160 366 172 366 188 360'],
      light:['M162 100 C172 200 160 300 152 400','M238 100 C228 200 240 300 248 400','M140 120 L176 150','M260 120 L224 150','M130 300 L170 330','M270 300 L230 330'],
      det:function(c,s,o){
        var x='', o2='#C98A3E';
        [150,196,246].forEach(function(lx){x+='<rect x="'+lx+'" y="36" width="8" height="34" rx="2" fill="'+tone(c,'mid')+'" stroke="'+tone(c,'dark')+'" stroke-opacity=".6"/>'});
        x+=LN('M136 62 H264',tone(c,'dark'),.55)+ST('M200 66 V150 Q200 170 188 172',o2)+BTN(200,51,'#B87333');
        x+=LN('M138 68 Q176 74 188 130',tone(c,'dark'),.6,1.6)+LN('M262 68 Q224 74 212 130',tone(c,'dark'),.6,1.6);
        x+=ST('M141 72 Q173 78 184 128',o2)+ST('M259 72 Q227 78 216 128',o2);
        x+='<circle cx="139" cy="70" r="3" fill="#B87333"/><circle cx="261" cy="70" r="3" fill="#B87333"/><circle cx="187" cy="130" r="3" fill="#B87333"/><circle cx="213" cy="130" r="3" fill="#B87333"/>';
        x+=ST('M114 432 H193',o2)+ST('M207 432 H286',o2)+ST('M137 70 L114 436',o2,1)+ST('M263 70 L286 436',o2,1);
        return x;
      }
    },
    shorts:{
      body:'M136 40 H264 L278 254 H206 L200 168 L194 254 H122 Z',
      parts:[{d:'M136 40 H264 V64 H136 Z',t:'mid'}],
      dark:['M152 120 C158 180 146 220 142 250','M248 120 C242 180 254 220 258 250','M130 200 C146 208 166 208 188 200'],
      light:['M164 90 C172 150 160 200 156 244','M236 90 C228 150 240 200 244 244'],
      det:function(c,s,o){
        var x=LN('M136 64 H264',tone(c,'dark'),.5);
        x+=LN('M192 64 Q188 104 182 130','#EDE8DA',1,3.2)+LN('M208 64 Q212 104 218 130','#EDE8DA',1,3.2)+'<circle cx="200" cy="66" r="5" fill="#EDE8DA" stroke="rgba(0,0,0,.35)"/>';
        x+=LN('M138 70 Q164 80 168 130',tone(c,'dark'),.5,1.5)+LN('M262 70 Q236 80 232 130',tone(c,'dark'),.5,1.5);
        x+=ST('M124 240 H193',s)+ST('M207 240 H276',s);
        return x;
      }
    }
  };
  SH.overshirt=SH.shirt;

  var uid=0;
  function garment(p,ci){
    var u=++uid, c=p.colors[ci].h||p.colors[ci][1], S=SH[p.type], o=p.o||{};
    var stitch=lum(c)>150?mix(c,'#000000',.28):mix(c,'#ffffff',.32);
    var clip=[S.body].concat(S.parts.map(function(x){return x.d}));
    var out='<svg viewBox="0 0 400 480" role="img" aria-label="'+esc(p.name)+' in '+esc(p.colors[ci][0])+'">';
    out+='<defs><clipPath id="cp'+u+'">'+clip.map(function(d){return '<path d="'+d+'"/>'}).join('')+'</clipPath></defs>';
    out+='<g filter="url(#dsh)"><path d="'+S.body+'" fill="'+c+'"/>';
    S.parts.forEach(function(x){out+='<path d="'+x.d+'" fill="'+tone(c,x.t)+'"/>'});
    out+='</g><g clip-path="url(#cp'+u+')">';
    out+=tex(p.tex,400,480)+'<rect width="400" height="480" fill="url(#lg)"/>';
    S.dark.forEach(function(d){out+='<path d="'+d+'" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="12" stroke-linecap="round" filter="url(#bl6)"/>'});
    S.light.forEach(function(d){out+='<path d="'+d+'" fill="none" stroke="#fff" stroke-opacity=".15" stroke-width="10" stroke-linecap="round" filter="url(#bl6)"/>'});
    out+='</g>'+S.det(c,stitch,o);
    clip.forEach(function(d){out+='<path d="'+d+'" fill="none" stroke="'+mix(c,'#000000',.45)+'" stroke-opacity=".55" stroke-width="1.4" stroke-linejoin="round"/>'});
    return out+'</svg>';
  }
  function swatch(t,c){
    var u=++uid;
    return '<svg viewBox="0 0 240 150" role="img" aria-label="Fabric swatch">'+
      '<defs><clipPath id="sw'+u+'"><rect width="240" height="150"/></clipPath></defs>'+
      '<g clip-path="url(#sw'+u+')"><rect width="240" height="150" fill="'+c+'"/>'+tex(t,240,150)+
      '<rect width="240" height="150" fill="url(#lg)"/>'+
      '<path d="M0 150 L0 112 Q60 128 110 150Z" fill="#000" fill-opacity=".14" filter="url(#bl6)"/></g></svg>';
  }

  window.Garments={garment:garment,swatch:swatch};
})();
