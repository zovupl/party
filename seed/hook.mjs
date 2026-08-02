// Loader-hook: перенаправляет импорты Firebase CDN на локальную заглушку.
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('https://www.gstatic.com/firebasejs')) {
    return { url: new URL('./fbstub.mjs', import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
}
