import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy | Canvasly",
  description: "Read how Canvasly handles account details, uploaded photos, payments, AI-generated paintings, and service data.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <Link className="brand" href="/"><span className="brand-icon" aria-hidden="true">✳</span><span>canvasly</span></Link>
      <article>
        <p className="eyebrow">LAST UPDATED: OCTOBER 26, 2026</p>
        <h1>Privacy Policy</h1>
        <p>This policy explains what Canvasly (“we”) handles when you use our AI oil painting generator. Canvasly is operated by an individual based in China. Questions or privacy requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>

        <h2>Information we handle</h2>
        <p><strong>Account information.</strong> If you sign in with Google, our authentication provider Supabase receives the sign-in information needed to create and maintain your account. Canvasly stores your account ID, email address, display name, painting-credit balance, and account timestamps in Supabase so sign-in and credits work.</p>
        <p><strong>Purchase records.</strong> If you buy credits, Waffo processes checkout and payment. Canvasly receives and stores the selected pack, amount, currency, payment/order reference, purchase time, and credit balance needed to fulfill the order and handle support or refund updates. Canvasly does not receive or store full payment-card numbers or security codes.</p>
        <p><strong>Photos and paintings.</strong> We receive the JPG, PNG, or WebP photo you choose (up to 4 MB), send it to Yir to create a painting, and return the result to your browser. Canvasly does not save these image files to a gallery or your account. Yir processes the photo and generated result to run the requested job; Yir states that results remain available for seven days. The result is held in your browser for preview and download; if you leave or refresh the page, you may need to generate it again.</p>
        <p><strong>Technical and security data.</strong> Our hosting, authentication, and request-limit services may process technical information such as browser requests, cookies used for sign-in, and network information. We use Upstash to enforce a limit of three generation attempts per IP address per ten minutes. We do not use this information to build an advertising profile.</p>

        <h2>Why we use it</h2>
        <p>We use account details to sign you in, provide and manage painting credits, prevent abuse, operate the website, and respond to support requests. We use your chosen photo only to perform the generation you request and to return the result.</p>

        <h2>Service providers</h2>
        <p>Canvasly relies on Supabase for sign-in and account data, Waffo for checkout and payment processing, Yir for image generation, Vercel for hosting, and Upstash for request limits. These providers process information to provide their services under their own terms and privacy practices. Your photo is sent to Yir for processing. Yir’s own terms and privacy practices govern its processing and retention; please review them for current details.</p>

        <h2>Storage and deletion</h2>
        <p>We do not store uploaded photos or generated paintings in Canvasly accounts. Account information, credit balances, and purchase references remain in Supabase while your account is active or as needed to handle order and legal records. To ask us to delete your Canvasly account data, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the email address connected to the account. We may retain limited records where needed to address security, legal, or service issues. Provider-side processing and retention follow each provider’s own policies.</p>

        <h2>Cookies and sign-in</h2>
        <p>Google sign-in uses authentication cookies or similar browser storage so the website can recognize your session. If you block these, sign-in and generation may not work. We do not currently run an advertising-cookie program.</p>

        <h2>Children and sensitive photos</h2>
        <p>Canvasly is not designed for children who are not legally able to use the service on their own. Please do not upload sensitive images or images you do not have permission to use. Images sent to Yir may be subject to Yir’s safety checks and retention rules.</p>

        <h2>Changes and your rights</h2>
        <p>We may update this policy when the service changes. The date above shows the latest revision. Depending on where you live, you may have privacy rights under local law. Contact us to ask about access, correction, or deletion. Nothing in this policy removes rights that cannot legally be waived.</p>

        <h2>Contact</h2>
        <p>Canvasly is operated by an individual based in China. Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
        <Link className="back-link" href="/">← Back to the generator</Link>
      </article>
      <SiteFooter />
    </main>
  );
}
