import fs from 'node:fs';

export function getAllFilePaths(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  const updatedArrayOfFiles = [...arrayOfFiles];

  files.forEach(file => {
    if (fs.statSync(`${dirPath}/${file}`).isDirectory()) {
      getAllFilePaths(`${dirPath}/${file}`, updatedArrayOfFiles);
    } else {
      updatedArrayOfFiles.push(`${dirPath}/${file}`);
    }
  });

  return updatedArrayOfFiles;
}
