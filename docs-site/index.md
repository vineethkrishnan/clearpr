---
layout: home

hero:
  name: ClearPR
  text: Strip the noise. Review what matters.
  tagline: Self-hosted GitHub App that filters formatting noise from diffs and reviews code with AI using your project's own guidelines.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/vineethkrishnan/ClearPR

features:
  - icon: "\U0001F333"
    title: Semantic Diff Engine
    details: Uses tree-sitter AST parsing to strip Prettier noise, trailing commas, quote changes, and import reordering. Only behavioral changes survive.
  - icon: "\U0001F916"
    title: Multi-Provider AI Review
    details: Review code with Anthropic Claude, OpenAI GPT, Ollama, Mistral, or Google Gemini. Pluggable — switch providers with one env var.
  - icon: "\U0001F4DA"
    title: Past PR Memory
    details: Indexes your team's review history with vector embeddings. Catches repeat mistakes by surfacing relevant past feedback.
  - icon: "\U0001F512"
    title: Self-Hosted & Private
    details: Your code never leaves your infrastructure. No telemetry, no SaaS dependency. Deploy with Docker Compose in minutes.
---
