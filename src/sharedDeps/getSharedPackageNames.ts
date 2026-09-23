import type { FederationConfig } from '../models';

/**
 * Package names from a Module Federation `shared` option, which may be a list of names,
 * a map of name to config, or a list mixing both. Prefix shares (`'@scope/'`) are not packages.
 */
export function getSharedPackageNames(shared: FederationConfig['shared']): string[] {
  if (!shared) {
    return [];
  }

  const items = Array.isArray(shared) ? shared : [shared];
  const names = items.flatMap(item => (typeof item === 'string' ? [item] : Object.keys(item)));

  return [...new Set(names)].filter(name => !name.endsWith('/'));
}
