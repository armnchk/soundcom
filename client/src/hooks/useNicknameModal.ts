import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";

export function useNicknameModal() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showNicknameModal, setShowNicknameModal] = useState(false);

  useEffect(() => {
    // Показываем модальное окно только если:
    // 1. Пользователь авторизован
    // 2. Загрузка завершена
    // 3. У пользователя нет никнейма
    if (isAuthenticated && !isLoading && user && !user.nickname) {
      setShowNicknameModal(true);
    } else if (user?.nickname) {
      // Если у пользователя есть никнейм, скрываем модальное окно
      setShowNicknameModal(false);
    } else {
      setShowNicknameModal(false);
    }
  }, [isAuthenticated, isLoading, user]);

  const closeModal = () => {
    // Модальное окно нельзя закрыть без выбора никнейма
    // если у пользователя нет никнейма
    if (user?.nickname) {
      setShowNicknameModal(false);
    }
  };

  const openNicknameModal = () => {
    setShowNicknameModal(true);
  };

  return {
    showNicknameModal,
    closeModal,
    openNicknameModal,
    isRequired: isAuthenticated && !isLoading && user && !user.nickname
  };
}
