import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RatingInput } from "../release/rating-input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";

interface CommentFormProps {
  releaseId: number;
  initialData?: {
    id?: number;
    text?: string;
    rating?: number;
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
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if user already has a comment for this release
  const { data: existingComments = [] } = useQuery({
    queryKey: ["/api/comments/releases", releaseId],
    queryFn: async () => {
      const response = await fetch(`/api/comments/releases/${releaseId}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!user,
  });

  const existingUserComment = existingComments.find((comment: any) =>
    comment.user_id === user?.id
  );


  const commentMutation = useMutation({
    mutationFn: async (data: { text: string; rating: number } | { delete: true }) => {
      if ('delete' in data) {
        await apiRequest('DELETE', `/api/comments/${existingUserComment?.id}`);
      } else if ((mode === 'edit' && initialData?.id) || (isEditing && existingUserComment?.id)) {
        const commentId = initialData?.id || existingUserComment?.id;
        await apiRequest('PUT', `/api/comments/${commentId}`, data);
      } else {
        await apiRequest('POST', `/api/comments/releases/${releaseId}`, data);
      }
    },
    onSuccess: () => {
        // Force page refresh to ensure all data is updated
        window.location.reload();
      
      if (mode === 'create' && !isEditing) {
        setText("");
        setRating(0);
      }
      
      if (isEditing) {
        setIsEditing(false);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      toast({
        title: mode === 'edit' || isEditing ? "Комментарий обновлен" : "Комментарий добавлен",
        description: "Ваш отзыв успешно сохранен",
      });
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
      
      if (error.message.includes("already commented")) {
        toast({
          title: "Комментарий уже существует",
          description: "Вы уже оставили комментарий к этому релизу. Вы можете отредактировать существующий.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Ошибка",
          description: error.message || "Не удалось сохранить комментарий",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Рейтинг обязателен
    if (rating === 0) {
      toast({
        title: "Оценка обязательна",
        description: "Пожалуйста, поставьте оценку от 1 до 10",
        variant: "destructive"
      });
      return;
    }

    // Текст комментария обязателен
    if (!text.trim() || text.trim().length < 5) {
      toast({
        title: "Комментарий обязателен",
        description: "Комментарий должен содержать минимум 5 символов",
        variant: "destructive"
      });
      return;
    }

    commentMutation.mutate({
      text: text.trim(),
      rating: rating,
    });
  };

  // Если есть существующий комментарий и мы не в режиме редактирования, показываем его вместо формы
  // Но только если mode !== 'edit' (чтобы избежать дублирования с CommentBlock)
  if (existingUserComment && !isEditing && mode !== 'edit') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg border">
          <h3 className="font-medium text-foreground mb-3">Ваш комментарий</h3>
          
          {existingUserComment.rating && existingUserComment.rating > 0 && (
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-sm text-muted-foreground">Оценка:</span>
              <span className="font-medium text-primary text-lg">{existingUserComment.rating}/10</span>
            </div>
          )}
          
          {existingUserComment.text && (
            <div className="mb-4">
              <span className="text-sm text-muted-foreground">Комментарий:</span>
              <p className="text-foreground mt-1 p-2 bg-background rounded border">"{existingUserComment.text}"</p>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setText(existingUserComment.text || "");
                setRating(existingUserComment.rating || 0);
                setIsEditing(true);
              }}
              className="p-2"
              title="Редактировать"
            >
              ✏️
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Вы уверены, что хотите удалить свой комментарий?")) {
                  commentMutation.mutate({ delete: true });
                }
              }}
              className="p-2 border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
              title="Удалить"
            >
              🗑️
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div>
          <Label htmlFor="rating">Оценка *</Label>
          <RatingInput
            rating={rating}
            onRatingChange={setRating}
            maxRating={10}
            size="md"
            label=""
          />
        </div>

        <div>
          <Label htmlFor="comment-text" className="text-sm font-medium text-foreground mb-2 block">
            Комментарий *
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
          <div className="flex justify-end items-center mt-2">
            <span className="text-xs text-muted-foreground" data-testid="text-char-count">
              {text.length}/1000
            </span>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            type="submit"
            disabled={commentMutation.isPending || rating === 0 || !text.trim() || text.trim().length < 5}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-submit"
          >
            {commentMutation.isPending ? "Отправляем..." : mode === 'edit' || isEditing ? "Обновить" : "Отправить"}
          </Button>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setText(existingUserComment?.text || "");
                setRating(existingUserComment?.rating || 0);
              }}
              disabled={commentMutation.isPending}
            >
              Отмена
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}