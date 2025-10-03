import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Clock } from 'lucide-react';

interface Track {
  id: number;
  title: string;
  title_short: string;
  duration: number;
  rank: number;
  explicit_lyrics?: boolean;
  artist?: {
    id: number;
    name: string;
  };
}

interface TrackListProps {
  tracks: Track[];
  releaseTitle: string;
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const TrackList: React.FC<TrackListProps> = ({ tracks, releaseTitle }) => {
  if (!tracks || tracks.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="space-y-1">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs text-muted-foreground font-mono w-6">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium truncate">
                    {track.title_short || track.title}
                  </span>
                  {track.explicit_lyrics && (
                    <Badge variant="destructive" className="text-xs px-1 py-0">
                      E
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">
                {formatDuration(track.duration)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
