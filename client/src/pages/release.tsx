import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { StarRating } from "@/components/release/rating-display";
import { RatingInput } from "@/components/release/rating-input";
import { CommentBlock } from "@/components/comments/comment-block";
import { TrackList } from "@/components/TrackList";
import { useTracks } from "@/hooks/useTracks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Music, ExternalLink, ArrowLeft, Star, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useState } from "react";
import type { Release, Artist, Rating } from "@shared/schema";
import { createSafeImageProps } from "@/lib/imageValidation";

export default function Release() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const releaseId = parseInt(id || '0');
  
  // State for collapsible tracks on mobile
  const [isTracksExpanded, setIsTracksExpanded] = useState(false);

  const { data: release, isLoading } = useQuery<Release & { artist: Artist; averageRating: number; commentCount: number }>({
    queryKey: [`/api/releases/${releaseId}`],
    enabled: !!releaseId,
  });

  const { data: tracks, isLoading: tracksLoading } = useTracks(releaseId);



  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Загружаем релиз...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!release) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <Card>
            <CardContent className="p-12 text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">Релиз не найден</h1>
              <p className="text-muted-foreground">Релиз, который вы ищете, не существует.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const streamingLinks = release.streamingLinks as { appleMusic?: string } || {};

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Release Info & Tracks */}
          <div className="lg:col-span-1 space-y-6">
            {/* Release Header Info */}
            <Card className="p-6">
              <div className="space-y-4">
                {/* Cover */}
                <div className="aspect-square overflow-hidden rounded-xl max-w-[200px] mx-auto">
                  {release.coverUrl ? (
                    <img 
                      {...createSafeImageProps(release.coverUrl, '/placeholder-album.png')}
                      alt={`${release.title} cover`}
                      className="w-full h-full object-cover shadow-lg"
                      data-testid="img-release-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center rounded-xl">
                      <Music className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Release Info */}
                <div className="text-center space-y-3">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <h1 className="text-2xl font-bold text-foreground" data-testid="text-release-title">
                        {release.title}
                      </h1>
                      <button
                        onClick={() => setLocation(`/artist/${release.artist.id}`)}
                        className="text-lg text-primary hover:text-primary/80 transition-colors"
                        data-testid="link-artist"
                      >
                        {release.artist.name}
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full" data-testid="badge-type">
                        {(release as any).type === 'single' ? 'Сингл' : 'Альбом'}
                      </span>
                      {release.releaseDate && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(release.releaseDate).toLocaleDateString('ru-RU')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rating */}
                <div className="text-center border-t pt-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Рейтинг сообщества</h3>
                  <div className="space-y-1">
                    <span className="text-3xl font-bold text-primary block" data-testid="text-average-rating">
                      {release.averageRating && Number(release.averageRating) > 0 ? Number(release.averageRating).toFixed(1) : '—'}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {release.commentCount > 0 ? `На основе ${release.commentCount} оценок` : 'Пока нет оценок'}
                    </p>
                  </div>
                </div>

                {/* Streaming Links */}
                {streamingLinks.appleMusic && (
                  <div className="space-y-2 border-t pt-4">
                    <h3 className="text-sm font-semibold text-foreground text-center">Слушать на</h3>
                    <div className="flex justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        asChild
                        data-testid="link-apple-music"
                      >
                        <a href={streamingLinks.appleMusic} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Apple Music
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Tracks Section */}
            {tracks && tracks.length > 0 && (
              <Card className="p-6">
                {/* Tracks Header - Always visible */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Треки ({tracks.length})
                  </h3>
                  {/* Collapse button - only visible on mobile */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTracksExpanded(!isTracksExpanded)}
                    className="lg:hidden"
                  >
                    {isTracksExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                {/* Tracks Content */}
                <div className={`${isTracksExpanded ? 'block' : 'hidden'} lg:block`}>
                  <TrackList tracks={tracks} releaseTitle={release?.title || ''} />
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Comments */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <CommentBlock
                releaseId={releaseId}
                isAuthenticated={isAuthenticated}
                currentUserId={user?.id}
              />
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
