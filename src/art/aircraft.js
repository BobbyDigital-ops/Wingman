/* Wingman tiny side-profile aircraft sprites. Each glyph = one rendered pixel.
   Transparent pixels are spaces. The top of each plane points UP on the sprite;
   its nose points RIGHT. Orientation is handled by the game renderer. */
(function(){
 'use strict';
 const C={
  fighter:{'.':'#253747','o':'#596c64','g':'#9aa996','h':'#e4d7ac','c':'#739cad','r':'#bc6650','p':'#d3d0ae'},
  heavy:{'.':'#293844','o':'#5b594e','g':'#8b8469','h':'#ccb58b','c':'#84a6a8','r':'#9e584b','p':'#d8d3af'},
  bomber:{'.':'#27383e','o':'#555a4f','g':'#888f76','h':'#c5bc9c','c':'#90b5be','r':'#b77b54','p':'#d5d4b2'}
 };
 const DATA={
  fighter:[
    '      oo        ',
    '    oogg.       ',
    '  .ooghhggo.    ',
    '...ooggccghho.p ',
    ' .rrggghhhho..p ',
    '    oogg.       ',
    '      oo        '
  ],
  heavy:[
    '       oo          ',
    '     ooogg.        ',
    '  ..ooghhhgg..     ',
    '.ooogggccghhhho.pp ',
    '.rrgghhhhhhhhho.pp ',
    '  ..oogggggo..     ',
    '     ooo..         ',
    '       oo          ',
    '                   '
  ],
  bomber:[
    '        ooo         ',
    '    oooggggo        ',
    ' .ooogggggggoo.     ',
    '..ogggccccghhhgo.pp ',
    '.rrgghhhhhhhhhggo.pp',
    '..ogggggggghhhgo.pp ',
    ' .ooogggggggoo.     ',
    '    oooggggo        ',
    '        ooo         ',
    '                    '
  ]
 };
 const sprites={};
 function build(){
   for(const type of Object.keys(DATA)){
     const rows=DATA[type],w=Math.max(...rows.map(x=>x.length)),h=rows.length;
     const c=document.createElement('canvas');c.width=w;c.height=h;
     const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
     rows.forEach((row,y)=>Array.from(row).forEach((key,x)=>{
       if(C[type][key]){ctx.fillStyle=C[type][key];ctx.fillRect(x,y,1,1);}
     }));
     sprites[type]=c;
   }
   return sprites;
 }
 window.WingmanSprites={build,DATA};
})();
