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
  const [userRating, setUserRating] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(0);

  const releaseId = parseInt(id || '0');

  const { data: release, isLoading } = useQuery<Release & { artist: Artist; averageRating: number; commentCount: number }>({
    queryKey: [`/api/releases/${releaseId}`],
    enabled: !!releaseId,
  });

  const { data: currentUserRating } = useQuery<Rating>({
    queryKey: [`/api/releases/${releaseId}/user-rating`],
    enabled: !!releaseId && isAuthenticated,
  });

  useEffect(() => {
    if (isAuthenticated && !authLoading && user && !user.nickname) {
      setShowNicknameModal(true);
    }
  }, [isAuthenticated, authLoading, user]);

  useEffect(() => {
    if (currentUserRating) {
      setUserRating(currentUserRating.score);
    }
  }, [currentUserRating]);

  const ratingMutation = useMutation({
    mutationFn: async (score: number) => {
      await apiRequest('POST', `/api/releases/${releaseId}/rate`, { score });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/releases/${releaseId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/releases/${releaseId}/user-rating`] });
      toast({ title: "Оценка сохранена!" });
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
        title: "Ошибка при сохранении оценки", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

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

  const handleRatingSubmit = (newRating: number) => {
    setUserRating(newRating);
    ratingMutation.mutate(newRating);
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
                    data-testid="img-release-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center rounded-xl">
                    <Music className="w-24 h-24 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold text-foreground" data-testid="text-release-title">
                      {release.title}
                    </h1>
                    <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full" data-testid="badge-type">
                      {(release as any).type === 'single' ? 'Сингл' : 'Альбом'}
                    </span>
                  </div>
                  <button
                    onClick={() => setLocation(`/artist/${release.artist.id}`)}
                    className="text-lg text-primary hover:text-primary/80 transition-colors"
                    data-testid="link-artist"
                  >
                    {release.artist.name}
                  </button>
                  <p className="text-sm text-muted-foreground">
                    Выпущен {release.releaseDate ? new Date(release.releaseDate).toLocaleDateString('ru-RU') : 'Неизвестно'}
                  </p>
                </div>
                
                {/* Average Rating Display */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Рейтинг сообщества</h3>
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl font-bold text-primary" data-testid="text-average-rating">
                        {release.averageRating && Number(release.averageRating) > 0 ? Number(release.averageRating).toFixed(1) : '—'}
                      </span>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {release.commentCount > 0 ? `На основе ${release.commentCount} оценок` : 'Пока нет оценок'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Streaming Links */}
                {(streamingLinks.spotify || streamingLinks.appleMusic) && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Слушать на</h3>
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

            {/* Comments Section */}
            <div className="md:col-span-2 space-y-6">
              {/* Add Comment Form */}
              {isAuthenticated ? (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Оставить отзыв и оценку</h3>
                    <div className="space-y-4">
                      {/* Rating Input */}
                      <div className="space-y-2">
                        <span className="text-sm font-medium text-foreground">Ваша оценка:</span>
                        <div className="flex items-center space-x-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                            <button
                              key={rating}
                              className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                                rating === userRating
                                  ? 'bg-primary text-primary-foreground'
                                  : rating === commentRating
                                  ? 'bg-secondary text-secondary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                              }`}
                              data-testid={`button-rating-${rating}`}
                              onClick={() => {
                                if (userRating === 0) {
                                  // Если пользователь еще не оценивал, сразу сохраняем его оценку
                                  handleRatingSubmit(rating);
                                }
                                setCommentRating(rating);
                              }}
                            >
                              {rating}
                            </button>
                          ))}
                          {userRating > 0 && (
                            <span className="text-sm text-muted-foreground ml-2">
                              (Ваша оценка: {userRating})
                            </span>
                          )}
                        </div>
                        {ratingMutation.isPending && (
                          <p className="text-xs text-muted-foreground">Сохраняем оценку...</p>
                        )}
                      </div>
                      
                      <Textarea
                        placeholder="Поделитесь своими впечатлениями о релизе..."
                        className="min-h-[120px]"
                        data-testid="input-comment"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button 
                          data-testid="button-submit-comment"
                          onClick={handleCommentSubmit}
                          disabled={commentMutation.isPending || !commentText.trim()}
                        >
                          {commentMutation.isPending ? "Отправляем..." : "Опубликовать отзыв"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground mb-4">Войдите, чтобы оставить отзыв и оценку</p>
                    <Button onClick={() => window.location.href = "/api/login"}>
                      Войти
                    </Button>
                  </CardContent>
                </Card>
              )}

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
