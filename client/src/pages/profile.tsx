import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Settings, BarChart3, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { FilterOptions } from "@/components/profile/ProfileFilters";
import { CombinedTab } from "@/components/profile/CombinedTab";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Profile() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'activity' | 'settings'>('activity');
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'newest',
  });

  // Use current user's ID if no ID provided
  const userId = id || currentUser?.id;
  

  // Fetch user data
  const { data: user, isLoading: userLoading, error: userError } = useQuery<User>({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const response = await apiRequest('GET', `/api/users/${userId}`);
      return response.json();
    },
    enabled: !!userId && isAuthenticated,
  });

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ["/api/users", userId, "stats"],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const response = await apiRequest('GET', `/api/users/${userId}/stats`);
      return response.json();
    },
    enabled: !!userId && isAuthenticated,
  });

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    if (!authLoading && !isAuthenticated && !id) {
      setLocation('/');
    }
    if (userError) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить профиль пользователя.",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, authLoading, id, userError, setLocation, toast]);

  if (authLoading || userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Загрузка профиля...</span>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">Профиль не найден</h2>
              <p className="text-muted-foreground mb-4">
                Пользователь с таким ID не существует или у вас нет доступа к этому профилю.
              </p>
              <Button onClick={() => setLocation('/')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Вернуться на главную
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            onClick={() => setLocation('/')} 
            variant="ghost" 
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </div>

        {/* User Info Header */}
        <Card className="mb-6">
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.nickname || user.first_name}`} />
              <AvatarFallback>{user.nickname ? user.nickname[0] : user.first_name ? user.first_name[0] : 'U'}</AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold text-foreground">
                {user.nickname || user.first_name || "Пользователь"}
              </h1>
              {stats && (
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  <span>{stats.ratingsCount} оценок</span>
                  <span>{stats.commentsCount} отзывов</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Активность
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Настройки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <CombinedTab user={user} filters={filters} onFiltersChange={setFilters} />
          </TabsContent>

          <TabsContent value="settings">
            <ProfileSettings user={user} isOwnProfile={isOwnProfile} />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}