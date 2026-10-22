/**
 * slides.js
 * Navegación de la presentación: botones, teclado, gestos táctiles,
 * contador, barra de progreso y la insignia con el nombre del expositor.
 *
 * Cada diapositiva de contenido declara su expositor en el HTML:
 *   data-presenter-name="Edward Jiménez"  data-presenter-id="A00126021"
 * La portada y el cierre no tienen expositor y ocultan la insignia.
 */
(function setUpSlideNavigation() {
  var SWIPE_MIN_DISTANCE_PX = 60;

  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var lastSlideIndex = slides.length - 1;
  var currentSlideIndex = 0;

  var presenterBadge = document.getElementById("presenter-badge");
  var presenterNameLabel = document.getElementById("presenter-name");
  var presenterIdLabel = document.getElementById("presenter-id");
  var slideCounterLabel = document.getElementById("slide-counter");
  var progressFill = document.getElementById("progress-fill");
  var previousButton = document.getElementById("previous-button");
  var nextButton = document.getElementById("next-button");
  var fullscreenButton = document.getElementById("fullscreen-button");
  var brandLogo = document.getElementById("brand-logo");

  /** Formatea un número con dos dígitos: 3 -> "03". */
  function twoDigits(number) {
    return (number < 10 ? "0" : "") + number;
  }

  /** Muestra el expositor de la diapositiva, o esconde la insignia si no tiene. */
  function updatePresenterBadge(slide) {
    var name = slide.getAttribute("data-presenter-name");
    if (!name) {
      presenterBadge.hidden = true;
      return;
    }
    presenterNameLabel.textContent = name;
    presenterIdLabel.textContent = slide.getAttribute("data-presenter-id");
    presenterBadge.hidden = false;
    // Reinicia la animación de entrada
    presenterBadge.classList.remove("is-entering");
    void presenterBadge.offsetWidth;
    presenterBadge.classList.add("is-entering");
  }

  /** Cambia a la diapositiva indicada (el índice se limita al rango válido). */
  function showSlide(requestedIndex) {
    currentSlideIndex = Math.max(0, Math.min(lastSlideIndex, requestedIndex));

    slides.forEach(function (slide, index) {
      var isCurrent = index === currentSlideIndex;
      slide.classList.toggle("is-active", isCurrent);
      slide.setAttribute("aria-hidden", isCurrent ? "false" : "true");
    });

    var activeSlide = slides[currentSlideIndex];
    updatePresenterBadge(activeSlide);
    activeSlide.scrollTop = 0;

    // El logo pequeño se oculta en la portada, que ya tiene uno grande
    brandLogo.hidden = currentSlideIndex === 0;

    slideCounterLabel.textContent = twoDigits(currentSlideIndex + 1) + " / " + twoDigits(slides.length);
    progressFill.style.width = ((currentSlideIndex + 1) / slides.length) * 100 + "%";
    previousButton.disabled = currentSlideIndex === 0;
    nextButton.disabled = currentSlideIndex === lastSlideIndex;
  }

  function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        var request = document.documentElement.requestFullscreen();
        if (request && request.catch) request.catch(function () {});
      }
    } catch (error) {
      // Algunos entornos no permiten pantalla completa; se ignora
    }
  }

  // Botones
  previousButton.addEventListener("click", function () { showSlide(currentSlideIndex - 1); });
  nextButton.addEventListener("click", function () { showSlide(currentSlideIndex + 1); });
  fullscreenButton.addEventListener("click", toggleFullscreen);

  // Teclado: flechas, Re Pág / Av Pág, espacio, Inicio y Fin
  document.addEventListener("keydown", function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    switch (event.key) {
      case "ArrowRight":
      case "PageDown":
      case " ":
        event.preventDefault();
        showSlide(currentSlideIndex + 1);
        break;
      case "ArrowLeft":
      case "PageUp":
        event.preventDefault();
        showSlide(currentSlideIndex - 1);
        break;
      case "Home":
        showSlide(0);
        break;
      case "End":
        showSlide(lastSlideIndex);
        break;
    }
  });

  // Gestos táctiles: deslizar horizontalmente cambia de diapositiva
  var touchStartX = 0;
  var touchStartY = 0;
  document.addEventListener("touchstart", function (event) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchend", function (event) {
    var deltaX = event.changedTouches[0].clientX - touchStartX;
    var deltaY = event.changedTouches[0].clientY - touchStartY;
    var isHorizontalSwipe = Math.abs(deltaX) > SWIPE_MIN_DISTANCE_PX && Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
    if (isHorizontalSwipe) showSlide(currentSlideIndex + (deltaX < 0 ? 1 : -1));
  }, { passive: true });

  // Toque o clic en un costado de la pantalla: izquierda = anterior, derecha = siguiente.
  // Funciona igual con el dedo en móviles y con el ratón en computadoras.
  document.addEventListener("click", function (event) {
    var clickedControl = event.target.closest("button, a, nav, .presenter-badge, .qr-card");
    if (clickedControl) return;

    // Si la persona está seleccionando texto, no cambia de diapositiva
    var selection = window.getSelection && window.getSelection();
    if (selection && selection.toString().length > 0) return;

    var tappedLeftSide = event.clientX < window.innerWidth / 2;
    showSlide(currentSlideIndex + (tappedLeftSide ? -1 : 1));
  });

  showSlide(0);
})();
