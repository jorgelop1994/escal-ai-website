## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Workflow & Git Flow Rules

- **Branch Protection**: Direct pushes to `main` are strictly forbidden. Always create a branch matching the naming convention:
  - `feature/change-name` for features and enhancements.
  - `fix/change-name` for bug fixes.
- **Pull Requests**: Integrate all changes via a Pull Request (PR) targeting `main`. Use squash merges and delete the branch after merging.
- **CI/CD Validations**: Every PR triggers a validation pipeline in GitHub Actions that runs:
  - `npm ci` (Dependency installation)
  - `npm run check` (Astro diagnostic checks)
  - `npm run build` (Static site compilation)
  Astro errors or build failures block the merge.
- **AI Review**: A Gemini-powered AI code review (`scripts/ai-review.mjs`) automatically scans code changes in the diff and comments on the PR. It must not block emergency merges if the API is down.

## Technical Stack & Design

- **Static Generation**: Use Astro purely as a static site generator.
- **Frameworks**: Do not add React, Vue, or Tailwind CSS unless explicitly requested by the user. Prefer clean Vanilla CSS and minimal native JavaScript.
- **Styling System**: Define styling tokens in `src/styles/global.css` using modern typography, glassmorphism, HSL tailormade colors, and fluid layouts.
- **Deployment**: Integrated with Cloudflare Pages. Previews are generated automatically on PRs. Do not use direct uploads.

## Security Policies

- **Credentials**: Never commit API keys, tokens, or credentials (such as Cloudflare or Gemini keys) to GitHub.
- **Secrets Management**: Use GitHub Repository Secrets (like `GEMINI_API_KEY`) and read them from environment variables.
- **Git Ignore**: Keep `.env` and local configurations in `.gitignore` to prevent leaks.

