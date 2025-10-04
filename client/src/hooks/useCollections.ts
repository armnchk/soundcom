import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Collection {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  is_active: boolean;
  is_public: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
  releases: Array<{
    id: number;
    title: string;
    cover_image_url?: string;
    release_date: string;
    artist: {
      id: number;
      name: string;
    };
  }>;
}

interface CreateCollectionData {
  title: string;
  subtitle?: string;
  description?: string;
  is_active?: boolean;
  is_public?: boolean;
  sort_order?: number;
  releaseIds?: number[];
}

interface UpdateCollectionData {
  title?: string;
  subtitle?: string;
  description?: string;
  is_active?: boolean;
  is_public?: boolean;
  sort_order?: number;
  releaseIds?: number[];
}

export const useCollections = (activeOnly: boolean = true) => {
  return useQuery<Collection[]>({
    queryKey: ['/api/collections', { activeOnly }],
    queryFn: async () => {
      const response = await fetch(`/api/collections?activeOnly=${activeOnly}`);
      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }
      return response.json();
    },
    staleTime: 0, // Данные считаются устаревшими сразу
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Обновлять при фокусе окна
    refetchOnMount: true, // Обновлять при монтировании
    refetchInterval: 30 * 1000, // Автоматическое обновление каждые 30 секунд
  });
};

export const useCollection = (id: number) => {
  return useQuery<Collection>({
    queryKey: ['/api/collections', id],
    queryFn: async () => {
      const response = await fetch(`/api/collections/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }
      return response.json();
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCollectionData) => {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create collection');
      }

      return response.json();
    },
    onSuccess: () => {
      // Инвалидируем кэш коллекций и принудительно обновляем
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      queryClient.refetchQueries({ queryKey: ['/api/collections'] });
    },
  });
};

export const useUpdateCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCollectionData }) => {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update collection');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Инвалидируем кэш коллекций и принудительно обновляем
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/collections', variables.id] });
      queryClient.refetchQueries({ queryKey: ['/api/collections'] });
      
      // Обновляем данные в кэше
      queryClient.setQueryData(['/api/collections', variables.id], data);
    },
  });
};

export const useDeleteCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete collection');
      }
    },
    onSuccess: (_, id) => {
      // Инвалидируем кэш коллекций и принудительно обновляем
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      queryClient.removeQueries({ queryKey: ['/api/collections', id] });
      queryClient.refetchQueries({ queryKey: ['/api/collections'] });
    },
  });
};
