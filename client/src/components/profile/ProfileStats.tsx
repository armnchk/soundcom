import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react';

interface ProfileStatsProps {
  ratingsCount: number;
  commentsCount: number;
  averageRating?: number;
  totalLikes?: number;
  totalDislikes?: number;
  recentActivity?: number;
}

export function ProfileStats({
  ratingsCount,
  commentsCount,
  averageRating,
  totalLikes = 0,
  totalDislikes = 0,
  recentActivity = 0
}: ProfileStatsProps) {
  const stats = [
    {
      title: 'Оценок',
      value: ratingsCount,
      icon: Star,
      color: 'text-yellow-500',
      description: 'Всего поставлено оценок'
    },
    {
      title: 'Отзывов',
      value: commentsCount,
      icon: MessageSquare,
      color: 'text-blue-500',
      description: 'Написано отзывов'
    },
    {
      title: 'Средняя оценка',
      value: averageRating ? averageRating.toFixed(1) : '—',
      icon: TrendingUp,
      color: 'text-green-500',
      description: 'Средняя оценка ваших отзывов'
    },
    {
      title: 'Лайков',
      value: totalLikes,
      icon: ThumbsUp,
      color: 'text-green-500',
      description: 'Получено лайков'
    },
    {
      title: 'Дизлайков',
      value: totalDislikes,
      icon: ThumbsDown,
      color: 'text-red-500',
      description: 'Получено дизлайков'
    },
    {
      title: 'Активность',
      value: recentActivity,
      icon: TrendingUp,
      color: 'text-purple-500',
      description: 'Активность за последние 30 дней'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {stat.value}
                </span>
                {stat.title === 'Средняя оценка' && averageRating && (
                  <Badge variant="secondary" className="text-xs">
                    /10
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
