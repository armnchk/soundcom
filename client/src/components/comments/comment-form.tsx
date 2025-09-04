import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RatingInput } from "../release/rating-input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CommentFormProps {
  releaseId: number;
  initialData?: {
    text?: string;
    rating?: number;
    isAnonymous?: boolean;
  };
  mode?: 'create' | 'edit';
  onSuccess?: () => void;
}

export function CommentForm({ 
  releaseId,
  initialData,
  mode = 'create',
  onSuccess
}: CommentFormProps) {
  const [text, setText] = useState(initialData?.text || "");
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [isAnonymous, setIsAnonymous] = useState(initialData?.isAnonymous || false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const commentMutation = useMutation({
    mutationFn: async (data: { text?: string; rating?: number; isAnonymous: boolean }) => {
      await apiRequest('POST', `/api/releases/${releaseId}/comments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases", releaseId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases", releaseId] });
      
      if (mode === 'create') {
        setText("");
        setRating(0);
        setIsAnonymous(false);
      }
      
      onSuccess?.();
      toast({ title: "Comment submitted successfully!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Failed to submit comment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim() && rating === 0) {
      toast({
        title: "Please add a rating or comment",
        variant: "destructive"
      });
      return;
    }

    commentMutation.mutate({
      text: text.trim() || undefined,
      rating: rating > 0 ? rating : undefined,
      isAnonymous,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <RatingInput
        rating={rating}
        onRatingChange={setRating}
        maxRating={10}
        size="lg"
      />

      <div>
        <Label htmlFor="comment-text" className="text-sm font-medium text-foreground mb-2 block">
          Add a Review (Optional)
        </Label>
        <Textarea
          id="comment-text"
          placeholder="Share your thoughts about this release..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="resize-none min-h-20"
          maxLength={1000}
          data-testid="textarea-comment"
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
          <span className="text-xs text-muted-foreground" data-testid="text-char-count">
            {text.length}/1000
          </span>
        </div>
      </div>

      <Button
        type="submit"
        disabled={commentMutation.isPending || (!text.trim() && rating === 0)}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
        data-testid="button-submit"
      >
        {commentMutation.isPending ? "Submitting..." : mode === 'edit' ? "Update" : "Submit Rating"}
      </Button>
    </form>
  );
}
