import { describe, expect, it } from "vitest";
import { HOST_TOKENS } from "@/lib/design/host-page-styles";
import tokensCss from "@/lib/design/tokens.css?raw";
import handoffCss from "../../../../design_handoff_sprachweise/design/_ds/organic-e2487b87-7bbd-4040-a728-11fe5c63a175/styles.css?raw";

const DESIGN_SOURCES = import.meta.glob<string>("../../lib/design/*.{css,ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** `--name: value;` declarations of the first rule block in `css`. */
function declarations(css: string): Map<string, string> {
  const block = css.slice(css.indexOf("{") + 1, css.indexOf("}"));
  const result = new Map<string, string>();
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    result.set(match[1]!, match[2]!.replace(/\s+/g, " ").trim());
  }
  return result;
}

const tokens = declarations(tokensCss);

describe("design tokens", () => {
  it("carry every handoff token with the handoff's value (fonts excepted: they are bundled)", () => {
    const handoff = declarations(handoffCss);
    expect(handoff.size).toBeGreaterThan(40);
    for (const [name, value] of handoff) {
      if (name === "--font-heading" || name === "--font-body") continue;
      expect(tokens.get(name), name).toBe(value);
    }
  });

  it("name only bundled font families, with a system fallback", () => {
    expect(tokens.get("--font-heading")).toBe('"Sprachweise Caprasimo", system-ui, sans-serif');
    expect(tokens.get("--font-body")).toBe('"Sprachweise Figtree", system-ui, sans-serif');
  });

  it("match the values written into host pages", () => {
    for (const [name, value] of Object.entries(HOST_TOKENS)) {
      expect(tokens.get(name), name).toBe(value);
    }
  });

  it("load nothing from the network", () => {
    expect(Object.keys(DESIGN_SOURCES).length).toBeGreaterThan(5);
    for (const [file, source] of Object.entries(DESIGN_SOURCES)) {
      expect(source, file).not.toMatch(/@import|url\(\s*["']?(https?:)?\/\//);
    }
  });
});
