Read issues $ARGUMENTS from Linear using MCP tools. Read the full description and ALL comments for each issue.

Analyze the issues for dependencies and file conflicts:
- If issues share NO files → create an agent team with one teammate per issue (parallel)
- If issues have dependencies (B needs output from A) → execute sequentially
- If issues share files → execute sequentially

For parallel execution:
Create an agent team. Assign one teammate per issue. Each teammate:
1. Reads its issue from Linear
2. Reads all files mentioned in the issue
3. Implements the changes (ONLY files listed in the issue)
4. Runs `npm run build` — fixes all errors
5. Commits with message: `fix(ISSUE_ID): description`

After all teammates complete:
1. Use the code-reviewer subagent to review all changes
2. Use the smoke-tester subagent to run Playwright tests
3. If tests pass, push to origin/main
4. If tests fail, have the relevant implementer teammate fix and re-test (up to 3 iterations)
5. Report summary of what was done

For sequential execution:
Process issues in order. Same steps per issue, but one at a time.
