import { useQuery } from '@tanstack/react-query';

interface Track {
  id: number;
  title: string;
  title_short: string;
  duration: number;
  rank: number;
  explicit_lyrics: boolean;
  artist: {
    id: number;
    name: string;
  };
}

export const useTracks = (releaseId: number) => {
  return useQuery<Track[]>({
    queryKey: ['/api/releases', releaseId, 'tracks'],
    queryFn: async () => {
      const response = await fetch(`/api/releases/${releaseId}/tracks`);
      if (!response.ok) {
        throw new Error('Failed to fetch tracks');
      }
      return response.json();
    },
    enabled: !!releaseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
