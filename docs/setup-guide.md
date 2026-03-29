# 🛠️ Setup Guide: Powering Up Your Environment

Before we write a single line of code, we need to set up your "Command Center."

::: tip 📖 New to a term?
Check the [Glossary](/glossary) any time you see an unfamiliar word.
:::

---

## 0. Download Antigravity

[Antigravity](/glossary#antigravity) is your **AI-powered code editor** — it's where you'll write code, run commands, and chat with AI. Everything happens inside this one app.

1. Go to the Antigravity download page and grab the **Windows** installer.
2. Install it like any other app (double-click the installer, follow the prompts).
3. Open Antigravity once it's installed.

You'll see three main areas:
- **The Chat** (left side) — Where you describe features in plain English and the AI helps you build them.
- **The Code** (center) — Where files are displayed and edited.
- **The Terminal** (bottom panel) — Where you type commands to run things. **We'll use this terminal for all commands going forward.**

::: tip
To open the terminal inside Antigravity, press `` Ctrl + ` `` (that's the backtick key, above Tab on your keyboard).
:::

<details>
<summary>💡 How is this different from VS Code?</summary>

VS Code is a traditional code editor — you type everything yourself and use extensions for extra features. Antigravity has AI built in as a first-class citizen. You describe what you want in plain English, and the AI helps write, debug, and test the code alongside you.

</details>

---

## 1. Install Git & Node.js

Before we can download the project, we need two tools:

### Install Git
[Git](/glossary#git) is the tool that tracks changes to your code and lets you download projects from [GitHub](/glossary#github).

1. Go to [git-scm.com/downloads/win](https://git-scm.com/downloads/win)
2. Download the installer and run it
3. Click **Next** through all the options — the defaults are fine

### Install Node.js
[Node.js](/glossary#nodejs) lets you run JavaScript tools like the Learning Portal.

1. Go to [nodejs.org](https://nodejs.org/)
2. Download the **LTS** version (the big green button)
3. Run the installer and click **Next** through the prompts

<details>
<summary>💡 How do I know these installed correctly?</summary>

After installing, close and reopen Antigravity, then type these in the terminal (one at a time):

```bash
git --version
node --version
npm --version
```

Each should print a version number (like `git version 2.43.0`). If you see an error instead, try restarting your computer and running the commands again.

</details>

---

## 2. Getting Set Up with GitHub

The project lives online on a website called **[GitHub](/glossary#github)**. You'll download ("[clone](/glossary#clone)") it to your computer so you have your own copy to work with.

### Step 1: Create a GitHub Account
If you don't already have one, go to [github.com](https://github.com) and sign up — it's free. This is where developers store and share code.

### Step 2: Download the Project
Open Antigravity and type this in the **chat** (not the terminal):

> "Clone the repo at https://github.com/rickcedwhat/julia-learn.git into my Documents folder, then open it and install the dependencies."

The AI will run the commands for you! Once it's done, you'll see all the project files in the sidebar.

<details>
<summary>💡 Want to do it manually instead?</summary>

If you'd rather type the commands yourself, open the terminal inside Antigravity (press `` Ctrl + ` ``) and run these one at a time:

```bash
cd %USERPROFILE%\Documents
git clone https://github.com/rickcedwhat/julia-learn.git
cd julia-learn
npm install
```

Then go to **File → Open Folder** and open the `julia-learn` folder from your Documents.

</details>

<details>
<summary>💡 What just happened?</summary>

| What | Why |
|------|-----|
| **Clone** | Downloaded the entire project from GitHub to your computer |
| **Open folder** | Let Antigravity see all the files so you can browse and edit them |
| **npm install** | Installed all the tools the project needs to run |

</details>

---

## 3. Understanding the Project Structure

Here's what you'll see after cloning:

```
julia-learn/
├── app/              ← 🔧 YOUR workspace — build the app here
│   └── README.md
├── docs/             ← 📚 Learning Portal (this site!)
│   ├── index.md
│   ├── curriculum.md
│   ├── setup-guide.md
│   ├── module-1.md … module-5.md
│   └── .vitepress/   ← Site configuration
├── package.json      ← Project scripts & dependencies
└── .gitignore        ← Files Git should ignore
```

| Folder | Purpose |
|--------|---------|
| `app/` | Where you write your Nutrition Label app code ([React](/glossary#react), [TypeScript](/glossary#typescript), etc.) |
| `docs/` | The Learning Portal — curriculum, guides, and module pages |
| `docs/.vitepress/` | [VitePress](/glossary#vitepress) config that controls sidebar, nav, and site settings |

<details>
<summary>💡 What are package.json and .gitignore?</summary>

**`package.json`** is the "recipe card" for the project. It lists what tools the project needs (`devDependencies`) and what commands you can run (`scripts`), like `npm run docs:dev` to start this Learning Portal.

**`.gitignore`** tells Git which files to skip when saving changes. Things like `node_modules/` (thousands of library files) and `.env` (secret API keys) shouldn't be uploaded to GitHub.

</details>

---

## 4. Getting Your Gemini API Key

The "Brain" of our app is Google's [Gemini](/glossary#gemini). It needs a "Key" (like a password) to work.

1. Go to the [Google AI Studio](https://aistudio.google.com/).
2. Log in with the shared account.
3. Click on **"Get API Key"** on the left sidebar.
4. Copy the key (it looks like a long string of random letters).
5. **CRITICAL:** Create a file in your project called `.env`. Paste the key there:
   ```
   GEMINI_API_KEY=your_key_here
   ```

::: warning
Never share your `.env` file or upload it to GitHub! The `.gitignore` is already configured to keep it safe.
:::

<details>
<summary>💡 What is an API Key?</summary>

An API key is like a password that lets your app talk to an external service (in this case, Google's Gemini AI). Each key is unique to you. If someone else gets your key, they could use up your credits or access your data — that's why we keep it in `.env` and never commit it to Git.

</details>

---

## 5. Understanding Scripts (Your Project's Shortcuts)

Before we run anything, let's learn **how** to run things.

Open `package.json` in Antigravity (click it in the sidebar). You'll see a section called `"scripts"`:

```json
"scripts": {
  "docs:dev": "vitepress dev docs",
  "docs:build": "vitepress build docs",
  "docs:preview": "vitepress preview docs"
}
```

Each script is a **shortcut**. Instead of typing the long command on the right, you type the short name on the left with `npm run` in front of it. For example:

- `npm run docs:dev` → runs `vitepress dev docs` behind the scenes
- You don't need to memorize the long version — just the shortcut name!

### Try it: See what scripts are available

In the Antigravity terminal (press `` Ctrl + ` `` to open it), type:

```bash
npm run
```

This lists every shortcut the project knows. Right now you'll see three `docs:` scripts.

::: warning Important
If you run a script that doesn't exist (like `npm run dev`), you'll get an error: **"Missing script: dev"**. That's not a bug — it just means that shortcut hasn't been created yet. Run `npm run` (with nothing after it) to see which ones are available.
:::

### What each script does

| Script | What it does |
|--------|-------------|
| `npm run docs:dev` | Starts a live preview of this Learning Portal |
| `npm run docs:build` | Creates the final version of the site for publishing |
| `npm run docs:preview` | Previews the built site before publishing |

::: tip
As you build the Nutrition Label app later, you'll add new scripts like `dev`, `build`, and `test` for the app itself. The AI will help you set those up when the time comes!
:::

<details>
<summary>💡 Why not just type the long command?</summary>

You *could* type `vitepress dev docs` directly, but scripts have some benefits:

1. **Shorter** — easier to remember and type
2. **Standardized** — every project uses `npm run` + a name, so once you learn the pattern, it works everywhere
3. **Documented** — anyone can run `npm run` to see what's available in a project they've never seen before

</details>

---

## 6. Viewing the Learning Portal

Let's put those scripts to use! In the Antigravity terminal, run:

```bash
npm run docs:dev
```

After a moment, you'll see a link like `http://localhost:5173/`. Click it or paste it in your browser — **you're now running this site on your own computer!** 🎉

Any changes you make to files in the `docs/` folder will instantly show up in your browser.

::: tip
Press `Ctrl + C` in the terminal to stop the server when you're done.
:::

---

## 7. Your First "AI Instruction"

Open the Antigravity chat and type:

> "Look at the `APP_SPEC.md` file. I want to build the basic layout for the 'Label Library' page. Can you show me a mock-up using React and Tailwind CSS?"