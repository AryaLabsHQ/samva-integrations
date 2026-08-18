#!/usr/bin/env bun

type PackFile = { readonly path: string };
type PackResult = {
  readonly files?: readonly PackFile[];
  readonly name?: string;
  readonly version?: string;
};

const packageRoots = ["packages/better-auth", "packages/email-sdk"] as const;
const dependencyFields = ["dependencies", "optionalDependencies", "peerDependencies"] as const;
const repositoryOnlyRange = /^(?:catalog:|file:|link:|workspace:)/;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function auditPackage(packageRoot: (typeof packageRoots)[number]) {
  const manifestPath = `${packageRoot}/package.json`;
  const manifest = (await Bun.file(manifestPath).json()) as Record<string, unknown>;
  const packageName = manifest.name;
  assert(typeof packageName === "string", `${manifestPath} must declare a package name`);
  assert(manifest.private !== true, `${packageName} must not be private`);

  const publishConfig = manifest.publishConfig as { readonly access?: unknown } | undefined;
  assert(publishConfig?.access === "public", `${packageName} must publish with public access`);

  for (const field of dependencyFields) {
    const dependencies = manifest[field] as Record<string, unknown> | undefined;
    for (const [dependency, range] of Object.entries(dependencies ?? {})) {
      assert(
        typeof range === "string" && !repositoryOnlyRange.test(range),
        `${packageName} ${field}.${dependency} must use a public registry range`,
      );
    }
  }

  const child = Bun.spawn(["npm", "pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: packageRoot,
    stdout: "pipe",
    stderr: "inherit",
  });
  const output = await new Response(child.stdout).text();
  assert((await child.exited) === 0, `${packageName} npm pack dry-run failed`);

  const results = JSON.parse(output) as readonly PackResult[];
  const result = results[0];
  assert(result?.name === packageName, `${packageName} pack metadata has the wrong name`);
  assert(result.version === manifest.version, `${packageName} pack metadata has the wrong version`);

  const paths = (result.files ?? []).map(({ path }) => path);
  assert(paths.includes("package.json"), `${packageName} tarball is missing package.json`);
  assert(paths.includes("README.md"), `${packageName} tarball is missing README.md`);
  assert(
    paths.some((path) => path.startsWith("dist/")),
    `${packageName} tarball is missing dist`,
  );

  const unexpected = paths.filter(
    (path) => path !== "package.json" && path !== "README.md" && !path.startsWith("dist/"),
  );
  assert(unexpected.length === 0, `${packageName} tarball includes: ${unexpected.join(", ")}`);

  console.log(`audited ${packageName}@${result.version} (${paths.length} files)`);
}

await Promise.all(packageRoots.map(auditPackage));
