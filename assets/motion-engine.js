// assets/motion-engine.js

import { getLenis } from "@theme/utilities";

let initialized=false;
let gsap=null;
let ScrollTrigger=null;
let SplitText=null;
let TextPlugin=null;
let observer=null;
let lenisSynced=false;

const active=new Set();
const queue=new Map();
const completed=new Set();

const config={
    maxActive:25,
    maxZoom:12,
    maxPerSection:8,
    threshold:0.15,
    rootMargin:"50px",
    defaults:{duration:1.2,ease:"power3.out"},
};

export async function initMotionEngine(scope=document){
    if(initialized&&scope===document){
        refresh(scope);
        return;
    }

    if(!gsap){
        const[
            gsapModule,
            scrollModule,
            splitModule,
            textModule
        ]=await Promise.all([
            import("@theme/gsap"),
            import("@theme/ScrollTrigger"),
            import("@theme/SplitText"),
            import("@theme/TextPlugin")
        ]);

        gsap=gsapModule.default||gsapModule.gsap||gsapModule;

        ScrollTrigger=
            scrollModule.default?.ScrollTrigger||
            scrollModule.ScrollTrigger||
            scrollModule.default||
            scrollModule;

        const SplitRaw=
            splitModule.default?.SplitText||
            splitModule.SplitText||
            splitModule.default||
            splitModule;

        SplitText=
            typeof SplitRaw==="function"
                ?SplitRaw
                :SplitRaw?.SplitText;

        TextPlugin=
            textModule.default?.TextPlugin||
            textModule.TextPlugin||
            textModule.default||
            textModule;

        gsap.registerPlugin(
            ...[
                ScrollTrigger,
                SplitText,
                TextPlugin
            ].filter(Boolean)
        );

        syncLenis();
    }

    if(!observer){
        observer=new IntersectionObserver(handleIntersections,{
            threshold:config.threshold,
            rootMargin:config.rootMargin,
        });
    }

    refresh(scope);

    initialized=true;
}

function syncLenis(){
    if(lenisSynced)return;

    const lenis=getLenis();

    if(!lenis||!ScrollTrigger||!gsap)return;

    lenisSynced=true;

    lenis.on("scroll",ScrollTrigger.update);

    gsap.ticker.add((time)=>lenis.raf(time*1000));

    gsap.ticker.lagSmoothing(0);

    requestAnimationFrame(()=>ScrollTrigger?.refresh?.());
}

export function refresh(scope=document){
    scope.querySelectorAll("motion-component").forEach(register);
}

export function register(element){
    if(!element)return;
    if(completed.has(element))return;
    if(queue.has(element))return;

    queue.set(element,{
        type:element.dataset.motion||"fade-up",
        delay:parseInt(element.dataset.motionDelay||0,10)/1000,
        duration:parseFloat(element.dataset.motionDuration||config.defaults.duration),
        ease:element.dataset.motionEase||config.defaults.ease,
    });

    observer?.observe(element);
}

export function unregister(element){
    observer?.unobserve(element);
    queue.delete(element);
    active.delete(element);
}

function handleIntersections(entries){
    for(const entry of entries){
        if(!entry.isIntersecting)continue;

        const element=entry.target;
        const data=queue.get(element);

        if(!data)continue;
        if(!canRun(element,data.type))continue;

        run(element,data);
    }
}

function canRun(element,type){
    if(active.size>=config.maxActive)return false;

    if(type.includes("zoom")){
        const zoomCount=[...active].filter((el)=>
            queue.get(el)?.type?.includes("zoom")
        ).length;

        if(zoomCount>=config.maxZoom)return false;
    }

    const section=element.closest("section,[class*='section']");

    if(section){
        const sectionCount=[...active].filter((el)=>
            section.contains(el)
        ).length;

        if(sectionCount>=config.maxPerSection)return false;
    }

    return true;
}

async function run(element,data){
    active.add(element);

    observer?.unobserve(element);

    try{
        await animate(element,data);

        element.setAttribute("data-motion-initialized","true");

    }catch(error){

        console.error("[MotionEngine]",error);

    }finally{

        active.delete(element);
        queue.delete(element);
        completed.add(element);
    }
}

function animate(element,{type,delay,duration,ease}){

    const base={delay,duration,ease,overwrite:"auto",force3D:true};

    switch(type){

        case "fade-up":
            gsap.set(element,{opacity:0,y:40,willChange:"transform,opacity"});

            return gsap.to(element,{
                opacity:1,
                y:0,
                clearProps:"willChange",
                ...base,
            });

        case "fade-in":
            gsap.set(element,{opacity:0,willChange:"opacity"});

            return gsap.to(element,{
                opacity:1,
                clearProps:"willChange",
                ...base,
            });

        case "slide-left":
            gsap.set(element,{opacity:0,x:-60,willChange:"transform,opacity"});

            return gsap.to(element,{
                opacity:1,
                x:0,
                clearProps:"willChange",
                ...base,
            });

        case "slide-right":
            gsap.set(element,{opacity:0,x:60,willChange:"transform,opacity"});

            return gsap.to(element,{
                opacity:1,
                x:0,
                clearProps:"willChange",
                ...base,
            });

        case "zoom-in":
            gsap.set(element,{opacity:0,scale:0.85,willChange:"transform,opacity"});

            return gsap.to(element,{
                opacity:1,
                scale:1,
                clearProps:"willChange",
                ...base,
            });

        case "zoom-out":
            gsap.set(element,{opacity:0,scale:1.15,willChange:"transform,opacity"});

            return gsap.to(element,{
                opacity:1,
                scale:1,
                clearProps:"willChange",
                ...base,
            });

        case "split-text":
            if(!SplitText)return;

            const split=new SplitText(element,{type:"chars,words"});

            gsap.set(split.chars,{opacity:0,y:20});

            return gsap.to(split.chars,{
                opacity:1,
                y:0,
                stagger:0.03,
                clearProps:"willChange",
                ...base,
            });

        case "text":
            if(!TextPlugin)return;

            return gsap.to(element,{
                duration,
                text:element.dataset.text||element.textContent,
                ease:"none",
                delay,
            });

        default:
            return gsap.to(element,{opacity:1,...base});
    }
}

export function replay(element){
    if(!element)return;

    completed.delete(element);

    register(element);
}

export function clearCompleted(element){
    completed.delete(element);
}

export function getMotionStats(){
    return{
        initialized,
        queued:queue.size,
        active:active.size,
        completed:completed.size,
        observer:observer?"initialized":"not initialized",
        config,
    };
}

export function destroyMotionEngine(){
    observer?.disconnect();
    observer=null;
    active.clear();
    queue.clear();
    completed.clear();
    initialized=false;
}

if(typeof window!=="undefined"){
    window.__THEME__=window.__THEME__||{};

    window.__THEME__.motionEngine={
        init:initMotionEngine,
        refresh,
        replay,
        destroy:destroyMotionEngine,
        stats:getMotionStats,
    };
}