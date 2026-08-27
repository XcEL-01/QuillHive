const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote",
  "h1", "h2", "h3", "h4", "ul", "ol", "li", "a", "img", "hr",
  "span", "div", "figure", "figcaption",
]);

const ALLOWED_ATTR: Record<string, Set<string>> = {
  a: new Set(["href", "name", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  span: new Set(["class"]),
  div: new Set(["class"]),
  code: new Set(["class"]),
};

const ALLOWED_SCHEMES = new Set(["http", "https", "mailto", "data"]);

function stripDangerousAttributes(tag: string, attrs: string): string {
  const tagName = tag.toLowerCase();
  const allowed = ALLOWED_ATTR[tagName];
  if (!allowed) return `<${tag}>`;

  const attrRegex = /(\w[\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let result = `<${tag}`;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(attrs)) !== null) {
    const attrName = match[1].toLowerCase();
    const attrValue = match[2] ?? match[3] ?? match[4] ?? "";

    if (!allowed.has(attrName)) continue;

    if (attrName === "href" || attrName === "src") {
      try {
        const scheme = attrValue.split(":")[0].toLowerCase();
        if (!ALLOWED_SCHEMES.has(scheme)) continue;
      } catch {
        continue;
      }
    }

    let finalValue = attrValue;
    if (attrName === "rel") finalValue = "noopener noreferrer nofollow";
    if (attrName === "target") finalValue = "_blank";

    result += ` ${attrName}="${finalValue.replace(/"/g, "&quot;")}"`;
  }

  if (tagName === "a") {
    if (!result.includes(" rel=")) result += ` rel="noopener noreferrer nofollow"`;
    if (!result.includes(" target=")) result += ` target="_blank"`;
  }

  return result + ">";
}

export function sanitizeRichText(html: string): string {
  if (!html) return "";

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?\/?>/g, (match, tag, attrs) => {
      const tagLower = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(tagLower)) return "";
      if (match.startsWith("</")) return `</${tagLower}>`;
      if (match.endsWith("/>")) return "";
      return stripDangerousAttributes(tagLower, attrs ?? "");
    })
    .replace(/\bon\w+\s*=/gi, "data-removed=");
}

export function sanitizePlain(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}
