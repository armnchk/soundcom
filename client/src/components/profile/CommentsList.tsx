import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Music, MessageSquare, Calendar, ThumbsUp, ThumbsDown, ExternalLink, Star } from 'lucide-react';
import { useLocation } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';
import type { FilterOptions } from './ProfileFilters';
import { createSafeImageProps } from '@/lib/imageValidation';

interface Comment {
  id: number;
  text: string;
  rating?: number;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  release: {
    id: number;
    title: string;
    coverUrl?: string;
    releaseDate: string;
    artist: {
      id: number;
      name: string;
    };
  };
}

interface CommentsListProps {
  userId: string;
  filters: FilterOptions;
}

export function CommentsList({ userId, filters }: CommentsListProps) {
  const [, setLocation] = useLocation();

  const { data: comments = [], isLoading, error } = useQuery<Comment[]>({
    queryKey: ['/api/users', userId, 'comments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.artistFilter) params.append('artist', filters.artistFilter);
      if (filters.releaseFilter) params.append('release', filters.releaseFilter);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);

      const response = await fetch(`/api/users/${userId}/comments?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }
      return response.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <Skeleton className="w-12 h-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Ошибка загрузки отзывов</p>
        </CardContent>
      </Card>
    );
  }

  if (comments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Отзывов не найдено</h3>
          <p className="text-muted-foreground">
            {filters.search || filters.artistFilter || filters.releaseFilter
              ? 'Попробуйте изменить фильтры поиска'
              : 'Начните писать отзывы, чтобы они появились здесь'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <Card 
          key={comment.id}
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setLocation(`/release/${comment.release.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              {/* Cover */}
              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                {comment.release.coverUrl ? (
                  <img 
                    {...createSafeImageProps(comment.release.coverUrl, '/placeholder-album.png')}
                    alt={`${comment.release.title} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Music className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground text-sm truncate">
                        {comment.release.title}
                      </h4>
                      {comment.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span className="text-xs font-medium text-foreground">
                            {comment.rating}/10
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs truncate">
                      {comment.release.artist.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.release.releaseDate).getFullYear()}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/release/${comment.release.id}`);
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>

                {/* Comment text */}
                <div className="mb-3">
                  <p className="text-foreground text-sm leading-relaxed line-clamp-3">
                    {comment.text}
                  </p>
                </div>

                {/* Stats and date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-muted-foreground">
                        {comment.likeCount}
                      </span>
                    </div>
                    {comment.dislikeCount > 0 && (
                      <div className="flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-muted-foreground">
                          {comment.dislikeCount}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-muted-foreground">
                        Отзыв
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
