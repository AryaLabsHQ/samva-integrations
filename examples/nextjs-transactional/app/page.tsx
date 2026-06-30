import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Samva + Next.js</p>
        <h1>Send transactional email from server code.</h1>
        <p className="lede">
          This example keeps the API key in a server-only module and sends through the Samva SDK
          from both a Server Action and an App Router Route Handler.
        </p>
        <div className="actions">
          <Link className="button" href="/contact">
            Open contact form
          </Link>
          <code>POST /api/send</code>
        </div>
      </section>
    </main>
  );
}
