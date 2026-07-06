import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Podcast episodes. One markdown file per episode in src/content/episodes/.
const episodes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/episodes' }),
  schema: z.object({
    title: z.string(),
    episodeNumber: z.number(),
    guest: z.string().optional(),
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
    featured: z.boolean().default(false),
  }),
});

export const collections = { episodes };
