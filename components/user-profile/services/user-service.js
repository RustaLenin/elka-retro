/**
 * User Service
 * 
 * Сервис для работы с профилем пользователя через WordPress REST API
 */

class UserService {
  constructor() {
    this.apiUrl = window.wpApiSettings?.root || '/wp-json/';
    this.nonce = window.wpApiSettings?.nonce || '';
  }

  /**
   * Получить расширенный профиль пользователя
   */
  async getProfile(userId = null) {
    try {
      // Используем кастомный endpoint для получения расширенного профиля
      const response = await fetch(`${this.apiUrl}elkaretro/v1/user/profile`, {
        method: 'GET',
        headers: {
          'X-WP-Nonce': this.nonce,
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка получения профиля');
      }

      const user = await response.json();

      return { success: true, user };
    } catch (error) {
      console.error('[UserService] Get profile error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Обновить профиль пользователя
   */
  async updateProfile(profileData) {
    try {
      const { 
        first_name, 
        last_name, 
        display_name, 
        email, 
        phone, 
        delivery_address, 
        messenger_link 
      } = profileData;

      // Подготавливаем данные для обновления через кастомный endpoint
      const updateData = {};
      
      // Стандартные поля WordPress
      if (display_name !== undefined) updateData.display_name = display_name;
      if (email !== undefined) updateData.email = email;

      // Мета-поля
      if (first_name !== undefined) updateData.first_name = first_name;
      if (last_name !== undefined) updateData.last_name = last_name;
      if (phone !== undefined) updateData.phone = phone;
      if (delivery_address !== undefined) updateData.delivery_address = delivery_address;
      if (messenger_link !== undefined) updateData.messenger_link = messenger_link;

      // Обновляем профиль через кастомный REST API endpoint
      const response = await fetch(`${this.apiUrl}elkaretro/v1/user/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': this.nonce,
        },
        credentials: 'same-origin',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка обновления профиля');
      }

      const result = await response.json();

      // Получаем обновлённый профиль
      const profileResult = await this.getProfile();
      
      return { success: true, user: profileResult.user || result };
    } catch (error) {
      console.error('[UserService] Update profile error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Изменить пароль пользователя
   */
  async changePassword(oldPassword, newPassword) {
    try {
      const response = await fetch(`${this.apiUrl}elkaretro/v1/user/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': this.nonce,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка смены пароля');
      }

      const data = await response.json();
      return { success: true, message: data.message || 'Пароль успешно изменён' };
    } catch (error) {
      console.error('[UserService] Change password error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const userService = new UserService();

// Делаем доступным глобально
if (window.app) {
  window.app.userService = userService;
}

export default UserService;

