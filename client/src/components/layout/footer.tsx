import { Link } from "wouter";
import { Music } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                <Music className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">RevYou</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Современная платформа для оценки и обсуждения музыкальных релизов.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-3 text-sm">Explore</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  New Releases
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-foreground transition-colors">
                  Search
                </Link>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">Top Rated</span>
              </li>
              <li>
                <span className="hover:text-foreground transition-colors cursor-pointer">Genres</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-3 text-sm">Community</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Guidelines</span></li>
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Support</span></li>
              <li><span className="hover:text-foreground transition-colors cursor-pointer">Contact</span></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground mb-3 text-sm">Connect</h3>
            <div className="flex space-x-3">
              <i className="fab fa-twitter text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
              <i className="fab fa-instagram text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
              <i className="fab fa-discord text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-muted-foreground text-xs">
            © 2024 MusicReview. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
