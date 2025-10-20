<?php

/**
 * Theme custom QuickTags
 * In this file all functions and action about theme QuickTags
 **/

function THEME_QuickTags() {
    if ( ! wp_script_is('quicktags') )
        return;
    ?>
    <script type="text/javascript">
        QTags.addButton( 'embed_tag', 'embed', '<embed>', '</embed>', 'o', 'Make Embed Tag', 777 );
    </script>
    <?php
}

add_action( 'admin_print_footer_scripts', 'THEME_QuickTags' );