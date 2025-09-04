import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 10,
  size = "md",
  showValue = false,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  // Always show 10 stars for 10-point scale
  const displayStars = maxRating;
  const numericRating = Number(rating || 0);
  
  return (
    <div className={cn("flex items-center gap-1", className)} data-testid="star-rating">
      {Array.from({ length: displayStars }, (_, index) => {
        const starNumber = index + 1;
        const filled = starNumber <= numericRating;
        
        return (
          <Star
            key={index}
            className={cn(
              sizeClasses[size],
              filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            )}
            data-testid={`star-${starNumber}`}
          />
        );
      })}
      {showValue && (
        <span className="text-sm text-muted-foreground ml-1" data-testid="rating-value">
          {Number(rating || 0).toFixed(1)}
        </span>
      )}
    </div>
  );
}
