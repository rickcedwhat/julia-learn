# 📖 Glossary

A quick-reference guide for terms you'll encounter throughout the bootcamp. Don't worry if these feel unfamiliar — by the end, they'll be second nature.

::: tip 💬 Have questions about a term?
Ask Antigravity to define something and it will add it to this glossary for you!
:::

---

## A

### Antigravity
The AI-powered code editor you're using for this bootcamp. Unlike traditional editors where you type every line yourself, Antigravity lets you describe what you want in plain English and collaborates with you to write the code. Think of it as having a coding partner who never sleeps. [Learn more](https://blog.google/technology/google-deepmind/introducing-antigravity/)

### API (Application Programming Interface)
A way for two pieces of software to talk to each other. When our app asks Gemini to analyze a nutrition label, it does so through an API — like placing an order at a drive-through window. You don't need to know how the kitchen works; you just need to know what to ask for. [Learn more](https://www.ibm.com/think/topics/api)

### API Key
A unique password that grants your app permission to use an API. Without it, the API won't respond to your requests. You'll get one from [Google AI Studio](https://aistudio.google.com/) — keep it secret, because anyone with your key can use your credits.

---

## C

### CLI (Command Line Interface)
A text-based way to interact with your computer by typing commands instead of clicking icons. The **Terminal** app on Mac is a CLI. It looks intimidating at first, but you'll only need a handful of commands.

### Clone
To download a copy of a project from GitHub to your own computer. When you run `git clone`, you get the full project — all the files, all the history. It's like downloading a shared Google Drive folder, but with version tracking built in.

---

## D

### Dependency
A piece of software that your project needs in order to work. For example, VitePress is a dependency of this Learning Portal. Dependencies are listed in `package.json` and installed automatically when you run `npm install`.

### Deploy
To put your app on the internet so anyone can access it. We'll use [Vercel](https://vercel.com/) to deploy in Module 5 — it takes your code and hosts it at a public URL.

---

## E

### Environment Variable
A secret value stored outside your code (usually in a `.env` file) so it doesn't get accidentally shared. Your Gemini API Key is stored this way.

---

## F

### Few-Shot Prompting
A technique where you give the AI a few examples of what you want before asking it to do something new. For example: "Here are 3 nutrition labels and their correct calorie counts. Now analyze this 4th one." This dramatically improves accuracy.

---

## G

### Gemini
Google's AI model that powers the "brain" of your app. It can understand text, images, and more. When you point a camera at a nutrition label, Gemini is what reads and analyzes it. [Learn more](https://deepmind.google/technologies/gemini/)

### Git
A tool that tracks every change you make to your code, so you can undo mistakes, compare versions, and collaborate with others. Think of it as "Track Changes" in Google Docs, but for code. [Download](https://git-scm.com/)

### GitHub
A website where developers store and share Git projects. Your instructor pushed this bootcamp project to GitHub so you could download (clone) it. [Visit GitHub](https://github.com)

---

## H

### Hallucination
When an AI confidently makes something up — like inventing calorie counts that don't exist on the label. Module 3 teaches you techniques to minimize this.

---

## I

### IDE (Integrated Development Environment)
A fancy term for a code editor with extra built-in tools like a file browser, terminal, and debugger. Antigravity is an AI-native IDE. Other popular IDEs include [VS Code](https://code.visualstudio.com/) and [Cursor](https://cursor.com/).

---

## L

### LLM (Large Language Model)
The type of AI that powers tools like Gemini and ChatGPT. It's been trained on massive amounts of text so it can understand and generate human language — including code. When you chat with the AI in Antigravity, you're talking to an LLM.

---

## N

### Node.js
The engine that runs JavaScript outside of a web browser. It's what lets you run commands like `npm run docs:dev` on your computer. [Download](https://nodejs.org/)

### npm (Node Package Manager)
A tool that comes with Node.js for installing and managing JavaScript packages (libraries of pre-written code). When you run `npm install`, it reads `package.json` and downloads everything the project needs. [Learn more](https://docs.npmjs.com/about-npm)

---

## P

### Package
A bundle of pre-written code that someone else published for you to use. VitePress, Playwright, and React are all packages. They save you from having to build everything from scratch.

### Playwright
A testing tool that automates a real web browser — it can click buttons, fill forms, and check results just like a human would, but much faster. You'll use it in Module 4 to make the app bulletproof. [Learn more](https://playwright.dev/)

### Prompt
The text instruction you send to an AI. A well-written prompt gets you accurate results; a vague prompt gets garbage. Module 3 is entirely about writing better prompts.

### PWA (Progressive Web App)
A website that can be "installed" on your phone and used like a native app — with an icon on your home screen and offline support. That's what you're building! [Learn more](https://web.dev/explore/progressive-web-apps)

---

## R

### React
A JavaScript library for building user interfaces, created by Meta (Facebook). It lets you build your app out of reusable "components" — like LEGO blocks for web pages. [Learn more](https://react.dev/)

### Repo (Repository)
A project folder tracked by Git. A "GitHub repo" is that project stored on GitHub. This bootcamp's repo is at [github.com/rickcedwhat/julia-learn](https://github.com/rickcedwhat/julia-learn).

---

## S

### Service Worker
A script that runs in the background of your web app, enabling features like offline access and push notifications. This is part of what makes a PWA feel like a real app.

### System Prompt
Hidden instructions given to an AI before the user starts chatting. It sets the AI's personality, rules, and behavior — like briefing an employee before they start their shift.

---

## T

### Terminal
A text-based interface for typing commands. In Antigravity, the terminal is built right in — press `` Ctrl + ` `` to open it. You'll use it to install tools, run the app, and interact with Git.

### TypeScript
A version of JavaScript with added safety features — it catches mistakes before you run your code, like a spell-checker for programming. Most modern React projects use TypeScript. [Learn more](https://www.typescriptlang.org/)

---

## V

### Vercel
A hosting platform that makes deploying web apps incredibly easy — connect your GitHub repo and it automatically publishes your site. You'll deploy the Nutrition Label app here in Module 5. [Visit Vercel](https://vercel.com/)

### VitePress
The tool that powers this Learning Portal. It turns Markdown files (like the ones in `/docs`) into a beautiful, searchable website. [Learn more](https://vitepress.dev/)
