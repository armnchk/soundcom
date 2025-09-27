import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { ReleaseCard } from "@/components/release/release-card";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Search as SearchIcon } from "lucide-react";

export default function Search() {
  const [location, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q) {
      setQuery(q);
    }
  }, [location]);

  const { data: releaseResults = [], isLoading: isLoadingReleases } = useQuery({
    queryKey: ["/api/search", { q: query }],
    enabled: query.length > 2,
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { q: string }];
      const response = await fetch(`/api/search?q=${encodeURIComponent(params.q)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  });

  const { data: artistResults = [], isLoading: isLoadingArtists } = useQuery({
    queryKey: ["/api/search/artists", { q: query }],
    enabled: query.length > 2,
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { q: string }];
      const response = await fetch(`/api/search/artists?q=${encodeURIComponent(params.q)}`);
      if (!response.ok) throw new Error('Artist search failed');
      return response.json();
    },
  });

  const isLoading = isLoadingReleases || isLoadingArtists;

  const handleReleaseClick = (releaseId: number) => {
    setLocation(`/release/${releaseId}`);
  };

  const handleArtistClick = (artistId: number) => {
    setLocation(`/artist/${artistId}`);
  };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Search Results */}
        {query.length > 2 ? (
          <div className="space-y-8">
            <h2 className="text-xl font-semibold text-white mb-6">
              {isLoading ? 'Ищем...' : `Результаты поиска для "${query}"`}
              {!isLoading && (artistResults.length + releaseResults.length) > 0 && (
                <span className="text-white/70 ml-2">({artistResults.length + releaseResults.length} найдено)</span>
              )}
            </h2>

            {isLoading ? (
              <div className="space-y-8">
                {/* Artists Loading */}
                <section>
                  <h3 className="text-lg font-semibold text-white mb-4">Артисты</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-muted rounded-lg aspect-square mb-3"></div>
                        <div className="bg-muted h-4 rounded mb-2"></div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Releases Loading */}
                <section>
                  <h3 className="text-lg font-semibold text-white mb-4">Релизы</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-muted rounded-lg aspect-square mb-3"></div>
                        <div className="bg-muted h-4 rounded mb-2"></div>
                        <div className="bg-muted h-3 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (artistResults.length > 0 || releaseResults.length > 0) ? (
              <div className="space-y-8">
                {/* Artists Section */}
                {artistResults.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Music className="w-5 h-5" />
                      Артисты ({artistResults.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {artistResults.map((artist: any) => (
                        <div
                          key={artist.id}
                          onClick={() => handleArtistClick(artist.id)}
                          className="group cursor-pointer transition-all duration-300 hover:scale-105"
                          data-testid={`card-artist-${artist.id}`}
                        >
                          <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-muted">
                            {artist.latestReleaseCover ? (
                              <img
                                src={artist.latestReleaseCover}
                                alt={artist.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                                <Music className="w-8 h-8 text-white/50" />
                              </div>
                            )}
                          </div>
                          <h4 className="font-medium text-white truncate group-hover:text-primary transition-colors" data-testid={`text-artist-name-${artist.id}`}>
                            {artist.name}
                          </h4>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Releases Section */}
                {releaseResults.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <SearchIcon className="w-5 h-5" />
                      Релизы ({releaseResults.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                      {releaseResults.map((release: any) => (
                        <ReleaseCard
                          key={release.id}
                          release={release}
                          onClick={() => handleReleaseClick(release.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Ничего не найдено</h3>
                  <p className="text-white/70">
                    Мы не смогли найти артистов или релизы, соответствующие "{query}". Попробуйте другие ключевые слова или проверьте правописание.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Начните поиск</h3>
              <p className="text-white/70">
                Введите минимум 3 символа для поиска альбомов, артистов или песен.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
