import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  onResults?: (results: any[]) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ 
  onSearch, 
  onResults, 
  placeholder = "Найти альбомы, артистов, песни...",
  className 
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Search API call
  const { data: searchResults } = useQuery({
    queryKey: ["/api/search", { q: debouncedQuery }],
    enabled: debouncedQuery.length > 2,
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { q: string }];
      const response = await fetch(`/api/search?q=${encodeURIComponent(params.q)}`);
      if (!response.ok) throw new Error('Поиск не удался');
      return response.json();
    },
  });

  useEffect(() => {
    if (searchResults && onResults) {
      onResults(searchResults);
    }
  }, [searchResults, onResults]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 bg-input border-border focus:ring-2 focus:ring-ring"
          data-testid="input-search"
        />
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      </div>
    </form>
  );
}
