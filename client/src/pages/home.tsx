import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Music, FolderOpen, ArrowRight, Search } from "lucide-react";
import { useState } from "react";

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

interface Collection {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  releases: ReleaseWithDetails[];
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch featured collections
  const { data: collections = [], isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
    queryFn: async () => {
      const response = await fetch('/api/collections?activeOnly=true');
      if (!response.ok) throw new Error('Failed to fetch collections');
      return response.json();
    },
  });

  const handleReleaseClick = (releaseId: number) => {
    setLocation(`/release/${releaseId}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (collectionsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-8 w-64 rounded mb-4"></div>
                <div className="flex space-x-4">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="flex-none w-32">
                      <div className="bg-muted rounded-lg aspect-square mb-2"></div>
                      <div className="bg-muted h-4 rounded mb-1"></div>
                      <div className="bg-muted h-3 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-hero-title">
              Найди свою музыку
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-description">
              Ищи релизы, исполнителей, читай отзывы и ставь оценки
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск релизов, исполнителей..."
                className="w-full pl-12 pr-24 py-6 text-lg bg-background border-2 border-muted focus:border-primary rounded-full shadow-sm focus:shadow-lg transition-all"
                data-testid="input-search-main"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-muted-foreground" />
              <Button 
                type="submit"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full px-6 bg-primary hover:bg-primary/90"
                data-testid="button-search-main"
              >
                Найти
              </Button>
            </form>
          </div>
        </section>

        {/* Collections Section */}
        {collections.length > 0 ? (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center">
                <FolderOpen className="mr-3 text-primary" />
                Подборки
              </h2>
            </div>
            
            <div className="space-y-8">
              {collections.map((collection) => (
                <Card key={collection.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-1">
                          {collection.title}
                        </h3>
                        {collection.subtitle && (
                          <p className="text-muted-foreground text-sm mb-2">
                            {collection.subtitle}
                          </p>
                        )}
                        {collection.description && (
                          <p className="text-muted-foreground text-sm">
                            {collection.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {collection.releases.length} releases
                        </p>
                      </div>
                    </div>

                    {/* Collection Releases - Horizontal Scroll */}
                    <div className="relative">
                      <div className="flex space-x-4 overflow-x-auto pb-2 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
                        {collection.releases.slice(0, 10).map((release) => (
                          <div
                            key={release.id}
                            className="flex-none w-32 cursor-pointer group"
                            onClick={() => handleReleaseClick(release.id)}
                            data-testid={`collection-release-${collection.id}-${release.id}`}
                          >
                            <div className="w-32 h-32 rounded-lg overflow-hidden mb-2 bg-muted">
                              {release.coverUrl ? (
                                <img 
                                  src={release.coverUrl} 
                                  alt={`${release.title} cover`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <Music className="w-8 h-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <h4 className="font-medium text-sm text-foreground truncate" title={release.title}>
                              {release.title}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate" title={release.artist.name}>
                              {release.artist.name}
                            </p>
                            <div className="flex items-center mt-1">
                              <span className="text-xs font-medium text-primary">
                                {release.averageRating && Number(release.averageRating) > 0 
                                  ? Number(release.averageRating).toFixed(1) 
                                  : '—'
                                }
                              </span>
                            </div>
                          </div>
                        ))}
                        
                        {collection.releases.length > 10 && (
                          <div className="flex-none w-32 flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <ArrowRight className="w-6 h-6 mx-auto mb-2" />
                              <p className="text-xs">
                                +{collection.releases.length - 10} more
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Подборки будут показаны здесь после их создания в админке.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
