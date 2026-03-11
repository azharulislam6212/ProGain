// animation.js (Shopify module, class-based, lazy scroll optimized)
 
class ShopifyAnimations {
  constructor() {
    // Safety check
    if (!window.gsap) {
      console.error("GSAP is not loaded yet!");
      return;
    }

    this.gsap = window.gsap;
    this.ScrollTrigger = window.ScrollTrigger;
    this.SplitText = window.SplitText;
    this.TextPlugin = window.TextPlugin;

    // Register plugins
    if (this.gsap && this.ScrollTrigger && this.SplitText && this.TextPlugin) {
      this.gsap.registerPlugin(this.ScrollTrigger, this.SplitText, this.TextPlugin);
    } else {
      console.error("One or more GSAP plugins are missing!");
      return;
    }

    // Wait for DOM
    document.addEventListener("DOMContentLoaded", () => this.init());
  }

  init() {
    this.animateScrollLazy();
    this.animateSplitTextLazy();
    this.animateTextPluginLazy();
  }

  // -----------------------
  // Lazy scroll animation for .animate-scroll
  animateScrollLazy() {
    const elements = document.querySelectorAll(".animate-scroll");
    elements.forEach(el => {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if(entry.isIntersecting){
            this.gsap.to(entry.target, {
              y: 100,
              opacity: 1,
              duration: 1.5,
              scrollTrigger: {
                trigger: entry.target,
                start: "top 80%",
                end: "bottom 20%",
                scrub: true,
                markers: false
              }
            });
            observer.unobserve(entry.target); // animate only once
          }
        });
      }, { threshold: 0.1 });
      observer.observe(el);
    });
  }

  // -----------------------
  // Lazy SplitText animation for .animate-split
  animateSplitTextLazy() {
    const elements = document.querySelectorAll(".animate-split");
    elements.forEach(el => {
      if (!this.SplitText) return;
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if(entry.isIntersecting){
            const split = new this.SplitText(el, { type: "chars, words" });
            this.gsap.from(split.chars, {
              duration: 1,
              opacity: 0,
              y: 20,
              stagger: 0.05,
              ease: "power2.out",
              scrollTrigger: {
                trigger: el,
                start: "top 90%",
                toggleActions: "play none none none"
              }
            });
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      observer.observe(el);
    });
  }

  // -----------------------
  // Lazy TextPlugin typing effect for .animate-text
  animateTextPluginLazy() {
    const elements = document.querySelectorAll(".animate-text");
    elements.forEach(el => {
      if (!this.TextPlugin) return;
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if(entry.isIntersecting){
            this.gsap.to(el, {
              duration: 3,
              text: "This is animated text!",
              ease: "none",
              scrollTrigger: {
                trigger: el,
                start: "top 80%",
                toggleActions: "play none none none"
              }
            });
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      observer.observe(el);
    });
  }
}

// Initialize the animations
new ShopifyAnimations();