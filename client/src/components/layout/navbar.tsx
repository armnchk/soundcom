import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Music, Search, User, Settings, Shield, LogOut } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = () => {
    window.location.href = "/api/logout";
  };

  const userInitials = user?.nickname?.substring(0, 2).toUpperCase() || 
                      user?.firstName?.substring(0, 2).toUpperCase() || "U";

  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center space-x-2" data-testid="link-home">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                <Music className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">MusicReview</span>
            </a>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search albums, artists, songs..."
                className="pl-10 bg-input border-border focus:ring-2 focus:ring-ring"
                data-testid="input-search"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </form>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2" data-testid="button-user-menu">
                    <Avatar className="w-8 h-8">
                      {user?.profileImageUrl && (
                        <AvatarImage src={user.profileImageUrl} alt={user.nickname || 'User'} />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium" data-testid="text-username">
                      {user?.nickname || user?.firstName || 'User'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${user?.id}`}>
                      <a className="flex items-center" data-testid="link-profile">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  {user?.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <a className="flex items-center" data-testid="link-admin">
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Panel
                        </a>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} data-testid="button-signout">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={() => window.location.href = "/api/login"}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-signin"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden px-4 py-3 border-b border-border">
        <form onSubmit={handleSearch} className="relative">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search music..."
            className="pl-10 bg-input border-border"
            data-testid="input-search-mobile"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </form>
      </div>
    </nav>
  );
}
