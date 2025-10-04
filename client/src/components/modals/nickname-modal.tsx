import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NicknameModalProps {
  open: boolean;
  onClose: () => void;
  isRequired?: boolean;
}

export function NicknameModal({ open, onClose, isRequired = false }: NicknameModalProps) {
  const [nickname, setNickname] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const nicknameMutation = useMutation({
    mutationFn: async (nickname: string) => {
      await apiRequest('POST', '/api/auth/nickname', { nickname });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Инвалидируем все запросы пользователей, чтобы обновились данные на странице профиля
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      onClose();
      toast({ 
        title: isRequired ? "Добро пожаловать в RevYou!" : "Никнейм успешно изменен!" 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to set nickname", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (nickname.length < 3 || nickname.length > 20) {
      toast({
        title: "Неверный никнейм",
        description: "Никнейм должен содержать 3-20 символов",
        variant: "destructive"
      });
      return;
    }

    // Check nickname format: only letters, numbers, periods, and underscores
    const nicknameRegex = /^[a-zA-Z0-9._]+$/;
    if (!nicknameRegex.test(nickname)) {
      toast({
        title: "Неверный формат никнейма",
        description: "Никнейм может содержать только английские буквы, цифры, точки и подчеркивания",
        variant: "destructive"
      });
      return;
    }

    // Check for reserved nicknames (client-side validation)
    const reservedNicknames = [
      'admin', 'administrator', 'root', 'system', 'support', 'help',
      'moderator', 'mod', 'staff', 'team', 'official', 'revyou',
      'musicreview', 'platform', 'service', 'api', 'www', 'mail',
      'email', 'ftp', 'blog', 'news', 'shop', 'store', 'app',
      'mobile', 'desktop', 'web', 'site', 'home', 'about', 'contact',
      'privacy', 'terms', 'legal', 'security', 'user', 'users',
      'member', 'members', 'guest', 'guests', 'anonymous', 'anon',
      'public', 'private', 'test', 'testing', 'demo', 'example',
      'sample', 'default', 'null', 'undefined', 'empty', 'none',
      'nobody', 'follow', 'following', 'followers', 'like', 'likes',
      'comment', 'comments', 'review', 'reviews', 'rating', 'ratings',
      'bot', 'robot', 'automated', 'script', 'cron', 'backup',
      'restore', 'migrate', 'update', 'upgrade'
    ];
    
    const lowerNickname = nickname.toLowerCase();
    if (reservedNicknames.includes(lowerNickname)) {
      toast({
        title: "Зарезервированный никнейм",
        description: "Этот никнейм зарезервирован и не может быть использован",
        variant: "destructive"
      });
      return;
    }

    nicknameMutation.mutate(nickname);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => isRequired && e.preventDefault()}
      >
        <DialogHeader>
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            {isRequired ? "Выберите никнейм" : "Изменить никнейм"}
          </DialogTitle>
          <p className="text-center text-muted-foreground text-sm">
            {isRequired 
              ? "Никнейм обязателен для использования сайта. Это будет ваше отображаемое имя в сообществе."
              : "Это будет ваше отображаемое имя в сообществе"
            }
          </p>
          {isRequired && (
            <div className="flex items-center justify-center gap-2 mt-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Обязательно для регистрации</span>
            </div>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nickname">Никнейм</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow letters, numbers, periods, and underscores
                const nicknameRegex = /^[a-zA-Z0-9._]*$/;
                if (nicknameRegex.test(value)) {
                  setNickname(value);
                }
              }}
              placeholder="Введите уникальный никнейм"
              maxLength={20}
              required
              data-testid="input-nickname"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Должен быть уникальным, содержать 3-20 символов и использовать только английские буквы, цифры, точки и подчеркивания
            </p>
          </div>

          <Button
            type="submit"
            disabled={
              nicknameMutation.isPending || 
              nickname.length < 3 || 
              !/^[a-zA-Z0-9._]+$/.test(nickname) ||
              ['admin', 'administrator', 'root', 'system', 'support', 'help', 'moderator', 'mod', 'staff', 'team', 'official', 'revyou', 'musicreview', 'platform', 'service', 'api', 'www', 'mail', 'email', 'ftp', 'blog', 'news', 'shop', 'store', 'app', 'mobile', 'desktop', 'web', 'site', 'home', 'about', 'contact', 'privacy', 'terms', 'legal', 'security', 'user', 'users', 'member', 'members', 'guest', 'guests', 'anonymous', 'anon', 'public', 'private', 'test', 'testing', 'demo', 'example', 'sample', 'default', 'null', 'undefined', 'empty', 'none', 'nobody', 'follow', 'following', 'followers', 'like', 'likes', 'comment', 'comments', 'review', 'reviews', 'rating', 'ratings', 'bot', 'robot', 'automated', 'script', 'cron', 'backup', 'restore', 'migrate', 'update', 'upgrade'].includes(nickname.toLowerCase())
            }
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-complete"
          >
            {nicknameMutation.isPending 
              ? "Сохраняем..." 
              : (isRequired ? "Завершить регистрацию" : "Сохранить")
            }
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
