import Link from "next/link";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const hasError = params.error === "google" || params.error === "callback";
  const needsSetup = params.error === "setup";

  return (
    <main className="auth-page">
      <Link className="brand" href="/">
        <span className="brand-icon" aria-hidden="true">✳</span>
        <span>canvasly</span>
      </Link>
      <section className="auth-card">
        <div className="eyebrow"><span /> YOUR PHOTO, REIMAGINED</div>
        <h1>Sign in to start creating</h1>
        <p>New accounts get one oil painting credit to try the generator.</p>
        {hasError && <p className="error-message" role="alert">We couldn’t sign you in with Google. Please try again.</p>}
        {needsSetup && <p className="error-message" role="alert">Google sign-in is not connected yet. The site owner needs to finish the setup steps.</p>}
        <a className="button button-primary google-button" href="/auth/login?next=%2Faccount">
          <span className="google-mark" aria-hidden="true">G</span>
          Continue with Google
        </a>
        <p className="auth-note">By continuing, you agree to use only photos you have permission to upload.</p>
        <Link className="back-link" href="/">Back to the generator</Link>
      </section>
    </main>
  );
}
