export function isEveryUrlValid(urls?: string[]): boolean {
  return (urls || []).every(url => /^(https?:)?\/\//.test(url));
}
