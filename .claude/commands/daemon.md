You are running in daemon mode. Your job is to continuously process open Linear issues until none remain.

<!-- HUMAN-ONLY: Do not modify this section autonomously -->
## Core Loop

Repeat the following until there are no more actionable issues:

### Step 1: Get the next issue
Query Linear for open issues in the Strange-ground team, sorted by priority (Urgent first, then High, Medium, Low). Skip issues that:
- Are labeled "HUMAN" (requires product judgment)
- Are blocked by other incomplete issues
- Have status "In Progress" with a delegate that isn't you

Pick the highest priority unblocked issue.

### Step 2: Check for file conflicts
Read the issue description. Extract the list of files to modify. Check `git status` and `git diff --name-only` — if any of those files have uncommitted changes from a previous failed attempt, run `git checkout -- <file>` to reset them before starting.

### Step 3: Implement
Follow the /fix-issue workflow:
1. Read the FULL issue description and ALL comments
2. Read .cursor/rules/issues.md and .cursor/rules/project.md
3. Read every file mentioned in the issue
4. Implement changes (ONLY files listed in the issue)
4b. If the issue adds or changes user-visible behavior:
    - Add data-testid attributes to any new UI elements
    - Add a test to tests/smoke.spec.ts that verifies the feature works
    - The test should follow the pattern: navigate → interact → assert
    - Place the test under the appropriate section comment (e.g., // ── Briefing generation ──)
    - The test must pass before committing
5. Run `npm run build` — fix all errors (up to 3 iterations)
6. Run `npm run lint` — fix all errors
7. Run `npx playwright test tests/smoke.spec.ts` — if tests fail, fix implementation (NOT tests), up to 3 iterations

### Step 4: Evaluate result
**If build + lint + tests all pass:**
1. Commit: `fix(ISSUE_ID): description`
2. Push to origin/main
3. Update the Linear issue status to "Done" (use Linear MCP tools)
4. Wait 10 seconds, then continue to Step 1

**If tests fail after 3 iterations:**
1. Revert all changes: `git checkout -- .`
2. Add a comment to the Linear issue via MCP: "Daemon attempted this issue 3 times. Failures: [paste test output]. Marking as blocked for human review."
3. Update the issue status to "Backlog" and add label "HUMAN"
4. Continue to Step 1 (pick up the next issue)

**If build fails after 3 iterations:**
1. Same as test failure — revert, comment, label "HUMAN", move on

### Step 5: Post-push monitoring
After pushing, wait 90 seconds for Vercel to deploy. Then run:
```bash
PLAYWRIGHT_BASE_URL=https://strange-ground.vercel.app npx playwright test tests/smoke.spec.ts
```
**If production tests fail:**
1. Create a NEW Linear issue via MCP:
   - Title: `REGRESSION · [test name] failing after [ISSUE_ID] deploy`
   - Description: Include the test failure output, the commit SHA, and the files that were changed
   - Priority: Urgent
   - Label: Bug
2. This new issue will be picked up in the NEXT iteration of the loop (it's now the highest priority)
3. Continue to Step 1
<!-- END HUMAN-ONLY -->

### Safety rails
- Maximum 10 issues per daemon session (prevents runaway cost)
- If the same issue fails twice in the same session, skip it permanently and label "HUMAN"
- Never modify test files (tests/*)
- Never modify supabase/migrations/ files that have already been applied
- If you encounter a permissions error, network timeout, or API rate limit, wait 60 seconds and retry once. If it fails again, stop the daemon and report what happened.

### Exit conditions
Stop the daemon when ANY of these are true:
- No open unblocked issues remain (backlog empty — success!)
- 10 issues have been processed in this session
- An issue has been attempted and failed twice in the same session
- A critical error occurs (database connection failure, git push rejected, etc.)

When exiting, print a summary:
```
DAEMON SESSION SUMMARY
======================
Issues completed: X
Issues failed (labeled HUMAN): Y
Regressions detected and filed: Z
Remaining open issues: N
```

## When debugging production bugs

Before attempting a code fix on any issue labeled "Bug", run the debug-production command to gather observability data:
```bash
# Check API health, Inngest status, Supabase connectivity, and network failures
/debug-production
```
This checks API health, Inngest function status, Vercel logs, and network requests.
Use the diagnostic report to identify whether the issue is:
- A code issue (proceed to fix)
- A configuration/environment issue (report and stop — label "HUMAN")

## Self-modification rules

The daemon has FULL write access to all files in the repository, including `.claude/`.

### What the daemon CAN do with .claude/ files:
- Create new commands in `.claude/commands/`
- Create new skills in `.claude/skills/`
- Create new agent definitions in `.claude/agents/`
- Append new sections to existing commands, skills, and agent files
- Update `.claude/settings.json` to register new tools or env vars
- Add new entries to `design-system/` files
- Create new `.claude/` subdirectories as needed

### Commit convention for self-modification:
When modifying any file in `.claude/`, commit the change SEPARATELY from other code changes, using the prefix `meta:` in the commit message. Examples:
- `meta: add debug-production step to daemon.md`
- `meta: register new skill for PDF generation`
- `meta: update settings.json with VERCEL_TOKEN env var`

This ensures self-modifications are easy to find, review, and revert in git history.

### What the daemon MUST NOT do:
- Delete existing behavioral rules or safety checks from any `.claude/` file
- Remove or weaken existing instructions (only ADD or AMEND)
- Modify content inside `<!-- HUMAN-ONLY -->` / `<!-- END HUMAN-ONLY -->` markers
- Modify git hooks or CI/CD configs that gate deployments

### Learning log:
When the daemon modifies `.claude/` files, it MUST append a one-line entry to `.claude/CHANGELOG.md`:
```
YYYY-MM-DD | [file modified] | [what changed] | [why / which issue triggered it]
```

## Self-improvement

After completing each issue, the daemon should consider:

1. **Did I encounter a pattern that should be documented?**
   - If yes, add it to the relevant skill or create a new one
   - Example: "Every time I touch Inngest functions, I need to check the model string" → add to a debugging checklist

2. **Did I waste time on something that could have been avoided with better instructions?**
   - If yes, update the relevant command or agent file with the missing context
   - Example: "I didn't know to check MASTER.md before UI changes" → add reminder to implementer.md

3. **Did I create a new tool or command that other commands should reference?**
   - If yes, wire it into the relevant existing commands
   - Example: Created debug-production.md → add reference to daemon.md and fix-issue.md

4. **Did I discover a new anti-pattern or best practice?**
   - If yes, add it to the relevant design system or skill file
   - Example: "Hardcoded model strings cause silent failures" → add to a common pitfalls doc

When self-modifying, always commit with `meta:` prefix and log the change in `.claude/CHANGELOG.md`.
