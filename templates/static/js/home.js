let currentSlide = 0;
const totalSlides = 15;
const slideshow = document.getElementById("slideshow");
const dotsContainer = document.getElementById("dots");

// Create dots
for (let i = 0; i < totalSlides; i++) {
  const dot = document.createElement("div");
  dot.classList.add("dot");
  if (i === 0) dot.classList.add("active");
  dot.addEventListener("click", () => goToSlide(i));
  dotsContainer.appendChild(dot);
}

const dots = document.querySelectorAll(".dot");

function updateSlidePosition() {
  const translateX = -(currentSlide * (100 / totalSlides));
  slideshow.style.transform = `translateX(${translateX}%)`;

  // Update dots
  dots.forEach((dot, index) => {
    dot.classList.toggle("active", index === currentSlide);
  });
}

function nextSlide() {
  currentSlide = (currentSlide + 1) % totalSlides;
  updateSlidePosition();
}

function previousSlide() {
  currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
  updateSlidePosition();
}

function goToSlide(index) {
  currentSlide = index;
  updateSlidePosition();
}

// Auto-play functionality
let autoPlayInterval = setInterval(nextSlide, 4000);

// Pause auto-play on hover
const carousel = document.getElementById("carousel");
carousel.addEventListener("mouseenter", () => {
  clearInterval(autoPlayInterval);
});

carousel.addEventListener("mouseleave", () => {
  autoPlayInterval = setInterval(nextSlide, 4000);
});

// Touch/swipe support for mobile
let startX = 0;
let isDragging = false;

carousel.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
  isDragging = true;
});

carousel.addEventListener("touchmove", (e) => {
  if (!isDragging) return;
  e.preventDefault();
});

carousel.addEventListener("touchend", (e) => {
  if (!isDragging) return;

  const endX = e.changedTouches[0].clientX;
  const diffX = startX - endX;

  if (Math.abs(diffX) > 50) {
    if (diffX > 0) {
      nextSlide();
    } else {
      previousSlide();
    }
  }

  isDragging = false;
});

// Mouse drag support for desktop
let mouseStartX = 0;
let isMouseDragging = false;

carousel.addEventListener("mousedown", (e) => {
  mouseStartX = e.clientX;
  isMouseDragging = true;
  carousel.style.cursor = "grabbing";
});

carousel.addEventListener("mousemove", (e) => {
  if (!isMouseDragging) return;
  e.preventDefault();
});

carousel.addEventListener("mouseup", (e) => {
  if (!isMouseDragging) return;

  const mouseEndX = e.clientX;
  const diffX = mouseStartX - mouseEndX;

  if (Math.abs(diffX) > 50) {
    if (diffX > 0) {
      nextSlide();
    } else {
      previousSlide();
    }
  }

  isMouseDragging = false;
  carousel.style.cursor = "grab";
});

carousel.addEventListener("mouseleave", () => {
  if (isMouseDragging) {
    isMouseDragging = false;
    carousel.style.cursor = "grab";
  }
});

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") {
    previousSlide();
  } else if (e.key === "ArrowRight") {
    nextSlide();
  }
});
