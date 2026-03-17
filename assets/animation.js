 
import { gsap } from "@theme/gsap";
import { ScrollTrigger } from "@theme/ScrollTrigger";
import { SplitText } from "@theme/SplitText";
import { TextPlugin } from "@theme/TextPlugin";


gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin);

 

class ShopifyAnimations {
  constructor() {
    // Directly use imported module variables
    if (!gsap || !ScrollTrigger) {
      console.error("GSAP or ScrollTrigger not loaded!");
      return;
    }

    this.gsap = gsap;
    this.ScrollTrigger = ScrollTrigger;
    this.SplitText = SplitText; // optional
    this.TextPlugin = TextPlugin; // optional

    // Register plugins (if not already registered in gsap-index.js)
    this.gsap.registerPlugin(this.ScrollTrigger, this.SplitText, this.TextPlugin);

    document.addEventListener("DOMContentLoaded", () => this.init());
  }

  init() {
    this.animateScrollLazy();
    this.animateSplitTextLazy();
    this.animateTextPluginLazy();
  }

animateScrollLazy() {
  this.gsap.utils.toArray(".animate-scroll").forEach(el => {
    this.gsap.from(el, {
      y: 100,
      opacity: 0,
      duration: 1.5,
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        end: "bottom 20%",
        scrub: true,
        markers: false
      }
    });
  });
}

  animateSplitTextLazy() {
    if (!this.SplitText) return;

    document.querySelectorAll(".animate-split").forEach(el => {
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

  animateTextPluginLazy() {
    if (!this.TextPlugin) return;

    document.querySelectorAll(".animate-text").forEach(el => {
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

// Initialize
new ShopifyAnimations();