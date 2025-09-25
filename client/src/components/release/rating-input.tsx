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
  label = "Ваша оценка",
  className,
}: RatingInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium text-foreground">{label}</Label>
      )}
      <div className="flex items-center gap-2" data-testid="rating-input">
        {Array.from({ length: maxRating }, (_, index) => {
          const ratingNumber = index + 1;
          const isSelected = ratingNumber === rating;
          
          return (
            <button
              key={index}
              className={cn(
                "w-8 h-8 rounded-md text-sm font-medium transition-colors border",
                isSelected 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-background text-foreground border-border hover:bg-secondary hover:border-secondary-foreground/20"
              )}
              onClick={() => onRatingChange(ratingNumber)}
              data-testid={`rating-input-${ratingNumber}`}
            >
              {ratingNumber}
            </button>
          );
        })}
        <span className="text-sm text-muted-foreground ml-2" data-testid="rating-value">
          {rating > 0 ? `${rating}/10` : "Оценить релиз"}
        </span>
      </div>
    </div>
  );
}
