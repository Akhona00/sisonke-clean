// Portfolio JavaScript with Lightbox Functionality

document.addEventListener("DOMContentLoaded", function () {
  // Create lightbox HTML structure
  createLightbox();

  // Initialize lightbox functionality
  initializeLightbox();

  // Initialize project filtering
  initializeProjectFiltering();
});

// Create lightbox modal structure
function createLightbox() {
  const lightboxHTML = `
        <div id="lightbox" class="lightbox">
            <div class="lightbox-content">
                <button class="lightbox-close" id="lightbox-close">&times;</button>
                <img class="lightbox-image" id="lightbox-image" src="" alt="">
                <div class="lightbox-caption" id="lightbox-caption"></div>
                <button class="lightbox-nav lightbox-prev" id="lightbox-prev">‹</button>
                <button class="lightbox-nav lightbox-next" id="lightbox-next">›</button>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", lightboxHTML);
}

// Initialize lightbox functionality
function initializeLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const closeBtn = document.getElementById("lightbox-close");
  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");
  const projectItems = document.querySelectorAll(".project-item");

  let currentImageIndex = 0;
  let currentImages = [];

  // Add click event to all project items
  projectItems.forEach((item, index) => {
    item.addEventListener("click", function () {
      const img = this.querySelector("img");
      const category = this.getAttribute("data-category");

      // Get all visible images for navigation
      const visibleItems = Array.from(
        document.querySelectorAll('.project-item:not([style*="display: none"])')
      );
      currentImages = visibleItems.map((item) => ({
        src: item.querySelector("img").src,
        alt: item.querySelector("img").alt,
        category: item.getAttribute("data-category"),
      }));

      currentImageIndex = visibleItems.indexOf(this);

      openLightbox(img.src, img.alt, category);
    });
  });

  // Close lightbox events
  closeBtn.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  // Navigation events
  prevBtn.addEventListener("click", showPreviousImage);
  nextBtn.addEventListener("click", showNextImage);

  // Keyboard navigation
  document.addEventListener("keydown", function (e) {
    if (lightbox.classList.contains("active")) {
      switch (e.key) {
        case "Escape":
          closeLightbox();
          break;
        case "ArrowLeft":
          showPreviousImage();
          break;
        case "ArrowRight":
          showNextImage();
          break;
      }
    }
  });

  // Open lightbox function
  function openLightbox(src, alt, category) {
    lightboxImage.src = src;
    lightboxImage.alt = alt;
    lightboxCaption.textContent = category.replace("-", " ");
    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";

    // Show/hide navigation buttons
    prevBtn.style.display = currentImages.length > 1 ? "block" : "none";
    nextBtn.style.display = currentImages.length > 1 ? "block" : "none";
  }

  // Close lightbox function
  function closeLightbox() {
    lightbox.classList.remove("active");
    document.body.style.overflow = "auto";

    // Add a small delay before hiding to allow fade animation
    setTimeout(() => {
      if (!lightbox.classList.contains("active")) {
        lightboxImage.src = "";
      }
    }, 300);
  }

  // Show previous image
  function showPreviousImage() {
    currentImageIndex =
      (currentImageIndex - 1 + currentImages.length) % currentImages.length;
    const currentImage = currentImages[currentImageIndex];
    lightboxImage.src = currentImage.src;
    lightboxImage.alt = currentImage.alt;
    lightboxCaption.textContent = currentImage.category.replace("-", " ");
  }

  // Show next image
  function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % currentImages.length;
    const currentImage = currentImages[currentImageIndex];
    lightboxImage.src = currentImage.src;
    lightboxImage.alt = currentImage.alt;
    lightboxCaption.textContent = currentImage.category.replace("-", " ");
  }
}

// Initialize project filtering functionality
function initializeProjectFiltering() {
  const filterButtons = document.querySelectorAll(".project-nav a");
  const projectItems = document.querySelectorAll(".project-item");

  filterButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();

      // Remove active class from all buttons
      filterButtons.forEach((btn) => btn.classList.remove("active"));

      // Add active class to clicked button
      this.classList.add("active");

      const filterText = this.textContent.toLowerCase();
      const filterCategory = filterText.replace(" ", "-");

      projectItems.forEach((item) => {
        const itemCategory = item.getAttribute("data-category");

        if (filterText === "all projects" || itemCategory === filterCategory) {
          item.style.display = "block";
          item.style.animation = "fadeInUp 0.5s ease-out";
        } else {
          item.style.display = "none";
        }
      });
    });
  });

  // Set "All Projects" as active by default
  const allProjectsBtn = document.querySelector(".project-nav a");
  if (allProjectsBtn) {
    allProjectsBtn.classList.add("active");
  }
}

// Add smooth scrolling for any anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Add loading animation for images
function addImageLoadingEffect() {
  const images = document.querySelectorAll(".project-item img");

  images.forEach((img) => {
    img.addEventListener("load", function () {
      this.style.opacity = "1";
    });

    // Add loading placeholder
    img.style.opacity = "0";
    img.style.transition = "opacity 0.3s ease";

    // If image is already loaded
    if (img.complete) {
      img.style.opacity = "1";
    }
  });
}

// Initialize image loading effects
addImageLoadingEffect();

// Add touch support for mobile devices
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener("touchstart", function (e) {
  if (document.getElementById("lightbox").classList.contains("active")) {
    touchStartX = e.changedTouches[0].screenX;
  }
});

document.addEventListener("touchend", function (e) {
  if (document.getElementById("lightbox").classList.contains("active")) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }
});

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) > swipeThreshold) {
    if (diff > 0) {
      // Swipe left - next image
      document.getElementById("lightbox-next").click();
    } else {
      // Swipe right - previous image
      document.getElementById("lightbox-prev").click();
    }
  }
}
