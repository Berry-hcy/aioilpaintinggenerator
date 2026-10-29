import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service | Canvasly",
  description: "Read the terms for using Canvasly’s AI oil painting generator, Google sign-in, free credits, and generated artwork.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="privacy-page">
      <Link className="brand" href="/"><span className="brand-icon" aria-hidden="true">✳</span><span>canvasly</span></Link>
      <article>
        <p className="eyebrow">LAST UPDATED: OCTOBER 26, 2026</p>
        <h1>Terms of Service</h1>
        <p>These terms apply when you use Canvasly, an AI oil painting generator operated by an individual based in China (“we,” “us,” or “Canvasly”). By using the website, you agree to these terms. If you do not agree, please do not use the service.</p>

        <h2>Who can use Canvasly</h2>
        <p>You must be legally able to use this service under the laws that apply to you. If you are not old enough to agree to online services where you live, use Canvasly only with a parent or guardian’s permission and supervision.</p>

        <h2>Accounts and free credits</h2>
        <p>You need to sign in with Google to generate a painting. A new account currently receives one free generation credit. Each successful image generation uses one credit. If generation fails, the credit is normally returned automatically; if it is not, contact us and we will review the issue. Keep your sign-in account secure and tell us if you believe it has been used without your permission.</p>

        <h2>Photos you upload</h2>
        <p>You may upload a JPG, PNG, or WebP image up to 4 MB. You must have the rights and permission needed to upload the image and request its processing. Do not use Canvasly to break the law or interfere with the service.</p>
        <p>You keep whatever rights you already have in your photo. You allow Canvasly and its service providers to process it only as needed to create and return the painting you request. The photo is sent to Yir for generation; read our <Link href="/privacy">Privacy Policy</Link> for details about provider processing.</p>

        <h2>Prohibited content</h2>
        <p>You may not upload, request, or share content through Canvasly that falls into any of these six categories:</p>
        <ol className="prohibited-list">
          <li><strong>Pornography or sexually explicit content:</strong> explicit sexual acts, pornographic imagery, or nudity presented for sexual gratification.</li>
          <li><strong>Sexual content involving minors:</strong> child sexual abuse or exploitation material, grooming, or any attempt to sexualize a person under 18, whether real or AI-generated.</li>
          <li><strong>Graphic violence or gore:</strong> graphic injury, torture, or gore, or content that praises, encourages, or instructs violence or self-harm.</li>
          <li><strong>Hate or targeted abuse:</strong> hateful, dehumanizing, threatening, or harassing content directed at a person or group based on protected characteristics.</li>
          <li><strong>Non-consensual intimate or identity misuse:</strong> intimate imagery shared without consent, or a real person’s likeness used without permission to sexualize, deceive, threaten, or harass them.</li>
          <li><strong>Copyright or trademark infringement:</strong> using protected artwork, characters, logos, or other copyrighted or trademarked material without the permission required to do so.</li>
        </ol>
        <p>You must also have permission to use a person’s photo or likeness. Do not try to bypass safety checks or disguise a prohibited request.</p>

        <h2>Safety checks, reports, and enforcement</h2>
        <p>Generation requests are subject to automated safety checks provided by our image-generation service. The service may reject a request or result. Automated checks are not perfect, and Canvasly does not manually pre-approve every image. Canvasly does not host a public gallery or keep generated images for ongoing review.</p>
        <p>If you believe a request or result violates these terms, report it to <a href={`mailto:${CONTACT_EMAIL}?subject=Canvasly%20content%20report`}>{CONTACT_EMAIL}</a> with the account email (if applicable), approximate date and time, and a description of the concern. Please do not email illegal material or sensitive images. The site operator reviews reports and may limit or suspend accounts, block further generations, and take other steps required by law.</p>

        <h2>Generated paintings</h2>
        <p>AI results can vary and may not match the original photo or your expectations. We do not promise that a result will be accurate, unique, suitable for a particular purpose, or free of third-party rights concerns. You are responsible for reviewing a result and deciding how to use it. Any rights in generated results depend on applicable law and the terms of the services used to create them.</p>

        <h2>Credits, purchases, and refunds</h2>
        <p>A new account receives one free standard-definition generation credit. The Starter Pack is a one-time payment of $4.99 USD for 10 HD generation credits. The Value Pack is a one-time payment of $14.99 USD for 40 HD generation credits. There is no automatic renewal. Paid credits expire 12 months after purchase; free credits do not expire. One credit is used for each successful painting, and failed generations are normally refunded automatically. Nothing here removes any refund or consumer rights that cannot legally be waived. If you are charged but do not receive the credits or service, contact us so we can investigate.</p>

        <h2>Availability and changes</h2>
        <p>We work to keep Canvasly available, but we may pause or change features for maintenance, safety, or service-provider reasons. We may suspend access for misuse or a serious breach of these terms. We may update these terms as the service changes; the date above shows the latest revision. Continued use after an update means you accept the revised terms where applicable law permits.</p>

        <h2>Responsibility</h2>
        <p>Canvasly is provided as an online creative tool. To the extent permitted by applicable law, we are not responsible for indirect losses caused by your use of AI-generated content, temporary outages, or third-party services. These terms do not exclude responsibility or consumer rights that applicable law does not allow us to exclude.</p>

        <h2>Applicable law</h2>
        <p>These terms are interpreted under the laws that apply to the individual operator in China, without limiting mandatory consumer protections or other rights that apply where you live. If a part of these terms cannot be enforced, the remaining parts continue to apply to the extent permitted by law.</p>

        <h2>Contact</h2>
        <p>For account, credit, or terms questions, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Canvasly is operated by an individual based in China.</p>
        <Link className="back-link" href="/">← Back to the generator</Link>
      </article>
      <SiteFooter />
    </main>
  );
}
