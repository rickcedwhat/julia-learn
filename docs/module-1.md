# 📅 Module 1: The Architect (Defining the Specs)

*Concepts: Product Ownership, Scope, and Clarity.*

## Objective
Understand that an AI is only as good as the instructions it receives.

## Task 1: Interrogating the Spec
Read the [App Spec](/app-spec). If you were testing this, what's the first thing that would break?

Open Antigravity and type this in the chat:
> "I am building the Nutrition Label PWA based on the `docs/app-spec.md` file. I'm focusing on QA right now. Can you interrogate this spec and tell me where the edge cases are?"

## Task 2: Collaborating to Update the Spec
We often get food from restaurants, but the spec focuses mostly on homemade batches. Instead of rewriting the spec yourself, ask the AI to do it!

Type this in the chat:
> "We get food from restaurants a lot. The current App Spec focuses mainly on ingredients and homemade batches. Can you give me ideas on how to update the spec to include 'tags' or 'custom items' for restaurant foods? Provide an updated 'Label Origins' section I can add to the document."

## Task 3: Back up your work and stay in sync
Edits you make in Antigravity (especially to `docs/app-spec.md`) exist only on **your computer** until you **commit** and **push** to GitHub. If you updated the spec but never pushed, your instructor only sees the old version online — push when you are happy with a milestone.

The instructor’s source of truth for new curriculum and doc fixes is **`https://github.com/rickcedwhat/julia-learn.git`**. Use the prompts below when you need to upload your work or pull those updates into your project.

Use these in order when they apply.

### Push your progress (your fork or your repo)
Open the Antigravity chat and type:

> "I edited `docs/app-spec.md` and maybe other files for Module 1. I want to save everything to GitHub so my instructor can see it. Show me the exact terminal commands to (1) see what changed, (2) stage all changes, (3) commit with the message `Update app spec after Module 1`, and (4) push. If `git push` fails, tell me what usually causes that and how to fix it."

::: tip
Adjust the commit message to match what you actually did (for example `Add restaurant tags section to app spec`).
:::

### Get the latest curriculum from the instructor
When new lessons or fixes land in the instructor repo, merge them into your project so you are not stuck on an old copy.

Type:

> "The instructor repo is `https://github.com/rickcedwhat/julia-learn.git`. I might be working from my own GitHub repo (not theirs). Walk me through: adding that repo as a remote named `upstream` if it is missing, fetching, and merging `upstream/main` into my current branch. Remind me to commit or stash my work first if that is safer.
>
> If there are merge conflicts—especially in `docs/app-spec.md` where I may have updated the spec—do **not** blindly take only the instructor's version. For each conflicted file, show both sides, recommend keep mine / theirs / combine, and **wait for my choice** before we finalize."

For a shorter version of the same idea, the [Setup Guide](/setup-guide) also has **Step 7 (Saving Your Work)** and **Step 8 (Getting the Latest Updates)**.

## Lesson
In AI dev, the "Requirement Doc" IS the code. If the spec is fuzzy, the app will be buggy.

---
*See the [Glossary](/glossary) for unfamiliar terms.*
