import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exportWorkerPath = resolve(projectRoot, "node_modules/next/dist/export/index.js");

const helperNeedle = "const exportPagesInBatches = async (worker, exportPaths, renderResumeDataCachesByPage)=>{";
const helperReplacement = `${helperNeedle}
        const makeCloneable = (value, seen = new WeakMap())=>{
            if (typeof value === 'function') {
                return undefined;
            }
            if (value === null || typeof value !== 'object') {
                return value;
            }
            if (value instanceof Date) {
                return new Date(value.getTime());
            }
            if (value instanceof RegExp) {
                return value;
            }
            if (seen.has(value)) {
                return seen.get(value);
            }
            if (Array.isArray(value)) {
                const clone = [];
                seen.set(value, clone);
                for (const item of value){
                    clone.push(makeCloneable(item, seen));
                }
                return clone;
            }
            const clone = {};
            seen.set(value, clone);
            for (const [key, nestedValue] of Object.entries(value)){
                const sanitizedValue = makeCloneable(nestedValue, seen);
                if (sanitizedValue !== undefined) {
                    clone[key] = sanitizedValue;
                }
            }
            return clone;
        };`;

const callNeedle = `return (await Promise.all(batches.map(async (batch)=>worker.exportPages({
                buildId,
                exportPaths: batch,
                parentSpanId: span.getId(),
                pagesDataDir,
                renderOpts,
                options,
                dir,
                distDir,
                outDir,
                nextConfig,
                cacheHandler: nextConfig.cacheHandler,
                cacheMaxMemorySize: nextConfig.cacheMaxMemorySize,
                fetchCache: true,
                fetchCacheKeyPrefix: nextConfig.experimental.fetchCacheKeyPrefix,
                renderResumeDataCachesByPage
            })))).flat();`;

const callReplacement = `return (await Promise.all(batches.map(async (batch)=>{
            const workerArgs = {
                buildId,
                exportPaths: batch,
                parentSpanId: span.getId(),
                pagesDataDir,
                renderOpts,
                options,
                dir,
                distDir,
                outDir,
                nextConfig,
                cacheHandler: nextConfig.cacheHandler,
                cacheMaxMemorySize: nextConfig.cacheMaxMemorySize,
                fetchCache: true,
                fetchCacheKeyPrefix: nextConfig.experimental.fetchCacheKeyPrefix,
                renderResumeDataCachesByPage
            };
            return worker.exportPages(makeCloneable(workerArgs));
        }))).flat();`;

function main() {
  if (!existsSync(exportWorkerPath)) {
    console.log("[fix-next-export-worker] next export worker not found, skipping.");
    return;
  }

  const source = readFileSync(exportWorkerPath, "utf8");

  if (source.includes("return worker.exportPages(makeCloneable(workerArgs));")) {
    console.log("[fix-next-export-worker] patch already applied.");
    return;
  }

  if (!source.includes(helperNeedle) || !source.includes(callNeedle)) {
    throw new Error(
      "[fix-next-export-worker] unsupported next/dist/export/index.js shape. Revisit the worker patch for this Next.js version.",
    );
  }

  const withHelper = source.replace(helperNeedle, helperReplacement);
  const patched = withHelper.replace(callNeedle, callReplacement);

  writeFileSync(exportWorkerPath, patched);
  console.log("[fix-next-export-worker] patched Next export worker for worker-thread-safe build payloads.");
}

main();
