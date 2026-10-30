/* Wingman G2 — small, crisp period-appropriate ordnance.
 * High-DPI Canvas artwork. No changes to collision geometry or combat damage.
 * Supplied by the shared aircraft overlay, with zero image dependencies.
 */
(()=>{'use strict';
  const PI2=Math.PI*2;
  // Compact WWII general-purpose bomb: blunt ogive, cylindrical casing and
  // open box-fin stabiliser. Small enough relative to all six miniatures.
  function drawBomb(c,b){
    if(b.delay>0)return;
    const vx=Number.isFinite(b.vx)?b.vx:0,vy=Number.isFinite(b.vy)?b.vy:10;
    c.save();c.translate(b.x,b.y);
    c.rotate(-Math.atan2(vx,vy||.01));
    c.scale(.46,.46);
    c.lineJoin='round';
    // Box-fin tail: slim square stabiliser and diagonal internal brace.
    c.fillStyle='#4f5849';c.strokeStyle='#232b26';c.lineWidth=.58;
    c.beginPath();
    c.moveTo(-2.7,-4.8);c.lineTo(-2.7,-2.45);
    c.lineTo(-1.0,-2.1);c.lineTo(1.0,-2.1);
    c.lineTo(2.7,-2.45);c.lineTo(2.7,-4.8);
    c.lineTo(2.06,-4.8);c.lineTo(2.06,-3.04);
    c.lineTo(.83,-2.68);c.lineTo(-.83,-2.68);
    c.lineTo(-2.06,-3.04);c.lineTo(-2.06,-4.8);c.closePath();
    c.fill();c.stroke();
    c.strokeStyle='#a0a48b';c.lineWidth=.45;
    c.beginPath();c.moveTo(-2.4,-4.4);c.lineTo(-.87,-2.7);
    c.moveTo(2.4,-4.4);c.lineTo(.87,-2.7);c.stroke();
    c.fillStyle='#383f35';c.fillRect(-1.08,-3,2.16,1.28);
    // WWII olive-drab body with a round/blunt ogive, not rocket pointed.
    const shell=c.createLinearGradient(-1.63,0,1.63,0);
    shell.addColorStop(0,'#272e2a');shell.addColorStop(.4,'#545d4c');
    shell.addColorStop(.7,'#69725b');shell.addColorStop(1,'#2b332c');
    c.fillStyle=shell;c.strokeStyle='#222a27';c.lineWidth=.62;
    c.beginPath();c.moveTo(-1.63,-2.05);c.lineTo(1.63,-2.05);
    c.lineTo(1.63,2.3);c.quadraticCurveTo(1.55,3.55,.78,4.23);
    c.quadraticCurveTo(0,5,-.78,4.23);
    c.quadraticCurveTo(-1.55,3.55,-1.63,2.3);c.closePath();
    c.fill();c.stroke();
    c.strokeStyle='#aa9b6d';c.lineWidth=.65;
    c.beginPath();c.moveTo(-1.52,2.50);c.lineTo(1.52,2.50);c.stroke();
    c.strokeStyle='rgba(230,225,192,.39)';c.lineWidth=.4;
    c.beginPath();c.moveTo(-.65,-1.62);c.lineTo(-.65,2.07);c.stroke();
    c.restore();
  }
  function drawRound(c,b,heavy){
    const speed=Math.hypot(b.vx,b.vy)||1;
    const dx=b.vx/speed,dy=b.vy/speed;
    const tracer=!!b.tracer;
    // A few short bright tracer streaks amongst tiny neutral rounds:
    // no large solid blocks, bright blobs or neon lasers.
    const len=tracer?(heavy?4.3:3.7):(heavy?2.35:1.85);
    const fading=b.life<.18?Math.max(.2,b.life/.18):1;
    c.save();c.lineCap='round';
    if(tracer){
      c.globalAlpha=fading*.19;
      c.strokeStyle='#d68b52';c.lineWidth=heavy?1.8:1.35;
      c.beginPath();c.moveTo(b.x-dx*(len+1.4),b.y-dy*(len+1.4));
      c.lineTo(b.x,b.y);c.stroke();
      c.globalAlpha=fading*.92;
      c.strokeStyle=b.rearGun?'#e9ab71':heavy?'#f7c88b':'#f3da9b';
      c.lineWidth=heavy?.9:.72;
    }else{
      c.globalAlpha=fading*.68;c.strokeStyle=b.rearGun?'#b6b9b1':'#d6dbd6';
      c.lineWidth=heavy?.75:.58;
    }
    c.beginPath();c.moveTo(b.x-dx*len,b.y-dy*len);
    c.lineTo(b.x,b.y);c.stroke();
    c.globalAlpha=tracer?fading*.94:fading*.66;
    c.fillStyle=tracer?'#fff0c7':'#d9dcd5';
    c.beginPath();c.arc(b.x,b.y,tracer?.51:.32,0,PI2);c.fill();
    c.restore();
  }
  function draw(c,bullets,bombs,planes){
    for(const b of bombs)drawBomb(c,b);
    for(const b of bullets){const owner=planes.find(p=>p.id===b.owner);drawRound(c,b,owner?.role==='heavy');}
  }
  window.WingmanOrdnance={draw,drawBomb,drawRound};
})();