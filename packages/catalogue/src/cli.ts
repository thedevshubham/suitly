import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { normalizeShopifyCsv } from './normalize-shopify-csv.js';

const argumentsMap = parseArguments(process.argv.slice(2));
const inputPath = requiredArgument(argumentsMap, 'input');
const productsPath = requiredArgument(argumentsMap, 'products');
const reportPath = requiredArgument(argumentsMap, 'report');
const currency = requiredArgument(argumentsMap, 'currency');

const csv = await readFile(resolve(inputPath), 'utf8');
const result = normalizeShopifyCsv(csv, {
  currency,
  sourceFile: inputPath,
});

await Promise.all([
  writeJson(productsPath, result.products),
  writeJson(reportPath, result.report),
]);

process.stdout.write(
  [
    `Normalized ${result.report.parsedProducts} products`,
    `${result.report.parsedVariants} variants`,
    `${result.report.availableVariants} available`,
    `${result.report.issues.length} reported issues`,
  ].join(', ') + '\n',
);

function parseArguments(args: string[]): Map<string, string> {
  const parsed = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const argumentValue = args[index + 1];
    if (key?.startsWith('--') !== true || argumentValue === undefined) {
      throw new Error(`Invalid CLI arguments near: ${key ?? '<end>'}`);
    }
    parsed.set(key.slice(2), argumentValue);
  }
  return parsed;
}

function requiredArgument(args: Map<string, string>, key: string): string {
  const argument = args.get(key);
  if (argument === undefined || argument.length === 0) {
    throw new Error(`Missing required argument: --${key}`);
  }
  return argument;
}

async function writeJson(path: string, data: unknown): Promise<void> {
  const resolvedPath = resolve(path);
  await mkdir(dirname(resolvedPath), { recursive: true });
  await writeFile(resolvedPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
