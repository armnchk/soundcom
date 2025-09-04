import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { ReleaseCard } from "@/components/release/release-card";
import { SearchBar } from "@/components/SearchBar";
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

  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["/api/search", { q: query }],
    enabled: query.length > 2,
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { q: string }];
      const response = await fetch(`/api/search?q=${encodeURIComponent(params.q)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  });

  const handleReleaseClick = (releaseId: number) => {
    setLocation(`/release/${releaseId}`);
  };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setLocation(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Search Music</h1>
          <div className="max-w-2xl mx-auto">
            <SearchBar 
              onSearch={handleSearch}
              placeholder="Search albums, artists, songs..."
              className="w-full"
            />
          </div>
        </div>

        {/* Search Results */}
        {query.length > 2 ? (
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-6">
              {isLoading ? 'Searching...' : `Search Results for "${query}"`}
              {!isLoading && searchResults.length > 0 && (
                <span className="text-muted-foreground ml-2">({searchResults.length} found)</span>
              )}
            </h2>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-muted rounded-lg aspect-square mb-3"></div>
                    <div className="bg-muted h-4 rounded mb-2"></div>
                    <div className="bg-muted h-3 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {searchResults.map((release: any) => (
                  <ReleaseCard
                    key={release.id}
                    release={release}
                    onClick={() => handleReleaseClick(release.id)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Results Found</h3>
                  <p className="text-muted-foreground">
                    We couldn't find any releases matching "{query}". Try different keywords or check the spelling.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <SearchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Start Searching</h3>
              <p className="text-muted-foreground">
                Enter at least 3 characters to search for albums, artists, or songs.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
