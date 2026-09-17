<div align="center">

<picture>
  <source media="(prefers-reduced-motion: reduce) and (prefers-color-scheme: dark)" srcset="assets/empryo-mote-dark.svg" />
  <source media="(prefers-reduced-motion: reduce)" srcset="assets/empryo-mote-light.svg" />
  <source media="(prefers-color-scheme: dark)" srcset="assets/empryo-mote-dark-normal.gif" />
  <source media="(prefers-color-scheme: light)" srcset="assets/empryo-mote-light-normal.gif" />
  <img src="assets/empryo-mote-light-normal.gif" width="150" height="150" alt="Empryo" />
</picture>

# Empryo

<sub>previously **SoulForge**</sub>

**Code in context.**

AI coding with a map of your codebase.

[Website](https://empryo.com) · [Download](https://empryo.com/download) · [Benchmarks](https://empryo.com/benchmarks) · [Changelog](https://empryo.com/changelog) · [Discussions](https://github.com/proxysoul/soulforge/discussions) · [Discord](https://discord.gg/fX4H7GYSMJ)

<img alt="Empryo in action" src="assets/intro_picture.png" width="880" />

</div>

---

**SoulForge is now Empryo.** Same symbol-level agent, rebuilt around a desktop app and a faster engine. This repository is Empryo's public home for issues and discussions.

## Install

```bash
# macOS / Linux
curl -fsSL https://empryo.com/install.sh | bash

# Windows (PowerShell)
irm https://empryo.com/install.ps1 | iex
```

Official installers and direct downloads are available only from [empryo.com/download](https://empryo.com/download). Empryo is not distributed through Homebrew, WinGet, or npm.

```bash
empryo --set-key anthropic sk-ant-...   # or run locally with Ollama — no key required
cd your-project
empryo
```

Desktop app and prebuilt binaries: [empryo.com/download](https://empryo.com/download). Runs on **macOS, Linux, and Windows**. Do not download Empryo binaries from GitHub Releases or third-party package managers.

## Why Empryo

Most coding agents search, read whole files and patch strings. They never know what depends on the code they just changed. Empryo maps that first:

- **It maps before it reads.** On launch, Empryo parses your repo into a live graph: every symbol, import and call site, ranked by how much the code leans on it and how often you change it. Those queries answer in milliseconds and cost no tokens.
- **It knows what a change will break.** Before an edit, the agent sees what imports a file and what usually changes with it. "What breaks if I touch this?" is answered before the first keystroke.
- **It edits by symbol, not by string.** 70+ symbol-level operations, batches that all land or all roll back, structural edits in 37 languages, and a typecheck before anything is kept. Whitespace cannot break an edit.
- **It treats tokens as money.** The graph does the navigating that models usually spend context on, so a task takes fewer reads, fewer steps and a smaller bill.

## What's inside

| | |
|---|---|
| **Code genome** | a live dependency graph across 37 languages, ranked by importance and by how often files change together, with millisecond search |
| **Symbol-level editing** | 70+ operations that all land or all roll back, plus structural edits in 37 languages |
| **Multi-agent** | agents explore and edit in parallel and share what they read, so cheap models scout and strong models write |
| **Task router** | ten jobs, any model in any seat, set per tab |
| **Time machine** | every prompt is a checkpoint. Rewind code and conversation together, to any turn |
| **Three surfaces** | a desktop app, a full terminal UI, and a headless CLI for scripts and CI, all on one engine |
| **LSP + MCP** | 576 language servers through Mason, any MCP server, and 13 points where your own scripts can run |
| **Free compaction** | Empryo shortens a long conversation without calling a model for it, so long sessions stay cheap |

## One agent, many brains

Empryo is not one model in a loop. It is a crew, and you assign the seats. Every job takes any model from any of the 31 providers:

<div align="center">

`brain` · `spark` <sub>scout</sub> · `ember` <sub>code</sub> · `explore` · `verify` <sub>review</sub> · `goal review` · `desloppify` · `summarize` · `compact` · `web search`

</div>

- **Per tab.** Each tab carries its own routing: a frontier model writing code in one, a fast cheap one triaging issues in the next, a local model on a private repo in a third.
- **Per config.** Set defaults globally or per project; override any slot from the tab. Cheap models scout, strong models write, reviewers judge with clean context.
- **Custom agents.** Define your own with a prompt, a model and a tool policy, then dispatch them alongside the built-ins. One run can mix providers freely.
- **It protects your prompt cache.** Sub-agents reuse the parent's cached prefix, so context you have already paid for is billed at cache rates instead of full price.
- **Costs, itemized.** Spend tracked live per model, per sub-agent, per tab, per session and per day. You always know where the tokens went.

## Benchmarks

Head to head against pi, on the same models, repositories and tasks:

| | Round 1 <sub>3 bugs × 3 models</sub> | Round 2 <sub>5 real bugs · hono / zod / ky</sub> |
|---|:---:|:---:|
| Bugs fixed | **8/9** vs 7/9 | **7/10** vs 6/10 |
| Cost | **28% lower** — $1.13 vs $1.58 | **23% lower** — $7.08 vs $9.19 |
| Time taken | **57% faster** — 4m 16s vs 10m | **32% faster** — 22m 30s vs 32m 55s |
| Efficiency | **5.7× fewer input tokens** — 1.09M vs 6.21M | **28% fewer steps** — 274 vs 382 |

Round 2 used real bugs from merged PRs (post-training-cutoff, history scrubbed, regression tests injected after each run). Full methodology and transcripts: [empryo.com/benchmarks](https://empryo.com/benchmarks) · reproduce at [proxysoul/pi-vs-empryo-bench](https://github.com/proxysoul/pi-vs-empryo-bench).

## Private by design

Empryo runs entirely on your machine. Bring your own key for Anthropic, OpenAI, Google, Groq, DeepSeek, Bedrock and 25 more, use any OpenAI-compatible endpoint, or run fully local with Ollama or LM Studio. Nothing sits in the middle, no code leaves your machine, and there is no per-seat fee. **Free to use.**

## SoulForge

SoulForge remains available to download and install, and continues to receive fixes for bugs and critical issues. New features and active development have moved to Empryo.

```bash
brew tap proxysoul/tap && brew install soulforge
# or
bun install -g @proxysoul/soulforge
```

## This repository

- **[Issues](https://github.com/proxysoul/soulforge/issues)** and **[Discussions](https://github.com/proxysoul/soulforge/discussions)** are the home for Empryo bug reports, questions and ideas.
- The SoulForge source remains archived here under its existing license (see [`LICENSE`](LICENSE)).

## Sponsors

<div align="center">

<a href="https://llmgateway.io/dashboard?ref=6tjJR2H3X4E9RmVQiQwK" title="LLM Gateway">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/llmg-white.svg" />
    <source media="(prefers-color-scheme: light)" srcset="assets/llmg-dark.svg" />
    <img alt="LLM Gateway" src="assets/llmg-dark.svg" height="52" />
  </picture>
</a>

<sub>One API, 200+ models, up to 30% off frontier. Wired in as the <code>llmgateway</code> provider.</sub>

<sub><a href="https://github.com/sponsors/proxysoul">Sponsor</a> · <a href="https://paypal.me/waeru">PayPal</a> · <a href="BACKERS.md">Featured sponsors and all backers</a></sub>

</div>
