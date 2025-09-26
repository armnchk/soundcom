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
  const [activeTab, setActiveTab] = useState<'releases' | 'reports' | 'users' | 'import' | 'browse' | 'collections' | 'music-import'>('releases');
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
      </main>

      <Footer />
    </div>
  );
}

// Новый компонент для импорта из Яндекс Музыки
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

    if (!playlistUrl.includes('music.yandex.ru')) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите корректную ссылку на плейлист Яндекс Музыки",
        variant: "destructive",
      });
      return;
    }

    testPlaylistImport.mutate(playlistUrl);
  };

  const predefinedPlaylists = [
    { name: "Чарт", url: "https://music.yandex.ru/chart" },
    { name: "Новые релизы", url: "https://music.yandex.ru/playlists/2111e2b6-587d-a600-2fea-54df7c314477" },
    { name: "Indie Rock", url: "https://music.yandex.ru/playlists/3c5d7e75-c8ea-55af-9689-2263608117ba" },
    { name: "Russian Hip-Hop", url: "https://music.yandex.ru/playlists/83d59684-4c03-783a-8a27-8a04d52edb95" },
    { name: "Электроника", url: "https://music.yandex.ru/playlists/be0f3522-0e50-fe5d-8a01-8a0146041ccd" }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Download className="w-6 h-6 text-primary" />
            <div>
              <h3 className="text-xl font-semibold text-white">Импорт музыки из Яндекс Музыки</h3>
              <p className="text-white/70 text-sm">
                Автоматический импорт релизов через Spotify API на основе плейлистов Яндекс Музыки
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
              <Label htmlFor="playlist-url" className="text-white">URL плейлиста Яндекс Музыки</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="playlist-url"
                  placeholder="https://music.yandex.ru/playlists/..."
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
    </div>
  );
}

// Continue with other existing components (ReportsTab, UserManagementTab, MusicImportTab, ReleaseBrowserTab, CollectionsTab)
// ... (these would be the existing component definitions)