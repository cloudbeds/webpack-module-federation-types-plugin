import fs from 'fs';

export function getAllFilePaths(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    if (fs.statSync(`${dirPath}/${file}`).isDirectory()) {
      arrayOfFiles = getAllFilePaths(`${dirPath}/${file}`, arrayOfFiles);
    } else {
      arrayOfFiles.push(`./${dirPath}/${file}`);
    }
  })

  return arrayOfFiles;
}
