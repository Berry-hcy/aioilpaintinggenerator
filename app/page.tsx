"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import AccountLink from "@/app/components/AccountLink";
import SiteFooter from "@/app/components/SiteFooter";
import CreditPacks from "@/app/components/CreditPacks";
import BeforeAfterSlider from "@/app/components/BeforeAfterSlider";
import DemoCarousel from "@/app/components/DemoCarousel";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function prepareReferencePhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 511 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this photo. Please try another image.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Your browser could not prepare this photo. Please try again.")), "image/jpeg", 0.9);
    });
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function chooseFile(candidate?: File) {
    setError("");
    setResult("");
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setFile(null);
      setPreview("");
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null);
      setPreview("");
      setError("This image is over 4 MB. Please choose a smaller one.");
      return;
    }
    setFile(candidate);
    setPreview(URL.createObjectURL(candidate));
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  async function makePainting() {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setResult("");
    try {
      const form = new FormData();
      form.append("image", await prepareReferencePhoto(file));
      const response = await fetch("/api/generate", { method: "POST", body: form });
      const data = (await response.json()) as { image?: string; error?: string };
      if (!response.ok || !data.image) {
        if (response.status === 401) throw new Error("Please sign in with Google to use your free painting credit.");
        throw new Error(data.error || "We could not make your painting. Please try again.");
      }
      setResult(data.image);
      window.dispatchEvent(new Event("credits-updated"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview("");
    setResult("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Canvasly home">
          <span className="brand-icon" aria-hidden="true">✳</span>
          <span>canvasly</span>
        </Link>
        <nav className="header-nav" aria-label="Main navigation">
          <a className="header-link" href="#examples">Examples <span aria-hidden="true">↗</span></a>
          <a className="header-link" href="#pricing">Pricing <span aria-hidden="true">↗</span></a>
          <a className="header-link" href="#how-it-works">How it works <span aria-hidden="true">↗</span></a>
        </nav>
        <AccountLink />
      </header>

      <section className="hero hero-split">
        <div className="hero-copy-block">
          <div className="eyebrow"><span /> YOUR PHOTO, REIMAGINED</div>
          <h1>AI Oil Painting<br /><em>Generator</em></h1>
          <p className="hero-copy">Turn a photo into an oil painting with AI. Move the slider to see a sample transformation. Get one free credit after Google sign-in.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#workspace">Create your painting <span aria-hidden="true">↘</span></a>
            <a className="hero-example-link" href="#examples">Explore more examples</a>
          </div>
        </div>
        <div className="hero-demo">
          <div className="hero-demo-heading"><span>SLIDE TO COMPARE</span><span>DEMO</span></div>
          <BeforeAfterSlider />
          <p className="hero-demo-caption">An illustrative sample. Your result may look different.</p>
        </div>
      </section>

      <section className="workspace" id="workspace" aria-label="Oil painting generator">
        <div className="work-topline"><span>YOUR CANVAS</span><span className="secure"><span aria-hidden="true">✦</span> Private by design</span></div>
        <div className="canvas-grid">
          <div className="canvas-column">
            <div className="canvas-label"><span>01</span> ORIGINAL PHOTO</div>
            <button
              className={`upload-zone ${dragging ? "dragging" : ""} ${preview ? "has-image" : ""}`}
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              aria-label="Choose a photo to turn into an oil painting"
            >
              {preview ? <Image src={preview} alt="Your selected original photo" fill unoptimized sizes="(max-width: 700px) 90vw, 45vw" /> : (
                <span className="upload-prompt">
                  <span className="upload-icon" aria-hidden="true">↑</span>
                  <strong>Drop your photo here</strong>
                  <span>or <u>browse files</u></span>
                  <small>JPG, PNG or WebP · up to 4 MB</small>
                </span>
              )}
            </button>
          </div>
          <div className="transform-arrow" aria-hidden="true"><span>→</span></div>
          <div className="canvas-column">
            <div className="canvas-label"><span>02</span> YOUR OIL PAINTING</div>
            <div className={`result-zone ${result ? "has-result" : ""}`}>
              {result ? <Image src={result} alt="AI-generated oil painting based on your photo" fill unoptimized sizes="(max-width: 700px) 90vw, 45vw" /> : busy ? (
                <div className="loading-state"><span className="loader" /><strong>Painting your moment</strong><small>This can take a little while</small></div>
              ) : (
                <div className="empty-result"><span className="sunmark" aria-hidden="true">✳</span><span>Your painting will appear here</span></div>
              )}
            </div>
          </div>
        </div>
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} />
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="action-row">
          {result ? (
            <>
              <a className="button button-primary" href={result} download="my-oil-painting.png">Download painting <span aria-hidden="true">↓</span></a>
              <button className="button button-secondary" type="button" onClick={reset}>Try another photo</button>
            </>
          ) : (
            <button className="button button-primary generate-button" type="button" disabled={!file || busy} onClick={makePainting}>
              {busy ? <><span className="button-spinner" /> Creating your painting…</> : <>Create my oil painting <span aria-hidden="true">✳</span></>}
            </button>
          )}
        </div>
        <p className="privacy-note">By creating a painting, your photo is sent to our image service for processing. We don’t save it to a gallery. <Link href="/privacy">Learn about privacy</Link>.</p>
      </section>

      <section className="examples-section" id="examples" aria-labelledby="examples-heading">
        <div className="section-heading">
          <span>FROM EVERYDAY PHOTOS TO PAINTERLY MOMENTS</span>
          <h2 id="examples-heading">Ten scenes, one painterly twist.</h2>
          <p className="examples-intro">Pets, portraits, flowers and places—scroll through the photo-to-painting examples.</p>
        </div>
        <DemoCarousel />
        <p className="examples-disclaimer">These are illustrative AI-created examples, not customer photos. Your result may look different.</p>
        <a className="examples-cta" href="#workspace">Try it with your own photo <span aria-hidden="true">↗</span></a>
      </section>

      <section className="pricing-section" id="pricing" aria-labelledby="pricing-heading">
        <p className="eyebrow">PRICING AND CREDITS</p>
        <h2 id="pricing-heading">Start with one free painting.</h2>
        <p className="pricing-intro">Sign in with Google to get one free credit. Choose a one-time credit pack when you want to create more.</p>
        <CreditPacks />
      </section>

      <section id="how-it-works" className="how-section">
        <div className="section-heading"><span>THE SIMPLE WAY TO MAKE SOMETHING BEAUTIFUL</span><h2>Three steps. A whole new feeling.</h2></div>
        <div className="steps">
          <article className="step"><div className="step-number">01</div><div className="step-symbol">▧</div><h3>Choose a photo</h3><p>Upload a JPG, PNG, or WebP image up to 4 MB. Portraits, pets, and landscapes are welcome.</p></article>
          <article className="step"><div className="step-number">02</div><div className="step-symbol">✳</div><h3>Make an oil painting</h3><p>AI uses your photo as a reference and adds painterly brush texture while aiming to keep the main subject and composition.</p></article>
          <article className="step"><div className="step-number">03</div><div className="step-symbol">↓</div><h3>Preview and download</h3><p>Review your result, download the PNG, or try another photo to create a different painting.</p></article>
        </div>
      </section>

      <section className="photo-guide" aria-labelledby="photo-guide-heading">
        <div className="section-heading"><span>PHOTO TO OIL PAINTING ONLINE</span><h2 id="photo-guide-heading">A few tips for your first painting</h2></div>
        <p className="photo-guide-intro">Canvasly is an AI oil painting generator that edits an uploaded photo, so you can start with a moment you already love instead of writing a text prompt from scratch. The result is a new interpretation; details and colors can change, so preview it before downloading.</p>
        <div className="photo-guide-tips">
          <article><h3>Choose a clear subject</h3><p>A well-lit portrait, pet, or landscape gives the image model a clear starting point.</p></article>
          <article><h3>Keep the photo simple</h3><p>Photos where the main subject is easy to see are a good place to begin, especially for a first try.</p></article>
          <article><h3>Check the result</h3><p>AI paintings can vary. Review the image and make sure it looks right before saving or sharing it.</p></article>
        </div>
      </section>

      <section className="faq-section">
        <div className="section-heading"><span>A FEW THINGS TO KNOW</span><h2>Good to know</h2></div>
        <div className="faq-list">
          <details><summary>How much does it cost?</summary><p>New accounts get one free standard-definition painting. The Starter Pack is $4.99 for 10 HD credits, and the Value Pack is $14.99 for 40 HD credits. Paid credits are one-time purchases and expire 12 months after purchase. Failed generations are normally refunded.</p></details>
          <details><summary>What photos can I upload?</summary><p>Use a JPG, PNG, or WebP file up to 4 MB. Please only upload photos you have permission to use.</p></details>
          <details><summary>Do I need an account?</summary><p>Yes. Sign in with Google to use your free painting credit and see how many credits remain.</p></details>
          <details><summary>What happens to my photo?</summary><p>Your photo is sent to our image service so it can create the painting. This website does not save uploads to a gallery. See our <a href="/privacy">Privacy Notice</a> for more details.</p></details>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
