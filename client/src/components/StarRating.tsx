import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number | null | undefined;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 10,
  size = "md",
  interactive = false,
  onRatingChange,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const handleStarClick = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)} data-testid="star-rating">
      {Array.from({ length: maxRating }, (_, index) => {
        const starNumber = index + 1;
        const filled = starNumber <= Number(rating || 0);
        
        return (
          <Star
            key={index}
            className={cn(
              sizeClasses[size],
              filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground",
              interactive && "cursor-pointer hover:text-yellow-400 transition-colors"
            )}
            onClick={() => handleStarClick(starNumber)}
            data-testid={`star-${starNumber}`}
          />
        );
      })}
      {maxRating <= 5 && (
        <span className="text-sm text-muted-foreground ml-1" data-testid="rating-text">
          {Number(rating || 0).toFixed(1)}
        </span>
      )}
    </div>
  );
}
