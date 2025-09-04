import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { StarRating } from "@/components/StarRating";
import { CommentItem } from "@/components/CommentItem";
import { CommentForm } from "@/components/CommentForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music, ExternalLink } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function ReleasePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'likes'>('date');

  const releaseId = parseInt(id || '0');

  const { data: release, isLoading } = useQuery({
    queryKey: ["/api/releases", releaseId],
    enabled: !!releaseId,
  });

  const { data: userRating } = useQuery({
    queryKey: ["/api/releases", releaseId, "user-rating"],
    enabled: !!releaseId && isAuthenticated,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["/api/releases", releaseId, "comments", { sortBy }],
    enabled: !!releaseId,
    queryFn: async ({ queryKey }) => {
      const [, releaseId, , params] = queryKey as [string, number, string, { sortBy: string }];
      const response = await fetch(`/api/releases/${releaseId}/comments?sortBy=${params.sortBy}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (data: { text?: string; rating?: number; isAnonymous: boolean }) => {
      await apiRequest('POST', `/api/releases/${releaseId}/comments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases", releaseId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases", releaseId] });
      toast({ title: "Comment submitted successfully!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Failed to submit comment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async ({ commentId, reactionType }: { commentId: number; reactionType: 'like' | 'dislike' }) => {
      await apiRequest('POST', `/api/comments/${commentId}/react`, { reactionType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases", releaseId, "comments"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Failed to react to comment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async ({ commentId, reason }: { commentId: number; reason: string }) => {
      await apiRequest('POST', `/api/comments/${commentId}/report`, { reason });
    },
    onSuccess: () => {
      toast({ title: "Comment reported successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Failed to report comment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading release...</div>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Release Not Found</h1>
          <p className="text-muted-foreground">The release you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const streamingLinks = release.streamingLinks as { spotify?: string; appleMusic?: string } || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 md:p-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Release Info */}
            <div className="md:col-span-1">
              <div className="aspect-square mb-6 overflow-hidden rounded-xl">
                {release.coverUrl ? (
                  <img 
                    src={release.coverUrl} 
                    alt={`${release.title} cover`}
                    className="w-full h-full object-cover shadow-lg"
                    data-testid="release-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center rounded-xl">
                    <Music className="w-24 h-24 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-1" data-testid="release-title">
                    {release.title}
                  </h1>
                  <p className="text-lg text-muted-foreground" data-testid="artist-name">
                    {release.artist.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Released {new Date(release.releaseDate).toLocaleDateString()}
                  </p>
                </div>
                
                {/* Average Rating Display */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Community Rating</h3>
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl font-bold text-primary" data-testid="average-rating">
                        {release.averageRating.toFixed(1)}
                      </span>
                      <div>
                        <StarRating rating={release.averageRating} maxRating={10} size="sm" />
                        <p className="text-xs text-muted-foreground mt-1">
                          Based on ratings
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* User's Rating */}
                {userRating && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-foreground mb-2">Your Rating</h3>
                      <StarRating rating={userRating.score} maxRating={10} size="sm" />
                    </CardContent>
                  </Card>
                )}

                {/* Streaming Links */}
                {(streamingLinks.spotify || streamingLinks.appleMusic) && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Listen On</h3>
                    <div className="flex flex-col space-y-2">
                      {streamingLinks.spotify && (
                        <Button
                          variant="secondary"
                          className="justify-start"
                          asChild
                          data-testid="link-spotify"
                        >
                          <a href={streamingLinks.spotify} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Spotify
                          </a>
                        </Button>
                      )}
                      {streamingLinks.appleMusic && (
                        <Button
                          variant="secondary"
                          className="justify-start"
                          asChild
                          data-testid="link-apple-music"
                        >
                          <a href={streamingLinks.appleMusic} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Apple Music
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comments and Ratings Section */}
            <div className="md:col-span-2">
              {/* Rate This Release */}
              {isAuthenticated && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Rate This Release</h3>
                  <CommentForm
                    onSubmit={(data) => commentMutation.mutate(data)}
                    isLoading={commentMutation.isPending}
                  />
                </div>
              )}

              {/* Comments Filter */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Reviews & Comments</h3>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="rating">Sort by Rating</SelectItem>
                    <SelectItem value="likes">Sort by Likes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Comments List */}
              <div className="space-y-6">
                {comments.map((comment: any) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUserId={user?.id}
                    onLike={(commentId) => reactionMutation.mutate({ commentId, reactionType: 'like' })}
                    onDislike={(commentId) => reactionMutation.mutate({ commentId, reactionType: 'dislike' })}
                    onReport={(commentId) => reportMutation.mutate({ commentId, reason: 'Inappropriate content' })}
                  />
                ))}

                {comments.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">
                      No comments yet. {isAuthenticated ? "Be the first to share your thoughts!" : "Sign in to leave a comment."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
