# Legal Modals

Модальные окна для отображения юридических документов.

## Структура

```
app/modals/
  ├── legal-modals.js    # Регистрация и управление модальными окнами
  └── README.md          # Документация
```

## Зарегистрированные модальные окна

### 1. Политика обработки персональных данных
- **ID:** `privacy-policy`
- **Размер:** `large` (800px)
- **Действие Event Bus:** `legal.openPrivacyPolicy`
- **Функция открытия:** `openPrivacyPolicyModal()`

### 2. Публичная оферта
- **ID:** `public-offer`
- **Размер:** `large` (800px)
- **Действие Event Bus:** `legal.openPublicOffer`
- **Функция открытия:** `openPublicOfferModal()`

### 3. Согласие на обработку персональных данных
- **ID:** `privacy-consent`
- **Размер:** `large` (800px)
- **Действие Event Bus:** `legal.openPrivacyConsent`
- **Функция открытия:** `openPrivacyConsentModal()`

## Использование

### Декларативное открытие через Event Bus (рекомендуется)

Используйте `data-app-action` атрибут для декларативного управления:

```html
<a href="#" data-app-action="legal.openPrivacyPolicy">Политика обработки персональных данных</a>
<a href="#" data-app-action="legal.openPublicOffer">Публичная оферта</a>
<a href="#" data-app-action="legal.openPrivacyConsent">Согласие на обработку персональных данных</a>
```

Ссылки автоматически обрабатываются глобальным делегатом кликов, без необходимости вручную навешивать обработчики.

### Программное открытие

```javascript
// Через Event Bus
window.app.events.emit('legal.openPrivacyPolicy');
window.app.events.emit('legal.openPublicOffer');
window.app.events.emit('legal.openPrivacyConsent');

// Напрямую через modal manager
window.app.modal.open('privacy-policy');
window.app.modal.open('public-offer');
window.app.modal.open('privacy-consent');

// Через функции-хелперы
import { openPrivacyPolicyModal, openPublicOfferModal, openPrivacyConsentModal } from './modals/legal-modals.js';
openPrivacyPolicyModal();
openPublicOfferModal();
openPrivacyConsentModal();
```

### Где используются

- **Футер сайта** (`site-footer`): ссылки на политику и оферту
- **Форма регистрации** (`register`): чекбоксы согласия с ссылками
- **Публичная оферта**: ссылки на политику и согласие
- **Согласие на обработку ПДН**: ссылка на политику

## Обновление контента

Контент хранится в функциях:
- `getPrivacyPolicyContent()` - контент политики
- `getPublicOfferContent()` - контент оферты

Для обновления контента замените возвращаемое значение этих функций на полный HTML-контент документов.

## Особенности

- Модальные окна имеют скролл для длинного контента
- Размер `large` (800px) оптимален для чтения документов
- Закрытие через кнопку X или клик по overlay
- Контент рендерится статически (без загрузки с сервера)

