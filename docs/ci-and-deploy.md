# CI and Deploy

This document explains the recommended CI and deployment setup for this project.

## GitHub Actions
- Workflow: `.github/workflows/ci.yml`
- Runs on push and PR to `main`.
- Steps: install, lint, type-check, build, test.

## Vercel
- Recommended: Connect this GitHub repository to Vercel.
- Set Environment Variables in the Vercel project settings (e.g., `DATABASE_URL`, `NEXT_PUBLIC_STRIPE_KEY`, etc.).
- `vercel.json` is provided for basic build settings.

## Branch Protection
- Protect `main` branch:
  - Require pull request reviews before merging
  - Require status checks: `CI` (the workflow created) to pass
  - Dismiss stale approvals when new commits are pushed
  - Restrict who can push to `main` if needed

## Notes
- If you use monorepo or workspaces, adjust Vercel `outputFileTracingRoot` in `next.config.js`.
- Keep secrets out of repository; use Vercel UI or GitHub Secrets for production credentials.
