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
- **The Panel** (left side) — Your file browser and other tools.
- **The Code** (center) — Where files are displayed and edited.
- **The Chat** (right side) — Where you describe features in plain English and the AI helps you build them.
- **The Terminal** (bottom, if you open it) — Where you type commands to run things.

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

### Fix: "Running scripts is disabled on this system"

If you see this error when running commands, Windows is blocking scripts by default. To fix it:

1. Right-click the **Start menu** → click **Terminal (Admin)** or **PowerShell (Admin)**
2. Paste this command and press Enter:
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. Type `Y` and press Enter
4. Close and reopen Antigravity — scripts should work now

<details>
<summary>💡 Alternative: use Command Prompt instead</summary>

If you don't want to change the policy, you can switch Antigravity's terminal to **Command Prompt (cmd)** which doesn't have this restriction. Look for a dropdown near the `+` button in the terminal panel and select `cmd`.

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
│   ├── app-spec.md
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

## 4. Understanding Scripts (Your Project's Shortcuts)

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

This lists every shortcut the project knows. Besides the `docs:*` scripts, there are small **Git helpers** (`repo:status`, `repo:remotes`, `repo:diff`) and `sync:fetch-upstream` (runs `git fetch upstream` after you have added the instructor repo as `upstream`). They do not replace the full push/merge workflow — they just give you and the AI quick, copy-paste-safe checks.

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

## 5. Viewing the Learning Portal

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

## 6. Review the App Spec

Before writing any code, let's understand **what we're building**.

Open the [App Spec](/app-spec) page and read through it. It describes the Nutrition Label app — what it does, how the data model works, and what tech we'll use.

Then open the Antigravity chat and ask:

> "Read the App Spec page in docs/app-spec.md. Give me a summary report: what is this app, what are the main features, and what tech will we use to build it? Is there anything you think is unclear or missing?"

The AI will break it all down for you. After reading the report, you can ask follow-up questions like:

> "What would be the hardest part to build?"

> "Is there anything you'd change about this spec?"

This is your chance to **understand and shape the project before diving in**. If something doesn't make sense or you want to adjust the plan, just tell the AI — you can even ask it to update the spec for you.

---

## 7. Saving Your Work

Whenever you've made changes you want to keep, you need to **save them to GitHub** so they're backed up and your instructor can see your progress.

In the Antigravity terminal, run these three commands:

```bash
git add -A
git commit -m "describe what you changed"
git push
```

For example, after finishing Module 1 you might type:

```bash
git add -A
git commit -m "completed module 1 exercises"
git push
```

That's it! Your changes are now saved on GitHub.

<details>
<summary>💡 What do these three commands do?</summary>

| Command | What it does |
|---------|-------------|
| `git add -A` | Gathers all your changes into a "package" ready to save |
| `git commit -m "..."` | Labels the package with a message describing what changed |
| `git push` | Uploads the package to GitHub so it's backed up online |

Think of it like packing a box (`add`), writing a label on it (`commit`), and shipping it (`push`).

</details>

::: tip 💬 Or just ask the AI!
You can also type in the Antigravity chat: *"Save my changes to GitHub with the message 'completed module 1'"* and it will run the commands for you.
:::

::: info Coming later
Right now you're pushing directly to `main` — the simplest workflow. In a future module, you'll learn about **branches** and **pull requests**, which let you organize changes and get feedback before merging. Don't worry about that yet!
:::

---

## 8. Getting the Latest Updates

Your instructor may update the curriculum, add new modules, or fix things in the docs. When that happens, you'll want to pull those changes into your copy.

::: warning Don't blindly overwrite your work
If you edited **`docs/app-spec.md`** (or other docs) with real improvements—restaurant items, new sections, QA notes—those changes are **yours**. The instructor's repo might only change the *curriculum* or other guide pages. A naïve "take everything from the main repo" merge can wipe spec work you care about.

The goal is: **get curriculum updates**, **keep the spec and edits you still want**, and **decide deliberately** when both sides touched the same file.
:::

Type this in the Antigravity chat:

> "I want to merge the latest from the instructor repo at `https://github.com/rickcedwhat/julia-learn.git`. My remote is usually named `upstream`. Help me `git fetch upstream` and merge `upstream/main` into my current branch (or walk me through the equivalent).
>
> If there are **merge conflicts**, do **not** default to 'keep only the instructor's version' for every file—especially not for `docs/app-spec.md`, where I may have real updates.
>
> For each conflicted file: show me what changed on each side, summarize in plain language, and **recommend** whether to keep my version, take theirs, or **combine** them. **I will decide** for each case before you apply anything.
>
> If there is **no conflict**, still give me a short summary of what new commits or files came in from the instructor, so I know what changed."

<details>
<summary>💡 Want to do it manually?</summary>

If you haven't set up the instructor's repo as a "remote" yet:
```bash
git remote add upstream https://github.com/rickcedwhat/julia-learn.git
```

Then whenever you want the latest updates:
```bash
git fetch upstream
git merge upstream/main
```

If Git stops with conflicts, open each conflicted file: you'll see `<<<<<<<`, `=======`, and `>>>>>>>` markers. You can edit by hand, or paste the conflict into the AI and ask for a **side-by-side recommendation**—then you choose and remove the markers yourself (or let the AI produce the merged text for you to paste in).

For **`docs/app-spec.md`**, treat it like a product decision: your additions might be better than the baseline, while typo fixes from the instructor might still be worth taking in the same file.

</details>

::: tip
It's a good idea to **save your work first** (Step 7) before pulling updates, so nothing gets lost.
:::