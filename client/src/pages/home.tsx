import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Music, FolderOpen, ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import { useCollections } from "../hooks/useCollections";
import { createSafeImageProps } from "@/lib/imageValidation";

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
  const { data: collections = [], isLoading: collectionsLoading } = useCollections(true);

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
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" data-testid="text-hero-title">
              Найди свою музыку
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto" data-testid="text-hero-description">
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
                className="w-full pl-12 pr-24 py-6 text-lg text-white bg-background border-2 border-muted focus:border-primary rounded-full shadow-sm focus:shadow-lg transition-all"
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
            <div className="space-y-12">
              {collections.map((collection) => (
                <div key={collection.id}>
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                          {collection.title}
                        </h2>
                        {(collection.subtitle || collection.description) && (
                          <p className="text-white/70 text-lg">
                            {collection.subtitle || collection.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-white/60">
                        <span className="text-sm">
                          {collection.releases.length} релизов
                        </span>
                        {collection.releases.length > 5 && (
                          <div className="flex items-center gap-1">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Collection Releases - Horizontal Scroll */}
                  <div className="relative group">
                    {/* Left gradient shadow */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background via-background/90 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Right gradient shadow */}
                    <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background via-background/90 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Scroll container */}
                    <div 
                      className="flex space-x-6 overflow-x-auto pb-4 scroll-smooth scrollbar-hide" 
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      ref={(el) => {
                        if (el) {
                          el.style.scrollbarWidth = 'none';
                          el.style.msOverflowStyle = 'none';
                        }
                      }}
                    >
                      {collection.releases.map((release) => (
                        <div
                          key={release.id}
                          className="flex-none w-52 cursor-pointer group"
                          onClick={() => handleReleaseClick(release.id)}
                          data-testid={`collection-release-${collection.id}-${release.id}`}
                        >
                          <div className="w-52 h-52 rounded-xl overflow-hidden mb-4 bg-muted shadow-lg group-hover:shadow-xl transition-all duration-300">
                            {release.coverUrl ? (
                              <img 
                                {...createSafeImageProps(release.coverUrl, '/placeholder-album.png')}
                                alt={`${release.title} cover`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <Music className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <h4 className="font-semibold text-lg text-white truncate" title={release.title}>
                            {release.title}
                          </h4>
                          <p className="text-base text-white/70 truncate" title={release.artist.name}>
                            {release.artist.name}
                          </p>
                          <div className="flex items-center mt-3">
                            <span className="text-base font-semibold text-primary">
                              {release.averageRating && Number(release.averageRating) > 0 
                                ? Number(release.averageRating).toFixed(1) 
                                : '—'
                              }
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Navigation arrows - only show if more than 5 releases */}
                    {collection.releases.length > 5 && (
                      <>
                        {/* Left arrow */}
                        <button
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
                          onClick={(e) => {
                            e.preventDefault();
                            const container = e.currentTarget.parentElement?.querySelector('.flex.space-x-6');
                            if (container) {
                              container.scrollBy({ left: -300, behavior: 'smooth' });
                            }
                          }}
                        >
                          <ArrowRight className="w-5 h-5 rotate-180" />
                        </button>
                        
                        {/* Right arrow */}
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
                          onClick={(e) => {
                            e.preventDefault();
                            const container = e.currentTarget.parentElement?.querySelector('.flex.space-x-6');
                            if (container) {
                              container.scrollBy({ left: 300, behavior: 'smooth' });
                            }
                          }}
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-white/70">Контент будет показан здесь после создания подборок в админке.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
