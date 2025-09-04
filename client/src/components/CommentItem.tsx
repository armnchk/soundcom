import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { ThumbsUp, ThumbsDown, Flag, Edit, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
      profileImageUrl?: string;
    } | null;
    likeCount: number;
    dislikeCount: number;
    userReaction?: 'like' | 'dislike';
  };
  currentUserId?: string;
  onLike?: (commentId: number) => void;
  onDislike?: (commentId: number) => void;
  onReport?: (commentId: number) => void;
  onEdit?: (commentId: number) => void;
  onDelete?: (commentId: number) => void;
  className?: string;
}

export function CommentItem({
  comment,
  currentUserId,
  onLike,
  onDislike,
  onReport,
  onEdit,
  onDelete,
  className,
}: CommentItemProps) {
  const isOwner = currentUserId && comment.user?.id === currentUserId;
  const displayName = comment.isAnonymous ? "Anonymous" : comment.user?.nickname || "Unknown";
  const userInitials = comment.isAnonymous ? "A" : (comment.user?.nickname?.substring(0, 2).toUpperCase() || "U");

  return (
    <div className={cn("bg-secondary rounded-lg p-4", className)} data-testid={`comment-${comment.id}`}>
      <div className="flex items-start space-x-4">
        <Avatar className="w-10 h-10 flex-shrink-0">
          {!comment.isAnonymous && comment.user?.profileImageUrl ? (
            <AvatarImage src={comment.user.profileImageUrl} alt={displayName} />
          ) : null}
          <AvatarFallback className={comment.isAnonymous ? "bg-muted" : "bg-primary"}>
            {userInitials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="font-medium text-foreground text-sm" data-testid="comment-author">
              {displayName}
            </span>
            {comment.rating && (
              <StarRating 
                rating={comment.rating} 
                maxRating={10} 
                size="sm"
                data-testid="comment-rating"
              />
            )}
            <span className="text-xs text-muted-foreground" data-testid="comment-date">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          
          {comment.text && (
            <p className="text-foreground text-sm leading-relaxed mb-3" data-testid="comment-text">
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
              onClick={() => onLike?.(comment.id)}
              data-testid="button-like"
            >
              <ThumbsUp className="w-3 h-3" />
              <span data-testid="like-count">{comment.likeCount}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex items-center space-x-1 text-xs h-auto p-1",
                comment.userReaction === 'dislike' && "text-destructive"
              )}
              onClick={() => onDislike?.(comment.id)}
              data-testid="button-dislike"
            >
              <ThumbsDown className="w-3 h-3" />
              <span data-testid="dislike-count">{comment.dislikeCount}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground h-auto p-1"
              onClick={() => onReport?.(comment.id)}
              data-testid="button-report"
            >
              <Flag className="w-3 h-3 mr-1" />
              Report
            </Button>
            
            {isOwner && (
              <div className="ml-auto flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary hover:text-primary/80 h-auto p-1"
                  onClick={() => onEdit?.(comment.id)}
                  data-testid="button-edit"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:text-destructive/80 h-auto p-1"
                  onClick={() => onDelete?.(comment.id)}
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
