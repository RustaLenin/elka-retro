<?php
/**
 * Inventory Calculator
 * 
 * Скрипт для подсчета общей стоимости всех опубликованных товаров
 * (экземпляры игрушек и новогодние аксессуары)
 * 
 * @package ElkaRetro
 */

class ELKARETRO_INVENTORY_CALCULATOR {
    
    /**
     * Подсчитывает общую стоимость всех опубликованных товаров
     * 
     * @return array Результат с суммами по типам и общей суммой
     */
    public static function calculate_total_inventory_value() {
        $toy_instances_total = self::calculate_toy_instances_total();
        $ny_accessories_total = self::calculate_ny_accessories_total();
        
        $grand_total = $toy_instances_total['total'] + $ny_accessories_total['total'];
        
        $message = sprintf(
            'Общая стоимость товаров: %s ₽ (Экземпляры игрушек: %s ₽, Новогодние аксессуары: %s ₽)',
            number_format($grand_total, 2, '.', ' '),
            number_format($toy_instances_total['total'], 2, '.', ' '),
            number_format($ny_accessories_total['total'], 2, '.', ' ')
        );
        
        return array(
            'success' => true,
            'message' => $message,
            'toy_instances' => $toy_instances_total,
            'ny_accessories' => $ny_accessories_total,
            'grand_total' => $grand_total,
        );
    }
    
    /**
     * Подсчитывает стоимость всех опубликованных экземпляров игрушек
     * 
     * @return array Массив с общей суммой и количеством записей
     */
    private static function calculate_toy_instances_total() {
        $query = new WP_Query(array(
            'post_type' => 'toy_instance',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'fields' => 'ids', // Получаем только ID для оптимизации
        ));
        
        $total = 0.0;
        $count = 0;
        $items_without_price = 0;
        
        foreach ($query->posts as $post_id) {
            $count++;
            
            // Получаем цену через Pods
            $price = null;
            if (function_exists('pods')) {
                $pod = pods('toy_instance', $post_id);
                if ($pod && $pod->exists()) {
                    $price_value = $pod->field('cost');
                    if ($price_value !== null && $price_value !== '' && $price_value !== false) {
                        $price = is_numeric($price_value) ? (float)$price_value : null;
                    }
                }
            }
            
            // Fallback через get_post_meta
            if ($price === null) {
                $price_meta = get_post_meta($post_id, 'cost', true);
                if ($price_meta !== '' && $price_meta !== false && $price_meta !== null) {
                    $price = is_numeric($price_meta) ? (float)$price_meta : null;
                }
            }
            
            if ($price !== null && $price > 0) {
                $total += $price;
            } else {
                $items_without_price++;
            }
        }
        
        wp_reset_postdata();
        
        return array(
            'total' => $total,
            'count' => $count,
            'items_without_price' => $items_without_price,
        );
    }
    
    /**
     * Подсчитывает стоимость всех опубликованных новогодних аксессуаров
     * 
     * @return array Массив с общей суммой и количеством записей
     */
    private static function calculate_ny_accessories_total() {
        $query = new WP_Query(array(
            'post_type' => 'ny_accessory',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'fields' => 'ids', // Получаем только ID для оптимизации
        ));
        
        $total = 0.0;
        $count = 0;
        $items_without_price = 0;
        
        foreach ($query->posts as $post_id) {
            $count++;
            
            // Получаем цену через Pods
            $price = null;
            if (function_exists('pods')) {
                $pod = pods('ny_accessory', $post_id);
                if ($pod && $pod->exists()) {
                    $price_value = $pod->field('ny_cost');
                    if ($price_value !== null && $price_value !== '' && $price_value !== false) {
                        $price = self::extract_price_value($price_value);
                    }
                }
            }
            
            // Fallback через get_post_meta
            if ($price === null) {
                $price_meta = get_post_meta($post_id, 'ny_cost', true);
                if ($price_meta !== '' && $price_meta !== false && $price_meta !== null) {
                    $price = self::extract_price_value($price_meta);
                }
            }
            
            if ($price !== null && $price > 0) {
                $total += $price;
            } else {
                $items_without_price++;
            }
        }
        
        wp_reset_postdata();
        
        return array(
            'total' => $total,
            'count' => $count,
            'items_without_price' => $items_without_price,
        );
    }
    
    /**
     * Извлекает числовое значение цены из различных форматов
     * 
     * @param mixed $price_value Значение цены (может быть массивом, строкой или числом)
     * @return float|null Числовое значение цены или null
     */
    private static function extract_price_value($price_value) {
        if (is_numeric($price_value)) {
            return (float)$price_value;
        }
        
        if (is_array($price_value)) {
            if (isset($price_value['amount'])) {
                return is_numeric($price_value['amount']) ? (float)$price_value['amount'] : null;
            }
            if (isset($price_value['value'])) {
                return is_numeric($price_value['value']) ? (float)$price_value['value'] : null;
            }
        }
        
        if (is_string($price_value) && $price_value !== '') {
            // Извлекаем числовое значение из строки (обрабатывает форматирование типа "1 000,50" или "1000.50")
            $numeric = preg_replace('/[^\d.,]/u', '', $price_value);
            if ($numeric !== '') {
                $numeric = str_replace(' ', '', $numeric);
                $numeric = str_replace(',', '.', $numeric);
                if (is_numeric($numeric)) {
                    return (float)$numeric;
                }
            }
        }
        
        return null;
    }
}

