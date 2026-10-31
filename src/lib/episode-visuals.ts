import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import type { CollectionEntry } from 'astro:content';

const assets = import.meta.glob<ImageMetadata>('../assets/{guests,shows}/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
type Visual = CollectionEntry<'episodes'>['data']['episodeVisuals'][number];

export async function resolveEpisodeVisuals(visuals: Visual[]) {
  return Promise.all(visuals.map(async visual => {
    const src = assets[`../assets${visual.src}`];
    if (!src) throw new Error(`Episode image is missing: ${visual.src}`);
    const image = await getImage({ src, width: 304, format: 'webp', quality: 85 });
    return { ...visual, image };
  }));
}
