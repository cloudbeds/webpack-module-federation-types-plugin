import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import download from 'download';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { setLogger } from '../../../helpers';
import { downloadRemoteEntrySharedDeps } from '../downloadRemoteEntrySharedDeps';

vi.mock('download', () => ({ default: vi.fn() }));

const mockDownload = vi.mocked(download);
const mockLogger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
setLogger(mockLogger);

const sharedDepsUrl = 'https://app1.example.com/dist/@types/shared-deps.json';
const manifest = { '@cloudbeds/ui-library': '2.237.0', react: '18.3.1' };

let dirDownloadedTypes: string;
let outFile: string;

function httpError(statusCode: number) {
  return Object.assign(new Error(`Response code ${statusCode}`), { statusCode });
}

beforeEach(() => {
  dirDownloadedTypes = fs.mkdtempSync(path.join(os.tmpdir(), 'remotes-'));
  outFile = path.join(dirDownloadedTypes, 'mfdApp1', 'shared-deps.json');
});

afterEach(() => {
  fs.rmSync(dirDownloadedTypes, { recursive: true, force: true });
});

describe('downloadRemoteEntrySharedDeps', () => {
  test('stores the manifest next to the remote types and returns it', async () => {
    mockDownload.mockResolvedValue(Buffer.from(JSON.stringify(manifest)) as never);

    const result = await downloadRemoteEntrySharedDeps(
      'mfdApp1',
      sharedDepsUrl,
      dirDownloadedTypes,
    );

    expect(result).toEqual(manifest);
    expect(JSON.parse(fs.readFileSync(outFile, 'utf8'))).toEqual(manifest);
    expect(mockDownload).toHaveBeenCalledWith(sharedDepsUrl, expect.any(Object));
  });

  test('treats a remote that publishes no manifest as having nothing to check', async () => {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, '{"react":"17.0.0"}');
    mockDownload.mockRejectedValue(httpError(404));

    const result = await downloadRemoteEntrySharedDeps(
      'mfdApp1',
      sharedDepsUrl,
      dirDownloadedTypes,
    );

    expect(result).toBeUndefined();
    expect(fs.existsSync(outFile)).toBe(false);
    expect(mockLogger.log).toHaveBeenCalledWith(
      'mfdApp1 publishes no shared-deps.json, skipping shared versions check',
    );
  });

  test('rethrows any other download failure', async () => {
    mockDownload.mockRejectedValue(httpError(500));

    await expect(
      downloadRemoteEntrySharedDeps('mfdApp1', sharedDepsUrl, dirDownloadedTypes),
    ).rejects.toThrow('Response code 500');
  });
});
