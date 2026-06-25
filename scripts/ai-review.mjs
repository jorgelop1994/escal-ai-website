#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Define target models in order of priority (Plan A, Plan B, etc.)
const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY is not configured in the environment. Skipping AI review.');
    process.exit(0);
  }

  // Get diff content from file argument or stdin
  let diffContent = '';
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    const filePath = path.resolve(args[0]);
    if (fs.existsSync(filePath)) {
      diffContent = fs.readFileSync(filePath, 'utf8');
    } else {
      console.error(`❌ The specified diff file does not exist: ${filePath}`);
      process.exit(1);
    }
  } else {
    // Read from stdin
    diffContent = await readStdin();
  }

  if (!diffContent || diffContent.trim() === '') {
    console.log('📝 No changes found in the diff to review.');
    process.exit(0);
  }

  // Check if diff is too large. If it is too large to safely analyze, block the PR to enforce small commits.
  if (diffContent.length > 300000) {
    const errorMsg = '❌ Error: PR diff is too large (> 300,000 characters) to be safely analyzed by the AI. Please split this PR into smaller, modular changes.';
    console.log(errorMsg);
    console.error(errorMsg);
    process.exit(1);
  }

  const prTitle = process.env.PR_TITLE || '';
  const prBody = process.env.PR_BODY || '';
  const prNumber = process.env.PR_NUMBER || '';

  let issueContent = '';
  const issuesFilePath = path.resolve('pr_issues.txt');
  if (fs.existsSync(issuesFilePath)) {
    try {
      issueContent = fs.readFileSync(issuesFilePath, 'utf8');
      console.warn(`✔ Read linked issues context from pr_issues.txt (${issueContent.length} chars)`);
    } catch (err) {
      console.warn(`⚠️ Warning: Failed to read pr_issues.txt: ${err.message}`);
    }
  }

  let prContext = '';
  if (prTitle || prBody || prNumber || issueContent) {
    prContext = `PR Number: #${prNumber || 'unknown'}
PR Title: ${prTitle || 'No title provided'}
PR Description:
${prBody || 'No description provided.'}
${issueContent ? `\nResolved/Linked Issues Details:\n${issueContent}` : ''}
`;
  }

  const systemInstructionText = `You are a senior code reviewer and security auditor for the corporate website escal-ai.com.
Your task is to analyze the git diff of a Pull Request.

Review the diff in detail and check for:
1. Semantic HTML & Accessibility (ARIA roles, form labels, focus states, basic color contrast).
2. SEO (image alt tags, h1-h6 heading hierarchy, metadata).
3. Local routing or navigation issues.
4. Performance & Core Web Vitals (responsive CSS, unneeded JavaScript, layout shifts).
5. Code quality (duplication, dead code, modularity).
6. Security & Leak Detection:
   - Check for exposed API keys, secrets, credentials, passwords, or private keys.
   - Check for obfuscated code or suspicious decoding functions (e.g. atob, eval, dynamic Function, Base64/Hex decoding of image/binary payloads) that could indicate dynamic code injection or steganography vulnerabilities.

Guidelines for PR & Issues Context:
- Understand the context of this PR using the provided PR Title, PR Description, and Linked Issues Details.
- If this PR is specifically intended to fix a bug, implement a suggestion, or close an issue (e.g., resolving a previously reported suggestion or feedback), do NOT raise suggestions that caution against or repeat the very fix the PR is implementing.
- Acknowledge the fix or remain silent about it if it is implemented correctly, rather than warning about its potential side effects or raising a redundant non-blocking suggestion.
- Focus suggestions only on actual new bugs or completely unrelated issues introduced by the changes.

Output Format Guidelines:
- The review MUST be in English.
- Format all findings using the **Conventional Comments** standard (https://conventionalcomments.org/).
  Each comment should follow the structure:
  \`<label> [decorations]: <subject>\`
  - **Labels**: Use \`praise\` (for positive feedback), \`suggestion\` (for improvements), \`issue\` (for bugs or defects), \`question\` (for clarifying queries), or \`thought\` (for general comments).
  - **Decorations**: Use \`[blocking]\` (for critical issues that must be fixed before merge, such as security secrets or broken builds) or \`[non-blocking]\` (for optional improvements or suggestions).
  - **Examples**:
    - \`issue [blocking]: API key is exposed in configuration.\`
    - \`issue [blocking]: Suspicious base64 decoder found which might execute hidden payloads.\`
    - \`suggestion [non-blocking]: Consider using <main> tag to improve layout landmark accessibility.\`
    - \`praise: Excellent work optimizing the hero CSS animation performance.\`

- Provide a concise summary at the beginning of the report indicating whether the PR is safe to merge.
- If no issues are found, congratulate the developer and let them know the PR looks perfect.`;

  const userContentText = `Here is the context of the Pull Request being reviewed:
${prContext ? prContext : 'No PR or Issue context metadata was provided.'}

Here is the Git Diff of the changes:
\`\`\`diff
${diffContent}
\`\`\`
`;

  let success = false;
  let reviewText = '';

  try {
    for (const model of MODELS) {
      try {
        console.warn(`🤖 Sending diff to Gemini (${model}) for automatic review...`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [
                  {
                    text: systemInstructionText,
                  },
                ],
              },
              contents: [
                {
                  parts: [
                    {
                      text: userContentText,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`⚠️ Warning: Model ${model} failed with status ${response.status}. Trying fallback...`);
          console.warn(errText);
          continue;
        }

        const data = await response.json();
        reviewText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!reviewText || reviewText.trim() === '') {
          console.warn(`⚠️ Warning: Empty response from model ${model}. Trying fallback...`);
          continue;
        }

        success = true;
        console.warn(`✔ Automatic review succeeded with model: ${model}`);
        break;
      } catch (e) {
        console.warn(`⚠️ Warning: Request error with model ${model} (${e.message}). Trying fallback...`);
      }
    }

    if (!success) {
      throw new Error('All configured Gemini models failed or returned empty responses.');
    }

    console.warn('\n--- GEMINI AI REVIEW REPORT LOG ---\n');
    console.log(reviewText);
    console.warn('\n-----------------------------------\n');

    // Use a precise regex to check for actual blocking findings (e.g. "issue [blocking]:") to avoid matching conversational mentions of "[blocking]".
    const hasBlocking = /(?:^|\n)\s*(?:[-*+]\s+)?(?:issue|suggestion|thought|question|praise)\s+\[\s*blocking\s*\]\s*:/i.test(reviewText);
    if (hasBlocking) {
      const errorMsg = '\n❌ PR Review failed: Gemini detected blocking issues (such as security vulnerabilities or credentials leaks). Please fix them before merging.';
      console.log(errorMsg);
      console.error(errorMsg);
      process.exit(1);
    }
  } catch (error) {
    console.warn(`⚠️ Warning: Error during automatic review with Gemini API.`);
    console.warn(error.message);
    console.warn('The workflow will continue normally to avoid blocking urgent fixes.');
    process.exit(0);
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    
    // Set a timeout in case stdin is kept open indefinitely without input
    setTimeout(() => {
      if (data === '') {
        resolve('');
      }
    }, 1000);
  });
}

main();
