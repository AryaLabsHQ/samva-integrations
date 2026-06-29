const htmlEscapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => htmlEscapeMap[character] ?? character);
}

export function renderMessageHtml(message: string): string {
  const lines = escapeHtml(message).split(/\r?\n/).join("<br>");
  return `<p>${lines}</p>`;
}
