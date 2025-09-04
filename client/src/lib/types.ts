import type { 
  User, 
  Artist, 
  Release, 
  Rating, 
  Comment, 
  CommentReaction,
  Report 
} from "@shared/schema";

export interface ReleaseWithDetails extends Release {
  artist: Artist;
  averageRating: number;
  commentCount: number;
}

export interface CommentWithDetails extends Comment {
  user: User | null;
  likesCount: number;
  dislikesCount: number;
  userReaction?: string | null;
}

export interface UserProfile extends User {
  comments: (Comment & { release: Release & { artist: Artist } })[];
  ratings: (Rating & { release: Release & { artist: Artist } })[];
}

export interface ReportWithDetails extends Report {
  comment: Comment;
  user: User;
}
