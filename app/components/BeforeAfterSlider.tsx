"use client";

import Image from "next/image";
import { CSSProperties, useState } from "react";

export default function BeforeAfterSlider() {
  const [split, setSplit] = useState(50);

  return (
    <div
      className="before-after-slider"
      style={{ "--split": `${split}%` } as CSSProperties}
    >
      <Image
        className="comparison-image comparison-after"
        src="/demo-portrait.jpg"
        alt="Oil painting version of the sample portrait"
        width={1400}
        height={933}
        priority
        sizes="(max-width: 700px) 90vw, 44vw"
      />
      <div className="comparison-before" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        <Image
          className="comparison-image comparison-original"
          src="/demo-portrait.jpg"
          alt="Original photo version of the sample portrait"
          width={1400}
          height={933}
          priority
          sizes="(max-width: 700px) 90vw, 44vw"
        />
      </div>
      <div className="comparison-labels" aria-hidden="true">
        <span>Original photo</span>
        <span>Oil painting</span>
      </div>
      <div className="comparison-divider" style={{ left: `var(--split)` }} aria-hidden="true">
        <span>↔</span>
      </div>
      <input
        className="comparison-control"
        type="range"
        min="0"
        max="100"
        value={split}
        onChange={(event) => setSplit(Number(event.currentTarget.value))}
        aria-label="Drag to compare the original photo with its oil painting"
        aria-valuetext={`${split}% original photo`}
      />
    </div>
  );
}
