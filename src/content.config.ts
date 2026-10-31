import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// Podcast episodes. One markdown file per episode in src/content/episodes/.
const episodes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/episodes' }),
  schema: z.object({
    title: z.string(),
    episodeNumber: z.number(),
    guest: z.string().optional(),
    // Curated from approved show notes; never inferred by the feed sync.
    listenerQuestion: z.string().trim().min(10).max(140).optional(),
    episodeVisuals: z.array(z.object({
      src: z.string().regex(/^\/(guests|shows)\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/),
      alt: z.string().trim().min(2).max(160),
      kind: z.enum(['portrait', 'show', 'episode-artwork']).default('portrait'),
      position: z.enum(['center 15%', 'center 28%', 'center 30%', 'center 35%', 'center']).default('center'),
      zoom: z.number().min(1).max(2.5).default(1),
    })).max(3).default([]),
    guestAppearance: z.object({
      show: z.string().trim().min(2).max(120),
      host: z.string().trim().min(2).max(100),
      url: z.string().url().startsWith('https://'),
    }).optional(),
    description: z.string(),
    pubDate: z.coerce.date(),
    duration: z.string().optional(),
    spotifyUrl: z.string().url().optional(),
    appleUrl: z.string().url().optional(),
    youtubeUrl: z.string().url().optional(),
    // Inline player sources (optional). youtubeId -> video embed; audioUrl -> audio player.
    youtubeId: z.string().optional(),
    spotifyEpisodeId: z.string().optional(),
    audioUrl: z.string().url().optional(),
    artwork: z.string().url().optional(),
    // RSS <guid>. Written by scripts/sync-episodes.mjs so a synced episode is
    // matched exactly on later runs and never duplicated.
    guid: z.string().optional(),
    featured: z.boolean().default(false),
    // A cross-post / special that the podcast feed does not give a mainline number to
    // (e.g. a guest-hosted feature). Shown as "Bonus" instead of "Episode N".
    bonus: z.boolean().default(false),
  }),
});

export const collections = { episodes };
