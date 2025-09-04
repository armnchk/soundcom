import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface RatingInputProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export function RatingInput({
  rating,
  onRatingChange,
  maxRating = 10,
  size = "lg",
  label = "Your Rating",
  className,
}: RatingInputProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-foreground">{label}</Label>
      )}
      <div className="flex items-center gap-1" data-testid="rating-input">
        {Array.from({ length: maxRating }, (_, index) => {
          const starNumber = index + 1;
          const filled = starNumber <= rating;
          
          return (
            <Star
              key={index}
              className={cn(
                sizeClasses[size],
                "cursor-pointer transition-colors",
                filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"
              )}
              onClick={() => onRatingChange(starNumber)}
              data-testid={`star-input-${starNumber}`}
            />
          );
        })}
        <span className="text-sm text-muted-foreground ml-2" data-testid="rating-value">
          {rating > 0 ? `${rating}/10` : "Rate this release"}
        </span>
      </div>
    </div>
  );
}
