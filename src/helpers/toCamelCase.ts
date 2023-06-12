export function toCamelCase(kebabCase: string): string {
  return kebabCase
    .replace(/-(\w)/g, (_, group) => group.toUpperCase());
}
