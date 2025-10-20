<?php

function THEME_content_width( $initArray ) {
	$initArray['width'] = '100%';
	return $initArray;
}
add_filter('tiny_mce_before_init', 'THEME_content_width');