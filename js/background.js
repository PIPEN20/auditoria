/**
 * background.js
 * Fondo animado: circuitos electrónicos con pulsos de luz que los recorren.
 *
 * Optimización del rendimiento:
 *  - Las partes estáticas (degradados, líneas, nodos) se dibujan UNA sola vez
 *    en un lienzo auxiliar y luego se copian en cada cuadro.
 *  - Cada cuadro solo dibuja los pulsos en movimiento.
 *  - El brillo de cada pulso usa una imagen pre-renderizada (sin shadowBlur).
 *  - Se limita la resolución y la cantidad de circuitos según el dispositivo.
 *  - La animación se pausa cuando la pestaña no está visible.
 *  - Con "reducir movimiento" activado solo se dibuja el fondo estático.
 */
(function startCircuitBackground() {
  var canvas = document.getElementById("background-canvas");
  var context = canvas.getContext("2d");

  var prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouchDevice =
    window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  // Ajustes de calidad según el dispositivo
  var GRID_CELL_SIZE = 44;
  var MAX_PIXEL_RATIO = isTouchDevice ? 1.5 : 2;
  var MAX_CIRCUITS = isTouchDevice ? 22 : 40;
  var MIN_FRAME_INTERVAL_MS = isTouchDevice ? 1000 / 30 : 1000 / 60;
  var TRAIL_SEGMENTS = 6;

  var viewportWidth = 0;
  var viewportHeight = 0;
  var circuits = [];
  var staticLayer = document.createElement("canvas");
  var glowSprite = createGlowSprite();
  var lastFrameTime = 0;
  var animationFrameId = 0;

  function randomBetween(min, max) { return min + Math.random() * (max - min); }
  function randomInteger(min, max) { return Math.floor(randomBetween(min, max + 1)); }

  /** Imagen pequeña con un halo radial, usada como cabeza de cada pulso. */
  function createGlowSprite() {
    var size = 40;
    var sprite = document.createElement("canvas");
    sprite.width = sprite.height = size;
    var spriteContext = sprite.getContext("2d");
    var gradient = spriteContext.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(180, 255, 248, 1)");
    gradient.addColorStop(0.25, "rgba(47, 214, 198, 0.75)");
    gradient.addColorStop(1, "rgba(47, 214, 198, 0)");
    spriteContext.fillStyle = gradient;
    spriteContext.fillRect(0, 0, size, size);
    return sprite;
  }

  /** Crea un circuito: una línea quebrada sobre una cuadrícula con giros de 45°. */
  function createCircuit() {
    var x = Math.round(randomBetween(0, viewportWidth) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
    var y = Math.round(randomBetween(0, viewportHeight) / GRID_CELL_SIZE) * GRID_CELL_SIZE;
    var direction = randomInteger(0, 7); // 8 direcciones, múltiplos de 45°
    var points = [{ x: x, y: y }];
    var segmentCount = randomInteger(4, 9);

    for (var i = 0; i < segmentCount; i++) {
      var segmentLength = GRID_CELL_SIZE * randomInteger(1, 3);
      x += Math.round(Math.cos((direction * Math.PI) / 4)) * segmentLength;
      y += Math.round(Math.sin((direction * Math.PI) / 4)) * segmentLength;
      points.push({ x: x, y: y });
      // 25 % de probabilidad de seguir recto, si no gira a la izquierda o derecha
      if (Math.random() >= 0.25) direction += Math.random() < 0.5 ? -1 : 1;
    }

    // Distancia acumulada hasta cada punto (sirve para ubicar el pulso)
    var distanceAtPoint = [0];
    var totalLength = 0;
    for (var k = 1; k < points.length; k++) {
      totalLength += Math.hypot(points[k].x - points[k - 1].x, points[k].y - points[k - 1].y);
      distanceAtPoint.push(totalLength);
    }

    return {
      points: points,
      distanceAtPoint: distanceAtPoint,
      totalLength: totalLength,
      pulsePosition: randomBetween(0, totalLength),
      pulseSpeed: randomBetween(45, 115),
      trailLength: randomBetween(80, 150)
    };
  }

  /** Devuelve la coordenada (x, y) que está a "distance" píxeles del inicio del circuito. */
  function pointAtDistance(circuit, distance) {
    var clamped = Math.max(0, Math.min(circuit.totalLength, distance));
    for (var i = 1; i < circuit.distanceAtPoint.length; i++) {
      if (clamped <= circuit.distanceAtPoint[i]) {
        var segmentStart = circuit.distanceAtPoint[i - 1];
        var segmentSpan = circuit.distanceAtPoint[i] - segmentStart || 1;
        var progress = (clamped - segmentStart) / segmentSpan;
        var from = circuit.points[i - 1];
        var to = circuit.points[i];
        return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
      }
    }
    return circuit.points[circuit.points.length - 1];
  }

  function paintGlow(layerContext, centerX, centerY, radius, rgb, alpha) {
    var gradient = layerContext.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, "rgba(" + rgb + "," + alpha + ")");
    gradient.addColorStop(1, "rgba(" + rgb + ",0)");
    layerContext.fillStyle = gradient;
    layerContext.fillRect(0, 0, viewportWidth, viewportHeight);
  }

  /** Dibuja una sola vez todo lo que no se mueve. */
  function paintStaticLayer() {
    var layer = staticLayer.getContext("2d");
    layer.setTransform(canvas.width / viewportWidth, 0, 0, canvas.height / viewportHeight, 0, 0);

    layer.fillStyle = "#06141a";
    layer.fillRect(0, 0, viewportWidth, viewportHeight);

    var largestSide = Math.max(viewportWidth, viewportHeight);
    paintGlow(layer, viewportWidth * 0.78, viewportHeight * 0.28, largestSide * 0.55, "47,214,198", 0.11);
    paintGlow(layer, viewportWidth * 0.15, viewportHeight * 0.85, largestSide * 0.5, "141,114,242", 0.07);

    layer.lineJoin = "round";
    layer.lineCap = "round";
    layer.lineWidth = 1;

    circuits.forEach(function (circuit) {
      // Trazo del circuito
      layer.strokeStyle = "rgba(47,214,198,0.10)";
      layer.beginPath();
      circuit.points.forEach(function (point, index) {
        if (index === 0) layer.moveTo(point.x, point.y);
        else layer.lineTo(point.x, point.y);
      });
      layer.stroke();

      // Nodos redondos en los extremos
      var first = circuit.points[0];
      var last = circuit.points[circuit.points.length - 1];
      layer.strokeStyle = "rgba(47,214,198,0.30)";
      layer.beginPath();
      layer.moveTo(first.x + 3.5, first.y);
      layer.arc(first.x, first.y, 3.5, 0, Math.PI * 2);
      layer.moveTo(last.x + 3.5, last.y);
      layer.arc(last.x, last.y, 3.5, 0, Math.PI * 2);
      layer.stroke();
    });
  }

  /** Recalcula tamaños y circuitos (al cargar y al cambiar el tamaño de la ventana). */
  function resizeAndRebuild() {
    var pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;

    canvas.width = staticLayer.width = Math.round(viewportWidth * pixelRatio);
    canvas.height = staticLayer.height = Math.round(viewportHeight * pixelRatio);
    context.setTransform(canvas.width / viewportWidth, 0, 0, canvas.height / viewportHeight, 0, 0);

    var circuitCount = Math.min(MAX_CIRCUITS, Math.round((viewportWidth * viewportHeight) / 42000) + 10);
    circuits = [];
    for (var i = 0; i < circuitCount; i++) circuits.push(createCircuit());

    paintStaticLayer();
    drawFrame(0);
  }

  /** Dibuja un cuadro: fondo estático + pulsos en movimiento. */
  function drawFrame(elapsedSeconds) {
    context.drawImage(staticLayer, 0, 0, viewportWidth, viewportHeight);
    if (prefersReducedMotion) return;

    context.lineWidth = 2;
    context.lineCap = "round";

    circuits.forEach(function (circuit) {
      circuit.pulsePosition += circuit.pulseSpeed * elapsedSeconds;
      // Cuando el pulso sale por completo del circuito, reinicia
      if (circuit.pulsePosition - circuit.trailLength > circuit.totalLength) {
        circuit.pulsePosition = 0;
        circuit.pulseSpeed = randomBetween(45, 115);
      }

      // Estela: segmentos cada vez más tenues detrás de la cabeza
      for (var segment = 0; segment < TRAIL_SEGMENTS; segment++) {
        var headDistance = circuit.pulsePosition - (circuit.trailLength * segment) / TRAIL_SEGMENTS;
        var tailDistance = circuit.pulsePosition - (circuit.trailLength * (segment + 1)) / TRAIL_SEGMENTS;
        if (headDistance < 0 || headDistance > circuit.totalLength + 1) continue;

        var from = pointAtDistance(circuit, headDistance);
        var to = pointAtDistance(circuit, tailDistance);
        var opacity = (1 - segment / TRAIL_SEGMENTS) * 0.85;
        context.strokeStyle = "rgba(47,214,198," + opacity.toFixed(2) + ")";
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
      }

      // Cabeza luminosa del pulso
      if (circuit.pulsePosition >= 0 && circuit.pulsePosition <= circuit.totalLength) {
        var head = pointAtDistance(circuit, circuit.pulsePosition);
        context.drawImage(glowSprite, head.x - 14, head.y - 14, 28, 28);
      }
    });
  }

  /** Bucle de animación con límite de cuadros por segundo. */
  function animationLoop(timestamp) {
    animationFrameId = requestAnimationFrame(animationLoop);
    var elapsedMs = timestamp - lastFrameTime;
    if (elapsedMs < MIN_FRAME_INTERVAL_MS) return;
    lastFrameTime = timestamp;
    // Limita saltos grandes (por ejemplo al volver a la pestaña)
    drawFrame(Math.min(elapsedMs, 50) / 1000);
  }

  function startAnimation() {
    if (prefersReducedMotion || animationFrameId) return;
    lastFrameTime = performance.now();
    animationFrameId = requestAnimationFrame(animationLoop);
  }

  function stopAnimation() {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }

  // Pausa la animación si la pestaña no está visible
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopAnimation();
    else startAnimation();
  });

  // Reconstruye el fondo al cambiar el tamaño (con retardo para no sobrecargar)
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeAndRebuild, 200);
  });

  resizeAndRebuild();
  startAnimation();
})();
