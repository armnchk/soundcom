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
import { AlertTriangle, Trash2, X, Shield, Upload, Download, Database } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Textarea } from "@/components/ui/textarea";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'releases' | 'reports' | 'users' | 'import'>('releases');
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
        title: "Не авторизован",
        description: "У вас нет прав доступа к админ-панели.",
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
      toast({ title: "Релиз успешно добавлен!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Не авторизован",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Ошибка добавления релиза", 
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
      toast({ title: "Комментарий успешно удален" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Не авторизован",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Ошибка удаления комментария", 
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
      toast({ title: "Жалоба закрыта" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Не авторизован",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({ 
        title: "Ошибка закрытия жалобы", 
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
            <h1 className="text-3xl font-bold text-foreground">Админ-панель</h1>
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
            Жалобы на комменты
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
          <Button
            variant={activeTab === 'import' ? 'default' : 'secondary'}
            onClick={() => setActiveTab('import')}
            data-testid="tab-import"
          >
            Импорт релизов
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
                    <Label htmlFor="title">Название релиза *</Label>
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
                    <Label htmlFor="artist">Имя артиста *</Label>
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
                    <Label htmlFor="date">Дата релиза *</Label>
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
                      placeholder="Ссылка Spotify"
                      data-testid="input-spotify"
                    />
                    <Input
                      type="url"
                      value={releaseForm.appleMusicUrl}
                      onChange={(e) => setReleaseForm(prev => ({ ...prev, appleMusicUrl: e.target.value }))}
                      placeholder="Ссылка Apple Music"
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
                  {addReleaseMutation.isPending ? "Добавляем..." : "Добавить релиз"}
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
              Новые жалобы ({reports.length})
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
                        <span className="font-medium text-foreground text-sm">Жалоба на коммент</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          Жалоба #{report.id}
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
                        <p className="text-xs text-muted-foreground mb-1">Причина жалобы:</p>
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
                        Удалить коммент
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => resolveReportMutation.mutate(report.id)}
                        disabled={resolveReportMutation.isPending}
                        data-testid={`button-dismiss-report-${report.id}`}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Отменить жалобу
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

        {/* Music Import Tab */}
        {activeTab === 'import' && (
          <MusicImportTab />
        )}
      </main>

      <Footer />
    </div>
  );
}

// Music Import Tab Component
function MusicImportTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [artistList, setArtistList] = useState('');
  const [importStats, setImportStats] = useState<{ totalReleases: number; totalArtists: number } | null>(null);

  // Fetch import stats
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/import/stats"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/import/stats');
      return response.json();
    },
  });

  const importMutation = useMutation({
    mutationFn: async (artists: string[]) => {
      const response = await apiRequest('POST', '/api/admin/import', { artists });
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Импорт завершен",
        description: `Импортировано ${result.success} релизов. ${result.errors.length > 0 ? `${result.errors.length} ошибок.` : ''}`,
      });
      setArtistList('');
      queryClient.invalidateQueries({ queryKey: ["/api/admin/import/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Не авторизован",
          description: "Вы вышли из системы. Заходим заново...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Ошибка импорта",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    const artists = artistList
      .split('\n')
      .map(artist => artist.trim())
      .filter(artist => artist.length > 0);
    
    if (artists.length === 0) {
      toast({
        title: "Пустой список",
        description: "Введите имена исполнителей для импорта",
        variant: "destructive",
      });
      return;
    }
    
    importMutation.mutate(artists);
  };

  return (
    <div className="space-y-6">
      {/* Import Stats */}
      {stats && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Статистика базы данных</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{stats.totalReleases}</p>
                <p className="text-sm text-muted-foreground">Всего релизов</p>
              </div>
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{stats.totalArtists}</p>
                <p className="text-sm text-muted-foreground">Всего артистов</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mass Import Form */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Массовый импорт исполнителей</h3>
          </div>
          
          <Alert className="mb-4">
            <Download className="h-4 w-4" />
            <AlertDescription>
              <strong>Как это работает:</strong> Введите имена исполнителей (по одному на строку). 
              Система автоматически загрузит все их релизы из MusicBrainz, включая обложки альбомов.
              Процесс может занять некоторое время из-за ограничений API (1 запрос в секунду).
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Label htmlFor="artists">Список исполнителей (по одному на строку)</Label>
            <Textarea
              id="artists"
              value={artistList}
              onChange={(e) => setArtistList(e.target.value)}
              placeholder={`Radiohead
The Beatles
Pink Floyd
Queen
Led Zeppelin`}
              rows={10}
              className="font-mono"
              data-testid="textarea-artists"
            />
            
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || !artistList.trim()}
              className="w-full"
              data-testid="button-import"
            >
              {importMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Импортирую...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Импортировать релизы ({artistList.split('\n').filter(s => s.trim()).length} исполнителей)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Information */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Информация о системе импорта</h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>MusicBrainz API:</strong> Полностью бесплатный и легальный источник метаданных</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span><strong>Cover Art Archive:</strong> Официальные обложки альбомов</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">ℹ</span>
              <span><strong>Ограничения:</strong> 1 запрос в секунду для соблюдения правил API</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">ℹ</span>
              <span><strong>Дубликаты:</strong> Система автоматически проверяет и пропускает существующие релизы</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
