<?php
/**
 * Instances Duplicates Merger
 *
 * Скрипт для поиска дублей экземпляров игрушек и типов игрушек, и объединения данных
 * между записями со статусами «На спецификации» и «На оформлении».
 *
 * @package ElkaRetro
 */

class ELKARETRO_INSTANCE_DUPLICATES_MERGER {
    /**
     * Статусы, которые считаются дублирующимися
     */
    const SPEC_STATUS = 'specification';
    const DECOR_STATUS = 'decoration';

    /**
     * Поля Pods, которые мы не должны перезаписывать при копировании (по типу поста)
     */
    private static function get_skip_meta_fields($post_type) {
        $skip_fields = array();
        
        if ($post_type === 'toy_instance') {
            $skip_fields[] = 'photos_of_the_toy_instance'; // сохраняем фотографии из записи на спецификации
        } elseif ($post_type === 'toy_type') {
            $skip_fields[] = 'toy_type_photos'; // сохраняем фотографии из записи на спецификации
        }
        
        return $skip_fields;
    }

    /**
     * Выполняет поиск дублей и объединяет данные для всех типов постов
     *
     * @param int|null $limit Максимальное количество обработанных наборов (null = без ограничений)
     * @return array Итоги выполнения
     */
    public static function run($limit = null) {
        if (!function_exists('pods')) {
            return array(
                'success' => false,
                'message' => 'Pods framework не доступен, запуск невозможен',
                'duplicates_found' => 0,
                'merged' => 0,
                'deleted' => 0,
                'skipped' => 0,
                'errors' => array(),
            );
        }

        // Обрабатываем оба типа постов
        $post_types = array('toy_instance', 'toy_type');
        
        $totals = array(
            'duplicates_found' => 0,
            'merged' => 0,
            'deleted' => 0,
            'skipped' => 0,
            'errors' => array(),
        );
        
        $results_by_type = array();
        
        foreach ($post_types as $post_type) {
            $result = self::process_post_type($post_type, $limit);
            
            $results_by_type[$post_type] = $result;
            
            $totals['duplicates_found'] += $result['duplicates_found'];
            $totals['merged'] += $result['merged'];
            $totals['deleted'] += $result['deleted'];
            $totals['skipped'] += $result['skipped'];
            $totals['errors'] = array_merge($totals['errors'], $result['errors']);
        }

        $message = sprintf(
            'Processed duplicate sets: toy_instance (%d), toy_type (%d). Найдено дублей: %d, объединено: %d, удалено дублей: %d, пропущено: %d',
            $results_by_type['toy_instance']['processed_sets'],
            $results_by_type['toy_type']['processed_sets'],
            $totals['duplicates_found'],
            $totals['merged'],
            $totals['deleted'],
            $totals['skipped']
        );

        if (!empty($totals['errors'])) {
            $message .= '. Ошибки: ' . implode('; ', array_slice($totals['errors'], 0, 5));
            if (count($totals['errors']) > 5) {
                $message .= '...';
            }
        }

        return array_merge(
            array('success' => true, 'message' => $message),
            $totals
        );
    }
    
    /**
     * Обрабатывает дубли для одного типа поста
     *
     * @param string $post_type Тип поста (toy_instance или toy_type)
     * @param int|null $limit Максимальное количество обработанных наборов
     * @return array Результаты обработки
     */
    private static function process_post_type($post_type, $limit = null) {
        $query_args = array(
            'post_type'      => $post_type,
            'post_status'    => array(self::SPEC_STATUS, self::DECOR_STATUS),
            'posts_per_page' => -1,
            'orderby'        => 'title',
            'order'          => 'ASC',
        );

        $query = new WP_Query($query_args);
        if (!$query->have_posts()) {
            return array(
                'processed_sets' => 0,
                'duplicates_found' => 0,
                'merged' => 0,
                'deleted' => 0,
                'skipped' => 0,
                'errors' => array(),
            );
        }

        $groups = array();
        foreach ($query->posts as $post) {
            $title = $post->post_title;
            if (!isset($groups[$title])) {
                $groups[$title] = array();
            }
            $groups[$title][] = $post;
        }
        wp_reset_postdata();

        $totals = array(
            'duplicates_found' => 0,
            'merged' => 0,
            'deleted' => 0,
            'skipped' => 0,
            'errors' => array(),
        );

        $processed_sets = 0;
        foreach ($groups as $title => $posts) {
            $spec_posts = array_filter($posts, function($post) {
                return $post->post_status === self::SPEC_STATUS;
            });
            $decor_posts = array_filter($posts, function($post) {
                return $post->post_status === self::DECOR_STATUS;
            });

            if (empty($spec_posts) || empty($decor_posts)) {
                continue;
            }

            if ($limit !== null && $processed_sets >= $limit) {
                break;
            }
            $processed_sets++;

            // Берём основную запись (со статусом «На спецификации»)
            $target_post = reset($spec_posts);
            $target_id = $target_post->ID;

            foreach ($decor_posts as $source_post) {
                $totals['duplicates_found']++;

                $merge_result = self::merge_pair($target_id, $source_post->ID, $post_type);

                if ($merge_result['success']) {
                    $totals['merged']++;
                    if ($merge_result['deleted']) {
                        $totals['deleted']++;
                    }
                } else {
                    $totals['skipped']++;
                    if (!empty($merge_result['error'])) {
                        $totals['errors'][] = $merge_result['error'];
                    }
                }
            }
        }

        return array_merge(
            array('processed_sets' => $processed_sets),
            $totals
        );
    }

    /**
     * Объединяет пару записей (specification + decoration)
     *
     * @param int $target_id ID записи «На спецификации»
     * @param int $source_id ID записи «На оформлении»
     * @param string $post_type Тип поста (toy_instance или toy_type)
     * @return array
     */
    private static function merge_pair($target_id, $source_id, $post_type) {
        $target_post = get_post($target_id);
        $source_post = get_post($source_id);

        if (!$target_post || !$source_post) {
            return array(
                'success' => false,
                'deleted' => false,
                'error'   => sprintf('Записи %d или %d не найдены', $target_id, $source_id),
            );
        }

        if ($target_post->post_title !== $source_post->post_title) {
            return array(
                'success' => false,
                'deleted' => false,
                'error'   => sprintf('Названия записей не совпадают (%d и %d)', $target_id, $source_id),
            );
        }

        try {
            $updated_fields = self::copy_post_fields($target_post, $source_post);
        } catch (\Throwable $e) {
            return array(
                'success' => false,
                'deleted' => false,
                'error'   => sprintf('Ошибка при обновлении записи %d: %s', $target_post->ID, $e->getMessage()),
            );
        }

        $meta_copied = self::copy_meta_fields($target_post, $source_post, $post_type);

        // Обновляем статус: после объединения переводим в базовый статус «На утверждении» (pending)
        if ($target_post->post_status === self::SPEC_STATUS) {
            $update_status = wp_update_post(array(
                'ID'          => $target_post->ID,
                'post_status' => 'pending',
            ), true);

            if (is_wp_error($update_status)) {
                return array(
                    'success' => false,
                    'deleted' => false,
                    'error'   => sprintf('Не удалось обновить статус записи %d: %s', $target_post->ID, $update_status->get_error_message()),
                );
            }
        }

        clean_post_cache($target_post->ID);

        // Удаляем источник
        $deleted = wp_delete_post($source_post->ID, true);
        if (!$deleted) {
            return array(
                'success' => false,
                'deleted' => false,
                'error'   => sprintf('Не удалось удалить запись %d', $source_post->ID),
            );
        }

        return array(
            'success' => true,
            'deleted' => true,
            'updated_fields' => $updated_fields,
            'meta_copied' => $meta_copied,
        );
    }

    /**
     * Копирует стандартные поля поста (контент, отрывок)
     */
    private static function copy_post_fields(WP_Post $target_post, WP_Post $source_post) {
        $update_data = array('ID' => $target_post->ID);
        $needs_update = false;
        $fields_copied = array();

        $target_content = trim((string) $target_post->post_content);
        $source_content = trim((string) $source_post->post_content);
        if ($target_content === '' && $source_content !== '') {
            $update_data['post_content'] = $source_post->post_content;
            $needs_update = true;
            $fields_copied[] = 'post_content';
        }

        $target_excerpt = trim((string) $target_post->post_excerpt);
        $source_excerpt = trim((string) $source_post->post_excerpt);
        if ($target_excerpt === '' && $source_excerpt !== '') {
            $update_data['post_excerpt'] = $source_post->post_excerpt;
            $needs_update = true;
            $fields_copied[] = 'post_excerpt';
        }

        if ($needs_update) {
            $result = wp_update_post($update_data, true);
            if (is_wp_error($result)) {
                throw new \RuntimeException(sprintf('Ошибка при обновлении записи %d: %s', $target_post->ID, $result->get_error_message()));
            }
        }

        return $fields_copied;
    }

    /**
     * Копирует данные Pods/мета поля
     *
     * @param WP_Post $target_post Целевая запись
     * @param WP_Post $source_post Исходная запись
     * @param string $post_type Тип поста (toy_instance или toy_type)
     * @return array Массив скопированных полей
     */
    private static function copy_meta_fields(WP_Post $target_post, WP_Post $source_post, $post_type) {
        $copied = array();

        $target_pod = pods($post_type, $target_post->ID);
        $source_pod = pods($post_type, $source_post->ID);

        if (!$target_pod || !$target_pod->exists() || !$source_pod || !$source_pod->exists()) {
            return $copied;
        }

        $fields = elkaretro_get_data_model("post_types.{$post_type}.fields");
        if (!$fields || !is_array($fields)) {
            return $copied;
        }

        $skip_fields = self::get_skip_meta_fields($post_type);

        foreach ($fields as $field_slug => $config) {
            $meta_field = isset($config['meta_field']) ? $config['meta_field'] : $field_slug;

            if (in_array($meta_field, $skip_fields, true)) {
                continue;
            }

            $source_value = $source_pod->field($meta_field);
            if (self::is_empty_value($source_value)) {
                continue;
            }

            $target_value = $target_pod->field($meta_field);
            if (!self::is_empty_value($target_value)) {
                continue;
            }

            $is_multi = !empty($config['multi_choose']);
            $normalized_value = self::normalize_meta_value($source_value, $is_multi);
            if (self::is_empty_value($normalized_value)) {
                continue;
            }

            $saved = $target_pod->save($meta_field, $normalized_value);
            if ($saved !== false) {
                $copied[] = $meta_field;
            }
        }

        return $copied;
    }

    /**
     * Проверяет, является ли значение «пустым» для целей копирования
     */
    private static function is_empty_value($value) {
        if ($value === null) {
            return true;
        }

        if ($value === '') {
            return true;
        }

        if ($value === false) {
            return true;
        }

        if (is_array($value)) {
            $filtered = array_filter($value, function ($item) {
                return !self::is_empty_value($item);
            });
            return empty($filtered);
        }

        return false;
    }

    /**
     * Нормализует значение поля Pods для сохранения
     */
    private static function normalize_meta_value($value, $is_multi = false) {
        if (is_array($value)) {
            $normalized = array();
            foreach ($value as $item) {
                if (is_object($item)) {
                    if (isset($item->ID)) {
                        $normalized[] = (int) $item->ID;
                        continue;
                    }
                    if (isset($item->id)) {
                        $normalized[] = (int) $item->id;
                        continue;
                    }
                    if (isset($item->term_id)) {
                        $normalized[] = (int) $item->term_id;
                        continue;
                    }
                    if (isset($item->term)) {
                        $normalized[] = (int) $item->term;
                        continue;
                    }
                } elseif (is_array($item)) {
                    if (isset($item['ID'])) {
                        $normalized[] = (int) $item['ID'];
                        continue;
                    }
                    if (isset($item['id'])) {
                        $normalized[] = (int) $item['id'];
                        continue;
                    }
                    if (isset($item['term_id'])) {
                        $normalized[] = (int) $item['term_id'];
                        continue;
                    }
                }

                $normalized[] = $item;
            }

            if ($is_multi) {
                return $normalized;
            }

            // Для одиночных значений возвращаем первый непустой элемент
            foreach ($normalized as $item) {
                if (!self::is_empty_value($item)) {
                    return $item;
                }
            }

            return null;
        }

        if (is_object($value)) {
            if (isset($value->ID)) {
                return (int) $value->ID;
            }
            if (isset($value->id)) {
                return (int) $value->id;
            }
            if (isset($value->term_id)) {
                return (int) $value->term_id;
            }
        }

        if ($is_multi) {
            return array($value);
        }

        return $value;
    }
}
