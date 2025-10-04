import { Card, CardContent } from "@/components/ui/card";
import { Music, ThumbsUp, ThumbsDown, Star } from "lucide-react";
import { useLocation } from "wouter";
import type { Rating, Comment, Release, Artist } from "@shared/schema";
import { createSafeImageProps } from "@/lib/imageValidation";

interface CombinedItem {
  id: string;
  type: 'review';
  createdAt: string;
  release: Release;
  artist: Artist;
  rating: number;
  content?: string;
  likeCount?: number;
  dislikeCount?: number;
}

interface CombinedListProps {
  items: CombinedItem[];
  isLoading: boolean;
}

export function CombinedList({ items, isLoading }: CombinedListProps) {
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-md bg-muted flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Активности пока нет.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card
          key={`${item.type}-${item.id}`}
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => setLocation(`/release/${item.release.id}`)}
        >
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                {item.release.coverUrl ? (
                  <img
                    {...createSafeImageProps(item.release.coverUrl, '/placeholder-album.png')}
                    alt={`${item.release.title} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Music className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium text-foreground text-sm">{item.release.title}</h4>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-sm font-medium text-primary">{item.rating}/10</span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Отзыв
                  </span>
                </div>
                <p className="text-muted-foreground text-xs mb-2">{item.artist.name}</p>
                
                {item.content && (
                  <p className="text-foreground text-sm leading-relaxed mb-2">{item.content}</p>
                )}
                
                <div className="flex items-center space-x-4 text-muted-foreground text-xs">
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" />
                    <span>{item.likeCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsDown className="w-3 h-3" />
                    <span>{item.dislikeCount || 0}</span>
                  </div>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
