// Add smooth scrolling and interactive effects
document.addEventListener("DOMContentLoaded", function () {
  // Animate service cards on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  }, observerOptions);

  // Initially hide cards and observe them
  document.querySelectorAll(".service-card").forEach((card, index) => {
    card.style.opacity = "0";
    card.style.transform = "translateY(30px)";
    card.style.transition = `all 0.6s ease ${index * 0.1}s`;
    observer.observe(card);
  });

  // Animate stats on scroll
  const statsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const number = entry.target.querySelector(".stat-number");
          const finalNumber = parseInt(number.textContent);
          let current = 0;
          const increment = finalNumber / 50;
          const timer = setInterval(() => {
            current += increment;
            if (current >= finalNumber) {
              number.textContent =
                finalNumber + (number.textContent.includes("%") ? "%" : "+");
              clearInterval(timer);
            } else {
              number.textContent =
                Math.floor(current) +
                (number.textContent.includes("%") ? "%" : "+");
            }
          }, 30);
        }
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll(".stat-item").forEach((item) => {
    statsObserver.observe(item);
  });

  // Navbar scroll effect
  let lastScrollY = window.scrollY;
  window.addEventListener("scroll", () => {
    const navbar = document.querySelector(".navbar");
    if (window.scrollY > lastScrollY && window.scrollY > 100) {
      navbar.style.transform = "translateY(-100%)";
    } else {
      navbar.style.transform = "translateY(0)";
    }
    lastScrollY = window.scrollY;
  });
});
