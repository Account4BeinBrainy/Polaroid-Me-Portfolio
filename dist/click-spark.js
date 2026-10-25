(() => {
  if (window.__clickSpark) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'click-spark-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;background:transparent;z-index:2147483647';
  document.body.append(canvas);
  window.__clickSpark = canvas;
  const context = canvas.getContext('2d');
  const sparks = [];
  let frame = 0;

  function resize() {
    const dpr = devicePixelRatio || 1;
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    frame = 0;
    context.clearRect(0, 0, innerWidth, innerHeight);
    context.strokeStyle = '#111';
    context.lineWidth = 2;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i];
      const progress = Math.min((now - spark.start) / 400, 1);
      if (progress >= 1) { sparks.splice(i, 1); continue; }
      const eased = progress * (2 - progress);
      const distance = eased * 15;
      const length = 10 * (1 - eased);
      const cos = Math.cos(spark.angle), sin = Math.sin(spark.angle);
      context.beginPath();
      context.moveTo(spark.x + distance * cos, spark.y + distance * sin);
      context.lineTo(spark.x + (distance + length) * cos, spark.y + (distance + length) * sin);
      context.stroke();
    }
    if (sparks.length) frame = requestAnimationFrame(draw);
  }

  addEventListener('resize', resize);
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.detail === 0) return;
    const start = performance.now();
    for (let i = 0; i < 8; i++) sparks.push({ x:event.clientX, y:event.clientY, angle:Math.PI * 2 * i / 8, start });
    if (!frame) frame = requestAnimationFrame(draw);
  });
  resize();
})();
