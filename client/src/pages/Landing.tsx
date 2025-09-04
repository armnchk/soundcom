import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Star, MessageCircle, Users } from "lucide-react";

export default function Landing() {
  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
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
            data-testid="button-signin"
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
            <Card>
              <CardContent className="p-8 text-center">
                <Star className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-3">Rate & Review</h3>
                <p className="text-muted-foreground">
                  Share your opinions with detailed ratings and reviews. Help others discover great music.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-accent mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-3">Community Driven</h3>
                <p className="text-muted-foreground">
                  Engage with fellow music enthusiasts through comments, discussions, and reactions.
                </p>
              </CardContent>
            </Card>
            
            <Card>
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

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-accent/10">
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
