"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

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

export default function DemoCarousel() {
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    const cards = gallery.querySelectorAll<HTMLElement>("[data-scroll-reveal]");
    gallery.classList.add("has-scroll-reveal");
    if (!("IntersectionObserver" in window)) {
      cards.forEach((card) => card.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const scrollElement = gallery;

    function mapWheelToHorizontal(event: WheelEvent) {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const maxScroll = scrollElement.scrollWidth - scrollElement.clientWidth;
      const canMoveLeft = event.deltaY < 0 && scrollElement.scrollLeft > 0;
      const canMoveRight = event.deltaY > 0 && scrollElement.scrollLeft < maxScroll - 1;
      if (canMoveLeft || canMoveRight) {
        event.preventDefault();
        scrollElement.scrollLeft += event.deltaY;
      }
    }

    scrollElement.addEventListener("wheel", mapWheelToHorizontal, { passive: false });
    return () => scrollElement.removeEventListener("wheel", mapWheelToHorizontal);
  }, []);

  function moveGallery(direction: -1 | 1) {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const card = gallery.querySelector<HTMLElement>(".demo-card");
    const step = (card?.getBoundingClientRect().width ?? gallery.clientWidth * 0.82) + 18;
    gallery.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  return (
    <>
      <div className="demo-carousel-controls">
        <p>Scroll to explore · swipe on mobile · stop anywhere to pause</p>
        <div className="demo-carousel-arrows" role="group" aria-label="Example controls">
          <button type="button" onClick={() => moveGallery(-1)} aria-label="Previous examples">←</button>
          <button type="button" onClick={() => moveGallery(1)} aria-label="Next examples">→</button>
        </div>
      </div>
      <div
        className="demo-marquee"
        role="region"
        aria-label="Ten photo-to-oil-painting examples"
        tabIndex={0}
        ref={galleryRef}
      >
        <div className="demo-track">
          {examples.map((example) => (
            <figure className="demo-card" key={example.src} data-scroll-reveal>
              <div className="demo-card-image">
                <Image src={example.src} alt={example.alt} fill sizes="(max-width: 700px) 78vw, 380px" />
                <div className="example-labels"><span>Photo</span><span>Oil painting</span></div>
              </div>
              <figcaption><strong>{example.title}</strong><span>{example.category}</span></figcaption>
            </figure>
          ))}
        </div>
      </div>
    </>
  );
}
