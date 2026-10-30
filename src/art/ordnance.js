/* Wingman G2 — small, crisp period-appropriate ordnance.
 * High-DPI Canvas artwork. No changes to collision geometry or combat damage.
 * Supplied by the shared aircraft overlay, with zero image dependencies.
 */
(()=>{'use strict';
  const PI2=Math.PI*2;
  function drawBomb(c,b){
    if(b.delay>0)return;
    c.save();c.translate(b.x,b.y);
    // A falling bomb pitches gradually from forward motion into a nose-first
    // descent as gravity takes over. The nose of this miniature points down.
    const a=-Math.atan2(b.vx,b.vy||.01);
    c.rotate(a);
    c.lineJoin='round';c.lineWidth=.55;
    // Four stylised fins in side view, with a slender tail mount.
    c.fillStyle='#66706a';c.strokeStyle='#293538';
    c.beginPath();
    c.moveTo(-.8,-2.6);c.lineTo(-2.6,-4);
    c.lineTo(-2.1,-1.35);c.lineTo(-1.3,-1.1);
    c.lineTo(1.3,-1.1);c.lineTo(2.1,-1.35);
    c.lineTo(2.6,-4);c.lineTo(.8,-2.6);
    c.closePath();c.fill();c.stroke();
    c.strokeStyle='#c6c4ac';c.lineWidth=.65;
    c.beginPath();c.moveTo(0,-4.1);c.lineTo(0,-2.4);c.stroke();
    // Olive-steel casing; rounded conical nose and fine edge highlight.
    c.fillStyle='#454d46';c.strokeStyle='#202b30';c.lineWidth=.6;
    c.beginPath();
    c.moveTo(-1.35,-2.7);c.lineTo(1.35,-2.7);
    c.lineTo(1.35,1.25);c.quadraticCurveTo(1.2,2.5,0,3.1);
    c.quadraticCurveTo(-1.2,2.5,-1.35,1.25);
    c.closePath();c.fill();c.stroke();
    c.strokeStyle='#9da58d';c.lineWidth=.43;
    c.beginPath();c.moveTo(-.56,-2.1);c.lineTo(-.56,1.75);c.stroke();
    c.strokeStyle='#9b896a';c.lineWidth=.52;
    c.beginPath();c.moveTo(-1.25,-1.65);c.lineTo(1.25,-1.65);c.stroke();
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