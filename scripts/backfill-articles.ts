#!/usr/bin/env tsx
/**
 * One-time backfill: a batch of evergreen field-guide articles, each pinned to
 * a specific historical day in June 2026 so the catalog reads as steady
 * publishing history rather than a single burst.
 *
 * Each entry uses the same generateForTopic() path as scripts/seed.ts (real
 * Brave-search research + a real LLM author). This repo's pipeline does not
 * take length options, so posts come out at the site's standard length.
 *
 * NEVER commits via Octokit: posts are written to the site's content directory
 * (content/<siteConfig.contentDirectory>/) and the local
 * content/.topic-log.json is updated, exactly like seed.ts. The companion
 * workflow (.github/workflows/backfill-articles.yml) commits the result.
 * Idempotent — an item whose signature is already in the log is skipped, and
 * the log is saved after each item, so a partial/interrupted run can simply be
 * re-dispatched.
 *
 * Requires the writer LLM key (`llm.apiKeyEnv` in site.config.ts) and
 * BRAVE_API_KEY (these topics have no source URL, so research relies on web
 * search). PEXELS_API_KEY is optional (hero images).
 *
 * Usage:
 *   npx tsx scripts/backfill-articles.ts         # run the whole batch
 *   npx tsx scripts/backfill-articles.ts --dry   # research+write the first item, write nothing
 */
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateForTopic } from '../src/lib/orchestrator/pipeline';
import { signature } from '../src/lib/orchestrator/score';
import type { TopicLog } from '../src/lib/orchestrator/types';
import { siteConfig } from '../src/site.config';

const LOG_PATH = path.join(process.cwd(), 'content', '.topic-log.json');
const POSTS_DIR = path.join(process.cwd(), 'content', siteConfig.contentDirectory);

const DELAY_MS = 2000;

interface BackfillItem {
  topic: string;
  date: string; // ISO
}

// Chronological, one per day at 12:00Z through June 2026. Evergreen explainers
// for this site's niche: future cities, new energy, off-world industry, and
// the systems and design decisions shaping the next century.
const BACKFILL_ITEMS: BackfillItem[] = [
  { topic: 'The 15-minute city: what it really means and why it became controversial', date: '2026-06-01T12:00:00.000Z' },
  { topic: 'Small modular reactors and the future of city-scale nuclear power', date: '2026-06-02T12:00:00.000Z' },
  { topic: 'Vertical farming: can food grow inside the cities that eat it', date: '2026-06-03T12:00:00.000Z' },
  { topic: 'How grid-scale batteries are reshaping the electric grid', date: '2026-06-04T12:00:00.000Z' },
  { topic: 'Green hydrogen explained: how it is made and what it can actually power', date: '2026-06-05T12:00:00.000Z' },
  { topic: 'Asteroid mining: how off-world resource extraction would actually work', date: '2026-06-06T12:00:00.000Z' },
  { topic: 'Space-based solar power: beaming energy from orbit down to Earth', date: '2026-06-07T12:00:00.000Z' },
  { topic: 'Enhanced geothermal energy: drilling for the heat beneath our feet', date: '2026-06-08T12:00:00.000Z' },
  { topic: 'Building on the Moon: turning lunar regolith into construction material', date: '2026-06-09T12:00:00.000Z' },
  { topic: 'Desalination and the future of water in fast-growing coastal cities', date: '2026-06-10T12:00:00.000Z' },
  { topic: 'Carbon capture technology: how it works and whether it can scale', date: '2026-06-11T12:00:00.000Z' },
  { topic: 'Why in-orbit manufacturing could become the first real space industry', date: '2026-06-12T12:00:00.000Z' },
  { topic: 'High-speed rail versus short-haul flights: the future of intercity travel', date: '2026-06-13T12:00:00.000Z' },
  { topic: 'Mass timber skyscrapers: building tall with wood instead of concrete', date: '2026-06-15T12:00:00.000Z' },
  { topic: 'District heating and cooling: decarbonizing cities one network at a time', date: '2026-06-16T12:00:00.000Z' },
  { topic: 'Fusion power: how close it really is and what the first plants will look like', date: '2026-06-17T12:00:00.000Z' },
  { topic: 'Smart grids: how cities balance renewable supply with real-time demand', date: '2026-06-18T12:00:00.000Z' },
  { topic: 'Floating cities and ocean urbanism: engineering habitable water', date: '2026-06-19T12:00:00.000Z' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function loadLocalLog(): Promise<TopicLog> {
  try {
    return JSON.parse(await fs.readFile(LOG_PATH, 'utf8')) as TopicLog;
  } catch {
    return { topics: [] };
  }
}

async function saveLocalLog(log: TopicLog): Promise<void> {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  await fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), 'utf8');
}

async function main() {
  const dryRun = process.argv.includes('--dry');

  const llmKeyEnv = siteConfig.llm.apiKeyEnv;
  if (!process.env[llmKeyEnv]?.trim()) {
    console.error(`✗ ${llmKeyEnv} is not set — it's required to write posts. See .env.example.`);
    process.exit(1);
  }
  if (!process.env.BRAVE_API_KEY?.trim()) {
    console.error(
      '✗ BRAVE_API_KEY is not set. These topics have no source URL of their own, ' +
        'so without web search there is nothing to research — every item would be skipped.'
    );
    process.exit(1);
  }

  let log = await loadLocalLog();
  const covered = new Set(log.topics.map((t) => t.signature));
  const queue = BACKFILL_ITEMS.filter((item) => !covered.has(signature(item.topic)));

  console.log(
    `→ ${BACKFILL_ITEMS.length} items in batch, ${queue.length} not yet covered.\n` +
      `→ ${dryRun ? 'DRY RUN (1 item, nothing written)' : `generating ${queue.length}`}…\n`
  );

  if (dryRun) {
    const item = queue[0] ?? BACKFILL_ITEMS[0];
    console.log(`Topic: ${item.topic}\nDate: ${item.date}\n`);
    const res = await generateForTopic(item.topic, {
      dryRun: true,
      date: new Date(item.date),
    });
    console.log(JSON.stringify({ ...res, mdx: res.mdx ? `[${res.mdx.length} bytes]` : undefined }, null, 2));
    if (res.mdx) {
      console.log('\n─── MDX preview (first 2000 chars) ───');
      console.log(res.mdx.slice(0, 2000));
    }
    return;
  }

  await fs.mkdir(POSTS_DIR, { recursive: true });
  let written = 0;
  let skipped = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    process.stdout.write(`[${i + 1}/${queue.length}] ${item.date.slice(0, 10)} — ${item.topic} … `);

    const res = await generateForTopic(item.topic, {
      dryRun: true,
      date: new Date(item.date),
    });

    if (!res.ok || !res.slug || !res.mdx) {
      console.log(`skip (${res.skipped ?? res.error ?? 'unknown'})`);
      skipped++;
      if (DELAY_MS > 0) await sleep(DELAY_MS);
      continue;
    }

    await fs.writeFile(path.join(POSTS_DIR, `${res.slug}.mdx`), res.mdx, 'utf8');
    log = {
      topics: [
        ...log.topics,
        {
          slug: res.slug,
          title: item.topic,
          url: '',
          publishedAt: item.date,
          signature: signature(item.topic),
        },
      ],
    };
    await saveLocalLog(log); // save after each so an interrupted run is resumable
    written++;
    console.log(`✓ ${res.slug} (${res.mdx.length} bytes)`);

    if (DELAY_MS > 0 && i < queue.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n✓ Done. Wrote ${written} post(s), skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
