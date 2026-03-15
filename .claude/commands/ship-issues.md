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
3b. If the issue adds or changes user-visible behavior:
    - Add data-testid attributes to any new UI elements
    - Add a test to tests/smoke.spec.ts that verifies the feature works
    - The test should follow the pattern: navigate → interact → assert
    - Place the test under the appropriate section comment (e.g., // ── Briefing generation ──)
    - The test must pass before committing
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
