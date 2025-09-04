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
    <div className="min-h-screen abstract-bg">
      {/* Simplified Header */}
      <header className="relative z-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div></div>
            <h1 className="text-3xl font-bold text-foreground tracking-[0.2em] text-shadow-sm">
              Rev<span className="text-primary">You</span>
            </h1>
            <Button 
              onClick={handleSignIn}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8 py-2.5 text-sm font-medium neon-glow smooth-hover border-0"
              data-testid="button-signin"
            >
              Войти
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with Abstract Background */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Abstract Background with Blue/Black/Gray Elements */}
        <div className="absolute inset-0">
          {/* Morphing blobs in different colors */}
          <div className="flowing-orb blue morphing-shape w-96 h-96 top-10 left-10" />
          <div className="flowing-orb gray morphing-shape w-80 h-80 bottom-20 right-20" style={{animationDelay: '7s'}} />
          <div className="flowing-orb dark wave-animation w-64 h-64 top-1/2 left-1/4" style={{animationDelay: '3s'}} />
          <div className="flowing-orb blue morphing-shape w-72 h-72 bottom-10 left-1/3" style={{animationDelay: '12s'}} />
          <div className="flowing-orb gray wave-animation w-56 h-56 top-20 right-1/3" style={{animationDelay: '5s'}} />
          
          {/* Floating particles in mixed colors */}
          {[...Array(8)].map((_, i) => (
            <div 
              key={`blue-${i}`}
              className="floating-particle blue particle" 
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 2}s`,
                animationDuration: `${12 + Math.random() * 6}s`
              }}
            />
          ))}
          {[...Array(6)].map((_, i) => (
            <div 
              key={`gray-${i}`}
              className="floating-particle gray particle" 
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 2.5 + 1}s`,
                animationDuration: `${14 + Math.random() * 4}s`
              }}
            />
          ))}
          {[...Array(4)].map((_, i) => (
            <div 
              key={`dark-${i}`}
              className="floating-particle dark particle" 
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 3}s`,
                animationDuration: `${16 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
        
        <div className="relative text-center px-4 sm:px-6 lg:px-8 z-10">
          <div>
            <div className="mb-12">
              <h1 className="text-7xl md:text-9xl font-extralight text-white mb-4 tracking-tight">
                Музыка
              </h1>
              <h2 className="text-4xl md:text-5xl font-light text-white tracking-wide">
                в новом измерении
              </h2>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <p className="text-xl md:text-2xl text-white mb-6 leading-relaxed font-light">
                Откройте для себя мир музыки через призму сообщества.
              </p>
              <p className="text-lg md:text-xl text-white leading-relaxed font-light">
                Находите, оценивайте, обсуждайте.
              </p>
            </div>
          </div>
          
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 animate-bounce opacity-50">
            <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-primary rounded-full mt-2 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* New Releases Carousel */}
      <section className="py-32 relative bg-white">
        <div className="flowing-orb blue morphing-shape w-72 h-72 -top-10 -right-20" style={{animationDelay: '5s'}} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-16 hero-animation">
            <div>
              <h2 className="text-5xl md:text-6xl font-extralight text-foreground mb-4 tracking-tight text-glow">
                Новые релизы
              </h2>
              <p className="text-muted-foreground text-xl font-light">
                Самые обсуждаемые альбомы недели
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevNewReleases}
                className="rounded-full w-12 h-12 p-0 smooth-hover border border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                data-testid="button-prev-new"
              >
                <ChevronLeft className="w-5 h-5 text-primary" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextNewReleases}
                className="rounded-full w-12 h-12 p-0 smooth-hover border border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                data-testid="button-next-new"
              >
                <ChevronRight className="w-5 h-5 text-primary" />
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
                  <Card className="border-0 shadow-lg smooth-hover bg-card/70 backdrop-blur-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-0">
                      <div className="aspect-square overflow-hidden mb-4 relative group">
                        {release.coverUrl ? (
                          <img 
                            src={release.coverUrl} 
                            alt={`${release.title} cover`}
                            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
                            <Music className="w-16 h-16 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                          <div className="bg-primary/90 rounded-full p-3 neon-glow">
                            <Play className="w-6 h-6 text-primary-foreground" />
                          </div>
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
      <section className="py-32 bg-gray-50/50 relative">
        <div className="flowing-orb gray wave-animation w-80 h-80 -bottom-10 -left-20" style={{animationDelay: '2s'}} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-16 hero-animation">
            <div>
              <h2 className="text-5xl md:text-6xl font-extralight text-foreground mb-4 tracking-tight text-glow">
                Лучшие оценки
              </h2>
              <p className="text-muted-foreground text-xl font-light">
                Высоко оценённые сообществом
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={prevTopRated}
                className="rounded-full w-12 h-12 p-0 smooth-hover border border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                data-testid="button-prev-top"
              >
                <ChevronLeft className="w-5 h-5 text-primary" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextTopRated}
                className="rounded-full w-12 h-12 p-0 smooth-hover border border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                data-testid="button-next-top"
              >
                <ChevronRight className="w-5 h-5 text-primary" />
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
                  <Card className="border-0 shadow-lg smooth-hover bg-card/80 backdrop-blur-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-0">
                      <div className="aspect-square overflow-hidden mb-4 relative group">
                        {release.coverUrl ? (
                          <img 
                            src={release.coverUrl} 
                            alt={`${release.title} cover`}
                            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-all duration-300">
                            <Music className="w-16 h-16 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                          <div className="bg-primary/90 rounded-full p-3 neon-glow">
                            <Play className="w-6 h-6 text-primary-foreground" />
                          </div>
                        </div>
                        <div className="absolute top-4 right-4 bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium neon-glow">
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
      <section className="py-40 relative bg-white">
        <div className="flowing-orb blue morphing-shape w-96 h-96 top-10 left-1/2 -translate-x-1/2" style={{animationDelay: '10s'}} />
        
        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="hero-animation">
            <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-8 neon-glow">
              <Music className="w-10 h-10 text-primary float-animation" />
            </div>
            <h2 className="text-5xl md:text-6xl font-extralight text-foreground mb-6 tracking-tight text-glow">
              Начните своё музыкальное путешествие
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-16 leading-relaxed max-w-3xl mx-auto font-light">
              Присоединяйтесь к сообществу меломанов и откройте для себя музыку в новом свете
            </p>
            
            <Button 
              size="lg"
              onClick={handleSignIn}
              className="bg-primary text-primary-foreground px-16 py-5 text-xl hover:bg-primary/90 rounded-full smooth-hover font-light neon-glow border-0"
              data-testid="button-signin-cta"
            >
              Присоединиться
            </Button>
          </div>
          
          <div className="mt-24 grid grid-cols-3 gap-12 max-w-2xl mx-auto opacity-60">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-extralight text-foreground mb-2">12К+</div>
              <div className="text-sm text-muted-foreground font-light">Релизов</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-extralight text-foreground mb-2">8К+</div>
              <div className="text-sm text-muted-foreground font-light">Пользователей</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-extralight text-foreground mb-2">45К+</div>
              <div className="text-sm text-muted-foreground font-light">Отзывов</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
