import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RatingInput } from "../release/rating-input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();

  // Check if user already has a comment for this release
  const { data: existingComments = [] } = useQuery({
    queryKey: ["/api/releases", releaseId, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/releases/${releaseId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!user,
  });

  const existingUserComment = existingComments.find((comment: any) => 
    comment.userId === user?.id && comment.rating !== null
  );

  useEffect(() => {
    if (existingUserComment && mode === 'create') {
      setRating(existingUserComment.rating || 0);
    }
  }, [existingUserComment, mode]);

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
      toast({ title: "Комментарий отправлен!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Не авторизован",
          description: "Вы не авторизованы. Выполняется вход...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      if (error.message.includes("already rated")) {
        toast({ 
          title: "Вы уже оценили этот релиз", 
          description: "Каждый пользователь может поставить только одну оценку",
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Ошибка при отправке комментария", 
          description: error.message,
          variant: "destructive" 
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim() && rating === 0) {
      toast({
        title: "Добавьте оценку или комментарий",
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
      {existingUserComment && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Ваша текущая оценка: <strong>{existingUserComment.rating}/10</strong>
            {existingUserComment.text && (
              <>
                <br />
                Ваш отзыв: "{existingUserComment.text}"
              </>
            )}
          </p>
        </div>
      )}
      
      <RatingInput
        rating={rating}
        onRatingChange={setRating}
        maxRating={10}
        size="lg"
        label={existingUserComment ? "Изменить оценку" : "Ваша оценка"}
      />

      <div>
        <Label htmlFor="comment-text" className="text-sm font-medium text-foreground mb-2 block">
          Добавить отзыв (необязательно)
        </Label>
        <Textarea
          id="comment-text"
          placeholder="Поделитесь своими мыслями об этом релизе..."
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
              Опубликовать анонимно
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
        {commentMutation.isPending ? "Отправляем..." : mode === 'edit' ? "Обновить" : "Отправить"}
      </Button>
    </form>
  );
}
