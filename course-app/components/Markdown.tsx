import React from "react";

// Tiny in-house markdown renderer for this course's controlled content.
// Supports: ##/### headings, paragraphs, ```code fences```, inline `code`,
// **bold**, bullet lists.
export function Markdown({ source }: { source: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = source.split("\n");
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { buf.push(lines[i]); i++; }
      i++;
      blocks.push(
        <pre key={key++}><code data-lang={lang}>{buf.join("\n")}</code></pre>
      );
      continue;
    }

    if (line.startsWith("### ")) { blocks.push(<h3 key={key++}>{line.slice(4)}</h3>); i++; continue; }
    if (line.startsWith("## "))  { blocks.push(<h2 key={key++}>{line.slice(3)}</h2>); i++; continue; }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) { items.push(lines[i].slice(2)); i++; }
      blocks.push(<ul key={key++}>{items.map((t, k) => <li key={k}>{inline(t)}</li>)}</ul>);
      continue;
    }

    if (line.trim() === "") { i++; continue; }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("```") && !lines[i].startsWith("- ") && !lines[i].startsWith("#")) {
      para.push(lines[i]); i++;
    }
    blocks.push(<p key={key++}>{inline(para.join(" "))}</p>);
  }

  return <div className="prose-k8s">{blocks}</div>;
}

function inline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={k++}>{tok.slice(2, -2)}</strong>);
    else parts.push(<code key={k++}>{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
