import { useQuery } from "@tanstack/react-query";
import { CommentItem } from "./comment-item";
import { CommentForm } from "./comment-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

interface CommentBlockProps {
  releaseId: number;
  isAuthenticated: boolean;
  currentUserId?: string;
}

export function CommentBlock({ releaseId, isAuthenticated, currentUserId }: CommentBlockProps) {
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'likes'>('date');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["/api/releases", releaseId, "comments", { sortBy }],
    queryFn: async ({ queryKey }) => {
      const [, releaseId, , params] = queryKey as [string, number, string, { sortBy: string }];
      const response = await fetch(`/api/releases/${releaseId}/comments?sortBy=${params.sortBy}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
  });

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

      {/* Rate This Release Form */}
      {isAuthenticated && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Оценить релиз</h3>
            <CommentForm releaseId={releaseId} />
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
