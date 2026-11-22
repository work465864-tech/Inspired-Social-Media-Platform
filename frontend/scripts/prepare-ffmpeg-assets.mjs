import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const sourceDirectory = resolve(
  process.cwd(),
  '../node_modules/@ffmpeg/core/dist/esm',
);
const targetDirectory = resolve(process.cwd(), 'public/ffmpeg');

await mkdir(targetDirectory, { recursive: true });

for (const filename of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  await copyFile(
    resolve(sourceDirectory, filename),
    resolve(targetDirectory, filename),
  );
}
