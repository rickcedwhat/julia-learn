# 📅 Module 2: The Engine ([Antigravity](/glossary#antigravity) & [Gemini](/glossary#gemini))

*Concepts: [IDEs](/glossary#ide-integrated-development-environment), [API Keys](/glossary#api-key), and Environment Setup.*

## Objective
Get your tools talking to each other.

## Task 1: Follow the Setup Guide
Follow the [Setup Guide](/setup-guide) to connect Antigravity to the Gemini API.

## Task 2: Running Scripts in the Terminal

Up until now, you may have been viewing this Learning Portal on your instructor's computer. Let's get your **own** version running!

Every project has a file called [`package.json`](/glossary#package) that lists commands (called "scripts") you can run. Open the **terminal inside Antigravity** (press `` Ctrl + ` ``) and try these:

### See what scripts are available
```bash
npm run
```

This shows you all the commands the project knows about. You should see `docs:dev`, `docs:build`, and `docs:preview`.

### Start the Learning Portal on your own machine
```bash
npm run docs:dev
```

After a moment, you'll see a link like `http://localhost:5173/`. Open it in your browser — **you're now running this site yourself!** 🎉

Any changes you make to the files in the `docs/` folder will instantly show up in your browser.

::: tip
Press `Ctrl + C` in the Antigravity terminal to stop the server when you're done.
:::

<details>
<summary>💡 What is npm? What are scripts?</summary>

**[npm](/glossary#npm-node-package-manager)** stands for "Node Package Manager." It's the tool that installs and runs JavaScript projects.

**Scripts** are shortcuts defined in `package.json`. Instead of typing long commands, you type short ones like `npm run docs:dev`. Think of them like keyboard shortcuts, but for the terminal.

Here's what each docs script does:

| Script | What it does |
|--------|-------------|
| `npm run docs:dev` | Starts a live preview of the Learning Portal |
| `npm run docs:build` | Creates the final version of the site for publishing |
| `npm run docs:preview` | Previews the built site before publishing |

</details>

## Lesson
Learn where the "brain" of your app lives and how to securely give it power.

---
*See the [Glossary](/glossary) for unfamiliar terms.*
