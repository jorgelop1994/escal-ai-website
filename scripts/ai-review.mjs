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
Analiza el siguiente git diff de un Pull Request para la web corporativa escal-ai.com.

Revisa detalladamente y busca posibles problemas relacionados con:
1. HTML semántico y accesibilidad (roles ARIA, etiquetas de formulario, contraste básico).
2. SEO (etiquetas alt en imágenes, jerarquía de títulos h1-h6, meta tags).
3. Rutas locales o enlaces problemáticos.
4. Rendimiento y optimización (CSS responsive, JavaScript innecesario).
5. Calidad del código (duplicidad, código muerto).
6. Seguridad (detección de contraseñas, secretos, tokens o claves de API expuestas).

Clasifica cada uno de los hallazgos en una de estas categorías de severidad:
- [CRITICAL] Problemas de seguridad graves (como credenciales expuestas) o fallos críticos que rompen la compilación o navegación.
- [HIGH] Problemas significativos de accesibilidad, SEO básico ausente o malas prácticas estructurales.
- [MEDIUM] Fallos de maquetación responsive, redundancia de CSS o lógica JavaScript mejorable.
- [LOW] Fallos menores de consistencia de estilo o código sobrante sin impacto mayor.
- [SUGGESTION] Oportunidades de mejora, refactorización limpia o comentarios constructivos.

Formato de respuesta:
Genera un informe directamente en formato Markdown, en español.
- Sé claro, constructivo y ve directo al grano.
- Incluye un breve resumen inicial indicando si el PR es seguro de integrar desde la perspectiva de mejores prácticas y seguridad.
- Si no encuentras ningún problema, felicita al desarrollador indicando que todo se ve excelente.

Aquí está el Git Diff a revisar:
\`\`\`diff
${diffContent}
\`\`\`
`;

  try {
    console.log('🤖 Enviando diff a Gemini para revisión automática...');
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

    console.log('\n--- REPORTE DE REVISIÓN CON IA ---\n');
    console.log(reviewText);
    console.log('\n---------------------------------\n');
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
