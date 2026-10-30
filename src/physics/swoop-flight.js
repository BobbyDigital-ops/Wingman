/* Wingman G1 — arcade swoop physics.
 * All six aircraft use the same angular-momentum model (including AI).
 * No simulation framework or new hitboxes; backward compatible with classic.
 */
(()=>{'use strict';
  const profiles={
    fighter:{yaw:.66,rollResponse:7.0,flightTurn:2.35,velocityResponse:3.1},
    heavy:{yaw:.60,rollResponse:4.5,flightTurn:1.40,velocityResponse:2.3},
    bomber:{yaw:.48,rollResponse:2.7,flightTurn:.83,velocityResponse:1.9}
  };
  const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
  const shortest=(target,current)=>Math.atan2(Math.sin(target-current),Math.cos(target-current));
  const profile=p=>profiles[p.role]||profiles.fighter;
  function desiredTurn(p,input){
    const cfg=profile(p),baseline=Math.max(1,p.d?.speed||1);
    const overspeed=Math.max(0,(p.speed||baseline)/baseline-1);
    // Faster aircraft carve a wider arc rather than instantly pivoting.
    const airframe=p.type==='fighter'?1.07:p.type==='bf109'?.92:
      p.type==='heavy'?1.03:p.type==='bf110'?.98:
      p.type==='bomber'?.95:1;
    return input*cfg.yaw*(p.id>0?1.30:1)*airframe*Math.max(.68,1-.30*overspeed);
  }
  function turnBlend(p,dt){return clamp(dt*profile(p).rollResponse,0,1);}
  function advanceVelocity(p,dt,scripted=false){
    if(!(dt>0)||!Number.isFinite(p.vx)||!Number.isFinite(p.vy)||!Number.isFinite(p.angle))return;
    const cfg=profile(p);
    const magnitude=Math.hypot(p.vx,p.vy);
    const current=magnitude>.01?Math.atan2(p.vy,p.vx):p.angle;
    const discrepancy=shortest(p.angle,current);
    // Airflow changes the actual travel direction along an arc. Ordinary
    // controls cannot teleport velocity to the nose's new heading.
    // Explicit aerobatic reversal skills have higher control authority.
    // Gradual vector coupling produces real inertial slip (around 15–25°),
    // rather than a nose-locked velocity vector. The capped angular rate
    // prevents instant movement reversal even during aggressive inputs.
    const coupling=scripted?14:(p.role==='fighter'?4.3:p.role==='heavy'?3.5:2.9);
    const maxRate=scripted?8.8:cfg.flightTurn;
    const direction=current+clamp(discrepancy*coupling*dt,-maxRate*dt,maxRate*dt);
    const speedTarget=Number.isFinite(p.speed)?Math.max(0,p.speed):magnitude;
    const speed=magnitude+(speedTarget-magnitude)*clamp(dt*(scripted?4.5:cfg.velocityResponse),0,1);
    p.vx=Math.cos(direction)*speed;
    p.vy=Math.sin(direction)*speed;
  }
  window.WingmanFlightPhysics={profiles,desiredTurn,turnBlend,advanceVelocity};
})();