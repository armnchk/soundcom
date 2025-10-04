import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Music, Star, Calendar, MessageSquare, ExternalLink } from 'lucide-react';
import { useLocation } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';
import type { FilterOptions } from './ProfileFilters';
import { createSafeImageProps } from '@/lib/imageValidation';

interface Rating {
  id: number;
  score: number;
  createdAt: string;
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
  comment?: {
    id: number;
    text: string;
    likeCount: number;
    dislikeCount: number;
  };
}

interface RatingsListProps {
  userId: string;
  filters: FilterOptions;
}

export function RatingsList({ userId, filters }: RatingsListProps) {
  const [, setLocation] = useLocation();

  const { data: ratings = [], isLoading, error } = useQuery<Rating[]>({
    queryKey: ['/api/users', userId, 'ratings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.artistFilter) params.append('artist', filters.artistFilter);
      if (filters.releaseFilter) params.append('release', filters.releaseFilter);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.withCommentsOnly) params.append('withComments', 'true');

      const response = await fetch(`/api/users/${userId}/ratings?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch ratings');
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
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
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
          <p className="text-muted-foreground">Ошибка загрузки оценок</p>
        </CardContent>
      </Card>
    );
  }

  if (ratings.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Оценок не найдено</h3>
          <p className="text-muted-foreground">
            {filters.search || filters.artistFilter || filters.releaseFilter
              ? 'Попробуйте изменить фильтры поиска'
              : 'Начните оценивать релизы, чтобы они появились здесь'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {ratings.map((rating) => (
        <Card 
          key={rating.id}
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setLocation(`/release/${rating.release.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              {/* Cover */}
              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                {rating.release.coverUrl ? (
                  <img 
                    {...createSafeImageProps(rating.release.coverUrl, '/placeholder-album.png')}
                    alt={`${rating.release.title} cover`}
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
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm truncate">
                      {rating.release.title}
                    </h4>
                    <p className="text-muted-foreground text-xs truncate">
                      {rating.release.artist.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(rating.release.releaseDate).getFullYear()}
                      </span>
                      {rating.comment && (
                        <Badge variant="secondary" className="text-xs">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          С отзывом
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Rating */}
                  <div className="flex items-center space-x-2 ml-4">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium text-foreground">
                        {rating.score}/10
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/release/${rating.release.id}`);
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Comment preview */}
                {rating.comment && (
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    <p className="text-foreground line-clamp-2">
                      {rating.comment.text}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {rating.comment.likeCount} лайков
                        </span>
                        {rating.comment.dislikeCount > 0 && (
                          <span className="text-muted-foreground">
                            {rating.comment.dislikeCount} дизлайков
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(rating.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Date */}
                {!rating.comment && (
                  <div className="flex items-center gap-1 mt-2">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(rating.createdAt).toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
