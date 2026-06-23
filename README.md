# escal-ai-website

Sitio web corporativo de [escal-ai.com](https://escal-ai.com).

## Stack Tecnológico

- **Framework**: Astro (como generador de sitios estáticos).
- **Estilos y Scripts**: CSS Vanilla y JavaScript nativo mínimo (sin React, Vue ni Tailwind CSS).
- **Despliegue**: Cloudflare Pages (integración automática de Git).
- **CI/CD**: GitHub Actions para validaciones automáticas y revisión de Pull Requests con Gemini API.

## Comandos de Desarrollo

Ejecuta todos los comandos desde la raíz del proyecto:

```bash
# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo local (en http://localhost:4321)
npm run dev

# Ejecutar el analizador estático y verificación de tipos (Astro Check)
npm run check

# Compilar el sitio estático para producción (salida en ./dist/)
npm run build

# Previsualizar el build de producción localmente antes de desplegar
npm run preview
```

## Flujo de Trabajo (Git Flow)

Para mantener la estabilidad de la rama principal (`main`), se aplican las siguientes reglas:

1. **Ramas**: No está permitido hacer `push` directo a `main`. Crea siempre una rama de trabajo:
   - `feature/nombre-del-cambio` para nuevas características.
   - `fix/nombre-del-cambio` para correcciones.
2. **Pull Requests**: Abre un PR hacia `main` para integrar tus cambios.
3. **Validación**: Cada PR ejecuta la acción de CI/CD que instala dependencias, corre `astro check` y compila el sitio. Adicionalmente, la Gemini API realiza una revisión automática del código modificado.
4. **Fusión**: Utiliza **Squash and Merge** y elimina la rama de trabajo tras completar la integración.

Para más detalles sobre el funcionamiento técnico, configuración y resolución de problemas del pipeline, consulta la [Documentación de CI/CD](docs/ci-cd.md).
