// Team slider functionality
let next = document.querySelector(".next");
let prev = document.querySelector(".prev");

next.addEventListener("click", function () {
  let items = document.querySelectorAll(".item");
  document.querySelector(".slide").appendChild(items[0]);
});

prev.addEventListener("click", function () {
  let items = document.querySelectorAll(".item");
  document.querySelector(".slide").prepend(items[items.length - 1]);
});

// Animated counter for stats
function animateCounter(element, target, suffix = "") {
  let current = 0;
  const increment = target / 100;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.ceil(current) + suffix;
  }, 20);
}

// Intersection Observer for stats animation
const observerOptions = {
  threshold: 0.5,
  rootMargin: "0px 0px -100px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const statNumbers = entry.target.querySelectorAll(".stat-number");
      statNumbers.forEach((stat) => {
        const target = parseInt(stat.getAttribute("data-target"));
        const text = stat.textContent;
        let suffix = "";

        if (text.includes("+")) suffix = "+";
        if (text.includes("%")) suffix = "%";

        stat.classList.add("animate");
        animateCounter(stat, target, suffix);
      });
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Start observing the stats section
const statsSection = document.querySelector(".stats-section");
observer.observe(statsSection);

// Add smooth scrolling
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
