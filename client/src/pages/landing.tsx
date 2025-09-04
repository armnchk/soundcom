import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Star, MessageCircle, Users, TrendingUp } from "lucide-react";

export default function Landing() {
  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                <Music className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">MusicReview</span>
            </div>

            <Button 
              onClick={handleSignIn}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-signin"
            >
              <i className="fab fa-google mr-2" />
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-2xl flex items-center justify-center mr-4">
              <Music className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">MusicReview</h1>
          </div>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            The ultimate platform for music discovery and community reviews. 
            Rate albums, share your thoughts, and discover your next favorite artist.
          </p>
          
          <Button 
            size="lg"
            onClick={handleSignIn}
            className="bg-primary text-primary-foreground px-8 py-4 text-lg hover:bg-primary/90"
            data-testid="button-signin-hero"
          >
            Sign In with Google
          </Button>
          
          <p className="text-sm text-muted-foreground mt-4">
            Join thousands of music lovers sharing their passion
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Why Choose MusicReview?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-8 text-center">
                <Star className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-3">Rate & Review</h3>
                <p className="text-muted-foreground">
                  Share your opinions with detailed ratings and reviews. Help others discover great music.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-accent mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-3">Community Driven</h3>
                <p className="text-muted-foreground">
                  Engage with fellow music enthusiasts through comments, discussions, and reactions.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-3">Discover Music</h3>
                <p className="text-muted-foreground">
                  Find new artists and albums based on community ratings and personalized recommendations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Sample Content Preview */}
      <section className="py-20 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Join the Conversation
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-border opacity-75">
                <CardContent className="p-4">
                  <div className="aspect-square bg-muted rounded-md mb-3 flex items-center justify-center">
                    <Music className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground text-sm mb-1 truncate">Featured Release</h3>
                  <p className="text-muted-foreground text-xs mb-2 truncate">Featured Artist</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Star className="w-3 h-3 text-yellow-400 mr-1" />
                      <span className="text-xs text-muted-foreground">8.5</span>
                    </div>
                    <span className="text-xs text-muted-foreground">24</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Join the Community?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start rating music, sharing reviews, and discovering new favorites today.
          </p>
          <Button 
            size="lg"
            onClick={handleSignIn}
            className="bg-primary text-primary-foreground px-8 py-4 text-lg hover:bg-primary/90"
            data-testid="button-signin-cta"
          >
            Get Started Now
          </Button>
        </div>
      </section>
    </div>
  );
}
