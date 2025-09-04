import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { ReleaseCard } from "@/components/release/release-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, MessageCircle, Music, TrendingUp, FolderOpen, ArrowRight } from "lucide-react";
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
  const [filters, setFilters] = useState({
    genre: "all",
    year: "all",
  });

  const { data: releases = [], isLoading } = useQuery<ReleaseWithDetails[]>({
    queryKey: ["/api/releases", filters],
    queryFn: async ({ queryKey }) => {
      const [, filterParams] = queryKey as [string, typeof filters];
      const params = new URLSearchParams();
      
      if (filterParams.genre && filterParams.genre !== 'all') params.append('genre', filterParams.genre);
      if (filterParams.year && filterParams.year !== 'all') params.append('year', filterParams.year);
      
      // Check if admin wants to show test data
      const showTestData = localStorage.getItem('showTestData') === 'true';
      if (showTestData) params.append('includeTestData', 'true');
      
      const response = await fetch(`/api/releases?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch releases');
      return response.json();
    },
  });

  // Fetch featured collections
  const { data: collections = [], isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
    queryFn: async () => {
      const response = await fetch('/api/collections?activeOnly=true');
      if (!response.ok) throw new Error('Failed to fetch collections');
      return response.json();
    },
  });

  // All releases for filter display
  const allReleases = releases;

  const handleReleaseClick = (releaseId: number) => {
    setLocation(`/release/${releaseId}`);
  };

  const clearFilters = () => {
    setFilters({ genre: "all", year: "all" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-lg aspect-square mb-3"></div>
                <div className="bg-muted h-4 rounded mb-2"></div>
                <div className="bg-muted h-3 rounded w-3/4"></div>
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
        {/* Hero Section */}
        <section className="mb-12">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 p-8 md:p-12">
            <div className="relative z-10">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4" data-testid="text-hero-title">
                Discover & Rate Music
              </h1>
              <p className="text-xl text-muted-foreground mb-6 max-w-2xl" data-testid="text-hero-description">
                Join the community of music lovers. Rate albums, share reviews, and discover your next favorite artist.
              </p>
              <Button 
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90"
                onClick={() => document.getElementById('all-releases')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-explore"
              >
                Explore All Releases
              </Button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
              <TrendingUp className="w-32 h-32 text-primary" />
            </div>
          </div>
        </section>

        {/* Collections Section */}
        {!collectionsLoading && collections.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center">
                <FolderOpen className="mr-3 text-primary" />
                Curated Collections
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
                              <span className="text-xs font-medium text-foreground">
                                {release.averageRating ? release.averageRating.toFixed(1) : '0.0'}
                              </span>
                              <span className="text-xs text-muted-foreground ml-1">★</span>
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
        )}

        {/* All Releases with Filters */}
        {allReleases.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center" id="all-releases">
                <TrendingUp className="mr-3 text-primary" />
                Browse All Releases
              </h2>
            </div>
            
            {/* Filter Bar */}
            <Card className="mb-8">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
                  
                  <Select value={filters.genre} onValueChange={(value) => setFilters(prev => ({ ...prev, genre: value }))}>
                    <SelectTrigger className="w-40" data-testid="select-genre">
                      <SelectValue placeholder="All Genres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Genres</SelectItem>
                      <SelectItem value="rock">Rock</SelectItem>
                      <SelectItem value="pop">Pop</SelectItem>
                      <SelectItem value="hip-hop">Hip-Hop</SelectItem>
                      <SelectItem value="electronic">Electronic</SelectItem>
                      <SelectItem value="jazz">Jazz</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filters.year} onValueChange={(value) => setFilters(prev => ({ ...prev, year: value }))}>
                    <SelectTrigger className="w-32" data-testid="select-year">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2021">2021</SelectItem>
                    </SelectContent>
                  </Select>

                  {(filters.genre !== 'all' || filters.year !== 'all') && (
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="ml-auto text-sm text-primary hover:text-primary/80"
                      data-testid="button-clear-filters"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {allReleases.map((release) => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  onClick={() => handleReleaseClick(release.id)}
                />
              ))}
            </div>

            {allReleases.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No releases found matching your filters.</p>
                </CardContent>
              </Card>
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
