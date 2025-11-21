<?php
/**
 * SEO Meta Tags Loader
 * 
 * Инициализация модуля микроразметки для SEO и социальных сетей
 * 
 * @package ElkaRetro
 * @subpackage SEO
 */

namespace Elkaretro\Core\SEO;

defined( 'ABSPATH' ) || exit;

// Подключаем основной класс
require_once __DIR__ . '/seo-meta-generator.php';

/**
 * Инициализация SEO модуля
 */
function init() {
	$generator = new SEO_Meta_Generator();
	$generator->init();
}

// Инициализируем при загрузке WordPress
add_action( 'init', __NAMESPACE__ . '\\init' );

