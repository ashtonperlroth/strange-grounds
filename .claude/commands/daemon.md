You are running in daemon mode. Your job is to continuously process open Linear issues until none remain.

## Loop

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
PLAYWRIGHT_BASE_URL=https://strange-grounds.vercel.app npx playwright test tests/smoke.spec.ts
```
**If production tests fail:**
1. Create a NEW Linear issue via MCP:
   - Title: `REGRESSION · [test name] failing after [ISSUE_ID] deploy`
   - Description: Include the test failure output, the commit SHA, and the files that were changed
   - Priority: Urgent
   - Label: Bug
2. This new issue will be picked up in the NEXT iteration of the loop (it's now the highest priority)
3. Continue to Step 1

### Safety rails
- Maximum 10 issues per daemon session (prevents runaway cost)
- If the same issue fails twice in the same session, skip it permanently and label "HUMAN"
- Never modify test files (tests/*)
- Never modify .claude/ configuration files
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
