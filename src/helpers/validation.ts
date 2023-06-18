export function isValidUrl(url: string): boolean {
  return /^(https?:)?\/\//.test(url);
}

export function isEveryUrlValid(urls?: string[]): boolean {
  return (urls || []).every(isValidUrl);
}
