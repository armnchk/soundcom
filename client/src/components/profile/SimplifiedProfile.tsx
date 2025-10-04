import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, 
  MessageSquare, 
  BarChart3, 
  ThumbsUp, 
  ThumbsDown, 
  Activity,
  Edit,
  Mail,
  User as UserIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNicknameModal } from "@/hooks/useNicknameModal";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { ProfileFilters, FilterOptions } from "./ProfileFilters";
import { RatingsList } from "./RatingsList";
import { CommentsList } from "./CommentsList";
import { CombinedList } from "./CombinedList";

interface SimplifiedProfileProps {
  user: User;
  isOwnProfile: boolean;
}

export function SimplifiedProfile({ user, isOwnProfile }: SimplifiedProfileProps) {
  const { toast } = useToast();
  const { openNicknameModal } = useNicknameModal();
  const [activeTab, setActiveTab] = useState<'all' | 'ratings' | 'comments'>('all');
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    sortBy: 'newest',
    artistFilter: '',
    releaseFilter: '',
    withCommentsOnly: false,
  });

  // Fetch user stats
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/users", user.id, "stats"],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/users/${user.id}/stats`);
      return response;
    },
    enabled: !!user.id,
  });

  // Fetch user ratings
  const { data: userRatings = [], isLoading: ratingsLoading } = useQuery({
    queryKey: ["/api/users", user.id, "ratings", filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.artistFilter) queryParams.append('artist', filters.artistFilter);
      if (filters.releaseFilter) queryParams.append('release', filters.releaseFilter);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.withCommentsOnly) queryParams.append('withComments', 'true');

      const response = await apiRequest('GET', `/api/users/${user.id}/ratings?${queryParams.toString()}`);
      return response;
    },
    enabled: !!user.id,
  });

  // Fetch user comments
  const { data: userComments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["/api/users", user.id, "comments", filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.artistFilter) queryParams.append('artist', filters.artistFilter);
      if (filters.releaseFilter) queryParams.append('release', filters.releaseFilter);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);

      const response = await apiRequest('GET', `/api/users/${user.id}/comments?${queryParams.toString()}`);
      return response;
    },
    enabled: !!user.id,
  });

  const handleNicknameEdit = () => {
    openNicknameModal();
  };

  // Combine ratings and comments into a single list
  const allItems = [
    ...userRatings.map(rating => ({
      id: rating.id,
      type: 'rating' as const,
      createdAt: rating.createdAt || rating.created_at || '',
      release: rating.release,
      score: rating.score,
    })),
    ...userComments.map(comment => ({
      id: comment.id,
      type: 'comment' as const,
      createdAt: comment.createdAt || comment.created_at || '',
      release: comment.release,
      content: comment.text || comment.content,
      likeCount: (comment as any).likeCount || 0,
      dislikeCount: (comment as any).dislikeCount || 0,
    }))
  ].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return filters.sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
  });

  const isLoading = statsLoading || ratingsLoading || commentsLoading;

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                {user.profile_image_url ? (
                  <img
                    src={user.profile_image_url}
                    alt={user.nickname || user.first_name || 'User'}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-8 h-8 text-primary" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {user.nickname || user.first_name || 'Пользователь'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </div>
            {isOwnProfile && (
              <Button onClick={handleNicknameEdit} variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Изменить никнейм
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      {!isLoading && userStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего оценок</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.ratingsCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего отзывов</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.commentsCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Средняя оценка</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.averageRating.toFixed(1)} / 10</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Активность</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.recentActivity}</div>
              <p className="text-xs text-muted-foreground">за 30 дней</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Все ({allItems.length})</TabsTrigger>
          <TabsTrigger value="ratings">Оценки ({userRatings.length})</TabsTrigger>
          <TabsTrigger value="comments">Отзывы ({userComments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ProfileFilters
            filters={filters}
            onFiltersChange={setFilters}
            type="ratings"
            totalCount={allItems.length}
          />
          <CombinedList items={allItems} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="ratings">
          <ProfileFilters
            filters={filters}
            onFiltersChange={setFilters}
            type="ratings"
            totalCount={userRatings.length}
          />
          <RatingsList userId={user.id} filters={filters} />
        </TabsContent>

        <TabsContent value="comments">
          <ProfileFilters
            filters={filters}
            onFiltersChange={setFilters}
            type="comments"
            totalCount={userComments.length}
          />
          <CommentsList userId={user.id} filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
