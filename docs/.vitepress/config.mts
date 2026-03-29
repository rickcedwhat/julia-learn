import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Nutrition Label: AI Engineer Bootcamp',
  description: 'A learning portal for building a Nutrition Label PWA with AI',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Curriculum', link: '/curriculum' },
      { text: 'Setup Guide', link: '/setup-guide' },
      { text: 'Glossary', link: '/glossary' },
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Home', link: '/' },
          { text: 'App Spec', link: '/app-spec' },
          { text: 'Full Curriculum', link: '/curriculum' },
          { text: 'Setup Guide', link: '/setup-guide' },
          { text: 'Glossary', link: '/glossary' },
        ],
      },
      {
        text: 'Modules',
        items: [
          { text: 'Module 1 – The Architect', link: '/module-1' },
          { text: 'Module 2 – The Engine', link: '/module-2' },
          { text: 'Module 3 – The Ghostwriter', link: '/module-3' },
          { text: 'Module 4 – The Safety Net', link: '/module-4' },
          { text: 'Module 5 – The Launch', link: '/module-5' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/rickcedwhat/julia-learn' },
    ],
  },

  vite: {
    server: {
      host: '0.0.0.0',
    },
  },
})
