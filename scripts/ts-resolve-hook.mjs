import { extname } from "node:path";

export async function resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !extname(specifier)) {
    try {
      return await next(`${specifier}.ts`, context);
    } catch {
      /* fall through to the normal resolution and its error */
    }
  }
  return next(specifier, context);
}
