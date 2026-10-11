---
title: "Viewing History: log, show & diff"
subtitle: Read your project's history, inspect any commit, view old versions of files, and compare any two points in time.
date: 2026-10-11
thumbnail: assets/cover.svg
tags: [git, log, diff, history, beginner]
references:
  - title: "Pro Git: Viewing the Commit History"
    url: https://git-scm.com/book/en/v2/Git-Basics-Viewing-the-Commit-History
  - title: git-log documentation
    url: https://git-scm.com/docs/git-log
  - title: git-diff documentation
    url: https://git-scm.com/docs/git-diff
---

Saving versions is only half the value of Git. The other half is **using** that history: seeing
what changed, when, by whom, and comparing then with now. This chapter teaches the three
commands for reading history: `git log`, `git show` and `git diff`.

> **In this chapter you'll learn**
> - How to read `git log` and shape its output (short, detailed, filtered)
> - How to refer to commits by position: `HEAD`, `HEAD~1`, `HEAD~2`…
> - How to inspect one commit with `git show`, and view a file as it was in the past
> - How to compare any two commits, or one file across time, with `git diff`
>
> **Prerequisites:** [chapter 5](../05-the-three-areas/index.md). **Time:** 35 minutes.

## Set up the practice history

To have something interesting to look at, let's create a project with a few commits, including
one by a "teammate". Run this block in your terminal (you can copy and paste it all at once):

```bash
cd ~/git-practice && rm -rf history-demo && mkdir history-demo && cd history-demo && git init
echo "<h1>Welcome to my website</h1>" > index.html && git add . && git commit -m "Add home page"
echo "<p>I am learning Git.</p>" >> index.html && git commit -am "Add intro paragraph"
echo "<h1>About me</h1>" > about.html && git add . && git commit -m "Add about page"
echo "body { font-family: sans-serif; }" > style.css && git add . && git commit -m "Add stylesheet"
echo "h1 { color: teal; }" >> style.css && git commit -am "Make headings teal" --author="Ravi Kumar <ravi@example.com>"
echo "<footer>Made with Git</footer>" >> index.html && git commit -am "Add footer"
```

(`--author` records someone else as the author of a commit. We use it here only to simulate a
teammate.)

## `git log`: the timeline

```bash
$ git log
commit a60d3f4ec457e951581304edc77ebdfbce87db8e
Author: Asha Rao <asha@example.com>
Date:   Sun Oct 11 10:00:00 2026 +0530

    Add footer

commit f33d67a4fec64ec0bfc03d7a270e8d87962b9724
Author: Ravi Kumar <ravi@example.com>
Date:   Sun Oct 11 10:00:00 2026 +0530

    Make headings teal
...
```

The newest commit is at the top. For each commit you see its full hash, author, date and message.
When the output is longer than your screen, Git opens a **pager**: use `↑`/`↓` or `Space` to
scroll, `/word` to search, and **`q` to quit**.

### Shaping the output

The full log is long. These options make it useful:

```bash
$ git log --oneline
a60d3f4 Add footer
f33d67a Make headings teal
7761c4a Add stylesheet
6352e37 Add about page
f5fdf82 Add intro paragraph
50f4d8d Add home page
```

| Option | Shows | Use it when |
| --- | --- | --- |
| `--oneline` | Short hash + subject, one line each | You want an overview (most common) |
| `-3` (any number) | Only the newest N commits | You only care about recent work |
| `--stat` | Which files changed and how many lines | You want to know *where* changes happened |
| `-p` (patch) | The full diff of every commit | You want to see *exactly* what changed |
| `--graph` | Draws branches and merges as lines | Once you use branches ([chapter 10](../10-branches/index.md)) |
| `--all` | Commits from all branches, not just the current one | Same |

Options combine freely:

```bash
$ git log --stat -2
commit a60d3f4...
Author: Asha Rao <asha@example.com>

    Add footer

 index.html | 1 +
 1 file changed, 1 insertion(+)

commit f33d67a...
Author: Ravi Kumar <ravi@example.com>

    Make headings teal

 style.css | 1 +
 1 file changed, 1 insertion(+)
```

```bash
$ git log -p -1
commit a60d3f4...
    Add footer

diff --git a/index.html b/index.html
--- a/index.html
+++ b/index.html
@@ -1,2 +1,3 @@
 <h1>Welcome to my website</h1>
 <p>I am learning Git.</p>
+<footer>Made with Git</footer>
```

### Filtering: find the commits you care about

| Question | Command |
| --- | --- |
| What did Ravi commit? | `git log --oneline --author="Ravi"` |
| Which commits mention "page" in their message? | `git log --oneline --grep="page"` (add `-i` to ignore case) |
| Which commits changed `style.css`? | `git log --oneline -- style.css` |
| What happened in the last two weeks? | `git log --oneline --since="2 weeks ago"` |
| What happened between two dates? | `git log --since="2026-09-01" --until="2026-09-30"` |
| History of a file, including before it was renamed | `git log --follow --oneline -- about-me.html` |

```bash
$ git log --oneline --author="Ravi"
f33d67a Make headings teal

$ git log --oneline -- style.css
f33d67a Make headings teal
7761c4a Add stylesheet
```

> The `--` before a file name means "everything after this is a file path, not an option or a
> branch name". It's optional most of the time, but it avoids confusion when a file and a branch
> have the same name.

### Your own format

`--pretty=format:` lets you choose exactly what to print:

```bash
$ git log --pretty=format:"%h %an, %ar: %s" -3
a60d3f4 Asha Rao, 2 hours ago: Add footer
f33d67a Ravi Kumar, 2 hours ago: Make headings teal
7761c4a Asha Rao, 2 hours ago: Add stylesheet
```

| Placeholder | Meaning |
| --- | --- |
| `%h` / `%H` | Short / full hash |
| `%an` / `%ae` | Author name / email |
| `%ar` / `%ad` | Date, relative ("2 hours ago") / absolute |
| `%s` | Subject (first line of the message) |

## Naming commits: hashes, `HEAD` and `~`

To inspect or compare commits, you need to name them. You have two options:

1. **By hash:** `a60d3f4` (any unique prefix of at least 4 characters works; 7 is typical).
2. **By position, relative to `HEAD`.** **`HEAD`** means "the commit you're on right now" —
   normally your latest commit. Adding `~N` means "N commits before that":

```text
50f4d8d ← f5fdf82 ← 6352e37 ← 7761c4a ← f33d67a ← a60d3f4
HEAD~5    HEAD~4    HEAD~3    HEAD~2    HEAD~1    HEAD
```

So `HEAD~1` is the previous commit, `HEAD~2` the one before that, and so on. These names are
relative: after your next commit, every commit's `HEAD~N` number shifts by one.

## `git show`: inspect one commit

`git show` displays a single commit: its details plus its diff.

```bash
$ git show HEAD
commit a60d3f4ec457e951581304edc77ebdfbce87db8e
Author: Asha Rao <asha@example.com>
Date:   Sun Oct 11 10:00:00 2026 +0530

    Add footer

diff --git a/index.html b/index.html
...
+<footer>Made with Git</footer>
```

```bash
$ git show HEAD~2 --stat           # summary only
commit 7761c4a...
    Add stylesheet

 style.css | 1 +
 1 file changed, 1 insertion(+)
```

### View a file as it was in the past

`git show <commit>:<path>` prints a file's **entire content** at that commit, without changing
anything in your working tree:

```bash
$ git show HEAD~3:index.html
<h1>Welcome to my website</h1>
<p>I am learning Git.</p>
```

That's `index.html` before the footer was added. To save that old version into a separate file
for comparison:

```bash
$ git show HEAD~3:index.html > old-index.html
```

(Delete `old-index.html` afterwards. To actually *restore* an old version of a file, see
[chapter 17](../17-undoing-changes/index.md).)

## `git diff` between commits

In [chapter 5](../05-the-three-areas/index.md) you used `git diff` to compare your working tree
and staging area. Give it two commits and it compares those instead:

```bash
$ git diff HEAD~2 HEAD
diff --git a/index.html b/index.html
...
+<footer>Made with Git</footer>
diff --git a/style.css b/style.css
...
 body { font-family: sans-serif; }
+h1 { color: teal; }
```

This answers: *"What's different between two commits ago and now?"* Read it as: changes needed
to go **from** the first commit **to** the second.

| Command | Compares |
| --- | --- |
| `git diff A B` | Commit A with commit B |
| `git diff A B --stat` | Same, as a summary of files |
| `git diff A B -- index.html` | Same, only for one file |
| `git diff A` | Commit A with your current working tree |
| `git diff A B --name-only` | Only the names of changed files |

```bash
$ git diff HEAD~2 HEAD --stat
 index.html | 1 +
 style.css  | 1 +
 2 files changed, 2 insertions(+)
```

### Useful diff options

| Option | Effect |
| --- | --- |
| `--stat` | Summary per file |
| `--word-diff` | Highlights changed **words** instead of whole lines (great for text and long lines) |
| `-w` | Ignore whitespace-only changes (indentation, trailing spaces) |
| `--color-words` | Like `--word-diff`, but with colours only |

## Hands-on lab: answer questions with history

Using the `history-demo` repository you created at the start, answer these questions **with Git
commands**. Try each one before opening the answer.

<details>
<summary>1. How many commits are in the project?</summary>

```bash
$ git log --oneline
```

Six lines, six commits. (For big projects: `git rev-list --count HEAD` prints just the number.)
</details>

<details>
<summary>2. Which commits did Asha make?</summary>

```bash
$ git log --oneline --author="Asha"
```
</details>

<details>
<summary>3. What exactly did Ravi change?</summary>

```bash
$ git log -p --author="Ravi"
```

He added `h1 { color: teal; }` to `style.css`.
</details>

<details>
<summary>4. What did <code>index.html</code> look like right after the very first commit?</summary>

```bash
$ git show HEAD~5:index.html
<h1>Welcome to my website</h1>
```

(You could also use the first commit's hash: `git show 50f4d8d:index.html`. Your hash will differ.)
</details>

<details>
<summary>5. Which files changed in the last three commits, in total?</summary>

```bash
$ git diff HEAD~3 HEAD --stat
```

`index.html` and `style.css`.
</details>

<details>
<summary>6. Show only the commits that touched <code>index.html</code>, with their diffs.</summary>

```bash
$ git log -p -- index.html
```
</details>

## When to use what

| You want to… | Use |
| --- | --- |
| Get an overview of recent work | `git log --oneline` (add `-10` for the last 10) |
| See which files a commit touched | `git log --stat` or `git show <commit> --stat` |
| See exactly what one commit changed | `git show <commit>` |
| See an old version of a file without changing anything | `git show <commit>:<path>` |
| Compare two points in history | `git diff <commit-A> <commit-B>` |
| Find commits by person, message, file or date | `git log --author / --grep / -- file / --since` |
| Find when a specific line or word changed | Next chapter: `git log -S` and `git blame` |

## Common mistakes

| Problem | Fix |
| --- | --- |
| Terminal shows `:` or `(END)` and won't take commands | You're in the pager: press `q` |
| `fatal: ambiguous argument 'HEAD~10'` | There aren't that many commits. Check `git log --oneline` |
| `git show HEAD~1:index.html` says the path doesn't exist | The file didn't exist yet at that commit, or the path is wrong. Paths are relative to the project root |
| `git diff A B` shows the changes "backwards" | Swap A and B: the diff shows how to go *from* the first *to* the second |

## Recap

- `git log` lists commits newest-first; `--oneline`, `--stat`, `-p`, `-N` shape the output.
- Filter with `--author`, `--grep`, `--since`, and `-- <file>`.
- `HEAD` is your current commit; `HEAD~N` is N commits before it.
- `git show <commit>` inspects a commit; `git show <commit>:<file>` shows an old file version.
- `git diff A B` compares any two commits (optionally limited to `-- <file>`).

## Check your understanding

<details>
<summary>1. What's the difference between <code>git log -p</code> and <code>git log --stat</code>?</summary>

`-p` shows the full line-by-line diff of every commit. `--stat` only shows which files changed
and how many lines were added or removed.
</details>

<details>
<summary>2. You just made a new commit. What does <code>HEAD~1</code> refer to now?</summary>

The commit that was `HEAD` before you committed: the one directly before your new commit.
</details>

<details>
<summary>3. How do you see what <code>config.json</code> looked like five commits ago, without changing your files?</summary>

`git show HEAD~5:config.json`
</details>

**Next:** [detective work: blame and searching history](../09-searching-history/index.md).
