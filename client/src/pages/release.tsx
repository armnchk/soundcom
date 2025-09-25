import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { StarRating } from "@/components/release/rating-display";
import { RatingInput } from "@/components/release/rating-input";
import { CommentBlock } from "@/components/comments/comment-block";
import { NicknameModal } from "@/components/modals/nickname-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Music, ExternalLink, ArrowLeft, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useState } from "react";
import type { Release, Artist, Rating } from "@shared/schema";

export default function Release() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(0);

  const releaseId = parseInt(id || '0');

  const { data: release, isLoading } = useQuery<Release & { artist: Artist; averageRating: number; commentCount: number }>({
    queryKey: [`/api/releases/${releaseId}`],
    enabled: !!releaseId,
  });

  useEffect(() => {
    if (isAuthenticated && !authLoading && user && !user.nickname) {
      setShowNicknameModal(true);
    }
  }, [isAuthenticated, authLoading, user]);


  const commentMutation = useMutation({
    mutationFn: async (data: { text: string; rating?: number }) => {
      await apiRequest('POST', `/api/releases/${releaseId}/comments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/releases/${releaseId}/comments`] });
      queryClient.invalidateQueries({ queryKey: [`/api/releases/${releaseId}`] });
      setCommentText("");
      setCommentRating(0);
      toast({ title: "Отзыв опубликован!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Не авторизован",
          description: "Вы не авторизованы. Выполняется вход...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCommentSubmit = () => {
    if (!commentText.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите текст комментария",
        variant: "destructive",
      });
      return;
    }
    commentMutation.mutate({
      text: commentText,
      rating: commentRating || undefined,
    });
  };


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
              <p className="text-muted-foreground mb-4">Релиз, который вы ищете, не существует.</p>
              <Button onClick={() => setLocation("/")} data-testid="button-go-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                На главную
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const streamingLinks = release.streamingLinks as { spotify?: string; appleMusic?: string } || {};

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Release Header Info */}
        <Card className="p-6 md:p-8 mb-8">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground" data-testid="text-release-title">
                  {release.title}
                </h1>
                <span className="px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full" data-testid="badge-type">
                  {(release as any).type === 'single' ? 'Сингл' : 'Альбом'}
                </span>
              </div>
              <button
                onClick={() => setLocation(`/artist/${release.artist.id}`)}
                className="text-xl text-primary hover:text-primary/80 transition-colors block mb-1"
                data-testid="link-artist"
              >
                {release.artist.name}
              </button>
              <p className="text-muted-foreground">
                Выпущен {release.releaseDate ? new Date(release.releaseDate).toLocaleDateString('ru-RU') : 'Неизвестно'}
              </p>
            </div>
            
            {/* Average Rating Display */}
            <div className="flex items-center gap-8">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Рейтинг сообщества</h3>
                <div className="flex items-center space-x-3">
                  <span className="text-4xl font-bold text-primary" data-testid="text-average-rating">
                    {release.averageRating && Number(release.averageRating) > 0 ? Number(release.averageRating).toFixed(1) : '—'}
                  </span>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {release.commentCount > 0 ? `На основе ${release.commentCount} оценок` : 'Пока нет оценок'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Streaming Links */}
              {(streamingLinks.spotify || streamingLinks.appleMusic) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Слушать на</h3>
                  <div className="flex space-x-2">
                    {streamingLinks.spotify && (
                      <Button
                        variant="secondary"
                        size="sm"
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
                        size="sm"
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
        </Card>

        {/* Content Grid */}
        <Card className="p-6 md:p-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Cover */}
            <div className="md:col-span-1">
              <div className="aspect-square overflow-hidden rounded-xl">
                {release.coverUrl ? (
                  <img 
                    src={release.coverUrl} 
                    alt={`${release.title} cover`}
                    className="w-full h-full object-cover shadow-lg"
                    data-testid="img-release-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center rounded-xl">
                    <Music className="w-24 h-24 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Comments Section */}
            <div className="md:col-span-2 space-y-6">
              {/* Comments List */}
              <CommentBlock
                releaseId={releaseId}
                isAuthenticated={isAuthenticated}
                currentUserId={user?.id}
              />
            </div>
          </div>
        </Card>
      </main>

      <Footer />
      
      {/* Nickname Modal */}
      <NicknameModal
        open={showNicknameModal}
        onClose={() => setShowNicknameModal(false)}
      />
    </div>
  );
}
