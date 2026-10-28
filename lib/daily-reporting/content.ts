const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "hr",
  "i",
  "ins",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strike",
  "strong",
  "sub",
  "sup",
  "u",
  "ul",
]);

const VOID_TAGS = new Set(["br", "hr"]);

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function isSafeHref(value: string) {
  const href = value.trim();
  if (!href) return false;
  if (/^(https?:|mailto:|tel:)/i.test(href)) return true;
  return href.startsWith("/") && !href.startsWith("//");
}

function readAttribute(rawAttributes: string, name: string) {
  const match = rawAttributes.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")
  );
  if (!match) return "";
  return match[1] ?? match[2] ?? match[3] ?? "";
}

/**
 * Conservative allow-list sanitizer for manager-authored report HTML.
 * The editor only produces a small set of tags, so anything outside that set
 * is stripped while its text content is kept.
 */
export function sanitizeReportHtml(input: string) {
  if (!input) return "";
  let html = String(input).slice(0, 250_000);

  // Remove comments and whole dangerous blocks first.
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(
    /<(script|style|iframe|object|embed|link|meta|form|input|textarea|select|option|svg|math|template)\b[\s\S]*?<\/\1\s*>/gi,
    ""
  );
  html = html.replace(
    /<\/?(script|style|iframe|object|embed|link|meta|form|input|textarea|select|option|svg|math|template)\b[^>]*>/gi,
    ""
  );

  html = html.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s[^<>]*)?)\s*\/?>/g,
    (match, rawTag: string, rawAttributes: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";

      if (match.startsWith("</")) return `</${tag}>`;

      let attributes = "";

      if (tag === "a") {
        const href = readAttribute(rawAttributes, "href");
        if (isSafeHref(href)) {
          attributes += ` href="${escapeAttribute(href)}" rel="noopener noreferrer" target="_blank"`;
        }
      }

      // Keep text alignment from the editor toolbar; drop every other style.
      const style = readAttribute(rawAttributes, "style");
      const align = style.match(/text-align\s*:\s*(left|right|center|justify)/i);
      if (align) {
        attributes += ` style="text-align: ${align[1].toLowerCase()}"`;
      }

      if (VOID_TAGS.has(tag)) return `<${tag}${attributes} />`;
      return `<${tag}${attributes}>`;
    }
  );

  return html.trim();
}

const BLOCK_END = /<\/(p|div|li|h[1-6]|blockquote|pre|tr|ul|ol|section|article)>/gi;

export function htmlToPlainText(input: string) {
  if (!input) return "";
  const decodeCodePoint = (code: string, radix: number) => {
    const point = Number.parseInt(code, radix);
    return Number.isFinite(point) && point >= 0 && point <= 0x10ffff
      ? String.fromCodePoint(point)
      : "";
  };
  return String(input)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(BLOCK_END, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => decodeCodePoint(code, 16))
    .replace(/&#(\d+);/g, (_, code: string) => decodeCodePoint(code, 10))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function reportExcerpt(content: string, maxLength = 220) {
  const text = htmlToPlainText(content).replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export function countReportWords(content: string) {
  const text = htmlToPlainText(content);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/** YYYY-MM-DD in the viewer's local timezone, for `<input type="date">`. */
export function toDateInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse a date input into a stable midday timestamp (avoids timezone drift). */
export function parseReportDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
