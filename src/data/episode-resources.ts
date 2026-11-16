import resourceCards from './episode-resources.json';

export type EpisodeResourceCard = {
  pillar: 'Financial literacy' | 'Veteran initiatives' | 'Ending poverty';
  episodeId: string;
  topic: string;
  idea: string;
  resources: {
    label: string;
    url: string;
    description: string;
    relationship: 'episode-notes' | 'team-selected';
  }[];
};

// See docs/episode-resources-audit.json for published-note and current-link sources.
export const episodeResources = resourceCards as EpisodeResourceCard[];
