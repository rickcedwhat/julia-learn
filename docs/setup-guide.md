# 🛠️ Setup Guide: Powering Up Your Environment

Before we write a single line of code, we need to set up your "Command Center."

::: tip 📖 New to a term?
Check the [Glossary](/glossary) any time you see an unfamiliar word.
:::

---

## 0. Getting Set Up with GitHub

The project lives online on a website called **[GitHub](/glossary#github)**. You'll download ("[clone](/glossary#clone)") it to your computer so you have your own copy to work with.

### Step 1: Create a GitHub Account
If you don't already have one, go to [github.com](https://github.com) and sign up — it's free. This is where developers store and share code.

### Step 2: Install Git
[Git](/glossary#git) is the tool that lets you download the project. Install it here: [git-scm.com/downloads](https://git-scm.com/downloads). Pick the option for your computer (Mac or Windows) and follow the installer.

### Step 3: Download the Project
Open your **[Terminal](/glossary#terminal)** (on Mac: search "Terminal" in Spotlight) and paste these commands one at a time, pressing Enter after each:

```bash
cd ~/Documents
git clone https://github.com/rickcedwhat/julia-learn.git
cd julia-learn
npm install
```

That's it! You now have the full project on your computer.

<details>
<summary>💡 Wait — what did those commands do?</summary>

| Command | What it does |
|---------|-------------|
| `cd ~/Documents` | Moves you into your Documents folder |
| `git clone https://...` | Downloads the entire project from GitHub to your computer |
| `cd julia-learn` | Moves you into the project folder you just downloaded |
| `npm install` | Installs all the tools the project needs to run |

**Git** is like "Track Changes" in Google Docs, but for code — it tracks every change so you can undo mistakes.

**GitHub** is the website that stores the project online so you (and others) can access it from anywhere.

</details>

---

## 1. Understanding the Project Structure

Here's what you'll see after cloning:

```
julia/
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

## 2. Understanding Antigravity

[Antigravity](/glossary#antigravity) is your **AI-Native [IDE](/glossary#ide-integrated-development-environment).** Unlike old editors where you type everything, here you **collaborate.**
- **The Chat:** Where you describe features.
- **The Code:** Where the AI writes the React/TypeScript.
- **The Terminal:** Where we run the app to see if it works.

<details>
<summary>💡 How is this different from VS Code?</summary>

VS Code is a traditional code editor — you type everything yourself and use extensions for extra features. Antigravity has AI built in as a first-class citizen. You describe what you want in plain English, and the AI helps write, debug, and test the code alongside you.

</details>

---

## 3. Getting Your Gemini API Key

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

## 4. Running the "Hello World"

In your Antigravity terminal, run:

```bash
npm install
npm run dev
```

This will start a local server. If you see a blank screen with "Nutrition App," you've successfully connected the brain to the body!

---

## 5. Your First "AI Instruction"

Open the Antigravity chat and type:

> "Look at the `APP_SPEC.md` file. I want to build the basic layout for the 'Label Library' page. Can you show me a mock-up using React and Tailwind CSS?"

---

## 6. Viewing the Learning Portal

To launch this documentation site locally:

```bash
npm run docs:dev
```

Then open the link shown in your terminal. You can navigate through the modules in the sidebar on the left.