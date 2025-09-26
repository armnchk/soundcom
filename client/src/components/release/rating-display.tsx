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
    <div className={cn("flex items-center", className)} data-testid="rating-display">
      <span className="text-sm font-medium text-primary" data-testid="rating-value">
        {rating && Number(rating) > 0 ? Number(rating).toFixed(1) : '—'}
      </span>
    </div>
  );
}
