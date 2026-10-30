/* Wingman G2 — small, crisp period-appropriate ordnance.
 * High-DPI Canvas artwork. No changes to collision geometry or combat damage.
 * Supplied by the shared aircraft overlay, with zero image dependencies.
 */
(()=>{'use strict';
  const PI2=Math.PI*2;
  function drawBomb(c,b){
    if(b.delay>0)return;
    const vx=Number.isFinite(b.vx)?b.vx:0;
    const vy=Number.isFinite(b.vy)?b.vy:10;
    c.save();
    c.translate(b.x,b.y);
    // Side-on WWII general-purpose bomb, nose pointing along the fall vector.
    // Fins are narrow sheet-metal stabilisers, not the old large triangular
    // "cartoon rocket" tail. Keep it recognisable at actual mobile size.
    c.rotate(-Math.atan2(vx,vy||.01));
    c.lineJoin='round';
    // Rear box-fin stabiliser and its two diagonal supports.
    c.fillStyle='#5b6654';
    c.strokeStyle='#252f2c';
    c.lineWidth=.52;
    c.beginPath();
    c.moveTo(-.85,-3.0);c.lineTo(-2.45,-5.3);
    c.lineTo(-2.35,-2.05);c.lineTo(-1.27,-1.65);
    c.lineTo(1.27,-1.65);c.lineTo(2.35,-2.05);
    c.lineTo(2.45,-5.3);c.lineTo(.85,-3.0);
    c.closePath();c.fill();c.stroke();
    // Slightly lighter far fin. The centre bracing stays dark and fine.
    c.fillStyle='#85907a';
    c.beginPath();
    c.moveTo(.3,-3.15);c.lineTo(1.75,-4.55);
    c.lineTo(1.58,-2.2);c.lineTo(.55,-1.65);c.closePath();c.fill();
    c.strokeStyle='#354038';c.lineWidth=.40;
    c.beginPath();c.moveTo(-2.2,-4.9);c.lineTo(-.7,-2.4);
    c.moveTo(2.2,-4.9);c.lineTo(.7,-2.4);c.stroke();
    // Slim retaining ring and tapered tail attachment.
    c.fillStyle='#424c43';
    c.beginPath();
    c.moveTo(-1.08,-3.05);c.lineTo(1.08,-3.05);
    c.lineTo(1.48,-1.8);c.lineTo(-1.48,-1.8);
    c.closePath();c.fill();
    c.strokeStyle='#a6ad96';c.lineWidth=.36;
    c.beginPath();c.moveTo(-1.1,-3.05);c.lineTo(1.1,-3.05);c.stroke();
    // Main steel casing: long parallel body, tapered ogive and rounded nose.
    const shell=c.createLinearGradient(-1.65,0,1.65,0);
    shell.addColorStop(0,'#303a32');
    shell.addColorStop(.3,'#59634f');
    shell.addColorStop(.74,'#6f775b');
    shell.addColorStop(1,'#313b34');
    c.fillStyle=shell;
    c.strokeStyle='#202a27';c.lineWidth=.51;
    c.beginPath();
    c.moveTo(-1.47,-2.2);
    c.lineTo(1.47,-2.2);
    c.lineTo(1.55,1.95);
    c.quadraticCurveTo(1.47,3.5,.71,4.78);
    c.quadraticCurveTo(.4,5.3,0,5.48);
    c.quadraticCurveTo(-.4,5.3,-.71,4.78);
    c.quadraticCurveTo(-1.47,3.5,-1.55,1.95);
    c.closePath();c.fill();c.stroke();
    // Narrow yellow identification band towards the nose, period-appropriate.
    c.strokeStyle='#b3a16c';c.lineWidth=.56;
    c.beginPath();c.moveTo(-1.43,2.13);c.lineTo(1.43,2.13);c.stroke();
    // Tiny fuselage glint and seam; do not turn the bomb into a shiny missile.
    c.strokeStyle='rgba(216,222,196,.52)';c.lineWidth=.36;
    c.beginPath();c.moveTo(-.77,-1.45);c.lineTo(-.77,1.7);
    c.quadraticCurveTo(-.74,3.4,-.26,4.45);c.stroke();
    c.strokeStyle='#343d33';c.lineWidth=.35;
    c.beginPath();c.moveTo(-1.32,-1.55);c.lineTo(1.32,-1.55);c.stroke();
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