import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'ClearPR',
  description: 'Self-hosted GitHub App that strips formatting noise from diffs and reviews code with AI',
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/configuration' },
      { text: 'GitHub', link: 'https://github.com/vineethkrishnan/ClearPR' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is ClearPR?', link: '/guide/what-is-clearpr' },
            { text: 'Why ClearPR?', link: '/guide/why-clearpr' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'Setup',
          items: [
            { text: 'GitHub App Setup', link: '/guide/github-app-setup' },
            { text: 'Docker Deployment', link: '/guide/docker-deployment' },
            { text: 'LLM Providers', link: '/guide/llm-providers' },
          ],
        },
        {
          text: 'Usage',
          items: [
            { text: 'PR Commands', link: '/guide/pr-commands' },
            { text: 'Project Config', link: '/guide/project-config' },
          ],
        },
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/guide/architecture' },
            { text: 'Domain Model', link: '/guide/domain-model' },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Configuration', link: '/reference/configuration' },
            { text: 'API Endpoints', link: '/reference/api-endpoints' },
            { text: 'Webhook Events', link: '/reference/webhook-events' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vineethkrishnan/ClearPR' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright 2026 Vineeth N K',
    },

    search: {
      provider: 'local',
    },
  },
});
