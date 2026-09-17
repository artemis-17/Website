document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

const scene = document.getElementById('hero-scene');
const canvas = document.getElementById('swarm-canvas');
if (scene && canvas) {
  const ctx = canvas.getContext('2d');
  const inputs = {
    radial: document.getElementById('radial-control'),
    cross: document.getElementById('cross-control'),
    spacing: document.getElementById('spacing-control'),
    phase: document.getElementById('phase-control')
  };
  const outputs = {
    radial: document.getElementById('radial-value'),
    cross: document.getElementById('cross-value'),
    spacing: document.getElementById('spacing-value'),
    phase: document.getElementById('phase-value'),
    separation: document.getElementById('separation-value'),
    period: document.getElementById('orbit-period')
  };
  const playButton = document.getElementById('orbit-play');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const muEarth = 398600.4418; // km^3/s^2
  const chiefRadius = 6378.137 + 500; // Earth equatorial radius + illustrative chief altitude, km
  const meanMotion = Math.sqrt(muEarth / chiefRadius ** 3); // rad/s
  const periodMinutes = 2 * Math.PI / meanMotion / 60;
  outputs.period.textContent = `PERIOD ${periodMinutes.toFixed(1)} MIN`;
  let width = 1, height = 1, dpr = 1, playing = false, lastFrame = 0, phaseFloat = Number(inputs.phase.value);

  // A bounded, unforced solution to the linear Hill–Clohessy–Wiltshire equations.
  // x: radial, y: along-track, z: cross-track. All three deputies share this
  // periodic relative orbit and differ only in orbital phase.
  function position(theta, A, B) {
    return [A * Math.cos(theta), -2 * A * Math.sin(theta), B * Math.sin(theta)];
  }
  function state() {
    return {
      A: Number(inputs.radial.value),
      B: Number(inputs.cross.value),
      spacing: Number(inputs.spacing.value),
      phase: Number(inputs.phase.value)
    };
  }
  function updateReadouts(values) {
    outputs.radial.textContent = `${values.A.toFixed(1)} km`;
    outputs.cross.textContent = `${values.B.toFixed(1)} km`;
    outputs.spacing.textContent = `${values.spacing}°`;
    outputs.phase.textContent = `${Math.round(values.phase)}°`;
  }
  Object.values(inputs).forEach(input => input.addEventListener('input', () => {
    if (input === inputs.phase) phaseFloat = Number(input.value);
    updateReadouts(state());
  }));
  playButton.addEventListener('click', () => {
    playing = !playing;
    playButton.textContent = playing ? '❚❚ PAUSE' : '▶ PLAY';
    playButton.setAttribute('aria-pressed', String(playing));
  });
  function resize() {
    const bounds = scene.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  function line(a, b, color, lineWidth = 1) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke();
  }
  function polygon(points, fill, stroke = '#dce4e5') {
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(point => ctx.lineTo(point[0], point[1]));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = stroke; ctx.stroke();
  }
  function text(value, x, y, color = '#d8e1e2', size = 10) {
    ctx.font = `${size}px ui-monospace, Consolas, monospace`;
    ctx.fillStyle = color; ctx.fillText(value, x, y);
  }
  function distance(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }
  function vehicle(x, y, label, featured = false) {
    const body = featured ? '#e6edec' : '#c2cdcf';
    polygon([[x-7,y-8],[x+5,y-10],[x+9,y+6],[x-4,y+8]], body, '#f3f6f5');
    polygon([[x+5,y-10],[x+11,y-6],[x+14,y+10],[x+9,y+6]], '#5d6b70');
    polygon([[x-7,y-8],[x-15,y-5],[x-13,y+9],[x-4,y+8]], '#303b40');
    line([x-14,y+2],[x-24,y+2],'#dce5e5',1.3);
    line([x+13,y+2],[x+23,y+2],'#dce5e5',1.3);
    polygon([[x-36,y-7],[x-24,y-8],[x-23,y+11],[x-35,y+12]], '#313b3f','#b8c4c6');
    polygon([[x+23,y-8],[x+35,y-7],[x+36,y+12],[x+24,y+11]], '#313b3f','#b8c4c6');
    line([x-30,y-7],[x-29,y+11],'#7e8d91',.7);
    line([x+29,y-7],[x+30,y+11],'#7e8d91',.7);
    text(label, x+16, y-17, '#f2f5f4', 10);
  }
  function render(now) {
    const elapsed = lastFrame ? Math.min(100, now - lastFrame) : 0;
    lastFrame = now;
    if (playing && !reducedMotion.matches) {
      phaseFloat = (phaseFloat + elapsed * 360 / 6000) % 360;
      inputs.phase.value = String(Math.round(phaseFloat));
    }
    const values = state();
    updateReadouts(values);
    const phase = values.phase * Math.PI / 180;
    const delta = values.spacing * Math.PI / 180;
    const deputies = [0, 1, 2].map(i => position(phase + i * delta, values.A, values.B));
    const minimum = Math.min(distance(deputies[0],deputies[1]),distance(deputies[1],deputies[2]),distance(deputies[0],deputies[2]));
    outputs.separation.textContent = `MIN DEPUTY SEPARATION ${minimum.toFixed(1)} KM`;

    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);
    const origin = [width*.5,height*.54];
    const scale = Math.min(width/62,height/42);
    function project(point) {
      const [x,y,z] = point;
      return [origin[0]+scale*(.43*x+.78*y),origin[1]+scale*(.5*x-.1*y-.83*z)];
    }
    for(let i=0;i<=10;i++) line([i*width/10,0],[i*width/10,height],'#263136',.6);
    for(let i=0;i<=8;i++) line([0,i*height/8],[width,i*height/8],'#263136',.6);
    const axes = [
      {point:[16,0,0],name:'X / RADIAL'},
      {point:[0,27,0],name:'Y / ALONG-TRACK'},
      {point:[0,0,10],name:'Z / CROSS-TRACK'}
    ];
    axes.forEach(axis => {
      const end = project(axis.point);
      line(origin,end,'#66767b',1);
      text(axis.name,end[0]+5,end[1]-5,'#899a9e',8);
    });
    ctx.beginPath();
    for(let i=0;i<=240;i++) {
      const screen = project(position(i*Math.PI*2/240,values.A,values.B));
      if(i===0) ctx.moveTo(screen[0],screen[1]); else ctx.lineTo(screen[0],screen[1]);
    }
    ctx.strokeStyle='#aab8bb';ctx.lineWidth=1.3;ctx.stroke();
    ctx.setLineDash([4,6]);
    [[0,1],[1,2],[0,2]].forEach(([a,b]) => line(project(deputies[a]),project(deputies[b]),'#78888d',.85));
    ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(origin[0],origin[1],17,0,Math.PI*2);
    ctx.strokeStyle='#9caeb1';ctx.lineWidth=.8;ctx.stroke();
    line([origin[0]-7,origin[1]],[origin[0]+7,origin[1]],'#dce4e5',1);
    line([origin[0],origin[1]-7],[origin[0],origin[1]+7],'#dce4e5',1);
    text('CHIEF / TARGET',origin[0]-34,origin[1]-34,'#dce4e5',9);
    deputies.forEach((point,i) => {
      const [x,y] = project(point);
      vehicle(x,y,`S${i+1}`,i===0);
    });
    requestAnimationFrame(render);
  }
  new ResizeObserver(resize).observe(scene);
  resize(); updateReadouts(state()); requestAnimationFrame(render);
}
