"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const examples = [
  { src: "/demo-dog.jpg", alt: "Golden retriever photo and oil-painting version", title: "A sunny garden companion", category: "Pets" },
  { src: "/demo-landscape.jpg", alt: "Mountain lake photo and oil-painting version", title: "Golden hour by the lake", category: "Landscapes" },
  { src: "/demo-cat.jpg", alt: "Orange cat photo and oil-painting version", title: "A quiet window nap", category: "Pets" },
  { src: "/demo-autumn.jpg", alt: "Autumn portrait photo and oil-painting version", title: "An autumn afternoon", category: "Portraits" },
  { src: "/demo-lighthouse.jpg", alt: "Coastal lighthouse photo and oil-painting version", title: "Light on the coast", category: "Seascapes" },
  { src: "/demo-flowers.jpg", alt: "Poppy and daisy bouquet photo and oil-painting version", title: "Flowers in morning light", category: "Still life" },
  { src: "/demo-bicycle.jpg", alt: "Vintage bicycle photo and oil-painting version", title: "A ride through the village", category: "Everyday moments" },
  { src: "/demo-sailboat.jpg", alt: "Mediterranean sailboat photo and oil-painting version", title: "A quiet blue bay", category: "Travel" },
  { src: "/demo-fox.jpg", alt: "Red fox in snow photo and oil-painting version", title: "A winter visitor", category: "Wildlife" },
  { src: "/demo-cafe.jpg", alt: "Old European café street photo and oil-painting version", title: "The café at golden hour", category: "Travel" },
];

function DemoSet({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div className="demo-set" aria-hidden={duplicate || undefined}>
      {examples.map((example) => (
        <figure className="demo-card" key={`${duplicate ? "copy-" : ""}${example.src}`}>
          <div className="demo-card-image">
            <Image src={example.src} alt={example.alt} fill sizes="(max-width: 700px) 78vw, 380px" />
            <div className="example-labels"><span>Photo</span><span>Oil painting</span></div>
          </div>
          <figcaption><strong>{example.title}</strong><span>{example.category}</span></figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function DemoCarousel() {
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  const isPaused = paused || reduceMotion;

  return (
    <>
      <div className="demo-carousel-controls">
        <p>{reduceMotion ? "Swipe or scroll to browse" : "Auto-scrolling examples · hover to pause"}</p>
        {!reduceMotion && (
          <button type="button" className="demo-pause-button" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>
            <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
            {paused ? "Play examples" : "Pause scroll"}
          </button>
        )}
      </div>
      <div className={`demo-marquee${isPaused ? " is-paused" : ""}`} role="region" aria-label="Ten photo-to-oil-painting examples">
        <div className="demo-track">
          <DemoSet />
          <DemoSet duplicate />
        </div>
      </div>
    </>
  );
}
