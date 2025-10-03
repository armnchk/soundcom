import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CommentItem } from "./comment-item";
import { CommentForm } from "./comment-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CommentBlockProps {
  releaseId: number;
  isAuthenticated: boolean;
  currentUserId?: string;
}

export function CommentBlock({ releaseId, isAuthenticated, currentUserId }: CommentBlockProps) {
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'likes'>('date');
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["/api/releases", releaseId, "comments", { sortBy }],
    queryFn: async ({ queryKey }) => {
      const [, releaseId, , params] = queryKey as [string, number, string, { sortBy: string }];
      const response = await fetch(`/api/releases/${releaseId}/comments?sortBy=${params.sortBy}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest('DELETE', `/api/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases", releaseId, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases", releaseId] });
      toast({
        title: "Оценка удалена",
        description: "Ваша оценка успешно удалена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить оценку",
        variant: "destructive"
      });
    },
  });

  // Find current user's comment
  const userComment = comments.find((comment: any) =>
    comment.user_id === user?.id
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-muted rounded-lg p-4 h-24"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comments Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Отзывы и комментарии ({comments.length})
        </h3>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-40" data-testid="select-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">По дате</SelectItem>
            <SelectItem value="rating">По рейтингу</SelectItem>
            <SelectItem value="likes">По лайкам</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rating Section */}
      {isAuthenticated && (
        <Card>
          <CardContent className="p-6">
            {userComment && !isEditing ? (
              // Show existing rating
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Ваша оценка</h3>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      data-testid="button-edit-rating"
                      className="p-2"
                      title="Редактировать"
                    >
                      ✏️
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Вы уверены, что хотите удалить свою оценку?")) {
                          deleteCommentMutation.mutate(userComment.id);
                        }
                      }}
                      disabled={deleteCommentMutation.isPending}
                      className="p-2 border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
                      title="Удалить оценку"
                    >
                      {deleteCommentMutation.isPending ? "..." : "🗑️"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">{userComment.rating}/10</span>
                    {userComment.updatedAt !== userComment.createdAt && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        отредактировано
                      </span>
                    )}
                  </div>
                  {userComment.text && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm">{userComment.text}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Show rating form
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {userComment ? "Редактировать оценку" : "Оценить релиз"}
                </h3>
                <CommentForm 
                  releaseId={releaseId}
                  initialData={userComment ? {
                    id: userComment.id,
                    text: userComment.text,
                    rating: userComment.rating
                  } : undefined}
                  mode={userComment ? 'edit' : 'create'}
                  onSuccess={() => {
                    setIsEditing(false);
                  }}
                />
                {isEditing && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => setIsEditing(false)}
                    data-testid="button-cancel-edit"
                  >
                    Отмена
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment: any) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
          />
        ))}

        {comments.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                Пока нет комментариев. {isAuthenticated ? "Будьте первым, кто поделится впечатлениями!" : "Войдите, чтобы оставить комментарий."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
