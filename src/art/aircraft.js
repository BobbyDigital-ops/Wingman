/* Wingman miniature aircraft models.
 * Draw crisp scale-model-style vector aircraft on the dedicated high-DPI layer.
 * World silhouettes are intentionally compact: no enlarged or resampled sprites.
 * Forward is +X; the upper/lower wings are visible in a top-down arcade view.
 */
(function(){
'use strict';
const paints={
 fighter:{outline:'#26373a',shade:'#466850',base:'#779879',highlight:'#bfd2a6',panel:'#e4e4cc',glass:'#5592aa',shine:'#b2e3e8',metal:'#ccd0c1',red:'#ba4c43'},
 heavy:{outline:'#343c3a',shade:'#545c50',base:'#858b74',highlight:'#c5c6a4',panel:'#e1d7b5',glass:'#5f96aa',shine:'#bde0df',metal:'#bcbfb0',red:'#b65e44'},
 bomber:{outline:'#344045',shade:'#60675a',base:'#9da68b',highlight:'#d1d3b7',panel:'#ebe6cb',glass:'#76a9b7',shine:'#d7eff0',metal:'#c6c7b9',red:'#af6149'}
};
function polygon(g,points,fill,stroke,width=.55){
 g.beginPath();g.moveTo(points[0][0],points[0][1]);
 for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);
 g.closePath();g.fillStyle=fill;g.fill();
 if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke();}
}
function ellipse(g,x,y,rx,ry,fill,stroke,width=.45){
 g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=fill;g.fill();
 if(stroke){g.lineWidth=width;g.strokeStyle=stroke;g.stroke();}
}
function line(g,a,b,color,width=.5){
 g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);
 g.strokeStyle=color;g.lineWidth=width;g.stroke();
}
function roundel(g,x,y,p){
 ellipse(g,x,y,1.65,1.65,p.panel,p.outline,.2);
 ellipse(g,x,y,1.05,1.05,p.glass);ellipse(g,x,y,.48,.48,p.red);
}
function canopy(g,x,y,rx,ry,p){
 ellipse(g,x,y,rx,ry,p.outline);
 ellipse(g,x,y,rx-.38,ry-.32,p.glass);
 ellipse(g,x+.5,y-.46,rx*.46,ry*.24,p.shine);
 line(g,[x-.3,y-ry*.72],[x+.2,y+ry*.72],p.outline,.35);
}
function prop(g,x,y,size,p){
 ellipse(g,x,y,.75,.78,p.metal,p.outline,.3);
 line(g,[x,y-size],[x,y+size],p.outline,.65);
 line(g,[x,y-size+.5],[x,y+size-.5],p.metal,.25);
}
function fighter(g,p){
 // Broad elliptical Spitfire wings, model-aircraft panel seams and roundels.
 polygon(g,[[-3,-2],[-.5,-5],[1,-9],[3,-11],[5,-10.8],[6,-9],[4,-3],
            [4,3],[6,9],[5,10.8],[3,11],[1,9],[-.5,5],[-3,2]],p.outline,p.outline);
 polygon(g,[[-1,-2],[1,-6],[2.8,-9.8],[4.5,-10],[5,-8],[3,0],
            [5,8],[4.5,10],[2.8,9.8],[1,6],[-1,2]],p.base);
 polygon(g,[[1,-3],[2.7,-9.4],[4.3,-9.7],[3.2,-2]],p.highlight);
 polygon(g,[[1,3],[3.2,2],[4.3,9.7],[2.7,9.4]],p.shade);
 roundel(g,3.5,-6.9,p);roundel(g,3.5,6.9,p);
 // Short attractive tail and recognisable rudder.
 polygon(g,[[-10,-1.4],[-9.4,-4.8],[-7.2,-4.6],[-6,-1.6],
            [-6,1.6],[-7.2,4.6],[-9.4,4.8],[-10,1.4]],p.shade,p.outline);
 line(g,[-8,-3.1],[-7,-1],p.panel,.4);line(g,[-8,3.1],[-7,1],p.panel,.4);
 // Slightly tapered nose and stubby cigar-shaped fuselage.
 polygon(g,[[-9,-1.5],[-2,-2],[4,-1.85],[8,-1.5],[11,-.9],
            [12.2,0],[11,.9],[8,1.5],[4,1.85],[-2,2],[-9,1.5]],p.base,p.outline,.65);
 polygon(g,[[-8,-1],[-2,-1.4],[8,-1.2],[11,-.4],[11,0],[-8,0]],p.highlight);
 line(g,[5,-1.4],[5,1.4],p.shade,.35);
 canopy(g,-.7,0,2.55,1.35,p);
 ellipse(g,8.3,0,1.7,1.1,p.shade);
 line(g,[9.7,-1.15],[9.7,1.15],p.panel,.34);
 prop(g,12.4,0,3,p);
}
function heavy(g,p){
 // The heavy fighter gets wide, rigid wings and unmistakable twin engines.
 polygon(g,[[-4,-2],[-1,-8],[-1,-12],[1,-12.8],[5,-11],[6.5,-3],
            [6.5,3],[5,11],[1,12.8],[-1,12],[-1,8],[-4,2]],p.shade,p.outline,.7);
 polygon(g,[[-2,-2],[.4,-10.7],[2,-11.5],[5,-10.3],[5.6,0],
            [5,10.3],[2,11.5],[.4,10.7]],p.base);
 polygon(g,[[0,-2],[1,-9.8],[2,-10.8],[3,-10.7],[2,-2]],p.highlight);
 polygon(g,[[0,2],[2,2],[3,10.7],[2,10.8],[1,9.8]],p.shade);
 roundel(g,2.3,-8.7,p);roundel(g,2.3,8.7,p);
 polygon(g,[[-12,-1.6],[-11,-5],[-8,-5.4],[-5,-2.3],
            [-5,2.3],[-8,5.4],[-11,5],[-12,1.6]],p.shade,p.outline);
 polygon(g,[[-11,-2],[-8,-4.5],[-7,-2],[-7,2],[-8,4.5],[-11,2]],p.highlight);
 // Twin protruding motor cowls, separate from fuselage.
 for(const wing of [-1,1]){
   g.save();g.translate(0,wing*6.8);
   ellipse(g,1.3,0,4.4,1.9,p.outline);
   ellipse(g,1.2,0,3.8,1.5,p.shade);
   ellipse(g,2.6,-.25,1.7,.68,p.highlight);
   prop(g,5.4,0,2.45,p);g.restore();
 }
 polygon(g,[[-10,-1.7],[-4,-2.6],[6,-2.6],[11,-1.7],[13,-.85],
            [13, .85],[11,1.7],[6,2.6],[-4,2.6],[-10,1.7]],p.base,p.outline,.75);
 polygon(g,[[-9,-1.1],[-3,-2],[9,-1.9],[12,-.45],[-9,-.4]],p.highlight);
 canopy(g,-.2,0,3,1.48,p);
 ellipse(g,9.2,0,2,1.25,p.shade);
 for(const side of [-.9,.9])line(g,[9,side],[13.8,side],p.outline,.65);
}
function bomber(g,p){
 // High wing, twin motors, large greenhouse canopy: miniature twin-engine bomber.
 polygon(g,[[-5,-2],[-2,-10],[-1,-14],[3,-14.2],[7,-12.3],[8,-3],
           [8,3],[7,12.3],[3,14.2],[-1,14],[-2,10],[-5,2]],p.shade,p.outline,.8);
 polygon(g,[[-3,-2],[-1,-11.7],[2,-13],[5.5,-11.4],[7,0],
           [5.5,11.4],[2,13],[-1,11.7]],p.base);
 polygon(g,[[-1,-2],[0,-11],[2,-12.4],[3.2,-12],[2,-2]],p.highlight);
 polygon(g,[[-1,2],[2,2],[3.2,12],[2,12.4],[0,11]],p.shade);
 roundel(g,2.3,-9.5,p);roundel(g,2.3,9.5,p);
 // Bomber has wide twin fins / horizontal tail.
 polygon(g,[[-14,-2],[-12.5,-5.4],[-8,-5.6],[-6,-2],
            [-6,2],[-8,5.6],[-12.5,5.4],[-14,2]],p.base,p.outline,.65);
 line(g,[-11,-4],[-10,-1.4],p.panel,.45);line(g,[-11,4],[-10,1.4],p.panel,.45);
 for(const wing of [-1,1]){
   g.save();g.translate(0,wing*7.5);
   ellipse(g,1.7,0,4.8,2.1,p.outline);
   ellipse(g,1.5,0,4,1.6,p.shade);
   ellipse(g,2.8,-.35,1.9,.7,p.highlight);
   prop(g,5.5,0,2.55,p);g.restore();
 }
 polygon(g,[[-13,-2.2],[-6,-2.8],[5,-3.15],[10,-2.7],[14,-1.7],
            [15.4,-.8],[15.4,.8],[14,1.7],[10,2.7],[5,3.15],
            [-6,2.8],[-13,2.2]],p.base,p.outline,.75);
 polygon(g,[[-12,-1.5],[-6,-2.2],[9,-2.25],[13,-1.3],[-12,-.6]],p.highlight);
 canopy(g,6,0,4.35,1.9,p);
 line(g,[5,-1.7],[5,1.7],p.outline,.38);
 line(g,[8,-1.4],[8,1.4],p.outline,.38);
 ellipse(g,14.5,0,1,.85,p.glass,p.outline,.3);
}
function draw(g,type,variant){
 const p=paints[type];if(!p)return;
 g.save();g.lineJoin='round';g.lineCap='round';
 if(type==='fighter')fighter(g,p);
 else if(type==='heavy')heavy(g,p);
 else bomber(g,p);
 if(variant==='damaged'){
   ellipse(g,-3,-1.2,1.5,.9,p.outline);
   line(g,[-5,-2],[-2,-1.4],p.shade,.8);
 }
 g.restore();
}
window.WingmanSprites={draw};
})();