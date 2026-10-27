/* Deliberately compact 16-bit inspired aircraft atlas; no texture downloads. */
(function(){
'use strict';
const palettes={
 fighter:{k:'#22333d',d:'#4a6558',m:'#849b78',l:'#c8d3a8',w:'#e0dfb9',c:'#78a3b5',a:'#cb6955',p:'#cbdde0'},
 heavy:{k:'#292f38',d:'#544c48',m:'#82756a',l:'#b7a18a',w:'#dfc6a2',c:'#81a8b5',a:'#a95440',p:'#d3ddce'},
 bomber:{k:'#293338',d:'#525b51',m:'#868f78',l:'#b3bca0',w:'#d7d7b4',c:'#8eb7bf',a:'#bd754b',p:'#d1dcd2'}
};
const DATA={
 fighter:[
 '       dd         ',
 '     kdmml        ',
 '    kmmwwmk       ',
 'kkkddmcccmmllkkpp',
 '  kammllllllmmkkp ',
 '    kmmwmmk       ',
 '      ddk         ',
 '       dd         '
 ],
 heavy:[
 '        dd          ',
 '     kkdmml         ',
 '   kddmmwwmmkk      ',
 'kkkdmmlcccmmlldkkpp',
 'kakmmllllllllmmdkpp',
 '   kddmmmmmmkk      ',
 '     kkdmml         ',
 '       ddk          ',
 '                    '
 ],
 bomber:[
 '         ddk          ',
 '      kkdmmlk         ',
 '   kddmmmmmmmddkk     ',
 'kkkddmmmccccmmlldkkpp',
 'kakmmlllllllllllmdkpp',
 'kkkddmmmmmmmllldkkkpp',
 '   kddmmmmmmmddkk     ',
 '      kkdmmlk         ',
 '         ddk          ',
 '                      '
 ]
};
function paint(rows,palette){
 const c=document.createElement('canvas');c.width=Math.max(...rows.map(r=>r.length));c.height=rows.length;
 const x=c.getContext('2d');x.imageSmoothingEnabled=false;
 rows.forEach((r,y)=>[...r].forEach((symbol,col)=>{
   if(palette[symbol]){x.fillStyle=palette[symbol];x.fillRect(col,y,1,1);}
 }));
 return c;
}
function build(){
 const sprites={};
 for(const type of Object.keys(DATA)){
   const rows=DATA[type],base=palettes[type];
   sprites[type]={
     level:paint(rows,base),
     climb:paint(rows.map((r,y)=>y<2?r.replaceAll('d','m'):r),base),
     dive:paint(rows.map((r,y)=>y>rows.length-3?r.replaceAll('m','d'):r),base),
     damaged:paint(rows.map((r,y)=>y===Math.floor(rows.length/2)?r.replaceAll('l','d'):r),base)
   };
 }
 return sprites;
}
window.WingmanSprites={build,DATA,palettes};
})();