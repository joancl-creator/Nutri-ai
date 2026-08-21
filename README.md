# Nutri AI — versión base

Aplicación PWA de diario nutricional personal.

## Incluye
- Registro de comidas.
- Alimentos y cantidades.
- Cálculo de kcal/proteína/carbohidratos/grasas.
- Objetivos diarios editables.
- Historial local.
- Progreso de los últimos 7 días.
- Interfaz responsive para iPhone.
- PWA y caché offline.
- Workflow preparado para GitHub Pages.

## Publicación
GitHub Pages puede publicar archivos estáticos directamente desde un repositorio. Este proyecto incluye `.github/workflows/deploy.yml`, que publica automáticamente cada push a `main`.

En GitHub:
1. Crea un repositorio público.
2. Sube todos los archivos respetando carpetas.
3. Ve a Settings → Pages.
4. En Source selecciona GitHub Actions.
5. Espera a que termine Actions.

La URL será similar a `https://TU-USUARIO.github.io/TU-REPOSITORIO/`.

## Próxima fase
Conectar un backend seguro para la IA. No se debe poner una API key de OpenAI/Anthropic en el JavaScript público de GitHub Pages.

## Nota nutricional
Los valores de `data/foods.json` son valores de referencia para el funcionamiento de la app. Para uso serio conviene ampliar y normalizar la base de datos con una fuente nutricional fiable y registrar marcas/recetas cuando sea necesario.


## Versión definitiva v2
- Corregido el cálculo de alimentos por unidad.
- Navegación entre fechas, selector de fecha y botón Hoy.
- Historial y progreso permiten abrir un día concreto.
- Exportación e importación de copia de seguridad JSON.
- Icono PNG 180×180 para iPhone.
- Aviso si falla la carga de la base de alimentos.
- Se eliminó el nombre hardcodeado de Joan: el perfil usa Usuario por defecto.
- No se añade ninguna función de fotos en Progreso.
