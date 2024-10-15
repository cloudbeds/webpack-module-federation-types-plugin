import fs from 'node:fs';

export function getAllFilePaths(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  let updatedArrayOfFiles = [...arrayOfFiles];

  files.forEach(file => {
    if (fs.statSync(`${dirPath}/${file}`).isDirectory()) {
      updatedArrayOfFiles = getAllFilePaths(`${dirPath}/${file}`, updatedArrayOfFiles);
    } else {
      updatedArrayOfFiles.push(`${dirPath}/${file}`);
    }
  });

  return updatedArrayOfFiles;
}
