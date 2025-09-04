import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/StarRating";
import { Music } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'ratings' | 'reviews'>('ratings');

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: id === currentUser?.id,
  });

  const { data: userRatings = [] } = useQuery({
    queryKey: ["/api/users", id, "ratings"],
    enabled: !!id && activeTab === 'ratings',
  });

  const { data: userComments = [] } = useQuery({
    queryKey: ["/api/users", id, "comments"],
    enabled: !!id && activeTab === 'reviews',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">User Not Found</h1>
          <p className="text-muted-foreground">The user profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const userInitials = user.nickname?.substring(0, 2).toUpperCase() || user.firstName?.substring(0, 2).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 md:p-8">
          {/* Profile Header */}
          <div className="flex items-center space-x-6 mb-8">
            <Avatar className="w-16 h-16">
              {user.profileImageUrl && (
                <AvatarImage src={user.profileImageUrl} alt={user.nickname || 'User'} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="user-nickname">
                {user.nickname || user.firstName || 'User'}
              </h1>
              <p className="text-muted-foreground">
                Joined {new Date(user.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground" data-testid="total-ratings">
                    {userRatings.length}
                  </span> Ratings
                </span>
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground" data-testid="total-comments">
                    {userComments.length}
                  </span> Reviews
                </span>
              </div>
            </div>
          </div>

          {/* Profile Tabs */}
          <div className="border-b border-border mb-6">
            <nav className="flex space-x-8">
              <Button
                variant="ghost"
                className={`pb-2 border-b-2 font-medium text-sm ${
                  activeTab === 'ratings' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('ratings')}
                data-testid="tab-ratings"
              >
                Recent Ratings
              </Button>
              <Button
                variant="ghost"
                className={`pb-2 border-b-2 font-medium text-sm ${
                  activeTab === 'reviews' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('reviews')}
                data-testid="tab-reviews"
              >
                Reviews
              </Button>
            </nav>
          </div>

          {/* Recent Ratings */}
          {activeTab === 'ratings' && (
            <div className="space-y-4">
              {userRatings.map((rating: any) => (
                <Card 
                  key={rating.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setLocation(`/releases/${rating.release.id}`)}
                  data-testid={`rating-${rating.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                        {rating.release.coverUrl ? (
                          <img 
                            src={rating.release.coverUrl} 
                            alt={`${rating.release.title} cover`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Music className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground text-sm">{rating.release.title}</h4>
                        <p className="text-muted-foreground text-xs">{rating.release.artist.name}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <StarRating rating={rating.score} maxRating={10} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(rating.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {userRatings.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No ratings yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {userComments.map((comment: any) => (
                <Card 
                  key={comment.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setLocation(`/releases/${comment.release.id}`)}
                  data-testid={`comment-${comment.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                        {comment.release.coverUrl ? (
                          <img 
                            src={comment.release.coverUrl} 
                            alt={`${comment.release.title} cover`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Music className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-foreground text-sm">{comment.release.title}</h4>
                          {comment.rating && (
                            <StarRating rating={comment.rating} maxRating={10} size="sm" />
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs mb-2">{comment.release.artist.name}</p>
                        {comment.text && (
                          <p className="text-foreground text-sm leading-relaxed">{comment.text}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {userComments.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No reviews yet.</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
