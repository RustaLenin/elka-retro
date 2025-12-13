<?php
/**
 * Update Notification System
 * 
 * Механизм уведомления пользователя о новой версии сайта с принудительным обновлением.
 * Выводит inline CSS и JavaScript для блокирующего уведомления.
 * 
 * @package ElkaRetro
 */

defined('ABSPATH') || exit;

/**
 * Выводит inline CSS и JavaScript для механизма обновления
 * Должен вызываться в <head> ДО загрузки app.js и components.js
 */
function elkaretro_output_update_notification() {
    ?>
    <!-- Inline CSS для блокирующего уведомления об обновлении -->
    <style id="update-notification-styles">
        #elkaretro-update-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.85);
            z-index: 999999;
            display: none;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        
        #elkaretro-update-overlay.show {
            display: flex;
            animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }
        
        #elkaretro-update-modal {
            background: #ffffff;
            border-radius: 12px;
            padding: 32px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
            animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
            from {
                transform: translateY(30px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        #elkaretro-update-modal h2 {
            margin: 0 0 16px 0;
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
        }
        
        #elkaretro-update-modal p {
            margin: 0 0 24px 0;
            font-size: 16px;
            color: #666666;
            line-height: 1.5;
        }
        
        #elkaretro-update-countdown {
            font-size: 18px;
            font-weight: 600;
            color: #0066cc;
            margin-bottom: 24px;
        }
        
        #elkaretro-update-button {
            background: #0066cc;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            padding: 12px 32px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        #elkaretro-update-button:hover {
            background: #0052a3;
        }
        
        #elkaretro-update-button:active {
            background: #003d7a;
        }
        
        @media (max-width: 480px) {
            #elkaretro-update-modal {
                padding: 24px;
                border-radius: 8px;
            }
            
            #elkaretro-update-modal h2 {
                font-size: 20px;
            }
            
            #elkaretro-update-modal p {
                font-size: 14px;
            }
            
            #elkaretro-update-countdown {
                font-size: 16px;
            }
        }
    </style>
    
    <!-- Inline script для проверки версии и показа уведомления -->
    <script>
        (function() {
            'use strict';
            
            // Проверяем, что APP_VERSION установлен (должен быть установлен через wp_head)
            if (typeof window.APP_VERSION === 'undefined') {
                console.warn('[elkaretro-update] APP_VERSION not defined');
                return;
            }
            
            const APP_VERSION_KEY = 'app_version';
            const TIMER_DURATION = 5; // секунд
            let countdownInterval = null;
            let currentCountdown = TIMER_DURATION;
            
            // Получаем параметры из URL
            const urlParams = new URLSearchParams(window.location.search);
            const forceUpdate = urlParams.get('forceUpdate') === 'true';
            
            // Обработка принудительного обновления
            if (forceUpdate) {
                // Обновляем версию в LocalStorage
                localStorage.setItem(APP_VERSION_KEY, window.APP_VERSION);
                
                // Убираем параметр из URL
                urlParams.delete('forceUpdate');
                urlParams.delete('_refresh');
                const newUrl = window.location.pathname + 
                    (urlParams.toString() ? '?' + urlParams.toString() : '') + 
                    window.location.hash;
                window.history.replaceState({}, '', newUrl);
            }
            
            // Проверка версии
            function checkVersion() {
                const currentVersion = window.APP_VERSION;
                const savedVersion = localStorage.getItem(APP_VERSION_KEY);
                
                // Если версии нет - это первый визит, сохраняем и не показываем уведомление
                if (!savedVersion) {
                    localStorage.setItem(APP_VERSION_KEY, currentVersion);
                    return;
                }
                
                // Если версии совпадают - всё ок
                if (savedVersion === currentVersion) {
                    return;
                }
                
                // Версии не совпадают - показываем уведомление
                showUpdateNotification();
            }
            
            // Показ блокирующего уведомления
            function showUpdateNotification() {
                function createAndShowOverlay() {
                    // Создаём overlay, если его ещё нет
                    let overlay = document.getElementById('elkaretro-update-overlay');
                    if (!overlay) {
                        overlay = document.createElement('div');
                        overlay.id = 'elkaretro-update-overlay';
                        overlay.innerHTML = 
                            '<div id="elkaretro-update-modal">' +
                            '<h2>🎉 Доступна новая версия сайта</h2>' +
                            '<p>Для корректной работы сайта необходимо обновить страницу.</p>' +
                            '<div id="elkaretro-update-countdown">Обновление через <span id="elkaretro-update-timer">' + TIMER_DURATION + '</span> секунд...</div>' +
                            '<button id="elkaretro-update-button">Обновить сейчас</button>' +
                            '</div>';
                        document.body.appendChild(overlay);
                        
                        // Обработчик кнопки
                        const button = document.getElementById('elkaretro-update-button');
                        button.addEventListener('click', forceReload);
                    }
                    
                    // Показываем overlay
                    overlay.classList.add('show');
                    
                    // Запускаем таймер
                    startCountdown();
                }
                
                // Ждём готовности DOM, если body ещё не загружен
                if (document.body) {
                    createAndShowOverlay();
                } else {
                    document.addEventListener('DOMContentLoaded', createAndShowOverlay);
                }
            }
            
            // Запуск таймера обратного отсчёта
            function startCountdown() {
                currentCountdown = TIMER_DURATION;
                const timerElement = document.getElementById('elkaretro-update-timer');
                
                if (timerElement) {
                    timerElement.textContent = currentCountdown;
                }
                
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                }
                
                countdownInterval = setInterval(function() {
                    currentCountdown--;
                    
                    if (timerElement) {
                        timerElement.textContent = currentCountdown;
                    }
                    
                    if (currentCountdown <= 0) {
                        clearInterval(countdownInterval);
                        forceReload();
                    }
                }, 1000);
            }
            
            // Принудительная перезагрузка с параметрами
            function forceReload() {
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                }
                
                const url = new URL(window.location.href);
                url.searchParams.set('_refresh', Date.now());
                url.searchParams.set('forceUpdate', 'true');
                window.location.href = url.toString();
            }
            
            // Синхронизация между вкладками
            window.addEventListener('storage', function(e) {
                if (e.key === APP_VERSION_KEY) {
                    // Версия обновилась в другой вкладке - проверяем снова
                    checkVersion();
                }
            });
            
            // Проверяем версию при загрузке
            checkVersion();
        })();
    </script>
    <?php
}

