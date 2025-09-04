import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2, X, Shield } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'releases' | 'reports' | 'users'>('releases');
  const [releaseForm, setReleaseForm] = useState({
    title: '',
    artistName: '',
    releaseDate: '',
    coverUrl: '',
    spotifyUrl: '',
    appleMusicUrl: ''
  });

  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      toast({
        title: "Unauthorized",
        description: "You don't have permission to access the admin panel.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }
  }, [authLoading, user, toast]);

  const { data: reports = [] } = useQuery({
    queryKey: ["/api/admin/reports", { status: 'pending' }],
    enabled: !!user?.isAdmin && activeTab === 'reports',
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { status: string }];
      const response = await fetch(`/api/admin/reports?status=${params.status}`);
      if (!response.ok) throw new Error('Failed to fetch reports');
      return response.json();
    },
  });

  const addReleaseMutation = useMutation({
    mutationFn: async (data: typeof releaseForm) => {
      // First create or find artist
      const artistResponse = await apiRequest('POST', '/api/artists', { name: data.artistName });
      const artist = await artistResponse.json();
      
      // Then create release
      const releaseData = {
        artistId: artist.id,
        title: data.title,
        releaseDate: new Date(data.releaseDate),
        coverUrl: data.coverUrl || null,
        streamingLinks: {
          spotify: data.spotifyUrl || null,
          appleMusic: data.appleMusicUrl || null,
        }
      };
      
      await apiRequest('POST', '/api/releases', releaseData);
    },
    onSuccess: () => {
      setReleaseForm({
        title: '',
        artistName: '',
        releaseDate: '',
        coverUrl: '',
        spotifyUrl: '',
        appleMusicUrl: ''
      });
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      toast({ title: "Release added successfully!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Failed to add release", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest('DELETE', `/api/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({ title: "Comment deleted successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Failed to delete comment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const resolveReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      await apiRequest('PUT', `/api/admin/reports/${reportId}`, { status: 'resolved' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({ title: "Report resolved" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Failed to resolve report", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <Alert className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access the admin panel.
            </AlertDescription>
          </Alert>
        </div>
        <Footer />
      </div>
    );
  }

  const handleReleaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseForm.title || !releaseForm.artistName || !releaseForm.releaseDate) {
      toast({ 
        title: "Missing required fields", 
        description: "Please fill in title, artist, and release date.",
        variant: "destructive" 
      });
      return;
    }
    addReleaseMutation.mutate(releaseForm);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground">Manage releases, reports, and users</p>
        </div>

        {/* Admin Navigation */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            variant={activeTab === 'releases' ? 'default' : 'secondary'}
            onClick={() => setActiveTab('releases')}
            data-testid="tab-releases"
          >
            Manage Releases
          </Button>
          <Button
            variant={activeTab === 'reports' ? 'default' : 'secondary'}
            onClick={() => setActiveTab('reports')}
            data-testid="tab-reports"
          >
            Reported Comments
            {reports.length > 0 && (
              <span className="ml-2 bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 text-xs">
                {reports.length}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === 'users' ? 'default' : 'secondary'}
            onClick={() => setActiveTab('users')}
            data-testid="tab-users"
          >
            User Management
          </Button>
        </div>

        {/* Manage Releases Tab */}
        {activeTab === 'releases' && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Add New Release</h3>
              
              <form onSubmit={handleReleaseSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="title">Release Title *</Label>
                    <Input
                      id="title"
                      value={releaseForm.title}
                      onChange={(e) => setReleaseForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter album/single title"
                      required
                      data-testid="input-title"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="artist">Artist Name *</Label>
                    <Input
                      id="artist"
                      value={releaseForm.artistName}
                      onChange={(e) => setReleaseForm(prev => ({ ...prev, artistName: e.target.value }))}
                      placeholder="Enter artist name"
                      required
                      data-testid="input-artist"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="date">Release Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={releaseForm.releaseDate}
                      onChange={(e) => setReleaseForm(prev => ({ ...prev, releaseDate: e.target.value }))}
                      required
                      data-testid="input-date"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cover">Cover Image URL</Label>
                    <Input
                      id="cover"
                      type="url"
                      value={releaseForm.coverUrl}
                      onChange={(e) => setReleaseForm(prev => ({ ...prev, coverUrl: e.target.value }))}
                      placeholder="https://..."
                      data-testid="input-cover"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Streaming Links</Label>
                  <div className="grid sm:grid-cols-2 gap-3 mt-2">
                    <Input
                      type="url"
                      value={releaseForm.spotifyUrl}
                      onChange={(e) => setReleaseForm(prev => ({ ...prev, spotifyUrl: e.target.value }))}
                      placeholder="Spotify URL"
                      data-testid="input-spotify"
                    />
                    <Input
                      type="url"
                      value={releaseForm.appleMusicUrl}
                      onChange={(e) => setReleaseForm(prev => ({ ...prev, appleMusicUrl: e.target.value }))}
                      placeholder="Apple Music URL"
                      data-testid="input-apple-music"
                    />
                  </div>
                </div>
                
                <Button
                  type="submit"
                  disabled={addReleaseMutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="button-add-release"
                >
                  {addReleaseMutation.isPending ? "Adding..." : "Add Release"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reported Comments Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <AlertTriangle className="mr-2 text-destructive" />
              Pending Reports ({reports.length})
            </h3>

            {reports.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No pending reports</p>
                </CardContent>
              </Card>
            ) : (
              reports.map((report: any) => (
                <Card key={report.id} className="border-destructive/20 bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="font-medium text-foreground text-sm">Reported Comment</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          Report #{report.id}
                        </span>
                      </div>
                      <span className="text-xs text-destructive font-medium">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="bg-secondary rounded p-3 mb-4">
                      <p className="text-sm text-foreground italic">
                        "{report.comment.text || 'Rating-only comment'}"
                      </p>
                      {report.comment.rating && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Rating: {report.comment.rating}/10
                        </p>
                      )}
                    </div>
                    
                    {report.reason && (
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Report reason:</p>
                        <p className="text-sm text-foreground">{report.reason}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteCommentMutation.mutate(report.comment.id)}
                        disabled={deleteCommentMutation.isPending}
                        data-testid={`button-delete-comment-${report.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete Comment
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => resolveReportMutation.mutate(report.id)}
                        disabled={resolveReportMutation.isPending}
                        data-testid={`button-dismiss-report-${report.id}`}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Dismiss Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">User management features coming soon...</p>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
