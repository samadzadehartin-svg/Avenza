<?php
if (!defined('ABSPATH')) exit;

add_action('init', function () {
    register_post_type('avenza_look', array(
        'labels' => array(
            'name' => 'Instagram / Shop The Look',
            'singular_name' => 'Look',
            'add_new_item' => 'افزودن Look',
            'edit_item' => 'ویرایش Look',
        ),
        'public' => false,
        'show_ui' => true,
        'show_in_menu' => 'avenza',
        'supports' => array('title','thumbnail'),
        'menu_icon' => 'dashicons-instagram',
    ));
});

add_action('add_meta_boxes', function () {
    add_meta_box('avenza_look_data','اتصال Instagram به محصول','avenza_look_metabox','avenza_look','normal','high');
});

function avenza_look_metabox($post) {
    wp_nonce_field('avenza_save_look','avenza_look_nonce');
    $url = get_post_meta($post->ID,'_avenza_instagram_url',true);
    $image = get_post_meta($post->ID,'_avenza_image_url',true);
    $products = get_post_meta($post->ID,'_avenza_product_ids',true);
    ?>
    <p><label>لینک Post / Reel اینستاگرام<br><input class="widefat" type="url" name="avenza_instagram_url" value="<?php echo esc_attr($url); ?>"></label></p>
    <p><label>لینک عکس (در صورت نداشتن Featured Image)<br><input class="widefat" type="url" name="avenza_image_url" value="<?php echo esc_attr($image); ?>"></label></p>
    <p><label>Product ID ها با کاما<br><input class="widefat" type="text" name="avenza_product_ids" value="<?php echo esc_attr($products); ?>" placeholder="12,18,24"></label></p>
    <p>برای نمایش عکس بهتر، Featured Image همین Look را هم می توانید تعیین کنید.</p>
    <?php
}

add_action('save_post_avenza_look', function ($post_id) {
    if (!isset($_POST['avenza_look_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['avenza_look_nonce'])), 'avenza_save_look')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post',$post_id)) return;

    update_post_meta($post_id,'_avenza_instagram_url',esc_url_raw(wp_unslash($_POST['avenza_instagram_url'] ?? '')));
    update_post_meta($post_id,'_avenza_image_url',esc_url_raw(wp_unslash($_POST['avenza_image_url'] ?? '')));

    $ids = array_filter(array_map('absint', preg_split('/\s*,\s*/', (string) wp_unslash($_POST['avenza_product_ids'] ?? ''))));
    update_post_meta($post_id,'_avenza_product_ids',implode(',',$ids));
});

add_shortcode('avenza_shop_the_look', function ($atts) {
    $atts = shortcode_atts(array('limit'=>4),$atts,'avenza_shop_the_look');
    $q = new WP_Query(array(
        'post_type'=>'avenza_look',
        'post_status'=>'publish',
        'posts_per_page'=>max(1,min(12,absint($atts['limit']))),
    ));
    if (!$q->have_posts()) return '';

    ob_start();
    echo '<div class="av-look-grid">';
    while ($q->have_posts()) {
        $q->the_post();
        $id = get_the_ID();
        $instagram = get_post_meta($id,'_avenza_instagram_url',true);
        $image = get_the_post_thumbnail_url($id,'large');
        if (!$image) $image = get_post_meta($id,'_avenza_image_url',true);
        $product_ids = array_filter(array_map('absint', explode(',', (string) get_post_meta($id,'_avenza_product_ids',true))));
        $product = $product_ids && function_exists('wc_get_product') ? wc_get_product($product_ids[0]) : null;
        $href = $product ? $product->get_permalink() : ($instagram ?: '#');

        echo '<a class="av-look-card" href="'.esc_url($href).'"'.(!$product && $instagram ? ' target="_blank" rel="noopener"' : '').'>';
        if ($image) echo '<img src="'.esc_url($image).'" alt="'.esc_attr(get_the_title()).'" loading="lazy">';
        else echo '<div class="av-look-fallback">AVENZA</div>';
        echo '<span>'.($product ? 'خرید این استایل' : 'مشاهده در Instagram').'</span></a>';
    }
    echo '</div>';
    wp_reset_postdata();
    return ob_get_clean();
});
