import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Play, ChevronLeft, ChevronRight, Star, MessageCircle } from "lucide-react";

interface ReleaseWithDetails {
  id: number;
  title: string;
  coverUrl?: string;
  releaseDate: string;
  artist: {
    name: string;
  };
  averageRating: number;
  commentCount: number;
}

export default function Landing() {
  const [newReleasesIndex, setNewReleasesIndex] = useState(0);
  const [topRatedIndex, setTopRatedIndex] = useState(0);

  const { data: releases = [] } = useQuery<ReleaseWithDetails[]>({
    queryKey: ["/api/releases"],
    queryFn: async () => {
      const response = await fetch("/api/releases");
      if (!response.ok) return [];
      return response.json();
    },
  });

  const newestReleases = releases.slice(0, 12);
  const topRatedReleases = [...releases]
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 12);

  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  const nextNewReleases = () => {
    setNewReleasesIndex((prev) => 
      prev + 4 >= newestReleases.length ? 0 : prev + 4
    );
  };

  const prevNewReleases = () => {
    setNewReleasesIndex((prev) => 
      prev - 4 < 0 ? Math.max(0, newestReleases.length - 4) : prev - 4
    );
  };

  const nextTopRated = () => {
    setTopRatedIndex((prev) => 
      prev + 4 >= topRatedReleases.length ? 0 : prev + 4
    );
  };

  const prevTopRated = () => {
    setTopRatedIndex((prev) => 
      prev - 4 < 0 ? Math.max(0, topRatedReleases.length - 4) : prev - 4
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextNewReleases();
    }, 8000);
    return () => clearInterval(interval);
  }, [newestReleases.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      nextTopRated();
    }, 10000);
    return () => clearInterval(interval);
  }, [topRatedReleases.length]);

  return (
    <div className="min-h-screen gradient-bg dark:gradient-bg-dark">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-effect">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 hero-animation">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center float-animation">
                <Music className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-light text-foreground tracking-tight">MusicReview</span>
            </div>

            <Button 
              onClick={handleSignIn}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 py-2 smooth-hover"
              data-testid="button-signin"
            >
              Войти
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl float-animation" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl float-animation" style={{animationDelay: '3s'}} />
        </div>
        
        <div className="relative text-center px-4 sm:px-6 lg:px-8 hero-animation">
          <div className="mb-12">
            <div className="inline-flex items-center justify-center mb-8">
              <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center mr-6 pulse-soft">
                <Music className="w-12 h-12 text-primary-foreground" />
              </div>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-extralight text-foreground mb-6 tracking-tight">
              Музыка
            </h1>
            <h2 className="text-3xl md:text-4xl font-light text-muted-foreground mb-8 tracking-wide">
              в новом измерении
            </h2>
            
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Откройте для себя мир музыки через призму сообщества. 
              Находите, оценивайте, обсуждайте.
            </p>
            
            <Button 
              size="lg"
              onClick={handleSignIn}
              className="bg-primary text-primary-foreground px-12 py-4 text-lg hover:bg-primary/90 rounded-full smooth-hover font-medium"
              data-testid="button-signin-hero"
            >
              Начать путешествие
            </Button>
          </div>
          
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-muted-foreground rounded-full flex justify-center">
              <div className="w-1 h-3 bg-muted-foreground rounded-full mt-2 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* New Releases Carousel */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12 slide-in">
            <div>
              <h2 className="text-4xl font-light text-foreground mb-2 tracking-tight">
                Новые релизы
              </h2>
              <p className="text-muted-foreground text-lg">
                Самые обсуждаемые альбомы недели
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevNewReleases}
                className="rounded-full w-10 h-10 p-0 smooth-hover"
                data-testid="button-prev-new"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextNewReleases}
                className="rounded-full w-10 h-10 p-0 smooth-hover"
                data-testid="button-next-new"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <div className="carousel-container">
            <div 
              className="carousel-track"
              style={{
                transform: `translateX(-${newReleasesIndex * (100 / 4)}%)`,
              }}
            >
              {newestReleases.map((release, index) => (
                <div key={release.id} className="carousel-item w-1/4 px-3">
                  <Card className="border-0 shadow-sm smooth-hover bg-card/50 backdrop-blur">
                    <CardContent className="p-0">
                      <div className="aspect-square rounded-t-lg overflow-hidden mb-4 relative group">
                        {release.coverUrl ? (
                          <img 
                            src={release.coverUrl} 
                            alt={`${release.title} cover`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                            <Music className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      
                      <div className="px-4 pb-4">
                        <h3 className="font-medium text-foreground text-sm mb-1 truncate">
                          {release.title}
                        </h3>
                        <p className="text-muted-foreground text-xs mb-3 truncate">
                          {release.artist.name}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className="text-xs font-medium text-foreground">
                              {release.averageRating.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {release.commentCount}
                            </span>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-3 text-xs text-primary hover:text-primary/80 hover:bg-primary/5"
                          data-testid={`button-view-${release.id}`}
                        >
                          Подробнее
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Top Rated Carousel */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-12 slide-in">
            <div>
              <h2 className="text-4xl font-light text-foreground mb-2 tracking-tight">
                Лучшие оценки
              </h2>
              <p className="text-muted-foreground text-lg">
                Высоко оценённые сообществом
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevTopRated}
                className="rounded-full w-10 h-10 p-0 smooth-hover"
                data-testid="button-prev-top"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextTopRated}
                className="rounded-full w-10 h-10 p-0 smooth-hover"
                data-testid="button-next-top"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <div className="carousel-container">
            <div 
              className="carousel-track"
              style={{
                transform: `translateX(-${topRatedIndex * (100 / 4)}%)`,
              }}
            >
              {topRatedReleases.map((release, index) => (
                <div key={release.id} className="carousel-item w-1/4 px-3">
                  <Card className="border-0 shadow-sm smooth-hover bg-card/80 backdrop-blur">
                    <CardContent className="p-0">
                      <div className="aspect-square rounded-t-lg overflow-hidden mb-4 relative group">
                        {release.coverUrl ? (
                          <img 
                            src={release.coverUrl} 
                            alt={`${release.title} cover`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                            <Music className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                          {release.averageRating.toFixed(1)}
                        </div>
                      </div>
                      
                      <div className="px-4 pb-4">
                        <h3 className="font-medium text-foreground text-sm mb-1 truncate">
                          {release.title}
                        </h3>
                        <p className="text-muted-foreground text-xs mb-3 truncate">
                          {release.artist.name}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 ${i < Math.round(release.averageRating / 2) ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`} 
                              />
                            ))}
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {release.commentCount}
                            </span>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-3 text-xs text-primary hover:text-primary/80 hover:bg-primary/5"
                          data-testid={`button-view-top-${release.id}`}
                        >
                          Послушать
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 hero-animation">
          <div className="mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Music className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-light text-foreground mb-4 tracking-tight">
              Начните своё музыкальное путешествие
            </h2>
            <p className="text-lg text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto">
              Присоединяйтесь к сообществу меломанов и откройте для себя музыку в новом свете
            </p>
          </div>
          
          <Button 
            size="lg"
            onClick={handleSignIn}
            className="bg-primary text-primary-foreground px-12 py-4 text-lg hover:bg-primary/90 rounded-full smooth-hover font-medium"
            data-testid="button-signin-cta"
          >
            Присоединиться
          </Button>
          
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto opacity-60">
            <div className="text-center">
              <div className="text-2xl font-light text-foreground mb-1">12К+</div>
              <div className="text-xs text-muted-foreground">Релизов</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-foreground mb-1">8К+</div>
              <div className="text-xs text-muted-foreground">Пользователей</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-light text-foreground mb-1">45К+</div>
              <div className="text-xs text-muted-foreground">Отзывов</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
