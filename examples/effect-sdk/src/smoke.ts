import { readSamvaConfig } from "./config";
import { renderMessageHtml } from "./html";

const escaped = renderMessageHtml(`Hello <Ada> & "team"`);
if (escaped !== "<p>Hello &lt;Ada&gt; &amp; &quot;team&quot;</p>") {
  throw new Error(`HTML escaping smoke failed: ${escaped}`);
}

try {
  readSamvaConfig({});
  throw new Error("Missing SAMVA_API_KEY smoke failed.");
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes("SAMVA_API_KEY is not set")) {
    throw error;
  }
}

console.log("Effect SDK example smoke checks passed.");
