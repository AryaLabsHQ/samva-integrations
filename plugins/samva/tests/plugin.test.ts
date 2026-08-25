import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateAgentPlugin } from "../../../scripts/validate-agent-plugin.mts";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const temporaryRoots: Array<string> = [];

const fixture = async (): Promise<string> => {
  const root = await mkdtemp(resolve(tmpdir(), "samva-agent-plugin-"));
  temporaryRoots.push(root);
  await cp(resolve(repositoryRoot, "plugins"), resolve(root, "plugins"), { recursive: true });
  await cp(resolve(repositoryRoot, ".cursor-plugin"), resolve(root, ".cursor-plugin"), {
    recursive: true,
  });
  return root;
};

const editJson = async (
  root: string,
  path: string,
  edit: (value: Record<string, any>) => void,
): Promise<void> => {
  const absolutePath = resolve(root, path);
  const value = JSON.parse(await readFile(absolutePath, "utf8")) as Record<string, any>;
  edit(value);
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
};

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Samva agent plugin contract", () => {
  it("accepts the canonical distributable bundle", async () => {
    await expect(validateAgentPlugin(repositoryRoot)).resolves.toEqual([]);
  });

  it("rejects a non-canonical endpoint", async () => {
    const root = await fixture();
    await editJson(root, "plugins/samva/mcp.json", (value) => {
      value.mcpServers.samva.url = "https://example.com/mcp";
    });
    expect(await validateAgentPlugin(root)).toContain(
      "Cursor MCP config must use the canonical HTTP endpoint https://mcp.samva.dev",
    );
  });

  it("rejects repository naming in the branded Cursor marketplace identity", async () => {
    const root = await fixture();
    await editJson(root, ".cursor-plugin/marketplace.json", (value) => {
      value.name = "samva-integrations";
    });
    expect(await validateAgentPlugin(root)).toContain("Cursor marketplace name must be samva");
  });

  it("rejects credentials in MCP configuration", async () => {
    const root = await fixture();
    await editJson(root, "plugins/samva/.mcp.json", (value) => {
      value.mcpServers.samva.headers = { Authorization: "Bearer secret" };
    });
    expect(await validateAgentPlugin(root)).toContain(
      "Codex MCP config contains unsupported or credential-bearing keys: headers",
    );
  });

  it("reports malformed primary JSON as a contract diagnostic", async () => {
    const root = await fixture();
    await writeFile(resolve(root, "plugins/samva/.mcp.json"), "{ not-json\n");
    const errors = await validateAgentPlugin(root);
    expect(errors.some((error) => error.startsWith("Cannot read Codex MCP config:"))).toBe(true);
    expect(errors).toContain("Codex MCP config must define exactly one MCP server named samva");
  });

  it("reports a missing primary artifact as a contract diagnostic", async () => {
    const root = await fixture();
    await rm(resolve(root, "plugins/samva/provenance.json"));
    const errors = await validateAgentPlugin(root);
    expect(errors.some((error) => error.startsWith("Cannot read provenance:"))).toBe(true);
    expect(errors).toContain("Provenance skill version must match SKILL.md");
  });

  it("reports an enumerated file that disappears before reading", async () => {
    const root = await fixture();
    await symlink("missing-doc-source.md", resolve(root, "plugins/samva/docs/disappeared.md"));
    const errors = await validateAgentPlugin(root);
    expect(errors.some((error) => error.startsWith("Cannot read docs/disappeared.md:"))).toBe(true);
  });

  it("rejects a missing canonical reference", async () => {
    const root = await fixture();
    await rm(resolve(root, "plugins/samva/skills/samva/references/auth.md"));
    expect(await validateAgentPlugin(root)).toContain("Missing canonical skill reference: auth.md");
  });

  it("rejects a path that escapes the plugin root", async () => {
    const root = await fixture();
    await editJson(root, "plugins/samva/.cursor-plugin/plugin.json", (value) => {
      value.skills = "./../skills";
    });
    expect(await validateAgentPlugin(root)).toContain(
      "Cursor manifest skills escapes the plugin root",
    );
  });

  it("rejects changed skill content with stale provenance", async () => {
    const root = await fixture();
    const path = resolve(root, "plugins/samva/skills/samva/references/sdk.md");
    await writeFile(path, `${await readFile(path, "utf8")}\nChanged.\n`);
    expect(await validateAgentPlugin(root)).toContain(
      "Skill bundle digest does not match provenance",
    );
  });

  it("rejects tools that are unavailable in the canonical MCP surface", async () => {
    const root = await fixture();
    const path = resolve(root, "plugins/samva/skills/samva/references/mcp.md");
    const reference = await readFile(path, "utf8");
    await writeFile(
      path,
      reference.replace(
        "`messages_list_email_events`",
        "`messages_list_email_events`, `messages_list_inbound_email`",
      ),
    );
    expect(await validateAgentPlugin(root)).toContain(
      "MCP inventory includes unavailable messages_list_inbound_email",
    );
  });

  it("allows unavailable tool names in explanatory prose outside the inventory", async () => {
    const root = await fixture();
    const path = resolve(root, "plugins/samva/skills/samva/references/mcp.md");
    await writeFile(path, `${await readFile(path, "utf8")}\nmessages_list_inbound_email\n`);
    expect(await validateAgentPlugin(root)).not.toContain(
      "MCP inventory includes unavailable messages_list_inbound_email",
    );
  });

  it("rejects required tools missing from the inventory even when prose mentions them", async () => {
    const root = await fixture();
    const path = resolve(root, "plugins/samva/skills/samva/references/mcp.md");
    const reference = await readFile(path, "utf8");
    await writeFile(path, reference.replace("`messages_send_email`, ", ""));
    expect(await validateAgentPlugin(root)).toContain(
      "MCP inventory is missing messages_send_email",
    );
  });

  it("rejects unsupported product claims", async () => {
    const root = await fixture();
    const path = resolve(root, "plugins/samva/docs/unsupported.md");
    await writeFile(path, "This plugin supports SMS.\n");
    const errors = await validateAgentPlugin(root);
    expect(errors).toContain("Unsupported product claim in docs/unsupported.md");
  });
});
