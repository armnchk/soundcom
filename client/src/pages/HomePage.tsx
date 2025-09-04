import { useQuery } from "@tanstack/react-query";
import { ReleaseCard } from "@/components/ReleaseCard";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MessageCircle, Music } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    genre: "",
    year: "",
    sortBy: "date"
  });

  const { data: releases, isLoading } = useQuery({
    queryKey: ["/api/releases", filters],
    queryFn: async ({ queryKey }) => {
      const [, filterParams] = queryKey as [string, typeof filters];
      const params = new URLSearchParams();
      
      if (filterParams.genre) params.append('genre', filterParams.genre);
      if (filterParams.year) params.append('year', filterParams.year);
      
      const response = await fetch(`/api/releases?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch releases');
      return response.json();
    },
  });

  const newReleases = releases?.slice(0, 12) || [];
  const discussedReleases = releases?.sort((a: any, b: any) => b.commentCount - a.commentCount).slice(0, 5) || [];

  const handleReleaseClick = (releaseId: number) => {
    setLocation(`/releases/${releaseId}`);
  };

  const clearFilters = () => {
    setFilters({ genre: "", year: "", sortBy: "date" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="mb-12">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 p-8 md:p-12 mx-4 sm:mx-6 lg:mx-8 mt-8">
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Discover & Rate Music
            </h1>
            <p className="text-xl text-muted-foreground mb-6 max-w-2xl">
              Join the community of music lovers. Rate albums, share reviews, and discover your next favorite artist.
            </p>
            <Button 
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90"
              onClick={() => document.getElementById('new-releases')?.scrollIntoView({ behavior: 'smooth' })}
              data-testid="button-explore"
            >
              Explore New Releases
            </Button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
            <Music className="w-32 h-32 text-primary" />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar 
            onSearch={(query) => setLocation(`/search?q=${encodeURIComponent(query)}`)}
            className="max-w-2xl mx-auto"
          />
        </div>

        {/* Filter Bar */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
              
              <Select value={filters.genre} onValueChange={(value) => setFilters(prev => ({ ...prev, genre: value }))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Genres</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="hip-hop">Hip-Hop</SelectItem>
                  <SelectItem value="electronic">Electronic</SelectItem>
                  <SelectItem value="jazz">Jazz</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.year} onValueChange={(value) => setFilters(prev => ({ ...prev, year: value }))}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Years</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                </SelectContent>
              </Select>

              {(filters.genre || filters.year) && (
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

        {/* New Releases Section */}
        <section className="mb-12" id="new-releases">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center">
            <Clock className="mr-3 text-primary" />
            Latest Releases
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {newReleases.map((release: any) => (
              <ReleaseCard
                key={release.id}
                release={release}
                onClick={() => handleReleaseClick(release.id)}
              />
            ))}
          </div>

          {newReleases.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No releases found matching your filters.</p>
            </div>
          )}
        </section>

        {/* Section Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-12"></div>

        {/* Most Discussed Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center">
            <MessageCircle className="mr-3 text-accent" />
            Most Discussed
          </h2>
          
          <div className="space-y-4">
            {discussedReleases.map((release: any) => (
              <Card 
                key={release.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleReleaseClick(release.id)}
                data-testid={`discussed-release-${release.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                      {release.coverUrl ? (
                        <img 
                          src={release.coverUrl} 
                          alt={`${release.title} cover`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Music className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{release.title}</h3>
                      <p className="text-muted-foreground text-sm truncate">{release.artist.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Released {new Date(release.releaseDate).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      <div className="text-sm">
                        <span className="font-semibold text-foreground">{release.averageRating.toFixed(1)}</span>
                        <span className="text-muted-foreground">/10</span>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        {release.commentCount} comments
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {discussedReleases.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No discussions yet. Be the first to comment!</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
