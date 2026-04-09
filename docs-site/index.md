---
layout: home

hero:
  name: ClearPR
  text: Strip the noise. Review what matters.
  tagline: Your PR has 50 real changes buried under 20,000 lines of Prettier formatting. ClearPR fixes that.
  image:
    src: /images/review-summary.png
    alt: ClearPR Review Summary
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Why ClearPR?
      link: /guide/why-clearpr
    - theme: alt
      text: GitHub
      link: https://github.com/vineethkrishnan/ClearPR

features:
  - icon: "\U0001F333"
    title: Semantic Diff Engine
    details: Parses code into ASTs with tree-sitter. Strips Prettier noise, trailing commas, quote changes, import reordering. Only behavioral changes survive.
  - icon: "\U0001F916"
    title: 5 LLM Providers
    details: Anthropic Claude, OpenAI GPT, Google Gemini, Mistral, or Ollama (local). Switch with one env var. Your prompts, your model, your choice.
  - icon: "\U0001F4DA"
    title: Past PR Memory
    details: Indexes review history with pgvector embeddings. Catches repeat mistakes by surfacing relevant past feedback automatically.
  - icon: "\U0001F512"
    title: Self-Hosted & Private
    details: Your code never leaves your infrastructure. No telemetry, no SaaS lock-in. Deploy with Docker Compose in 5 minutes.
  - icon: "\U0001F4B0"
    title: 90% Token Savings
    details: Filters 20K lines of formatting noise down to 47 real changes before sending to the LLM. Dramatically lower API costs.
  - icon: "\U0001F4CB"
    title: Your Team's Rules
    details: Reads claude.md, agent.md, or .reviewconfig from your repo. Reviews against your coding standards, not generic advice.
---

<div style="text-align: center; margin: 2rem 0;">
  <img src="/images/diff-comparison.png" alt="ClearPR strips formatting noise from diffs" style="max-width: 100%; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);" />
  <p style="color: #888; margin-top: 0.5rem;">20,847 raw lines → 47 semantic lines (99.8% noise filtered)</p>
</div>
