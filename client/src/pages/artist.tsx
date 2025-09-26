import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { ReleaseCard } from "@/components/release/release-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, ArrowLeft } from "lucide-react";
import type { Artist, Release } from "@shared/schema";

export default function Artist() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const artistId = parseInt(id || '0');

  const { data: artist, isLoading: artistLoading } = useQuery<Artist>({
    queryKey: ["/api/artists", artistId],
    enabled: !!artistId,
  });

  const { data: releases = [], isLoading: releasesLoading } = useQuery<(Release & { artist: Artist; averageRating: number; commentCount: number })[]>({
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
    setLocation(`/release/${releaseId}`);
  };

  if (artistLoading || releasesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
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
        <Footer />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <Card>
            <CardContent className="p-12 text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">Artist Not Found</h1>
              <p className="text-muted-foreground">The artist you're looking for doesn't exist.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Artist Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="text-artist-name">
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
      </main>

      <Footer />
    </div>
  );
}
