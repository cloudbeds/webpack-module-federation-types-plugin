export function toCamelCase(stringInKebabCase: string): string {
  return stringInKebabCase
    .replace(/-(\w)/g, (_, group) => group.toUpperCase());
}
