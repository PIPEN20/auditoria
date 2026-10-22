/**
 * gears.js
 * Dibuja engranajes decorativos en las esquinas de las diapositivas.
 * Cada diapositiva indica las posiciones con el atributo data-gears,
 * por ejemplo: data-gears="top-right bottom-left".
 * El engranaje se define una sola vez y se reutiliza con <use>.
 */
(function addDecorativeGears() {
  var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  var TOOTH_COUNT = 10;
  var OUTER_RADIUS = 47;
  var INNER_RADIUS = 38;
  var CENTER = 50;

  /** Calcula el contorno del engranaje como un único trazado SVG. */
  function buildGearOutline() {
    var anglePerTooth = (2 * Math.PI) / TOOTH_COUNT;
    var commands = [];

    function pointAt(radius, angle) {
      var x = CENTER + radius * Math.cos(angle);
      var y = CENTER + radius * Math.sin(angle);
      return x.toFixed(2) + " " + y.toFixed(2);
    }

    for (var tooth = 0; tooth < TOOTH_COUNT; tooth++) {
      var start = tooth * anglePerTooth;
      var corners = [
        [INNER_RADIUS, start + 0.05 * anglePerTooth],
        [OUTER_RADIUS, start + 0.2 * anglePerTooth],
        [OUTER_RADIUS, start + 0.5 * anglePerTooth],
        [INNER_RADIUS, start + 0.65 * anglePerTooth]
      ];
      corners.forEach(function (corner, cornerIndex) {
        var isFirstPoint = tooth === 0 && cornerIndex === 0;
        commands.push((isFirstPoint ? "M" : "L") + pointAt(corner[0], corner[1]));
      });
    }
    return commands.join(" ") + " Z";
  }

  /** Inserta el engranaje como símbolo reutilizable en la página. */
  function insertGearSymbol() {
    var sprite = document.createElementNS(SVG_NAMESPACE, "svg");
    sprite.setAttribute("width", "0");
    sprite.setAttribute("height", "0");
    sprite.setAttribute("style", "position:absolute");
    sprite.setAttribute("aria-hidden", "true");
    sprite.innerHTML =
      '<symbol id="gear-shape" viewBox="0 0 100 100">' +
      '<path d="' + buildGearOutline() + '"/>' +
      '<circle cx="50" cy="50" r="16"/>' +
      '<circle cx="50" cy="50" r="27" stroke-dasharray="2 4" opacity="0.6"/>' +
      "</symbol>";
    document.body.appendChild(sprite);
  }

  insertGearSymbol();

  var slides = document.querySelectorAll(".slide[data-gears]");
  Array.prototype.forEach.call(slides, function (slide) {
    var positions = slide.getAttribute("data-gears").split(" ").filter(Boolean);

    positions.forEach(function (position, index) {
      var gear = document.createElementNS(SVG_NAMESPACE, "svg");
      var classes = "gear gear--" + position;
      // Los engranajes alternan el sentido de giro
      if (index % 2 === 1) classes += " is-counter-clockwise";
      gear.setAttribute("class", classes);
      gear.setAttribute("viewBox", "0 0 100 100");
      gear.setAttribute("aria-hidden", "true");
      gear.innerHTML = '<use href="#gear-shape"/>';
      slide.appendChild(gear);
    });
  });
})();
