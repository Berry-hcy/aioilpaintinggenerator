"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import AccountLink from "@/app/components/AccountLink";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
      form.append("image", file);
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
        <a className="header-link" href="#how-it-works">How it works <span aria-hidden="true">↗</span></a>
        <AccountLink />
      </header>

      <section className="hero">
        <div className="eyebrow"><span /> YOUR PHOTO, REIMAGINED</div>
        <h1>Turn a photo into<br /><em>an oil painting</em></h1>
        <p className="hero-copy">Bring a painterly touch to a moment you love.<br className="desktop-break" /> Upload a photo and let AI create your oil painting.</p>
      </section>

      <section className="workspace" aria-label="Oil painting generator">
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
              <a className="button button-primary" href={result} download="my-oil-painting.jpg">Download painting <span aria-hidden="true">↓</span></a>
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

      <section id="how-it-works" className="how-section">
        <div className="section-heading"><span>THE SIMPLE WAY TO MAKE SOMETHING BEAUTIFUL</span><h2>Three steps. A whole new feeling.</h2></div>
        <div className="steps">
          <article className="step"><div className="step-number">01</div><div className="step-symbol">▧</div><h3>Choose a photo</h3><p>Pick a favorite moment from your device. Portraits, pets, and places all work.</p></article>
          <article className="step"><div className="step-number">02</div><div className="step-symbol">✳</div><h3>Let AI paint</h3><p>Our image tool reimagines your photo with the texture and warmth of oil paint.</p></article>
          <article className="step"><div className="step-number">03</div><div className="step-symbol">↓</div><h3>Take it with you</h3><p>Preview your new painting and download it to keep.</p></article>
        </div>
      </section>

      <section className="faq-section">
        <div className="section-heading"><span>A FEW THINGS TO KNOW</span><h2>Good to know</h2></div>
        <div className="faq-list">
          <details><summary>Do I get a free painting?</summary><p>Yes. Sign in with Google and your new account gets one painting credit to try the generator. Each successful painting uses one credit.</p></details>
          <details><summary>What photos can I upload?</summary><p>Use a JPG, PNG, or WebP file up to 4 MB. Please only upload photos you have permission to use.</p></details>
          <details><summary>Do I need an account?</summary><p>Yes. Sign in with Google to use your free painting credit and see how many credits remain.</p></details>
          <details><summary>What happens to my photo?</summary><p>Your photo is sent to our image service so it can create the painting. This website does not save uploads to a gallery. See our <a href="/privacy">Privacy Notice</a> for more details.</p></details>
        </div>
      </section>

      <footer className="site-footer"><Link className="brand footer-brand" href="/"><span className="brand-icon" aria-hidden="true">✳</span><span>canvasly</span></Link><span>Make a little art from a moment.</span><Link href="/privacy">Privacy</Link></footer>
    </main>
  );
}
