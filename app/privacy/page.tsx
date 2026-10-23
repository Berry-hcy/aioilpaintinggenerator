import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Notice | Canvasly",
  description: "Learn how Canvasly processes photos submitted to its AI oil painting generator.",
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <Link className="brand" href="/"><span className="brand-icon" aria-hidden="true">✳</span><span>canvasly</span></Link>
      <article>
        <p className="eyebrow">A CLEAR NOTE ABOUT YOUR PHOTO</p>
        <h1>Privacy Notice</h1>
        <p>When you use Canvasly, the photo you choose is sent to our image service to create an oil painting. Please only upload images you have permission to use and are comfortable sending to a third-party service.</p>
        <h2>What this website keeps</h2>
        <p>Canvasly does not create a public gallery or save your original photo or generated painting to an account. The image is held temporarily while your request is processed and returned to your browser. We do not ask you to create an account.</p>
        <h2>Image service</h2>
        <p>The image service processes the photo to produce the requested result. Its own handling and retention rules may apply. Please review the service provider’s current privacy and API data-use terms before uploading a sensitive photo.</p>
        <h2>Request limits</h2>
        <p>To prevent misuse, the service may temporarily use your network address to limit repeated requests. This limit information is not shown publicly.</p>
        <h2>Questions</h2>
        <p>This practice project does not yet provide a contact form. Do not upload private or sensitive images if you need to discuss data removal or handling with the site owner.</p>
        <Link className="back-link" href="/">← Back to the generator</Link>
      </article>
    </main>
  );
}
