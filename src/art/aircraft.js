/* Wingman aircraft silhouettes: original, hand-drawn, pixel-native shapes.
   Nose points right. Broad wings read as wings, not a solid oval. */
(function(){
'use strict';
const palette={
 fighter:['#233644','#52705c','#94a88c','#d4d9b2','#7aa8b9','#c66e53'],
 heavy:['#242f39','#655b4e','#a79776','#e1c69c','#88b4bd','#b75e45'],
 bomber:['#25333c','#596554','#a0a789','#d9d4ae','#98c0c8','#bd744d']
};
function buildPlane(type,variant){
 const c=document.createElement('canvas');c.width=32;c.height=16;
 const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 const [edge,shadow,body,light,glass,mark]=palette[type];
 const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};
 const poly=(pts,color)=>{g.fillStyle=color;g.beginPath();g.moveTo(...pts[0]);for(const p of pts.slice(1))g.lineTo(...p);g.closePath();g.fill()};
 if(type==='fighter'){
   // Elliptical swept wings, narrow tail and long tapered fuselage.
   poly([[12,3],[17,4],[21,7],[22,9],[17,12],[12,13],[15,9]],edge);
   poly([[13,4],[17,5],[20,8],[17,11],[13,12],[16,8]],body);
   r(12,4,2,1,light);r(12,11,2,1,light);
   poly([[2,5],[6,6],[9,8],[6,10],[2,11],[4,8]],edge);
   r(3,7,3,2,mark);
   poly([[5,7],[11,7],[15,6],[25,6],[30,7],[31,8],[26,9],[12,10],[6,9]],edge);
   r(8,7,17,2,body);r(15,7,11,1,light);
   r(16,6,5,1,glass);r(17,5,3,1,edge);r(19,6,2,1,glass);
   r(27,7,3,1,light);r(30,6,1,4,edge);
   r(16,3,2,1,mark);r(16,12,2,1,mark);
 }else if(type==='heavy'){
   // Twin engine nacelles stand apart from broad wings; thick cannon nose.
   poly([[10,2],[17,3],[23,6],[23,10],[17,13],[10,14],[13,8]],edge);
   poly([[11,3],[17,4],[21,7],[21,9],[17,12],[11,13],[15,8]],body);
   r(11,4,3,2,shadow);r(11,10,3,2,shadow);
   r(12,3,2,1,light);r(12,12,2,1,light);
   r(11,2,5,1,edge);r(11,13,5,1,edge);
   r(3,5,5,2,edge);r(3,9,5,2,edge);
   r(3,7,3,2,mark);
   poly([[5,7],[12,6],[19,6],[26,7],[30,7],[31,9],[24,10],[10,10],[5,9]],edge);
   r(9,7,19,2,body);r(18,7,10,1,light);
   r(16,6,5,1,glass);r(17,5,3,1,edge);
   r(27,8,4,1,shadow);r(29,6,2,1,edge);r(29,10,2,1,edge);
   r(7,5,3,1,mark);r(7,10,3,1,mark);
 }else{
   // Twin-engine bomber: long tail, clear cockpit and distinct engine pods.
   poly([[10,2],[19,3],[24,6],[24,10],[19,13],[10,14],[14,8]],edge);
   poly([[11,3],[19,4],[22,7],[22,9],[19,12],[11,13],[16,8]],body);
   r(11,4,3,3,shadow);r(11,9,3,3,shadow);
   r(12,3,4,1,light);r(12,12,4,1,light);
   r(10,2,6,1,edge);r(10,13,6,1,edge);
   poly([[2,5],[8,6],[10,8],[8,10],[2,11],[4,8]],edge);
   r(3,7,4,2,mark);
   poly([[6,7],[12,6],[24,6],[29,7],[31,8],[29,10],[12,10],[6,9]],edge);
   r(10,7,18,2,body);r(19,7,9,1,light);
   r(20,6,5,1,glass);r(22,5,2,1,edge);
   r(28,7,3,2,glass);
   r(10,4,5,2,shadow);r(10,10,5,2,shadow);
   r(8,3,1,5,edge);r(8,9,1,5,edge);
 }
 // Engine propellers are highly contrasted and independent of the fuselage.
 if(type==='fighter'){
   r(30,5,1,6,edge);r(30,7,1,2,light);
 }else{
   r(9,1,1,6,edge);r(9,9,1,6,edge);
   r(8,4,3,1,light);r(8,11,3,1,light);
 }
 if(variant==='damaged'){r(14,7,4,2,shadow);r(15,6,2,1,edge);}
 if(variant==='climb'){r(26,7,2,1,light);}
 if(variant==='dive'){r(23,8,2,1,shadow);}
 return c;
}
function build(){
 const sprites={};
 for(const type of Object.keys(palette)){
  sprites[type]={};
  for(const pose of ['level','climb','dive','damaged'])sprites[type][pose]=buildPlane(type,pose);
 }
 return sprites;
}
window.WingmanSprites={build,palette};
})();