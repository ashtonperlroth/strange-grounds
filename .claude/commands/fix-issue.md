Read issue $ARGUMENTS from Linear using MCP tools.
Read the full issue description and ALL comments.

Before writing any code:
1. Read .cursor/rules/issues.md for execution rules
2. Read .cursor/rules/project.md for architecture conventions
3. Read EVERY file mentioned in the issue description

Implement the changes:
- ONLY modify files listed in the issue
- Follow existing code patterns
- If the issue requires a Supabase migration, create AND apply it

After implementation:
1. `npm run build` — fix ALL errors
2. `npm run lint` — fix ALL errors
3b. If the issue adds or changes user-visible behavior:
    - Add data-testid attributes to any new UI elements
    - Add a test to tests/smoke.spec.ts that verifies the feature works
    - The test should follow the pattern: navigate → interact → assert
    - Place the test under the appropriate section comment (e.g., // ── Briefing generation ──)
    - The test must pass before committing
3. `npx playwright test tests/smoke.spec.ts` — if tests fail, fix implementation (NOT tests), iterate up to 3 times
4. `git diff --name-only` — verify only expected files changed

When all checks pass:
1. Commit: `fix($ARGUMENTS): description`
2. Push to origin/main
