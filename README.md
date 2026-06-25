# escal-ai-website

Corporate website of [escal-ai.com](https://escal-ai.com).

## Technical Stack

- **Framework**: Astro (as a static site generator).
- **Styles and Scripts**: Vanilla CSS and minimal native JavaScript (no React, Vue, or Tailwind CSS).
- **Deployment**: Cloudflare Pages (automatic Git integration).
- **CI/CD**: GitHub Actions for automatic validations and Pull Request review using the Gemini API.

## Development Commands

Run all commands from the project root:

```bash
# Install dependencies
npm install

# Start the local development server (at http://localhost:4321)
npm run dev

# Run the static analyzer and type check (Astro Check)
npm run check

# Build the static site for production (output in ./dist/)
npm run build

# Preview the production build locally before deploying
npm run preview
```

## Workflow (Git Flow)

To maintain the stability of the main branch (`main`), the following rules apply:

1. **Branches**: Direct pushing to `main` is not allowed. Always create a working branch:
   - `feature/change-name` for new features.
   - `fix/change-name` for bug fixes.
2. **Pull Requests**: Open a PR targeting `main` to integrate your changes.
3. **Validation**: Every PR executes the CI/CD action which installs dependencies, runs `astro check`, and builds the site. Additionally, the Gemini API performs an automatic code review of the modified code.
4. **Merging**: Use **Squash and Merge** and delete the working branch after completing the integration.

For more details on the technical behavior, configuration, and troubleshooting of the pipeline, see the [CI/CD Documentation](docs/ci-cd.md).
