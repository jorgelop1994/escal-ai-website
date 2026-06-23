#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Define target model
const MODEL_NAME = 'gemini-2.5-flash';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY no configurado en el entorno. Saltando revisión con IA.');
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
      console.error(`❌ El archivo de diff especificado no existe: ${filePath}`);
      process.exit(1);
    }
  } else {
    // Read from stdin
    diffContent = await readStdin();
  }

  if (!diffContent || diffContent.trim() === '') {
    console.log('📝 No hay cambios en el diff para revisar.');
    process.exit(0);
  }

  // Check if diff is too large (Gemini can handle large inputs, but we should be mindful of token sizes)
  if (diffContent.length > 300000) {
    console.warn('⚠️ El diff es muy grande. Se truncará para la revisión de IA.');
    diffContent = diffContent.slice(0, 300000) + '\n\n... [DIFF TRUNCADO POR TAMAÑO] ...';
  }

  const prompt = `
Analyze the following git diff of a Pull Request for the corporate website escal-ai.com.

Review the diff in detail and check for:
1. Semantic HTML & Accessibility (ARIA roles, form labels, focus states, basic color contrast).
2. SEO (image alt tags, h1-h6 heading hierarchy, metadata).
3. Local routing or navigation issues.
4. Performance & Core Web Vitals (responsive CSS, unneeded JavaScript, layout shifts).
5. Code quality (duplication, dead code, modularity).
6. Security (exposed API keys, secrets, credentials, passwords).

Output Format Guidelines:
- The review MUST be in English.
- Format all findings using the **Conventional Comments** standard (https://conventionalcomments.org/).
  Each comment should follow the structure:
  \`<label> [decorations]: <subject>\`
  - **Labels**: Use \`praise\` (for positive feedback), \`suggestion\` (for improvements), \`issue\` (for bugs or defects), \`question\` (for clarifying queries), or \`thought\` (for general comments).
  - **Decorations**: Use \`[blocking]\` (for critical issues that must be fixed before merge, such as security secrets or broken builds) or \`[non-blocking]\` (for optional improvements or suggestions).
  - **Examples**:
    - \`issue [blocking]: API key is exposed in configuration.\`
    - \`suggestion [non-blocking]: Consider using <main> tag to improve layout landmark accessibility.\`
    - \`praise: Excellent work optimizing the hero CSS animation performance.\`

- Provide a concise summary at the beginning of the report indicating whether the PR is safe to merge.
- If no issues are found, congratulate the developer and let them know the PR looks perfect.

Here is the Git Diff to review:
\`\`\`diff
${diffContent}
\`\`\`
`;

  try {
    console.warn('🤖 Sending diff to Gemini for automatic review...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error en la API de Gemini: ${response.status} ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    const reviewText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reviewText) {
      throw new Error('Respuesta vacía o formato inesperado de la API de Gemini.');
    }

    console.warn('\n--- GEMINI AI REVIEW REPORT LOG ---\n');
    console.log(reviewText);
    console.warn('\n-----------------------------------\n');
  } catch (error) {
    console.warn(`⚠️ Advertencia: Error durante la revisión automática con Gemini API.`);
    console.warn(error.message);
    console.warn('El flujo continuará normalmente para no bloquear correcciones urgentes.');
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
