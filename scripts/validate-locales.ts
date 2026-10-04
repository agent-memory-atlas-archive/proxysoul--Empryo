#!/usr/bin/env bun
import { Glob } from "bun";

const DIR = process.env.LOCALES_DIR ?? "locales";
const SOURCE = `${DIR}/en.json`;
const MAX_LEN = 400;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

type Catalog = Record<string, string>;

interface Problem {
  locale: string;
  key: string;
  rule: string;
  detail: string;
}

const problems: Problem[] = [];
const note = (locale: string, key: string, rule: string, detail: string) =>
  problems.push({ locale, key, rule, detail });

const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

const BIDI = /[\u202a-\u202e\u2066-\u2069]/;

const INVISIBLE =
  /[\u00ad\u061c\u180e\u200b-\u200f\u2028\u2029\u2060-\u2064\ufe00-\ufe0f\ufeff\ufff9-\ufffb]|[\u{e0000}-\u{e007f}]|[\u{e0100}-\u{e01ef}]/u;

interface Arg {
  name: string;
  type: string | null;
  branches: string[];
}

const BRANCHING = new Set(["plural", "select", "selectordinal"]);

interface Parsed {
  args: Arg[];
  balanced: boolean;
  badQuotes: string[];
}

function parse(pattern: string): Parsed {
  const out: Parsed = { args: [], balanced: true, badQuotes: [] };
  walk(pattern, 0, pattern.length, out);
  return out;
}

function quoteEnd(src: string, i: number, to: number, out: Parsed): number {
  if (src[i] !== "'") return -1;
  const next = i + 1 < to ? src[i + 1] : undefined;
  if (next === "'") return i + 2;
  if (next !== "{" && next !== "}") return -1;
  const close = src.indexOf("'", i + 2);
  const open = close < 0 || close >= to;
  const end = open ? to : close + 1;
  const span = src.slice(i, end);
  if (open || /\{\s*[A-Za-z_][A-Za-z0-9_]*\s*[,}]/.test(span)) out.badQuotes.push(span);
  return end;
}

function walk(src: string, from: number, to: number, out: Parsed): void {
  let i = from;
  while (i < to) {
    const quoted = quoteEnd(src, i, to, out);
    if (quoted >= 0) {
      i = quoted;
      continue;
    }
    if (src[i] === "}") {
      out.balanced = false;
      i++;
      continue;
    }
    if (src[i] !== "{") {
      i++;
      continue;
    }
    const close = matching(src, i, to);
    if (close < 0) {
      out.balanced = false;
      return;
    }
    const inner = src.slice(i + 1, close);
    const name = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(,|$)/.exec(inner);
    if (!name) {
      i = close + 1;
      continue;
    }
    const arg: Arg = { name: name[1]!, type: null, branches: [] };
    out.args.push(arg);
    if (name[2] === ",") {
      const afterName = i + 1 + inner.indexOf(",") + 1;
      const type = /^\s*([A-Za-z]+)/.exec(src.slice(afterName, close));
      arg.type = type ? type[1]! : null;
      let j = afterName;
      let segment = afterName;
      while (j < close) {
        if (src[j] !== "{") {
          j++;
          continue;
        }
        const keyword = /(\S+)\s*$/.exec(src.slice(segment, j));
        if (keyword) arg.branches.push(keyword[1]!);
        const bodyEnd = matching(src, j, close);
        if (bodyEnd < 0) break;
        walk(src, j + 1, bodyEnd, out);
        j = bodyEnd + 1;
        segment = j;
      }
    }
    i = close + 1;
  }
}

function matching(src: string, open: number, to: number): number {
  let depth = 0;
  for (let i = open; i < to; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

function argTypes(args: Arg[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const a of args) if (a.type !== null && !out.has(a.name)) out.set(a.name, a.type);
  return out;
}

const lineBreaks = (s: string): number => s.split("\n").length - 1;

const src = (await Bun.file(SOURCE).json()) as Catalog;
const srcKeys = new Set(Object.keys(src));

{
  const entity = /&(?:amp|lt|gt|quot|apos|#\d+);/;
  const bad = Object.entries(src).filter(([, v]) => typeof v === "string" && entity.test(v));
  if (bad.length > 0) {
    console.log(`\n${SOURCE} carries ${bad.length} HTML entit${bad.length === 1 ? "y" : "ies"}:`);
    for (const [k, v] of bad.slice(0, 20)) console.log(`  ${k}: ${v}`);
    console.log("Re-run `bun run locales:extract` — it decodes them.");
    process.exit(1);
  }
}

{
  const dash = /[\u2013\u2014]/;
  const bad = Object.entries(src).filter(([, v]) => typeof v === "string" && dash.test(v));
  if (bad.length > 0) {
    console.log(`\n${SOURCE} carries ${bad.length} en or em dash${bad.length === 1 ? "" : "es"}:`);
    for (const [k, v] of bad.slice(0, 20)) console.log(`  ${k}: ${v}`);
    console.log("Use a colon, a comma or a full stop instead.");
    process.exit(1);
  }
}

{
  const slug = (text: string): string =>
    text
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .split("-")
      .filter(Boolean)
      .slice(0, 6)
      .join("-") || "text";
  const suffix = (key: string): string => key.slice(key.lastIndexOf(".") + 1);
  const areaOf = (key: string): string => key.slice(0, key.lastIndexOf("."));
  const misplaced = (key: string): string | null => {
    const v = src[key];
    if (typeof v !== "string" || key.startsWith("command.")) return null;
    const want = slug(v);
    if (want === suffix(key) || want === suffix(key).replace(/-\d+$/, "")) return null;
    const owner = `${areaOf(key)}.${want}`;
    return owner !== key && srcKeys.has(owner) ? owner : null;
  };
  const chained = Object.keys(src).filter((k) => {
    const owner = misplaced(k);
    return owner !== null && misplaced(owner) !== null;
  });
  if (chained.length > 0) {
    console.log(`\n${SOURCE} has ${chained.length} key(s) carrying another key's text:`);
    for (const k of chained.slice(0, 20)) console.log(`  ${k}: ${JSON.stringify(src[k])}`);
    console.log("Each value belongs to the key its own slug names — the table is shifted.");
    process.exit(1);
  }
}

const allowStale = process.argv.includes("--allow-stale");
const only = process.argv.slice(2).find((a) => !a.startsWith("--"));
const targets: string[] = [];
for await (const f of new Glob("*.json").scan(DIR)) {
  const tag = f.replace(/\.json$/, "");
  if (tag === "en" || (only && tag !== only)) continue;
  targets.push(tag);
}
targets.sort();

if (targets.length === 0) {
  console.log(`No translations yet. Source ${SOURCE} has ${srcKeys.size} keys.`);
  process.exit(0);
}

for (const tag of targets) {
  const file = Bun.file(`${DIR}/${tag}.json`);
  if (file.size > MAX_FILE_BYTES) {
    note(tag, "-", "size", `${file.size} bytes, limit is ${MAX_FILE_BYTES}`);
    continue;
  }
  let cat: Catalog;
  try {
    cat = (await file.json()) as Catalog;
  } catch (err) {
    note(tag, "-", "parse", `not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
    continue;
  }

  if (Array.isArray(cat) || typeof cat !== "object" || cat === null) {
    note(tag, "-", "shape", "top level must be a flat object of key to string");
    continue;
  }

  try {
    new Intl.PluralRules(tag);
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    note(tag, "-", "tag", `"${tag}" is not a usable BCP-47 language tag: ${why}`);
  }

  for (const [key, value] of Object.entries(cat)) {
    if (typeof value !== "string") {
      note(tag, key, "type", `value is ${typeof value}, must be a string`);
      continue;
    }
    if (!srcKeys.has(key)) {
      note(tag, key, "unknown-key", "not present in en.json — stale or invented");
      continue;
    }

    const srcBreaks = lineBreaks(src[key]!);
    const gotBreaks = lineBreaks(value);
    const stripped = srcBreaks > 0 ? value.replace(/\n/g, "") : value;
    if (CONTROL.test(stripped)) {
      note(tag, key, "control-char", "contains an escape or control character");
    }
    if (srcBreaks > 0 && gotBreaks > srcBreaks) {
      note(tag, key, "newline", `${gotBreaks} line breaks, the English has ${srcBreaks}`);
    }
    if (BIDI.test(value)) {
      note(tag, key, "bidi-override", "contains an explicit bidi override");
    }
    if (INVISIBLE.test(value)) {
      note(tag, key, "invisible", "contains zero-width or invisible formatting");
    }
    if (/^command\..*\.name$/.test(key) && !/^[\p{L}\p{M}\p{N}_-]{1,32}$/u.test(value)) {
      note(tag, key, "command-name", "must be one word (letters, digits, - _), no slash");
    }
    const limit = Math.max(MAX_LEN, 2 * [...src[key]!].length);
    const length = [...value].length;
    if (length > limit) {
      note(tag, key, "length", `${length} chars, limit is ${limit}`);
    }

    const source = parse(src[key]!);
    const parsed = parse(value);
    if (!parsed.balanced) {
      note(tag, key, "braces", "unbalanced { }");
    }
    for (const span of parsed.badQuotes) {
      if (source.badQuotes.includes(span)) continue;
      note(
        tag,
        key,
        "quote",
        `${JSON.stringify(span)} is ICU quoting and renders as literal text; write \u2019 or '' for an apostrophe`,
      );
    }

    const want = new Set(source.args.map((a) => a.name));
    const got = new Set(parsed.args.map((a) => a.name));
    for (const p of want) if (!got.has(p)) note(tag, key, "placeholder", `missing {${p}}`);
    for (const p of got) if (!want.has(p)) note(tag, key, "placeholder", `unexpected {${p}}`);

    const gotTypes = argTypes(parsed.args);
    for (const [p, type] of argTypes(source.args)) {
      if (got.has(p) && gotTypes.get(p) !== type) {
        note(tag, key, "arg-type", `{${p}} lost its ${type} form`);
      }
    }
    for (const a of parsed.args) {
      if (a.type !== null && BRANCHING.has(a.type) && !a.branches.includes("other")) {
        note(tag, key, "other-branch", `{${a.name}, ${a.type}} is missing its \`other\` branch`);
      }
    }
  }

  const have = Object.keys(cat).filter((k) => srcKeys.has(k)).length;
  const exact = (have / srcKeys.size) * 100;
  const pct = have > 0 ? Math.max(1, Math.floor(exact)) : 0;
  const mine = problems.filter((p) => p.locale === tag);
  const bad = (allowStale ? mine.filter((p) => p.rule !== "unknown-key") : mine).length;
  const stale = mine.length - bad;
  const status = bad === 0 ? "ok  " : "FAIL";
  const count =
    (bad ? `  ${bad} problem${bad === 1 ? "" : "s"}` : "") +
    (stale ? `  ${stale} stale` : "");
  console.log(
    `${status}  ${tag.padEnd(8)} ${String(pct).padStart(3)}% translated  (${have}/${srcKeys.size})${count}`,
  );
}

const fatal = allowStale ? problems.filter((p) => p.rule !== "unknown-key") : problems;
if (fatal.length > 0) {
  console.log("");
  for (const p of fatal) {
    console.log(`  ${p.locale}  ${p.rule.padEnd(14)} ${p.key}\n      ${p.detail}`);
  }
}
if (fatal.length > 0) {
  console.log(`\n${fatal.length} problem${fatal.length === 1 ? "" : "s"}. Not safe to merge.`);
  process.exit(1);
}
if (problems.length > fatal.length) {
  console.log(`\n${problems.length - fatal.length} stale key(s) ignored (--allow-stale).`);
}
