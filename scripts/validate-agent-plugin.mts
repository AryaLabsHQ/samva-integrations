import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const canonicalEndpoint = "https://mcp.samva.dev";
const expectedReferences = [
  "auth.md",
  "cli.md",
  "executor.md",
  "mcp.md",
  "sdk.md",
  "template-authoring.md",
] as const;

type JsonObject = Record<string, unknown>;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const parseJson = async (
  errors: Array<string>,
  path: string,
  label: string,
): Promise<JsonObject> => {
  try {
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!isObject(value)) {
      errors.push(`${label} must contain a JSON object`);
      return {};
    }
    return value;
  } catch (error) {
    errors.push(`Cannot read ${label}: ${errorMessage(error)}`);
    return {};
  }
};

const readText = async (errors: Array<string>, path: string, label: string): Promise<string> => {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    errors.push(`Cannot read ${label}: ${errorMessage(error)}`);
    return "";
  }
};

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const filesBelow = async (root: string): Promise<Array<string>> => {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(root, entry.name);
      return entry.isDirectory() ? filesBelow(path) : [path];
    }),
  );
  return files.flat().sort();
};

const bundleDigest = async (pluginRoot: string): Promise<string> => {
  const skillRoot = resolve(pluginRoot, "skills/samva");
  const files = await filesBelow(skillRoot);
  const inventory = await Promise.all(
    files.map(async (path) => {
      const digest = createHash("sha256")
        .update(await readFile(path))
        .digest("hex");
      return `${digest}  ${relative(pluginRoot, path).split(sep).join("/")}\n`;
    }),
  );
  return `sha256:${createHash("sha256").update(inventory.join("")).digest("hex")}`;
};

const referencedPath = async (
  errors: Array<string>,
  pluginRoot: string,
  label: string,
  value: unknown,
): Promise<void> => {
  if (typeof value !== "string" || !value.startsWith("./")) {
    errors.push(`${label} must be a ./-relative path`);
    return;
  }
  const path = resolve(pluginRoot, value);
  const prefix = `${resolve(pluginRoot)}${sep}`;
  if (!path.startsWith(prefix)) {
    errors.push(`${label} escapes the plugin root`);
  } else if (!(await exists(path))) {
    errors.push(`${label} does not exist: ${value}`);
  }
};

const validateMcp = (errors: Array<string>, label: string, config: JsonObject): void => {
  const servers = config.mcpServers;
  if (!isObject(servers) || Object.keys(servers).length !== 1 || !isObject(servers.samva)) {
    errors.push(`${label} must define exactly one MCP server named samva`);
    return;
  }
  const server = servers.samva;
  if (server.type !== "http" || server.url !== canonicalEndpoint) {
    errors.push(`${label} must use the canonical HTTP endpoint ${canonicalEndpoint}`);
  }
  const extraKeys = Object.keys(server).filter((key) => key !== "type" && key !== "url");
  if (extraKeys.length > 0) {
    errors.push(
      `${label} contains unsupported or credential-bearing keys: ${extraKeys.join(", ")}`,
    );
  }
};

export const validateAgentPlugin = async (repositoryRoot: string): Promise<Array<string>> => {
  const errors: Array<string> = [];
  const pluginRoot = resolve(repositoryRoot, "plugins/samva");
  const [codexManifest, cursorManifest, marketplace, codexMcp, cursorMcp, provenance] =
    await Promise.all([
      parseJson(errors, resolve(pluginRoot, ".codex-plugin/plugin.json"), "Codex manifest"),
      parseJson(errors, resolve(pluginRoot, ".cursor-plugin/plugin.json"), "Cursor manifest"),
      parseJson(
        errors,
        resolve(repositoryRoot, ".cursor-plugin/marketplace.json"),
        "Cursor marketplace",
      ),
      parseJson(errors, resolve(pluginRoot, ".mcp.json"), "Codex MCP config"),
      parseJson(errors, resolve(pluginRoot, "mcp.json"), "Cursor MCP config"),
      parseJson(errors, resolve(pluginRoot, "provenance.json"), "provenance"),
    ]);

  const manifests = [
    ["Codex manifest", codexManifest],
    ["Cursor manifest", cursorManifest],
  ] as const;
  for (const [label, manifest] of manifests) {
    if (manifest.name !== "samva") errors.push(`${label} name must be samva`);
    if (manifest.version !== "0.2.1") errors.push(`${label} version must be 0.2.1`);
  }
  await Promise.all([
    ...manifests.flatMap(([label, manifest]) => [
      referencedPath(errors, pluginRoot, `${label} skills`, manifest.skills),
      referencedPath(errors, pluginRoot, `${label} MCP config`, manifest.mcpServers),
    ]),
    referencedPath(errors, pluginRoot, "Codex logo", (codexManifest.interface as JsonObject)?.logo),
    referencedPath(
      errors,
      pluginRoot,
      "Codex composer icon",
      (codexManifest.interface as JsonObject)?.composerIcon,
    ),
    referencedPath(errors, pluginRoot, "Cursor logo", cursorManifest.logo),
  ]);

  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length !== 1) {
    errors.push("Cursor marketplace must contain exactly one plugin");
  } else {
    const entry = marketplace.plugins[0];
    if (!isObject(entry) || entry.name !== "samva" || entry.source !== "plugins/samva") {
      errors.push("Cursor marketplace must point samva to plugins/samva");
    }
  }

  validateMcp(errors, "Codex MCP config", codexMcp);
  validateMcp(errors, "Cursor MCP config", cursorMcp);

  const skillRoot = resolve(pluginRoot, "skills/samva");
  const skill = await readText(errors, resolve(skillRoot, "SKILL.md"), "SKILL.md");
  const version = skill.match(/metadata:\s*\n\s*version:\s*([^\s]+)/)?.[1];
  const provenanceSkill = provenance.skill;
  if (!isObject(provenanceSkill) || provenanceSkill.version !== version) {
    errors.push("Provenance skill version must match SKILL.md");
  }
  const linkedReferences = [...skill.matchAll(/\(references\/([^)]+\.md)\)/g)].map(
    (match) => match[1],
  );
  await Promise.all(
    expectedReferences.map(async (reference) => {
      if (!linkedReferences.includes(reference)) errors.push(`SKILL.md does not link ${reference}`);
      if (!(await exists(resolve(skillRoot, "references", reference)))) {
        errors.push(`Missing canonical skill reference: ${reference}`);
      }
    }),
  );
  let referenceFiles: Array<string> = [];
  try {
    referenceFiles = await readdir(resolve(skillRoot, "references"));
  } catch (error) {
    errors.push(`Cannot read skill references: ${errorMessage(error)}`);
  }
  const unexpectedReferences = referenceFiles.filter(
    (name) => name.endsWith(".md") && !expectedReferences.includes(name as never),
  );
  if (unexpectedReferences.length > 0) {
    errors.push(`Unexpected skill references: ${unexpectedReferences.join(", ")}`);
  }

  const bundle = isObject(provenanceSkill) ? provenanceSkill.bundle : undefined;
  const archive = isObject(provenanceSkill) ? provenanceSkill.archive : undefined;
  if (!isObject(bundle) || bundle.algorithm !== "sha256-file-list-v1") {
    errors.push("Provenance must declare sha256-file-list-v1 for the local bundle");
  } else {
    try {
      if (bundle.digest !== (await bundleDigest(pluginRoot))) {
        errors.push("Skill bundle digest does not match provenance");
      }
    } catch (error) {
      errors.push(`Cannot calculate skill bundle digest: ${errorMessage(error)}`);
    }
  }
  if (
    !isObject(archive) ||
    archive.url !== "https://samva.dev/.well-known/agent-skills/samva.tar.gz" ||
    typeof archive.digest !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(archive.digest)
  ) {
    errors.push("Provenance must identify the canonical public archive and SHA-256 digest");
  }
  const source = provenance.source;
  if (
    !isObject(source) ||
    source.repository !== "https://github.com/AryaLabsHQ/samva" ||
    typeof source.commit !== "string" ||
    !/^[a-f0-9]{40}$/.test(source.commit) ||
    source.path !== "apps/web/content/agent-skills/samva"
  ) {
    errors.push("Provenance must identify the canonical source repository, SHA, and path");
  }

  let distributableFiles: Array<string> = [];
  try {
    distributableFiles = (await filesBelow(pluginRoot)).filter((path) =>
      /\.(?:json|md)$/i.test(path),
    );
  } catch (error) {
    errors.push(`Cannot enumerate plugin files: ${errorMessage(error)}`);
  }
  await Promise.all(
    distributableFiles.map(async (path) => {
      const text = await readFile(path, "utf8");
      if (/samva_sk_(?:live|test)_[A-Za-z0-9]{20,}/.test(text)) {
        errors.push(`Embedded Samva API key in ${relative(pluginRoot, path)}`);
      }
      if (/\b(?:challenge|portal)[_-]?(?:token|id)\s*[:=]\s*["']?[A-Za-z0-9_-]{12,}/i.test(text)) {
        errors.push(`Embedded portal or challenge credential in ${relative(pluginRoot, path)}`);
      }
      if (
        /\b(?:supports?|includes?|provides?)\s+(?:sms|whatsapp|code mode|openapi search)/i.test(
          text,
        )
      ) {
        errors.push(`Unsupported product claim in ${relative(pluginRoot, path)}`);
      }
      if (
        /\b(?:submitted|approved|listed)\s+(?:to|in|on)\s+(?:the\s+)?(?:openai|cursor|claude)\b/i.test(
          text,
        )
      ) {
        errors.push(`Unsupported submission claim in ${relative(pluginRoot, path)}`);
      }
    }),
  );

  const mcpReference = await readText(
    errors,
    resolve(skillRoot, "references/mcp.md"),
    "MCP reference",
  );
  for (const required of [
    "messages_send_email",
    "email_domains_remove",
    "templates_publish_document",
    "scheduled_messages_cancel",
    "campaigns_control_run",
    "samva://reference/sml-agent-contract",
    "idempotentHint: false",
  ]) {
    if (!mcpReference.includes(required)) errors.push(`MCP inventory is missing ${required}`);
  }

  const reviewRequirements = new Map([
    [
      "review/openai.md",
      [
        "70-tool annotation inventory",
        "messages_send_email",
        "webhooks_retry_delivery",
        "Reviewer account",
        "Domain challenge",
        "Submission preparation",
      ],
    ],
    [
      "review/claude.md",
      [
        "70 uniquely named tools",
        "5 resources",
        "permissionPromptMatched",
        "not-run",
        "Data and permission boundaries",
        "External gate",
      ],
    ],
    [
      "review/cursor.md",
      [
        "~/.cursor/plugins/local/<plugin-name>/",
        "cp -R plugins/samva",
        "submission form",
        "external approval gates",
      ],
    ],
    [
      "review/test-cases.md",
      ["Automated package contract", "Positive prompts", "Negative prompts", "Expected outcome"],
    ],
  ]);
  await Promise.all(
    [...reviewRequirements].map(async ([path, requirements]) => {
      const text = await readText(errors, resolve(pluginRoot, path), path);
      for (const requirement of requirements) {
        if (!text.includes(requirement)) errors.push(`${path} is missing ${requirement}`);
      }
    }),
  );

  return errors;
};

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const repositoryRoot = resolve(dirname(scriptPath), "..");
  const errors = await validateAgentPlugin(repositoryRoot);
  if (errors.length > 0) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Samva agent plugin contract is valid.");
  }
}
