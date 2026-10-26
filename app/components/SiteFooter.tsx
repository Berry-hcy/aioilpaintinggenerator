import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link className="brand footer-brand" href="/">
        <span className="brand-icon" aria-hidden="true">✳</span><span>canvasly</span>
      </Link>
      <span>Make a little art from a moment.</span>
      <nav aria-label="Legal and contact links">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
      </nav>
    </footer>
  );
}
