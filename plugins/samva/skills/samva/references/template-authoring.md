# Template Authoring

Use this reference when the task is to produce or improve **Samva Markup
Language (SML)** for email templates. This is about template authoring quality,
not API integration.

- [First move](#first-move)
- [Revision-safe authoring loop](#revision-safe-authoring-loop)
- [Production email translation rules](#production-email-translation-rules)
- [Common recipes](#common-recipes)
- [Visual QA](#visual-qa)
- [Failure patterns](#failure-patterns)
- [Validation commands](#validation-commands)

SML is JSX-strict markup compiled to email-safe HTML. The quality bar is:

- valid Samva compile
- visually faithful light render
- visually faithful dark render when the reference has a dark variant
- editor-friendly primitives and classes
- no raw HTML tags
- reusable `{{placeholders}}` for recipient-specific content
- repair compiler diagnostics before claiming completion

## First move

1. Identify the source of truth: current editor source, raw HTML, screenshot,
   product copy, or a production email reference.
2. Fetch the compact SML contract when available:
   `samva://reference/sml-agent-contract`.
3. Fetch the full language reference only when needed:
   `samva://reference/sml`.
4. Start from an existing template id. Create the template with the CLI, SDK,
   REST API, or dashboard if needed because hosted MCP does not create or find templates.
5. Read the current source and revision before editing. Do not edit blind.
6. After every mutation, re-read before planning another change.

## Revision-safe authoring loop

Open the durable document with `templates_open_document` and its `templateId`.

Then use this loop:

1. Call `templates_read_model` to get `source`, `revision`, compile diagnostics, and stable
   semantic node ids. Use `templates_read_source` when a node index is unnecessary.
2. Prefer `templates_apply_ops` for semantic changes. Pass `expectedRevision` from the latest
   read and up to 32 operations in one batch. Every id in that batch comes from the same read.
3. After a successful mutation, call `read_model` or `read_source` again. The revision changed, node
   ids may have changed, and nodes created in one batch cannot be targeted until the re-read.
4. Repair returned compile diagnostics. Use `templates_write_source` only for a deliberate
   whole-source replacement or one ranged splice, then re-read immediately.
5. Run `templates_check_document`. Require `compile.ok`, repair blocking diagnostics, and
   review compatibility and dark-mode warnings.
6. Run `templates_render_document` with representative variables and inspect the result.
7. Call `templates_send_test_email` only when a real test delivery is requested. Pass one
   recipient and representative `variables`.
8. Call `templates_save_document` with the latest revision only after an explicit save
   request. Draft edits remain durable in the document but are not delivery versions until saved.
9. Publish only after an explicit request with `templates_publish_document`. List, unpublish,
   and restore saved versions through the corresponding document tools.

If `apply_ops` rejects `expectedRevision`, do not replay the stale batch. Re-read, rebuild the
operations against the current model, and submit once with the new revision.

Diagnostics can include `repair` metadata:

- `replace-class`: use one of the suggested classes
- `remove-class`: delete unsupported email CSS
- `use-primitive`: replace CSS layout with SML structure
- `rewrite-node`: change the markup structure

Prefer `apply_ops` with semantic ids for structural edits. Use a ranged `write_source` edit at the
diagnostic `span` for a small textual repair, or a full source replacement for a deliberate rewrite.

## Production Email Translation Rules

- Use email primitives for layout: `Email`, `Preview`, `Container`, `Section`,
  `Row`, `Column`, `Text`, `Heading`, `Button`, `Image`, `Divider`, `Spacer`,
  `Footer`, `If`, and `Else`.
- Do not use raw HTML tags such as `table`, `tr`, `td`, `div`, `span`, `a`, or
  `img`.
- Do not use flexbox or grid classes. Translate those patterns into
  `Row`/`Column`, `Section`, and `Spacer`.
- Keep dense operational emails dense. Do not turn product notices, receipts,
  and security emails into marketing landing pages.
- Prefer semantic tokens and supported utility classes over arbitrary styling.
  Arbitrary pixel text and radius values are allowed only where the compiler
  supports them.
- Pair dark foreground, background, and border classes. A light card with only
  dark text changes is usually wrong.
- Make placeholders explicit: `{{firstName}}`, `{{workspaceName}}`,
  `{{invoiceTotal}}`, `{{ctaUrl}}`.
- Use `<If test="...">...<Else>...</Else></If>` for conditional content.
  Interpolation cannot branch.

## Common Recipes

Security or account notice:

```sml
<Email>
  <Preview>Important account update</Preview>
  <Container class="bg-white dark:bg-black text-gray-900 dark:text-gray-50">
    <Section>
      <Heading>Important security update</Heading>
      <Text>Hello {{firstName}},</Text>
      <Text>Explain the issue directly and name the required action.</Text>
      <Button href="{{actionUrl}}">Review settings</Button>
    </Section>
    <Footer>
      <Text class="text-xs text-gray-500 dark:text-gray-400">
        You received this because you use {{productName}}.
      </Text>
    </Footer>
  </Container>
</Email>
```

Digest or changelog:

```sml
<Email>
  <Preview>{{productName}} updates for {{period}}</Preview>
  <Container>
    <Section>
      <Row>
        <Column><Heading>{{productName}} Digest</Heading></Column>
        <Column align="right"><Text>{{period}}</Text></Column>
      </Row>
    </Section>
    <Section class="bg-gray-50 dark:bg-gray-900 rounded-lg">
      <Heading as="h2">Changelog</Heading>
      <Text class="font-semibold">{{featureTitle}}</Text>
      <Text>{{featureSummary}}</Text>
      <Divider />
      <Text class="font-semibold">{{secondFeatureTitle}}</Text>
      <Text>{{secondFeatureSummary}}</Text>
    </Section>
  </Container>
</Email>
```

Receipt or invoice:

```sml
<Email>
  <Preview>Receipt for {{orderNumber}}</Preview>
  <Container>
    <Section>
      <Heading>Receipt</Heading>
      <Text>Thanks for your purchase, {{firstName}}.</Text>
    </Section>
    <Section>
      <Row>
        <Column><Text>{{lineItemName}}</Text></Column>
        <Column align="right"><Text>{{lineItemPrice}}</Text></Column>
      </Row>
      <Divider />
      <Row>
        <Column><Text class="font-semibold">Total</Text></Column>
        <Column align="right"><Text class="font-semibold">{{total}}</Text></Column>
      </Row>
    </Section>
  </Container>
</Email>
```

## Visual QA

Before saving or calling the template done:

- Re-read the current source and revision after the last mutation.
- Run `templates_check_document`.
- Confirm `compile.ok` is true.
- Review `checks.compatibility` for client-compatibility findings.
- Render the document and inspect output.
- Compare light and dark variants when dark classes or a dark source reference
  exist.
- Check placeholder coverage and missing variables.
- Send a real test only when requested, then save or publish only when requested.

If the light render is good but the dark render is wrong, first fix container
backgrounds and body text colors, then cards, dividers, links, and button
contrast.

## Failure Patterns

- Unsupported HTML layout: replace with primitives.
- Unsupported Tailwind variant: use `sm:` or remove the variant.
- CSS variables or functions: replace with semantic token classes or literal
  supported values.
- Over-broad restyling: preserve the original email's information density.
- Dark render inversion: set paired `dark:bg-*`, `dark:text-*`, and
  `dark:border-*` classes.
- Missing placeholders: convert real recipient/account values into named
  placeholders.

## Validation Commands

In the Samva repo, prefer focused checks:

```bash
bun --filter @samva/markup build
bun --filter @samva/api typecheck
bun --filter @samva/web typecheck
bun --filter @samva/vite test
```

For local template projects using the Vite plugin, inspect the preview payload
under `/api/templates` and `/api/document?id=...` by default. If the plugin has
`route: "/__samva"`, use `/__samva/api/templates` and
`/__samva/api/document?id=...` instead.
