<svelte:head>
  <title>SvelteKit + Samva</title>
</svelte:head>

<main class="shell">
  <section class="panel">
    <p class="eyebrow">SvelteKit transactional email</p>
    <h1>Send email with Samva</h1>
    <p>
      This example includes a SvelteKit form action and a JSON
      <code>POST /api/send</code> endpoint. Both call
      <code>samva.messages.send</code> from server-only code.
    </p>
    <a href="/contact">Open the contact form</a>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f6f6f3;
    color: #171717;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .shell {
    display: grid;
    min-height: 100vh;
    place-items: center;
    padding: 2rem;
  }

  .panel {
    width: min(100%, 40rem);
    border: 1px solid #dedbd2;
    border-radius: 8px;
    background: #fff;
    padding: 2rem;
    box-shadow: 0 10px 30px rgb(0 0 0 / 8%);
  }

  .eyebrow {
    margin: 0 0 0.75rem;
    color: #785f2f;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1 {
    margin: 0 0 1rem;
    font-size: 2.3rem;
    line-height: 1.05;
  }

  p {
    line-height: 1.65;
  }

  a {
    color: #1155cc;
    font-weight: 700;
  }

  code {
    border-radius: 4px;
    background: #f0eee8;
    padding: 0.08rem 0.28rem;
  }
</style>
