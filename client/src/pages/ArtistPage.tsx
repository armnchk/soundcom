import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ReleaseCard } from "@/components/ReleaseCard";
import { Card, CardContent } from "@/components/ui/card";
import { Music } from "lucide-react";
import { useLocation } from "wouter";

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const artistId = parseInt(id || '0');

  const { data: artist, isLoading: artistLoading } = useQuery({
    queryKey: ["/api/artists", artistId],
    enabled: !!artistId,
  });

  const { data: releases = [], isLoading: releasesLoading } = useQuery({
    queryKey: ["/api/releases", { artistId }],
    enabled: !!artistId,
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { artistId: number }];
      const response = await fetch(`/api/releases?artistId=${params.artistId}`);
      if (!response.ok) throw new Error('Failed to fetch releases');
      return response.json();
    },
  });

  const handleReleaseClick = (releaseId: number) => {
    setLocation(`/releases/${releaseId}`);
  };

  if (artistLoading || releasesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="bg-muted h-8 w-64 rounded mb-8"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i}>
                  <div className="bg-muted rounded-lg aspect-square mb-3"></div>
                  <div className="bg-muted h-4 rounded mb-2"></div>
                  <div className="bg-muted h-3 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Artist Not Found</h1>
          <p className="text-muted-foreground">The artist you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Artist Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="artist-name">
            {artist.name}
          </h1>
          <p className="text-muted-foreground">
            {releases.length} release{releases.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Releases Grid */}
        {releases.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {releases.map((release: any) => (
              <ReleaseCard
                key={release.id}
                release={release}
                onClick={() => handleReleaseClick(release.id)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Releases</h3>
              <p className="text-muted-foreground">
                This artist doesn't have any releases in our database yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
