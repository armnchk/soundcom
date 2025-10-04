import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit, Mail, User as UserIcon } from 'lucide-react';
import { NicknameModal } from '@/components/modals/nickname-modal';
import type { User } from '@shared/schema';

interface ProfileSettingsProps {
  user: User;
  isOwnProfile: boolean;
}

export function ProfileSettings({ user, isOwnProfile }: ProfileSettingsProps) {
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  const openNicknameModal = () => {
    setShowNicknameModal(true);
  };

  const closeNicknameModal = () => {
    setShowNicknameModal(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          Настройки профиля
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="email"
              value={user.email || 'Не указан'}
              disabled
              className="bg-muted"
            />
            <Badge variant="secondary" className="text-xs">
              Google OAuth
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Email привязан к Google аккаунту и не может быть изменен
          </p>
        </div>

        {/* Nickname */}
        <div className="space-y-2">
          <Label htmlFor="nickname" className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            Никнейм
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="nickname"
              value={user.nickname || 'Не установлен'}
              disabled
              className="flex-1 bg-muted"
            />
            {isOwnProfile && (
              <Button
                size="sm"
                variant="outline"
                onClick={openNicknameModal}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Никнейм отображается в ваших отзывах и комментариях
          </p>
        </div>

        {/* User ID */}
        <div className="space-y-2">
          <Label htmlFor="userId">ID пользователя</Label>
          <Input
            id="userId"
            value={user.id}
            disabled
            className="bg-muted font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            Уникальный идентификатор вашего аккаунта
          </p>
        </div>

      </CardContent>
      
      {/* Nickname Modal */}
      <NicknameModal 
        open={showNicknameModal} 
        onClose={closeNicknameModal}
        isRequired={false}
      />
    </Card>
  );
}
