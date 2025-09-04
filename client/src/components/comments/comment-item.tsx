import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { StarRating } from "../release/rating-display";
import { ThumbsUp, ThumbsDown, Edit, Trash2, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface CommentItemProps {
  comment: {
    id: number;
    text?: string;
    rating?: number;
    isAnonymous: boolean;
    createdAt: string;
    user: {
      id: string;
      nickname: string;
    } | null;
    likeCount: number;
    dislikeCount: number;
    userReaction?: 'like' | 'dislike';
  };
  currentUserId?: string;
  className?: string;
}

export function CommentItem({
  comment,
  currentUserId,
  className,
}: CommentItemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isOwner = currentUserId && comment.user?.id === currentUserId;
  const displayName = comment.isAnonymous ? "Аноним" : comment.user?.nickname || "Неизвестный";

  const reactionMutation = useMutation({
    mutationFn: async ({ reactionType }: { reactionType: 'like' | 'dislike' }) => {
      if (comment.userReaction === reactionType) {
        await apiRequest('DELETE', `/api/comments/${comment.id}/react`);
      } else {
        await apiRequest('POST', `/api/comments/${comment.id}/react`, { reactionType });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
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
        title: "Failed to react to comment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });


  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/comments/${comment.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      toast({ title: "Comment deleted successfully" });
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
        title: "Failed to delete comment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return (
    <div className={cn("bg-secondary rounded-lg p-4", className)} data-testid={`comment-${comment.id}`}>
      <div className="flex items-start space-x-4">
        <div className="w-10 h-10 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-medium text-foreground text-sm" data-testid="text-author">
              {displayName}
            </span>
            {comment.rating && (
              <StarRating 
                rating={comment.rating} 
                maxRating={10} 
                size="sm"
                showValue
              />
            )}
            <span className="text-xs text-muted-foreground" data-testid="text-date">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          
          {comment.text && (
            <p className="text-foreground text-sm leading-relaxed mb-3" data-testid="text-content">
              {comment.text}
            </p>
          )}
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex items-center space-x-1 text-xs h-auto p-1",
                comment.userReaction === 'like' && "text-primary"
              )}
              onClick={() => reactionMutation.mutate({ reactionType: 'like' })}
              disabled={reactionMutation.isPending}
              data-testid="button-like"
            >
              <ThumbsUp className="w-3 h-3" />
              <span data-testid="text-like-count">{comment.likeCount}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex items-center space-x-1 text-xs h-auto p-1",
                comment.userReaction === 'dislike' && "text-destructive"
              )}
              onClick={() => reactionMutation.mutate({ reactionType: 'dislike' })}
              disabled={reactionMutation.isPending}
              data-testid="button-dislike"
            >
              <ThumbsDown className="w-3 h-3" />
              <span data-testid="text-dislike-count">{comment.dislikeCount}</span>
            </Button>
            
            
            {isOwner && (
              <div className="ml-auto flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:text-destructive/80 h-auto p-1"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
