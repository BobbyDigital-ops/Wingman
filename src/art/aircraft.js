/* Wingman miniature aircraft: pixel-native artwork, no resampling.
 * Inspired by painted scale-model silhouettes: bright cockpit glazing,
 * engine housings, RAF-style markings and hard-edged wing shadows.
 * Every stroke lands on a whole pixel. Aircraft nose points RIGHT.
 */
(function(){
'use strict';
const colours={
 fighter:{line:'#263540',under:'#364b4d',shade:'#496d56',body:'#829d75',light:'#c4d2a6',shine:'#e8e3bf',glass:'#82c4dc',glassDark:'#426f83',red:'#c65c4c',white:'#f1e8d3',metal:'#b9b9a1'},
 heavy:{line:'#2e3437',under:'#51483e',shade:'#716850',body:'#a39978',light:'#d8c9a0',shine:'#f1dec1',glass:'#85b9bd',glassDark:'#426a76',red:'#b95f4c',white:'#e9dbbe',metal:'#a9afa9'},
 bomber:{line:'#2d373c',under:'#404b46',shade:'#607061',body:'#a3ad92',light:'#d6d8b5',shine:'#ece9cc',glass:'#99cbd6',glassDark:'#527d91',red:'#b9644c',white:'#eae6cd',metal:'#afb8aa'}
};
function buildPlane(type,variant){
 const size=type==='fighter'?[21,15]:type==='heavy'?[24,16]:[26,17];
 const c=document.createElement('canvas');c.width=size[0];c.height=size[1];
 const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 const p=colours[type],r=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
 const roundel=(x,y)=>{r(x,y,3,3,p.white);r(x+1,y+1,1,1,p.red);};
 if(type==='fighter'){
   // Elliptical-wing Spitfire; deliberately short and stout at 21 x 15.
   r(10,1,3,13,p.line);r(9,3,5,9,p.line);r(8,5,7,5,p.line);
   r(10,2,2,11,p.shade);r(9,4,4,7,p.body);r(8,6,6,3,p.light);
   r(10,2,2,2,p.light);r(10,11,2,2,p.under);
   roundel(10,4);roundel(10,9);
   // Distinctive little horizontal tail and rudder.
   r(2,5,4,5,p.line);r(3,4,2,7,p.line);
   r(3,6,3,3,p.shade);r(3,5,1,2,p.light);r(3,9,1,1,p.red);
   // Short round cowling, canopy, silver prop and painted fuselage.
   r(5,6,12,4,p.line);r(6,7,12,2,p.body);
   r(7,7,4,1,p.light);r(11,6,4,3,p.glassDark);
   r(12,6,2,2,p.glass);r(13,6,1,1,p.shine);
   r(15,6,4,4,p.line);r(16,7,3,2,p.light);
   r(19,7,1,2,p.metal);r(20,5,1,6,p.line);r(20,7,1,2,p.shine);
   r(9,8,2,1,p.white);r(10,8,1,1,p.red);
 }else if(type==='heavy'){
   // Twin-engine cannon fighter: chunky nacelles separated from central hull.
   r(11,1,5,14,p.line);r(10,3,7,10,p.line);r(9,5,9,6,p.line);
   r(11,2,4,12,p.shade);r(10,4,6,8,p.body);r(9,6,8,4,p.light);
   roundel(11,3);roundel(11,10);
   r(3,5,5,6,p.line);r(4,6,4,4,p.shade);r(4,5,2,1,p.light);
   // Engine nacelles set outboard from the fuselage.
   r(15,2,5,3,p.line);r(16,3,4,1,p.metal);
   r(15,11,5,3,p.line);r(16,12,4,1,p.metal);
   r(20,1,1,5,p.line);r(20,10,1,5,p.line);
   r(20,3,1,2,p.shine);r(20,12,1,2,p.shine);
   // Long cannon chin, short cockpit, heavy nose.
   r(5,7,18,3,p.line);r(7,8,15,1,p.body);
   r(12,7,4,2,p.glassDark);r(13,7,2,1,p.glass);
   r(18,7,4,1,p.light);r(21,7,3,1,p.metal);
   r(21,9,3,1,p.metal);r(6,8,3,1,p.red);
 }else{
   // Twin-engine bomber: high wings, two propellers and glazed nose.
   r(12,1,6,15,p.line);r(10,3,9,11,p.line);
   r(9,5,12,7,p.line);r(12,2,5,13,p.shade);
   r(11,4,7,9,p.body);r(10,6,10,5,p.light);
   roundel(12,4);roundel(12,11);
   // Twin detached engines + prop discs.
   r(14,2,6,3,p.line);r(15,3,5,1,p.metal);
   r(14,12,6,3,p.line);r(15,13,5,1,p.metal);
   r(20,1,1,6,p.line);r(20,10,1,6,p.line);
   r(20,3,1,2,p.shine);r(20,12,1,2,p.shine);
   r(2,6,6,5,p.line);r(3,5,3,7,p.line);
   r(4,7,5,3,p.body);r(4,6,2,1,p.light);
   // Glazed cockpit and blunted greenhouse nose.
   r(6,7,17,4,p.line);r(8,8,15,2,p.body);
   r(16,7,5,2,p.glassDark);r(17,7,3,1,p.glass);
   r(22,7,3,4,p.line);r(23,8,2,2,p.glass);
   r(25,8,1,2,p.metal);
   r(6,9,3,1,p.red);r(10,8,3,1,p.light);
 }
 if(variant==='damaged'){r(type==='fighter'?14:17,8,2,2,p.under);r(11,5,1,2,p.line);}
 if(variant==='climb'){r(type==='fighter'?17:19,7,2,1,p.shine);}
 if(variant==='dive'){r(type==='fighter'?17:19,9,2,1,p.under);}
 return c;
}
function build(){
 const atlas={};
 for(const type of Object.keys(colours)){
  atlas[type]={};
  for(const variant of ['level','climb','dive','damaged'])atlas[type][variant]=buildPlane(type,variant);
 }
 return atlas;
}
window.WingmanSprites={build};
})();