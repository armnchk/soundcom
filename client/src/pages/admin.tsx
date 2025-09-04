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
import { AlertTriangle, Trash2, X, Shield, Upload, Download, Database, Calendar, User, List, Search, Eye, FolderOpen, Plus } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'releases' | 'reports' | 'users' | 'import' | 'browse' | 'collections'>('releases');
  const [releaseForm, setReleaseForm] = useState({
    title: '',
    artistName: '',
    releaseDate: '',
    coverUrl: '',
    spotifyUrl: '',
    appleMusicUrl: ''
  });
  const [showTestData, setShowTestData] = useState(() => {
    const saved = localStorage.getItem('showTestData');
    return saved === 'true';
  });
  const [releaseSearch, setReleaseSearch] = useState('');

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

  // Save test data preference to localStorage
  useEffect(() => {
    localStorage.setItem('showTestData', showTestData.toString());
    // Invalidate releases queries to refetch with new setting
    queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
  }, [showTestData, queryClient]);

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
            Добавить релизы
          </Button>
          <Button
            variant={activeTab === 'browse' ? 'default' : 'secondary'}
            onClick={() => setActiveTab('browse')}
            data-testid="tab-browse"
          >
            <List className="w-4 h-4 mr-2" />
            Все релизы
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
          <Button
            variant={activeTab === 'collections' ? 'default' : 'secondary'}
            onClick={() => setActiveTab('collections')}
            data-testid="tab-collections"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Подборки
          </Button>
        </div>

        {/* Manage Releases Tab */}
        {activeTab === 'releases' && (
          <Card>
            <CardContent className="p-6">
              {/* Test Data Toggle */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Настройки отображения</h3>
                  <p className="text-sm text-muted-foreground">Управление видимостью тестовых данных</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="show-test-data" className="text-sm font-medium">
                    Показывать тестовые релизы
                  </Label>
                  <Switch
                    id="show-test-data"
                    checked={showTestData}
                    onCheckedChange={setShowTestData}
                    data-testid="switch-show-test-data"
                  />
                </div>
              </div>

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

        {/* Browse Releases Tab */}
        {activeTab === 'browse' && (
          <ReleaseBrowserTab 
            searchQuery={releaseSearch} 
            onSearchChange={setReleaseSearch} 
            showTestData={showTestData}
          />
        )}

        {/* Collections Tab */}
        {activeTab === 'collections' && (
          <CollectionsTab />
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
  const [importMode, setImportMode] = useState<'artists' | 'years'>('artists');
  const [artistList, setArtistList] = useState('');
  const [yearsList, setYearsList] = useState('');
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
    mutationFn: async (data: { artists?: string[]; years?: number[] }) => {
      if (data.artists) {
        const response = await apiRequest('POST', '/api/admin/import', { artists: data.artists });
        return response.json();
      } else if (data.years) {
        const response = await apiRequest('POST', '/api/admin/import/years', { years: data.years });
        return response.json();
      }
      throw new Error('Invalid import data');
    },
    onSuccess: (result) => {
      const successCount = result.success || 0;
      const errorCount = result.errors?.length || 0;
      const skippedCount = result.skipped || 0;
      
      toast({
        title: "Импорт завершен!",
        description: `✅ Добавлено: ${successCount} релизов${errorCount > 0 ? ` | ❌ Ошибок: ${errorCount}` : ''}${skippedCount > 0 ? ` | ⏭️ Пропущено: ${skippedCount}` : ''}`,
      });
      
      // Показать подробные результаты
      if (result.errors && result.errors.length > 0) {
        console.log('Ошибки импорта:', result.errors);
      }
      
      setArtistList('');
      setYearsList('');
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
    if (importMode === 'artists') {
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
      
      importMutation.mutate({ artists });
    } else {
      const years = yearsList
        .split('\n')
        .map(year => parseInt(year.trim()))
        .filter(year => !isNaN(year) && year >= 1900 && year <= new Date().getFullYear());
      
      if (years.length === 0) {
        toast({
          title: "Некорректные годы",
          description: "Введите годы в диапазоне от 1900 до текущего года",
          variant: "destructive",
        });
        return;
      }
      
      importMutation.mutate({ years });
    }
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.realReleases || 0}</p>
                <p className="text-sm text-muted-foreground">Реальные релизы</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Импортированные</p>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.testReleases || 0}</p>
                <p className="text-sm text-muted-foreground">Тестовые релизы</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Для демо</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalReleases}</p>
                <p className="text-sm text-muted-foreground">Всего релизов</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">В базе данных</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalArtists}</p>
                <p className="text-sm text-muted-foreground">Всего артистов</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Уникальных</p>
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
            <h3 className="text-lg font-semibold text-foreground">Массовый импорт релизов</h3>
          </div>
          
          {/* Import Mode Selection */}
          <div className="space-y-4 mb-6">
            <Label>Режим импорта</Label>
            <RadioGroup value={importMode} onValueChange={(value: 'artists' | 'years') => setImportMode(value)} className="flex gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="artists" id="artists-mode" />
                <Label htmlFor="artists-mode" className="flex items-center gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  По исполнителям
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="years" id="years-mode" />
                <Label htmlFor="years-mode" className="flex items-center gap-2 cursor-pointer">
                  <Calendar className="w-4 h-4" />
                  По годам выпуска
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <Alert className="mb-4">
            <Download className="h-4 w-4" />
            <AlertDescription>
              {importMode === 'artists' ? (
                <>
                  <strong>Импорт по исполнителям:</strong> Введите имена исполнителей (по одному на строку). 
                  Система загрузит все их релизы из MusicBrainz, включая обложки альбомов.
                </>
              ) : (
                <>
                  <strong>Импорт по годам:</strong> Введите годы выпуска (по одному на строку). 
                  Система найдет популярные релизы разных исполнителей за указанные годы.
                </>
              )}
              <br />Процесс может занять время из-за ограничений API (1 запрос в секунду).
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {importMode === 'artists' ? (
              <>
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
              </>
            ) : (
              <>
                <Label htmlFor="years">Список годов (по одному на строку)</Label>
                <Textarea
                  id="years"
                  value={yearsList}
                  onChange={(e) => setYearsList(e.target.value)}
                  placeholder={`2024
2023
2022
2021
2020`}
                  rows={10}
                  className="font-mono"
                  data-testid="textarea-years"
                />
              </>
            )}
            
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || (importMode === 'artists' ? !artistList.trim() : !yearsList.trim())}
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
                  {importMode === 'artists' 
                    ? `Импортировать релизы (${artistList.split('\n').filter(s => s.trim()).length} исполнителей)`
                    : `Импортировать релизы (${yearsList.split('\n').filter(s => s.trim()).length} годов)`
                  }
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

// Release Browser Tab Component
function ReleaseBrowserTab({ 
  searchQuery, 
  onSearchChange, 
  showTestData 
}: { 
  searchQuery: string; 
  onSearchChange: (query: string) => void; 
  showTestData: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<'all' | 'real' | 'test'>('real');

  // Fetch all releases with search and filtering
  const { data: releases = [], isLoading } = useQuery({
    queryKey: ["/api/releases", { 
      includeTestData: showTestData || selectedType === 'test' || selectedType === 'all',
      search: searchQuery 
    }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { includeTestData: boolean; search: string }];
      const urlParams = new URLSearchParams();
      
      if (params.includeTestData) urlParams.append('includeTestData', 'true');
      if (params.search) urlParams.append('search', params.search);
      
      const response = await fetch(`/api/releases?${urlParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch releases');
      return response.json();
    },
  });

  // Filter releases based on type selection
  const filteredReleases = releases.filter((release: any) => {
    if (selectedType === 'real') return !release.isTestData;
    if (selectedType === 'test') return release.isTestData;
    return true; // 'all'
  });

  const deleteReleaseMutation = useMutation({
    mutationFn: async (releaseId: number) => {
      await apiRequest('DELETE', `/api/releases/${releaseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/import/stats"] });
      toast({ title: "Релиз успешно удален" });
    },
    onError: (error) => {
      toast({ 
        title: "Ошибка удаления релиза", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Поиск и фильтры</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск по названию релиза или исполнителю..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                data-testid="input-search-releases"
              />
            </div>
            
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'all' | 'real' | 'test')}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
              data-testid="select-release-type"
            >
              <option value="real">Только реальные релизы</option>
              <option value="test">Только тестовые релизы</option>
              <option value="all">Все релизы</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Releases List */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Релизы ({filteredReleases.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-muted-foreground">Загрузка релизов...</p>
            </div>
          ) : filteredReleases.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? 'Релизы не найдены' : 'Нет релизов для отображения'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredReleases.map((release: any) => (
                <div 
                  key={release.id} 
                  className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-secondary/50"
                  data-testid={`release-item-${release.id}`}
                >
                  {/* Release Cover */}
                  <div className="w-16 h-16 bg-secondary rounded-md flex items-center justify-center flex-shrink-0">
                    {release.coverUrl ? (
                      <img 
                        src={release.coverUrl} 
                        alt={release.title}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <div className="text-muted-foreground text-2xl">♪</div>
                    )}
                  </div>
                  
                  {/* Release Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">{release.title}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {release.artist?.name || 'Неизвестный исполнитель'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span>{release.releaseDate ? new Date(release.releaseDate).getFullYear() : 'Нет даты'}</span>
                      <span>★ {release.averageRating ? release.averageRating.toFixed(1) : '0.0'}</span>
                      <span>{release.commentCount || 0} отзывов</span>
                      {release.isTestData && (
                        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs">
                          Тестовый
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/release/${release.id}`, '_blank')}
                      data-testid={`button-view-release-${release.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteReleaseMutation.mutate(release.id)}
                      disabled={deleteReleaseMutation.isPending}
                      data-testid={`button-delete-release-${release.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Collections Tab Component
function CollectionsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [collectionForm, setCollectionForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    isActive: true,
    sortOrder: 0
  });
  const [releaseSearch, setReleaseSearch] = useState('');
  const [managingReleases, setManagingReleases] = useState<number | null>(null);

  // Fetch collections
  const { data: collections, isLoading: collectionsLoading } = useQuery({
    queryKey: ['/api/collections?activeOnly=false'],
    queryFn: () => apiRequest('GET', '/api/collections?activeOnly=false').then(res => res.json()),
  });

  // Fetch all releases for selection
  const { data: allReleases } = useQuery({
    queryKey: ['/api/releases'],
    queryFn: () => apiRequest('GET', '/api/releases').then(res => res.json()),
  });

  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/collections', data),
    onSuccess: () => {
      toast({ title: "Подборка создана успешно" });
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      setIsCreating(false);
      setCollectionForm({ title: '', subtitle: '', description: '', isActive: true, sortOrder: 0 });
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка при создании подборки", 
        description: error.message || 'Неизвестная ошибка',
        variant: "destructive" 
      });
    }
  });

  // Update collection mutation
  const updateCollectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => apiRequest('PUT', `/api/collections/${id}`, data),
    onSuccess: () => {
      toast({ title: "Подборка обновлена успешно" });
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      setEditingCollection(null);
      setIsCreating(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка при обновлении подборки", 
        description: error.message || 'Неизвестная ошибка',
        variant: "destructive" 
      });
    }
  });

  // Delete collection mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/collections/${id}`),
    onSuccess: () => {
      toast({ title: "Подборка удалена успешно" });
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка при удалении подборки", 
        description: error.message || 'Неизвестная ошибка',
        variant: "destructive" 
      });
    }
  });

  // Add release to collection mutation
  const addReleaseMutation = useMutation({
    mutationFn: ({ collectionId, releaseId, sortOrder }: { collectionId: number, releaseId: number, sortOrder: number }) => 
      apiRequest('POST', `/api/collections/${collectionId}/releases`, { releaseId, sortOrder }),
    onSuccess: () => {
      toast({ title: "Релиз добавлен в подборку" });
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      setReleaseSearch('');
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка при добавлении релиза", 
        description: error.message || 'Неизвестная ошибка',
        variant: "destructive" 
      });
    }
  });

  // Remove release from collection mutation
  const removeReleaseMutation = useMutation({
    mutationFn: ({ collectionId, releaseId }: { collectionId: number, releaseId: number }) =>
      apiRequest('DELETE', `/api/collections/${collectionId}/releases/${releaseId}`),
    onSuccess: () => {
      toast({ title: "Релиз удален из подборки" });
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка при удалении релиза", 
        description: error.message || 'Неизвестная ошибка',
        variant: "destructive" 
      });
    }
  });

  // Initialize system collections mutation
  const initializeSystemCollectionsMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/collections/initialize-system'),
    onSuccess: () => {
      toast({ title: "Системные подборки созданы успешно" });
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка при создании системных подборок", 
        description: error.message || 'Неизвестная ошибка',
        variant: "destructive" 
      });
    }
  });

  // Update system collection mutation
  const updateSystemCollectionMutation = useMutation({
    mutationFn: (type: 'latest' | 'most_discussed') => 
      apiRequest('POST', `/api/collections/update-system/${type}`),
    onSuccess: (_, type) => {
      toast({ title: `Системная подборка "${type === 'latest' ? 'Новые релизы' : 'Популярные'}" обновлена` });
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка при обновлении системной подборки", 
        description: error.message || 'Неизвестная ошибка',
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCollection) {
      updateCollectionMutation.mutate({ id: editingCollection.id, data: collectionForm });
    } else {
      createCollectionMutation.mutate(collectionForm);
    }
  };

  const startEditing = (collection: any) => {
    setEditingCollection(collection);
    setCollectionForm({
      title: collection.title,
      subtitle: collection.subtitle || '',
      description: collection.description || '',
      isActive: collection.isActive,
      sortOrder: collection.sortOrder
    });
    setIsCreating(true);
  };

  const cancelEditing = () => {
    setEditingCollection(null);
    setIsCreating(false);
    setCollectionForm({ title: '', subtitle: '', description: '', isActive: true, sortOrder: 0 });
  };

  const filteredReleases = allReleases?.filter((release: any) =>
    release.title.toLowerCase().includes(releaseSearch.toLowerCase()) ||
    release.artist?.name.toLowerCase().includes(releaseSearch.toLowerCase())
  ) || [];

  if (collectionsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Загружаем подборки...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Управление подборками</h3>
              <p className="text-sm text-muted-foreground">Создавайте и управляйте тематическими подборками релизов</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => initializeSystemCollectionsMutation.mutate()}
                disabled={initializeSystemCollectionsMutation.isPending}
                data-testid="button-init-system-collections"
              >
                <Database className="w-4 h-4 mr-2" />
                {initializeSystemCollectionsMutation.isPending ? 'Создаю...' : 'Создать системные подборки'}
              </Button>
              <Button
                onClick={() => setIsCreating(true)}
                disabled={isCreating}
                data-testid="button-create-collection"
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать подборку
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Collection Form */}
      {isCreating && (
        <Card>
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold mb-4">
              {editingCollection ? 'Редактировать подборку' : 'Создать новую подборку'}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Название</Label>
                  <Input
                    id="title"
                    value={collectionForm.title}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Название подборки"
                    required
                    data-testid="input-collection-title"
                  />
                </div>
                <div>
                  <Label htmlFor="subtitle">Подзаголовок</Label>
                  <Input
                    id="subtitle"
                    value={collectionForm.subtitle}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="Краткое описание"
                    data-testid="input-collection-subtitle"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={collectionForm.description}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Подробное описание подборки"
                  rows={3}
                  data-testid="textarea-collection-description"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={collectionForm.isActive}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    data-testid="checkbox-collection-active"
                  />
                  <Label htmlFor="isActive">Активная подборка</Label>
                </div>
                <div>
                  <Label htmlFor="sortOrder">Порядок сортировки</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={collectionForm.sortOrder}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-20"
                    data-testid="input-collection-sort-order"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createCollectionMutation.isPending || updateCollectionMutation.isPending}
                  data-testid="button-submit-collection"
                >
                  {editingCollection ? 'Обновить' : 'Создать'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEditing}
                  data-testid="button-cancel-collection"
                >
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Collections List */}
      <Card>
        <CardContent className="p-6">
          <h4 className="text-lg font-semibold mb-4">Все подборки ({collections?.length || 0})</h4>
          {!collections?.length ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Подборки пока не созданы</p>
              <Button
                onClick={() => setIsCreating(true)}
                className="mt-4"
                data-testid="button-create-first-collection"
              >
                Создать первую подборку
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {collections.map((collection: any) => (
                <div
                  key={collection.id}
                  className="border rounded-lg p-4 space-y-3"
                  data-testid={`collection-${collection.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-semibold text-foreground">{collection.title}</h5>
                      {collection.subtitle && (
                        <p className="text-sm text-muted-foreground mt-1">{collection.subtitle}</p>
                      )}
                      {collection.description && (
                        <p className="text-sm text-muted-foreground mt-2">{collection.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span>Релизов: {collection.releases?.length || 0}</span>
                        <span>Порядок: {collection.sortOrder}</span>
                        <span className={collection.isActive ? "text-green-600" : "text-red-600"}>
                          {collection.isActive ? "Активная" : "Неактивная"}
                        </span>
                        {(collection.type === 'latest' || collection.type === 'most_discussed') && (
                          <span className="text-blue-600 font-medium">Системная</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {/* System collection update button */}
                      {(collection.type === 'latest' || collection.type === 'most_discussed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateSystemCollectionMutation.mutate(collection.type)}
                          disabled={updateSystemCollectionMutation.isPending}
                          data-testid={`button-update-system-${collection.id}`}
                          className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        >
                          <Database className="w-4 h-4 mr-1" />
                          Обновить
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManagingReleases(managingReleases === collection.id ? null : collection.id)}
                        data-testid={`button-manage-releases-${collection.id}`}
                      >
                        <List className="w-4 h-4 mr-1" />
                        {collection.releases?.length || 0}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(collection)}
                        data-testid={`button-edit-collection-${collection.id}`}
                      >
                        Изменить
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteCollectionMutation.mutate(collection.id)}
                        disabled={deleteCollectionMutation.isPending}
                        data-testid={`button-delete-collection-${collection.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Release Management */}
                  {managingReleases === collection.id && (
                    <div className="border-t pt-3 space-y-3">
                      <h6 className="font-medium">Релизы в подборке ({collection.releases?.length || 0})</h6>
                      
                      {collection.releases?.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {collection.releases.map((release: any) => (
                            <div
                              key={release.id}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded"
                              data-testid={`collection-release-${collection.id}-${release.id}`}
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm">{release.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {release.artist?.name} • {release.releaseDate ? new Date(release.releaseDate).getFullYear() : 'Нет даты'}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeReleaseMutation.mutate({ 
                                  collectionId: collection.id, 
                                  releaseId: release.id 
                                })}
                                disabled={removeReleaseMutation.isPending}
                                data-testid={`button-remove-release-${collection.id}-${release.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Release */}
                      <div className="space-y-2">
                        <Input
                          placeholder="Поиск релизов для добавления..."
                          value={releaseSearch}
                          onChange={(e) => setReleaseSearch(e.target.value)}
                          data-testid={`input-search-releases-${collection.id}`}
                        />
                        
                        {releaseSearch && (
                          <div className="max-h-32 overflow-y-auto border rounded">
                            {filteredReleases
                              .filter((release: any) => !collection.releases?.some((cr: any) => cr.id === release.id))
                              .slice(0, 10)
                              .map((release: any) => (
                                <div
                                  key={release.id}
                                  className="flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer"
                                  onClick={() => {
                                    addReleaseMutation.mutate({
                                      collectionId: collection.id,
                                      releaseId: release.id,
                                      sortOrder: collection.releases?.length || 0
                                    });
                                  }}
                                  data-testid={`search-result-release-${release.id}`}
                                >
                                  <div>
                                    <p className="font-medium text-sm">{release.title}</p>
                                    <p className="text-xs text-muted-foreground">{release.artist?.name}</p>
                                  </div>
                                  <Plus className="w-4 h-4" />
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
