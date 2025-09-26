import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReleaseCardProps {
  release: {
    id: number;
    title: string;
    coverUrl?: string;
    artist: {
      name: string;
    };
    averageRating: number;
    commentCount: number;
  };
  onClick?: () => void;
  className?: string;
}

export function ReleaseCard({ release, onClick, className }: ReleaseCardProps) {
  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
        className
      )}
      onClick={onClick}
      data-testid={`release-card-${release.id}`}
    >
      <CardContent className="p-4">
        <div className="aspect-square mb-3 overflow-hidden rounded-md">
          {release.coverUrl ? (
            <img 
              src={release.coverUrl} 
              alt={`${release.title} cover`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              data-testid="release-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
              <span className="text-muted-foreground text-sm">No Cover</span>
            </div>
          )}
        </div>
        
        <h3 className="font-semibold text-foreground text-sm mb-1 truncate" data-testid="release-title">
          {release.title}
        </h3>
        <p className="text-muted-foreground text-xs mb-2 truncate" data-testid="artist-name">
          {release.artist.name}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-primary" data-testid="release-rating">
            {release.averageRating && Number(release.averageRating) > 0 
              ? Number(release.averageRating).toFixed(1) 
              : '—'
            }
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageCircle className="w-3 h-3" />
            <span data-testid="comment-count">{release.commentCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
