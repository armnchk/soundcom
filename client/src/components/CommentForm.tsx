import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StarRating } from "./StarRating";
import { Card, CardContent } from "@/components/ui/card";

interface CommentFormProps {
  onSubmit: (data: {
    text?: string;
    rating?: number;
    isAnonymous: boolean;
  }) => void;
  isLoading?: boolean;
  initialData?: {
    text?: string;
    rating?: number;
    isAnonymous?: boolean;
  };
  mode?: 'create' | 'edit';
}

export function CommentForm({ 
  onSubmit, 
  isLoading = false, 
  initialData,
  mode = 'create' 
}: CommentFormProps) {
  const [text, setText] = useState(initialData?.text || "");
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [isAnonymous, setIsAnonymous] = useState(initialData?.isAnonymous || false);
  const [charCount, setCharCount] = useState(initialData?.text?.length || 0);

  const handleTextChange = (value: string) => {
    if (value.length <= 1000) {
      setText(value);
      setCharCount(value.length);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim() && rating === 0) {
      return;
    }

    onSubmit({
      text: text.trim() || undefined,
      rating: rating > 0 ? rating : undefined,
      isAnonymous,
    });

    if (mode === 'create') {
      setText("");
      setRating(0);
      setIsAnonymous(false);
      setCharCount(0);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">
              Your Rating
            </Label>
            <StarRating
              rating={rating}
              maxRating={10}
              size="lg"
              interactive
              onRatingChange={setRating}
              data-testid="rating-input"
            />
          </div>

          <div>
            <Label htmlFor="comment-text" className="text-sm font-medium text-foreground mb-2 block">
              Add a Review (Optional)
            </Label>
            <Textarea
              id="comment-text"
              placeholder="Share your thoughts about this release..."
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              className="resize-none"
              rows={3}
              data-testid="input-comment"
            />
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(!!checked)}
                  data-testid="checkbox-anonymous"
                />
                <Label htmlFor="anonymous" className="text-sm text-muted-foreground">
                  Post anonymously
                </Label>
              </div>
              <span className="text-xs text-muted-foreground" data-testid="char-count">
                {charCount}/1000
              </span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || (!text.trim() && rating === 0)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-submit"
          >
            {isLoading ? "Submitting..." : mode === 'edit' ? "Update" : "Submit Rating"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
