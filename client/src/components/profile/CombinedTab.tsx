import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Activity } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { ProfileFilters, FilterOptions } from "./ProfileFilters";
import { CombinedList } from "./CombinedList";
import type { User } from "@shared/schema";

interface CombinedTabProps {
  user: User;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

export function CombinedTab({ user, filters, onFiltersChange }: CombinedTabProps) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/users", user.id, "stats"],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${user.id}/stats`);
      return response.json();
    },
    enabled: !!user.id,
  });

  const { data: userRatings = [], isLoading: ratingsLoading } = useQuery({
    queryKey: ["/api/users", user.id, "ratings", filters.sortBy],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      const response = await apiRequest('GET', `/api/users/${user.id}/ratings?${queryParams.toString()}`);
      return response.json();
    },
    enabled: !!user.id,
  });

  // No longer need separate comments query since reviews include both rating and content

  // Show only reviews (comments with ratings) - no separate ratings/comments
  const allItems = userRatings.map(review => ({
    id: review.id,
    type: 'review' as const,
    createdAt: review.created_at || '',
    release: review.release,
    artist: review.artist,
    rating: review.rating,
    content: review.content,
    likeCount: 0, // TODO: implement likes/dislikes for reviews
    dislikeCount: 0,
  })).sort((a, b) => {
    if (filters.sortBy === 'likes_high') {
      const likesA = a.likeCount || 0;
      const likesB = b.likeCount || 0;
      return likesB - likesA;
    }
    
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return filters.sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
  });

  const isLoading = statsLoading || ratingsLoading;

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Отзывы</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ratingsCount}</div>
              <p className="text-xs text-muted-foreground">
                Средняя: {stats.averageRating}/10
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Активность</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentActivity}</div>
              <p className="text-xs text-muted-foreground">
                За последние 30 дней
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Реакции на ваши отзывы</CardTitle>
              <ThumbsUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.totalLikes}</div>
                  <p className="text-xs text-muted-foreground">Лайки</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.totalDislikes}</div>
                  <p className="text-xs text-muted-foreground">Дизлайки</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <ProfileFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        totalCount={allItems.length}
      />

      {/* Combined List */}
      <CombinedList items={allItems} isLoading={isLoading} />
    </div>
  );
}
