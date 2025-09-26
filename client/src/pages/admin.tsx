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
import { AlertTriangle, Trash2, X, Shield, Upload, Download, Database, Calendar, User, List, Search, Eye, FolderOpen, Plus, Album } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<'releases' | 'reports' | 'users' | 'import' | 'browse' | 'collections' | 'music-import' | 'playlists'>('releases');
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
        releaseDate: new Date(data.releaseDate).toISOString(),
        coverUrl: data.coverUrl || null,
        streamingLinks: {
          spotify: data.spotifyUrl || null,
          appleMusic: data.appleMusicUrl || null
        }
      };
      
      const response = await apiRequest('POST', '/api/releases', releaseData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Релиз добавлен!" });
      setReleaseForm({
        title: '',
        artistName: '',
        releaseDate: '',
        coverUrl: '',
        spotifyUrl: '',
        appleMusicUrl: ''
      });
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
    },
    onError: (error: any) => {
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
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddRelease = () => {
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
          <Button
            variant={activeTab === 'music-import' ? 'default' : 'secondary'}
            onClick={() => setActiveTab('music-import')}
            data-testid="tab-music-import"
          >
            <Download className="w-4 h-4 mr-2" />
            Импорт музыки
          </Button>
          <Button
            variant={activeTab === 'playlists' ? 'default' : 'secondary'}
            onClick={() => setActiveTab('playlists')}
            data-testid="tab-playlists"
          >
            <List className="w-4 h-4 mr-2" />
            Плейлисты
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

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddRelease();
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                data-testid="form-add-release"
              >
                <div>
                  <Label htmlFor="title">Название релиза *</Label>
                  <Input
                    id="title"
                    placeholder="Album Title"
                    value={releaseForm.title}
                    onChange={(e) => setReleaseForm(prev => ({ ...prev, title: e.target.value }))}
                    data-testid="input-release-title"
                  />
                </div>
                <div>
                  <Label htmlFor="artistName">Исполнитель *</Label>
                  <Input
                    id="artistName"
                    placeholder="Artist Name"
                    value={releaseForm.artistName}
                    onChange={(e) => setReleaseForm(prev => ({ ...prev, artistName: e.target.value }))}
                    data-testid="input-artist-name"
                  />
                </div>
                <div>
                  <Label htmlFor="releaseDate">Дата релиза *</Label>
                  <Input
                    id="releaseDate"
                    type="date"
                    value={releaseForm.releaseDate}
                    onChange={(e) => setReleaseForm(prev => ({ ...prev, releaseDate: e.target.value }))}
                    data-testid="input-release-date"
                  />
                </div>
                <div>
                  <Label htmlFor="coverUrl">Ссылка на обложку</Label>
                  <Input
                    id="coverUrl"
                    placeholder="https://example.com/cover.jpg"
                    value={releaseForm.coverUrl}
                    onChange={(e) => setReleaseForm(prev => ({ ...prev, coverUrl: e.target.value }))}
                    data-testid="input-cover-url"
                  />
                </div>
                <div>
                  <Label htmlFor="spotifyUrl">Spotify URL</Label>
                  <Input
                    id="spotifyUrl"
                    placeholder="https://open.spotify.com/album/..."
                    value={releaseForm.spotifyUrl}
                    onChange={(e) => setReleaseForm(prev => ({ ...prev, spotifyUrl: e.target.value }))}
                    data-testid="input-spotify-url"
                  />
                </div>
                <div>
                  <Label htmlFor="appleMusicUrl">Apple Music URL</Label>
                  <Input
                    id="appleMusicUrl"
                    placeholder="https://music.apple.com/album/..."
                    value={releaseForm.appleMusicUrl}
                    onChange={(e) => setReleaseForm(prev => ({ ...prev, appleMusicUrl: e.target.value }))}
                    data-testid="input-apple-music-url"
                  />
                </div>
                <div className="md:col-span-2">
                  <Button
                    type="submit"
                    disabled={addReleaseMutation.isPending}
                    data-testid="button-add-release"
                  >
                    {addReleaseMutation.isPending ? "Добавляем..." : "Добавить релиз"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <ReportsTab reports={reports} />
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <UserManagementTab />
        )}

        {/* Import Tab */}
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

        {/* Music Import Tab */}
        {activeTab === 'music-import' && (
          <YandexMusicImportTab />
        )}

        {/* Playlists Tab */}
        {activeTab === 'playlists' && (
          <PlaylistsTab />
        )}
      </main>

      <Footer />
    </div>
  );
}

// Компонент для импорта из российских музыкальных сервисов
function YandexMusicImportTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [playlistUrl, setPlaylistUrl] = useState('');

  // Fetch import stats
  const { data: importStats } = useQuery({
    queryKey: ["/api/import/stats"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/import/stats');
      return response.json();
    },
  });

  const testPlaylistImport = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest('POST', '/api/import/test-playlist', { playlistUrl: url });
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Импорт завершен!",
        description: `✅ Добавлено: ${result.stats.newReleases} релизов | ⏭️ Пропущено: ${result.stats.skippedReleases} | ❌ Ошибок: ${result.stats.errors.length}`,
      });
      
      setPlaylistUrl('');
      queryClient.invalidateQueries({ queryKey: ["/api/import/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка импорта",
        description: error.message || "Не удалось импортировать плейлист",
        variant: "destructive",
      });
    },
  });

  const updateArtists = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/import/update-artists', {});
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Обновление завершено!",
        description: `✅ Новых релизов: ${result.stats.newReleases} | 🔄 Обновлено артистов: ${result.stats.updatedArtists} | ❌ Ошибок: ${result.stats.errors.length}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/import/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка обновления",
        description: error.message || "Не удалось обновить артистов",
        variant: "destructive",
      });
    },
  });

  const handleTestImport = () => {
    if (!playlistUrl.trim()) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите URL плейлиста",
        variant: "destructive",
      });
      return;
    }

    if (!playlistUrl.includes('music.mts.ru') && !playlistUrl.includes('music.yandex.ru')) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите корректную ссылку на плейлист (MTS Music или Яндекс Музыка)",
        variant: "destructive",
      });
      return;
    }

    testPlaylistImport.mutate(playlistUrl);
  };

  const predefinedPlaylists = [
    { name: "🔥 MTS Чарт", url: "https://music.mts.ru/chart" },
    { name: "Чарт Яндекс", url: "https://music.yandex.ru/chart" },
    { name: "Новые релизы", url: "https://music.yandex.ru/playlists/2111e2b6-587d-a600-2fea-54df7c314477" },
    { name: "Indie Rock", url: "https://music.yandex.ru/playlists/3c5d7e75-c8ea-55af-9689-2263608117ba" },
    { name: "Russian Hip-Hop", url: "https://music.yandex.ru/playlists/83d59684-4c03-783a-8a27-8a04d52edb95" }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Download className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-xl font-semibold text-white">Импорт музыки из российских сервисов</h3>
              <p className="text-white/70 text-sm">
                Автоматический импорт релизов через Deezer/iTunes API на основе плейлистов MTS Music и Яндекс Музыки
              </p>
            </div>
          </div>

          {/* Import Statistics */}
          {importStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/20 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{importStats.totalArtists || 0}</div>
                <div className="text-sm text-white/70">Всего артистов</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{importStats.totalReleases || 0}</div>
                <div className="text-sm text-white/70">Всего релизов</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{importStats.artistsWithSpotify || 0}</div>
                <div className="text-sm text-white/70">С Spotify</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{importStats.recentReleases || 0}</div>
                <div className="text-sm text-white/70">За неделю</div>
              </div>
            </div>
          )}

          {/* Test Import Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="playlist-url" className="text-white">URL плейлиста (MTS Music или Яндекс Музыка)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="playlist-url"
                  placeholder="https://music.mts.ru/chart или https://music.yandex.ru/playlists/..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className="text-white"
                  data-testid="input-playlist-url"
                />
                <Button
                  onClick={handleTestImport}
                  disabled={testPlaylistImport.isPending}
                  data-testid="button-test-import"
                >
                  {testPlaylistImport.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Импорт...
                    </div>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Тест импорта
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Predefined Playlists */}
            <div>
              <Label className="text-white">Популярные плейлисты:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {predefinedPlaylists.map((playlist) => (
                  <Button
                    key={playlist.name}
                    variant="outline"
                    size="sm"
                    onClick={() => setPlaylistUrl(playlist.url)}
                    data-testid={`button-preset-${playlist.name.toLowerCase().replace(' ', '-')}`}
                  >
                    {playlist.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-white/80">
              <strong>Как работает импорт:</strong>
              <br />
              1. Парсим плейлист Яндекс Музыки для получения списка артистов
              <br />
              2. Ищем каждого артиста в Spotify по имени  
              <br />
              3. Загружаем полную дискографию артиста через Spotify API
              <br />
              4. Сохраняем все релизы (альбомы, синглы, компиляции) в базу данных
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Update Existing Artists */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-white">Обновление существующих артистов</h4>
              <p className="text-white/70 text-sm">
                Проверить новые релизы для артистов, которые уже есть в базе данных
              </p>
            </div>
            <Button
              onClick={() => updateArtists.mutate()}
              disabled={updateArtists.isPending}
              data-testid="button-update-artists"
            >
              {updateArtists.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Обновление...
                </div>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Обновить артистов
                </>
              )}
            </Button>
          </div>
          
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription className="text-white/80">
              Это действие проверит всех артистов в базе данных и добавит новые релизы, 
              если они были выпущены с момента последнего обновления. 
              Рекомендуется запускать ежедневно для актуальной базы релизов.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Background Import Jobs */}
      <BackgroundImportSection />

      {/* Automatic Scheduler Management */}
      <AutomaticSchedulerSection />
    </div>
  );
}

// Background Import Jobs Component
function BackgroundImportSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [backgroundUrl, setBackgroundUrl] = useState('');

  // Fetch background jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/import/jobs"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/import/jobs');
      return response.json();
    },
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
  });

  // Start background import
  const startBackgroundImport = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest('POST', '/api/import/background-playlist', { playlistUrl: url });
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Фоновый импорт запущен!",
        description: `Задача #${result.jobId} создана. Отслеживайте прогресс ниже.`,
      });
      setBackgroundUrl('');
      queryClient.invalidateQueries({ queryKey: ["/api/import/jobs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка запуска",
        description: error.message || "Не удалось запустить фоновый импорт",
        variant: "destructive",
      });
    },
  });

  // Cancel background job
  const cancelJob = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest('POST', `/api/import/jobs/${jobId}/cancel`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Задача отменена",
        description: "Фоновый импорт был отменён",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/import/jobs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка отмены",
        description: error.message || "Не удалось отменить задачу",
        variant: "destructive",
      });
    },
  });

  const handleStartBackgroundImport = () => {
    if (!backgroundUrl.trim()) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите URL плейлиста",
        variant: "destructive",
      });
      return;
    }

    if (!backgroundUrl.includes('music.mts.ru') && !backgroundUrl.includes('music.yandex.ru')) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите корректную ссылку на плейлист (MTS Music или Яндекс Музыка)",
        variant: "destructive",
      });
      return;
    }

    startBackgroundImport.mutate(backgroundUrl);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-500';
      case 'processing': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидание';
      case 'processing': return 'Выполняется';
      case 'completed': return 'Завершен';
      case 'failed': return 'Ошибка';
      default: return status;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-xl font-semibold text-white">Фоновый импорт (для массовой обработки)</h3>
            <p className="text-white/70 text-sm">
              Запуск длительного импорта в фоне для обработки больших плейлистов без таймаутов
            </p>
          </div>
        </div>

        {/* Background Import Form */}
        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="background-url" className="text-white">URL плейлиста для фонового импорта</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="background-url"
                placeholder="https://music.mts.ru/chart или https://music.yandex.ru/playlists/..."
                value={backgroundUrl}
                onChange={(e) => setBackgroundUrl(e.target.value)}
                className="text-white"
                data-testid="input-background-url"
              />
              <Button
                onClick={handleStartBackgroundImport}
                disabled={startBackgroundImport.isPending}
                data-testid="button-start-background"
              >
                {startBackgroundImport.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Запуск...
                  </div>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Запустить в фоне
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Фоновые задачи</h4>
          
          {jobsLoading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-white/70 mt-2">Загрузка задач...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-white/70">
              Нет фоновых задач
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job: any) => (
                <div key={job.id} className="border border-white/20 rounded-lg p-4 bg-muted/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-white">Задача #{job.id}</span>
                      <span className={`text-sm font-medium ${getStatusColor(job.status)}`}>
                        {getStatusText(job.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === 'processing' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelJob.mutate(job.id)}
                          disabled={cancelJob.isPending}
                        >
                          Отменить
                        </Button>
                      )}
                      <span className="text-xs text-white/60">
                        {new Date(job.createdAt).toLocaleString('ru')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-white/80 mb-3">
                    <div className="break-all">{job.playlistUrl}</div>
                  </div>

                  {/* Progress Bar */}
                  {job.status === 'processing' && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-white/70 mb-1">
                        <span>Прогресс: {job.progress || 0}%</span>
                        <span>{job.processedArtists || 0}/{job.totalArtists || 0} артистов</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${job.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Results */}
                  {(job.status === 'completed' || job.status === 'processing') && (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-green-400">{job.newReleases || 0}</div>
                        <div className="text-white/60">Новых</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-yellow-400">{job.skippedReleases || 0}</div>
                        <div className="text-white/60">Пропущено</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-red-400">{job.errors || 0}</div>
                        <div className="text-white/60">Ошибок</div>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {job.status === 'failed' && job.errorMessage && (
                    <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
                      {job.errorMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-white/80">
            <strong>Фоновый импорт:</strong> Обрабатывает плейлисты любого размера без таймаутов. 
            Идеально для больших плейлистов с сотнями артистов. Следите за прогрессом в режиме реального времени.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Automatic Scheduler Management Component
function AutomaticSchedulerSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch scheduler status
  const { data: schedulerStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/scheduler/status"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/scheduler/status');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Start scheduler
  const startScheduler = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/scheduler/start', {});
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Планировщик запущен!",
        description: result.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduler/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка запуска",
        description: error.message || "Не удалось запустить планировщик",
        variant: "destructive",
      });
    },
  });

  // Stop scheduler
  const stopScheduler = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/scheduler/stop', {});
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Планировщик остановлен",
        description: result.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduler/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка остановки",
        description: error.message || "Не удалось остановить планировщик",
        variant: "destructive",
      });
    },
  });

  // Trigger manual import
  const triggerImport = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/scheduler/trigger', {});
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Импорт запущен",
        description: result.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка запуска",
        description: error.message || "Не удалось запустить импорт",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-500' : 'text-red-500';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Активен' : 'Остановлен';
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-xl font-semibold text-white">Автоматический ежедневный импорт</h3>
            <p className="text-white/70 text-sm">
              Система автоматически обновляет базу каждый день в 03:00 МСК
            </p>
          </div>
        </div>

        {statusLoading ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white/70 mt-2">Загрузка статуса...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-muted/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Статус планировщика</span>
                  <span className={`text-sm font-bold ${getStatusColor(schedulerStatus?.isActive)}`}>
                    {getStatusText(schedulerStatus?.isActive)}
                  </span>
                </div>
                {schedulerStatus?.isActive && schedulerStatus?.nextRun && (
                  <div className="text-sm text-white/70">
                    Следующий запуск: {new Date(schedulerStatus.nextRun).toLocaleString('ru')}
                    <br />
                    Через: {schedulerStatus.hoursUntilNextRun} часов
                  </div>
                )}
              </div>

              <div className="bg-muted/20 rounded-lg p-4">
                <div className="text-white font-medium mb-2">Автоматически обрабатывает</div>
                <div className="text-sm text-white/70">
                  • MTS Music Чарт<br />
                  • Яндекс Музыка плейлисты<br />
                  • Обновление всех артистов<br />
                  • Поиск новых релизов
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-3">
              {schedulerStatus?.isActive ? (
                <Button
                  onClick={() => stopScheduler.mutate()}
                  disabled={stopScheduler.isPending}
                  variant="destructive"
                  data-testid="button-stop-scheduler"
                >
                  {stopScheduler.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Остановка...
                    </div>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Остановить планировщик
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => startScheduler.mutate()}
                  disabled={startScheduler.isPending}
                  data-testid="button-start-scheduler"
                >
                  {startScheduler.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Запуск...
                    </div>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Запустить планировщик
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={() => triggerImport.mutate()}
                disabled={triggerImport.isPending}
                variant="secondary"
                data-testid="button-trigger-import"
              >
                {triggerImport.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Запуск...
                  </div>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Запустить сейчас
                  </>
                )}
              </Button>
            </div>

            {/* Info Alert */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-white/80">
                <strong>Автоматический импорт:</strong> Планировщик запускается автоматически при старте сервера.
                Каждый день в 03:00 МСК система будет обновлять базу новыми релизами из русских музыкальных сервисов.
                Можете также запустить импорт вручную в любое время.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Reports Tab Component
function ReportsTab({ reports }: { reports: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dismissReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await apiRequest('POST', `/api/admin/reports/${reportId}/dismiss`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Жалоба отклонена" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const response = await apiRequest('POST', `/api/admin/reports/${reportId}/delete-comment`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Комментарий удален" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
    },
  });

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Нет активных жалоб</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report: any) => (
        <Card key={report.id}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <p className="font-medium">Жалоба от: {report.reportedBy.nickname}</p>
                <p className="text-sm text-muted-foreground">Причина: {report.reason}</p>
              </div>
              <div className="bg-muted p-3 rounded">
                <p className="text-sm">{report.comment.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  От: {report.comment.user.nickname} • {new Date(report.comment.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => deleteCommentMutation.mutate(report.id)}
                  disabled={deleteCommentMutation.isPending}
                >
                  Удалить комментарий
                </Button>
                <Button
                  variant="outline"
                  onClick={() => dismissReportMutation.mutate(report.id)}
                  disabled={dismissReportMutation.isPending}
                >
                  Отклонить жалобу
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// User Management Tab Component
function UserManagementTab() {
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/users');
      return response.json();
    },
  });

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold mb-4 text-white">Управление пользователями</h3>
        <div className="space-y-4">
          {users.map((user: any) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded">
              <div>
                <p className="font-medium text-white">{user.nickname || user.name}</p>
                <p className="text-sm text-white/70">{user.email}</p>
                <p className="text-xs text-white/50">
                  Зарегистрирован: {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${user.isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {user.isAdmin ? 'Админ' : 'Пользователь'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Music Import Tab Component
function MusicImportTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [importMode, setImportMode] = useState<'artists' | 'years'>('artists');
  const [artistList, setArtistList] = useState('');
  const [yearsList, setYearsList] = useState('');

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
      toast({
        title: "Импорт завершен!",
        description: `✅ Добавлено: ${result.success || 0} релизов`,
      });
      setArtistList('');
      setYearsList('');
      queryClient.invalidateQueries({ queryKey: ["/api/admin/import/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/releases"] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка импорта",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (importMode === 'artists') {
      const artists = artistList.split('\n').filter(name => name.trim());
      if (artists.length === 0) {
        toast({ title: "Список пуст", variant: "destructive" });
        return;
      }
      importMutation.mutate({ artists });
    } else {
      const years = yearsList.split('\n').map(y => parseInt(y.trim())).filter(y => !isNaN(y));
      if (years.length === 0) {
        toast({ title: "Список пуст", variant: "destructive" });
        return;
      }
      importMutation.mutate({ years });
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Upload className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-xl font-semibold text-white">Массовый импорт релизов</h3>
            <p className="text-white/70 text-sm">Импорт через Last.fm API</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted/20 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalReleases || 0}</div>
              <div className="text-sm text-white/70">Всего релизов</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalArtists || 0}</div>
              <div className="text-sm text-white/70">Всего артистов</div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <RadioGroup value={importMode} onValueChange={(value: 'artists' | 'years') => setImportMode(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="artists" id="artists" />
              <Label htmlFor="artists" className="text-white">По артистам</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="years" id="years" />
              <Label htmlFor="years" className="text-white">По годам</Label>
            </div>
          </RadioGroup>

          {importMode === 'artists' ? (
            <div>
              <Label className="text-white">Список артистов (по одному на строку):</Label>
              <Textarea
                placeholder="Arctic Monkeys&#10;Radiohead&#10;..."
                value={artistList}
                onChange={(e) => setArtistList(e.target.value)}
                rows={6}
                className="text-white"
              />
            </div>
          ) : (
            <div>
              <Label className="text-white">Список годов (по одному на строку):</Label>
              <Textarea
                placeholder="2023&#10;2022&#10;..."
                value={yearsList}
                onChange={(e) => setYearsList(e.target.value)}
                rows={6}
                className="text-white"
              />
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={importMutation.isPending}
            className="w-full"
          >
            {importMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Импорт...
              </div>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Начать импорт
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Release Browser Tab Component  
function ReleaseBrowserTab({ searchQuery, onSearchChange, showTestData }: { 
  searchQuery: string; 
  onSearchChange: (query: string) => void; 
  showTestData: boolean 
}) {
  const { data: releases = [] } = useQuery({
    queryKey: ["/api/releases", { showTestData }],
    queryFn: async ({ queryKey }) => {
      const [, params] = queryKey as [string, { showTestData: boolean }];
      const response = await fetch(`/api/releases?showTestData=${params.showTestData}`);
      if (!response.ok) throw new Error('Failed to fetch releases');
      return response.json();
    },
  });

  const filteredReleases = releases.filter((release: any) =>
    release.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    release.artist?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <List className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold text-white">Все релизы ({filteredReleases.length})</h3>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Поиск по названию или артисту..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="text-white"
          />
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredReleases.map((release: any) => (
            <div
              key={release.id}
              className="flex items-center gap-4 p-4 border rounded hover:bg-muted/50"
            >
              {release.coverUrl ? (
                <img
                  src={release.coverUrl}
                  alt={release.title}
                  className="w-12 h-12 rounded object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                  <Album className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <h4 className="font-medium text-white">{release.title}</h4>
                <p className="text-sm text-white/70">{release.artist?.name}</p>
                <p className="text-xs text-white/50">
                  {release.releaseDate ? new Date(release.releaseDate).getFullYear() : 'Нет даты'}
                </p>
              </div>
              <div className="text-sm text-white/70">
                ⭐ {release.averageRating?.toFixed(1) || 'Нет оценок'}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Collections Tab Component
function CollectionsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCollection, setNewCollection] = useState({ title: '', description: '', isPublic: true });
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [managingReleases, setManagingReleases] = useState<number | null>(null);
  const [releaseSearch, setReleaseSearch] = useState('');

  const { data: collections = [] } = useQuery({
    queryKey: ["/api/admin/collections"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/collections');
      return response.json();
    },
  });

  const { data: allReleases = [] } = useQuery({
    queryKey: ["/api/releases", { showTestData: true }],
    queryFn: async () => {
      const response = await fetch('/api/releases?showTestData=true');
      return response.json();
    },
  });

  const filteredReleases = allReleases.filter((release: any) =>
    release.title.toLowerCase().includes(releaseSearch.toLowerCase()) ||
    release.artist?.name.toLowerCase().includes(releaseSearch.toLowerCase())
  );

  const createCollectionMutation = useMutation({
    mutationFn: async (data: typeof newCollection) => {
      const response = await apiRequest('POST', '/api/admin/collections', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Подборка создана!" });
      setNewCollection({ title: '', description: '', isPublic: true });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/collections"] });
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/admin/collections/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Подборка удалена!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/collections"] });
    },
  });

  const addReleaseMutation = useMutation({
    mutationFn: async (data: { collectionId: number; releaseId: number; sortOrder: number }) => {
      const response = await apiRequest('POST', `/api/admin/collections/${data.collectionId}/releases`, {
        releaseId: data.releaseId,
        sortOrder: data.sortOrder
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Релиз добавлен!" });
      setReleaseSearch('');
      queryClient.invalidateQueries({ queryKey: ["/api/admin/collections"] });
    },
  });

  const removeReleaseMutation = useMutation({
    mutationFn: async (data: { collectionId: number; releaseId: number }) => {
      const response = await apiRequest('DELETE', `/api/admin/collections/${data.collectionId}/releases/${data.releaseId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Релиз удален!" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/collections"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Create Collection */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <FolderOpen className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-semibold text-white">Создать новую подборку</h3>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCollection.title.trim()) {
                toast({ title: "Введите название", variant: "destructive" });
                return;
              }
              createCollectionMutation.mutate(newCollection);
            }}
            className="space-y-4"
          >
            <div>
              <Label className="text-white">Название подборки</Label>
              <Input
                placeholder="Название подборки"
                value={newCollection.title}
                onChange={(e) => setNewCollection(prev => ({ ...prev, title: e.target.value }))}
                className="text-white"
              />
            </div>
            <div>
              <Label className="text-white">Описание</Label>
              <Textarea
                placeholder="Описание подборки"
                value={newCollection.description}
                onChange={(e) => setNewCollection(prev => ({ ...prev, description: e.target.value }))}
                className="text-white"
              />
            </div>
            <Button type="submit" disabled={createCollectionMutation.isPending}>
              {createCollectionMutation.isPending ? "Создаем..." : "Создать подборку"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Collections List */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            Все подборки ({collections.length})
          </h3>

          {collections.length === 0 ? (
            <p className="text-white/70">Нет созданных подборок</p>
          ) : (
            <div className="space-y-4">
              {collections.map((collection: any) => (
                <div key={collection.id} className="border rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h5 className="font-semibold text-white">{collection.title}</h5>
                      {collection.description && (
                        <p className="text-sm text-white/70 mt-1">{collection.description}</p>
                      )}
                      <p className="text-xs text-white/50 mt-1">
                        {collection.isPublic ? 'Публичная' : 'Приватная'} • {collection.releases?.length || 0} релизов
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setManagingReleases(managingReleases === collection.id ? null : collection.id)}
                      >
                        <List className="w-4 h-4 mr-1" />
                        {collection.releases?.length || 0}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteCollectionMutation.mutate(collection.id)}
                        disabled={deleteCollectionMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Release Management */}
                  {managingReleases === collection.id && (
                    <div className="border-t pt-3 space-y-3">
                      <h6 className="font-medium text-white">Релизы в подборке ({collection.releases?.length || 0})</h6>
                      
                      {collection.releases?.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {collection.releases.map((release: any) => (
                            <div
                              key={release.id}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm text-white">{release.title}</p>
                                <p className="text-xs text-white/70">
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
                          className="text-white"
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
                                >
                                  <div>
                                    <p className="font-medium text-sm text-white">{release.title}</p>
                                    <p className="text-xs text-white/70">{release.artist?.name}</p>
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

// Компонент для управления плейлистами автоимпорта
function PlaylistsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [playlistForm, setPlaylistForm] = useState({
    name: '',
    url: '',
    enabled: true,
    sortOrder: 0
  });
  const [isEditing, setIsEditing] = useState<number | null>(null);

  const { data: playlists = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/auto-import-playlists"],
    enabled: true,
  });

  const createPlaylistMutation = useMutation({
    mutationFn: async (data: typeof playlistForm) => {
      const response = await apiRequest('POST', '/api/auto-import-playlists', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-import-playlists"] });
      setPlaylistForm({ name: '', url: '', enabled: true, sortOrder: 0 });
      toast({
        title: "Плейлист добавлен",
        description: "Новый плейлист успешно добавлен в автоимпорт.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить плейлист.",
        variant: "destructive",
      });
    },
  });

  const updatePlaylistMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<typeof playlistForm>) => {
      const response = await apiRequest('PUT', `/api/auto-import-playlists/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-import-playlists"] });
      setIsEditing(null);
      toast({
        title: "Плейлист обновлен",
        description: "Плейлист успешно обновлен.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить плейлист.",
        variant: "destructive",
      });
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/auto-import-playlists/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-import-playlists"] });
      toast({
        title: "Плейлист удален",
        description: "Плейлист удален из автоимпорта.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить плейлист.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistForm.name.trim() || !playlistForm.url.trim()) {
      toast({
        title: "Ошибка",
        description: "Название и URL обязательны для заполнения.",
        variant: "destructive",
      });
      return;
    }

    createPlaylistMutation.mutate(playlistForm);
  };

  const handleEdit = (playlist: any) => {
    setIsEditing(playlist.id);
    setPlaylistForm({
      name: playlist.name,
      url: playlist.url,
      enabled: playlist.enabled,
      sortOrder: playlist.sortOrder
    });
  };

  const handleUpdate = (id: number) => {
    if (!playlistForm.name.trim() || !playlistForm.url.trim()) {
      toast({
        title: "Ошибка",
        description: "Название и URL обязательны для заполнения.",
        variant: "destructive",
      });
      return;
    }

    updatePlaylistMutation.mutate({ id, ...playlistForm });
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setPlaylistForm({ name: '', url: '', enabled: true, sortOrder: 0 });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Управление плейлистами автоимпорта</h3>
          
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Здесь вы можете добавлять, редактировать и удалять плейлисты из российских музыкальных сервисов для автоматического импорта музыки.
              Система ежедневно проверяет указанные плейлисты и добавляет новые релизы в базу данных.
            </AlertDescription>
          </Alert>

          {/* Форма добавления/редактирования */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="playlist-name" className="text-white">
                  Название плейлиста
                </Label>
                <Input
                  id="playlist-name"
                  type="text"
                  value={playlistForm.name}
                  onChange={(e) => setPlaylistForm({ ...playlistForm, name: e.target.value })}
                  placeholder="Новинки хип-хопа"
                  className="text-white"
                  data-testid="input-playlist-name"
                />
              </div>
              
              <div>
                <Label htmlFor="playlist-url" className="text-white">
                  URL плейлиста
                </Label>
                <Input
                  id="playlist-url"
                  type="url"
                  value={playlistForm.url}
                  onChange={(e) => setPlaylistForm({ ...playlistForm, url: e.target.value })}
                  placeholder="https://music.mts.ru/playlist/..."
                  className="text-white"
                  data-testid="input-playlist-url"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="playlist-enabled"
                  checked={playlistForm.enabled}
                  onCheckedChange={(checked) => setPlaylistForm({ ...playlistForm, enabled: checked })}
                  data-testid="switch-playlist-enabled"
                />
                <Label htmlFor="playlist-enabled" className="text-white">
                  Активен
                </Label>
              </div>
              
              <div>
                <Label htmlFor="playlist-order" className="text-white">
                  Порядок сортировки
                </Label>
                <Input
                  id="playlist-order"
                  type="number"
                  value={playlistForm.sortOrder}
                  onChange={(e) => setPlaylistForm({ ...playlistForm, sortOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="text-white"
                  data-testid="input-playlist-order"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    onClick={() => handleUpdate(isEditing)}
                    disabled={updatePlaylistMutation.isPending}
                    data-testid="button-update-playlist"
                  >
                    Обновить плейлист
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    data-testid="button-cancel-edit"
                  >
                    Отмена
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  disabled={createPlaylistMutation.isPending}
                  data-testid="button-add-playlist"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить плейлист
                </Button>
              )}
            </div>
          </form>

          {/* Список плейлистов */}
          {isLoading ? (
            <div className="text-center text-white/70 py-8">Загрузка плейлистов...</div>
          ) : playlists.length === 0 ? (
            <div className="text-center text-white/70 py-8">
              Нет добавленных плейлистов. Добавьте первый плейлист выше.
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Текущие плейлисты ({playlists.length})</h4>
              
              {playlists.map((playlist: any) => (
                <div
                  key={playlist.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  data-testid={`playlist-item-${playlist.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-white" data-testid={`text-playlist-name-${playlist.id}`}>
                        {playlist.name}
                      </h5>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          playlist.enabled 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}
                        data-testid={`status-playlist-${playlist.id}`}
                      >
                        {playlist.enabled ? 'Активен' : 'Отключен'}
                      </span>
                    </div>
                    <p className="text-sm text-white/70 mb-1" data-testid={`text-playlist-url-${playlist.id}`}>
                      {playlist.url}
                    </p>
                    <p className="text-xs text-white/50">
                      Порядок: {playlist.sortOrder} • 
                      Создан: {new Date(playlist.createdAt).toLocaleDateString('ru-RU')} •
                      Обновлен: {new Date(playlist.updatedAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(playlist)}
                      disabled={isEditing === playlist.id}
                      data-testid={`button-edit-${playlist.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deletePlaylistMutation.mutate(playlist.id)}
                      disabled={deletePlaylistMutation.isPending}
                      data-testid={`button-delete-${playlist.id}`}
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