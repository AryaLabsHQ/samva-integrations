export interface SignatureScheme {
  parseHeader(value: string): { signature: string };
  signedMaterial(rawBody: string): string;
  algorithm: "HMAC";
  hash: "SHA-256";
  encoding: "hex";
}

export const samvaScheme: SignatureScheme = {
  algorithm: "HMAC",
  hash: "SHA-256",
  encoding: "hex",
  parseHeader(value: string): { signature: string } {
    const trimmed = value.trim();
    const signature = trimmed.startsWith("sha256=") ? trimmed.slice(7) : trimmed;
    return { signature };
  },
  signedMaterial(rawBody: string): string {
    return rawBody;
  },
};
