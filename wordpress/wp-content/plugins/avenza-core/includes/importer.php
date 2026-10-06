<?php
if (!defined('ABSPATH')) exit;

add_action('admin_menu', function () {
    add_submenu_page('avenza','Migration','Migration','manage_woocommerce','avenza-migration','avenza_migration_page');
});

function avenza_migration_page() {
    if (!current_user_can('manage_woocommerce')) return;
    $done = isset($_GET['imported']) ? absint($_GET['imported']) : null;
    ?>
    <div class="wrap">
        <h1>مهاجرت AVENZA به WooCommerce</h1>
        <p>این Import از Snapshot پروژه فعلی، تنظیمات سایت، محصولات، واریانت ها، موجودی و قیمت عمده را وارد می کند.</p>
        <?php if ($done !== null) : ?><div class="notice notice-success"><p><?php echo esc_html($done); ?> محصول پردازش شد.</p></div><?php endif; ?>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="avenza_run_migration">
            <?php wp_nonce_field('avenza_run_migration'); ?>
            <?php submit_button('اجرای Import یک باره', 'primary', 'submit', false); ?>
        </form>
    </div>
    <?php
}

add_action('admin_post_avenza_run_migration', function () {
    if (!current_user_can('manage_woocommerce')) wp_die('Forbidden');
    check_admin_referer('avenza_run_migration');

    if (!class_exists('WooCommerce')) wp_die('WooCommerce must be active.');

    $file = AVENZA_CORE_DIR . 'data/avenza-live-export.json';
    if (!is_readable($file)) wp_die('Migration snapshot not found.');

    $data = json_decode((string) file_get_contents($file), true);
    if (!is_array($data)) wp_die('Migration snapshot is invalid.');

    $site = (array) ($data['site_settings'] ?? array());
    $content = (array) ($site['content'] ?? array());
    unset($site['content']);
    update_option('avenza_site', $site, false);
    update_option('avenza_legacy_content', $content, false);

    if (!empty($site['hero_image_url'])) {
        $hero_id = avenza_sideload_image($site['hero_image_url'], 'AVENZA Hero');
        if ($hero_id) {
            $site['hero_image_url'] = wp_get_attachment_url($hero_id);
            update_option('avenza_site', $site, false);
        }
    }

    $count = 0;
    foreach ((array) ($data['products'] ?? array()) as $row) {
        avenza_import_product($row);
        $count++;
    }

    wp_safe_redirect(admin_url('admin.php?page=avenza-migration&imported=' . $count));
    exit;
});

function avenza_find_product_by_legacy_id($legacy_id) {
    $q = new WP_Query(array(
        'post_type' => 'product',
        'post_status' => array('publish','draft','private'),
        'posts_per_page' => 1,
        'fields' => 'ids',
        'meta_key' => '_avenza_legacy_id',
        'meta_value' => (string) $legacy_id,
    ));
    return $q->posts ? (int) $q->posts[0] : 0;
}

function avenza_import_product($row) {
    $variants = (array) ($row['variants'] ?? array());
    $legacy_id = absint($row['id'] ?? 0);
    $existing_id = avenza_find_product_by_legacy_id($legacy_id);

    if ($variants) {
        $product = $existing_id ? wc_get_product($existing_id) : new WC_Product_Variable();
        if (!$product || !$product->is_type('variable')) {
            $product = new WC_Product_Variable();
        }
    } else {
        $product = $existing_id ? wc_get_product($existing_id) : new WC_Product_Simple();
        if (!$product || !$product->is_type('simple')) {
            $product = new WC_Product_Simple();
        }
    }

    $product->set_name((string) ($row['name'] ?? 'AVENZA Product'));
    if (!empty($row['slug'])) $product->set_slug(sanitize_title($row['slug']));
    $product->set_description((string) ($row['description'] ?? ''));
    $product->set_status(!empty($row['active']) ? 'publish' : 'draft');
    $product->set_featured(!empty($row['featured']));

    $category = trim((string) ($row['category'] ?? ''));
    if ($category) {
        $term = term_exists($category, 'product_cat');
        if (!$term) $term = wp_insert_term($category, 'product_cat');
        if (!is_wp_error($term)) {
            $term_id = is_array($term) ? (int) $term['term_id'] : (int) $term;
            $product->set_category_ids(array($term_id));
        }
    }

    if (!$variants) {
        $product->set_regular_price((string) (float) ($row['single_price'] ?? 0));
        $product->set_manage_stock(true);
        $product->set_stock_quantity(max(0, (int) ($row['stock'] ?? 0)));
        $product->set_stock_status(((int) ($row['stock'] ?? 0)) > 0 ? 'instock' : 'outofstock');
    } else {
        $colors = array_values(array_unique(array_filter(array_map(function($v){ return isset($v['color']) ? (string) $v['color'] : ''; }, $variants))));
        $sizes = array_values(array_unique(array_filter(array_map(function($v){ return isset($v['size']) ? (string) $v['size'] : ''; }, $variants))));
        $attributes = array();

        if ($colors) {
            $a = new WC_Product_Attribute();
            $a->set_id(0);
            $a->set_name('رنگ');
            $a->set_options($colors);
            $a->set_visible(true);
            $a->set_variation(true);
            $attributes[] = $a;
        }
        if ($sizes) {
            $a = new WC_Product_Attribute();
            $a->set_id(0);
            $a->set_name('سایز');
            $a->set_options($sizes);
            $a->set_visible(true);
            $a->set_variation(true);
            $attributes[] = $a;
        }
        $product->set_attributes($attributes);
    }

    $product->update_meta_data('_avenza_legacy_id', $legacy_id);
    $product->update_meta_data('_avenza_wholesale_price', (string) (float) ($row['wholesale_price'] ?? $row['single_price'] ?? 0));
    $product->update_meta_data('_avenza_wholesale_min_qty', 1);
    $product_id = $product->save();

    if (!empty($row['image']) && !has_post_thumbnail($product_id)) {
        $image_id = avenza_sideload_image($row['image'], $product->get_name(), $product_id);
        if ($image_id) set_post_thumbnail($product_id, $image_id);
    }

    $gallery = array();
    foreach ((array) ($row['images'] ?? array()) as $image) {
        if (empty($image['image_url'])) continue;
        $id = avenza_sideload_image($image['image_url'], $product->get_name(), $product_id);
        if ($id) $gallery[] = $id;
    }
    if ($gallery) {
        $product = wc_get_product($product_id);
        $product->set_gallery_image_ids($gallery);
        $product->save();
    }

    if ($variants) {
        foreach (get_posts(array('post_type'=>'product_variation','post_parent'=>$product_id,'posts_per_page'=>-1,'fields'=>'ids')) as $variation_id) {
            wp_delete_post($variation_id, true);
        }

        foreach ($variants as $v) {
            $variation = new WC_Product_Variation();
            $variation->set_parent_id($product_id);
            $attrs = array();
            if (!empty($v['color'])) $attrs[sanitize_title('رنگ')] = (string) $v['color'];
            if (!empty($v['size'])) $attrs[sanitize_title('سایز')] = (string) $v['size'];
            $variation->set_attributes($attrs);
            if (!empty($v['sku'])) {
                try { $variation->set_sku((string) $v['sku']); } catch (Exception $e) {}
            }
            $variation->set_regular_price((string) (float) ($row['single_price'] ?? 0));
            if (array_key_exists('stock', $v) && $v['stock'] !== null) {
                $variation->set_manage_stock(true);
                $variation->set_stock_quantity(max(0, (int) $v['stock']));
                $variation->set_stock_status(((int) $v['stock']) > 0 ? 'instock' : 'outofstock');
            } else {
                $variation->set_manage_stock(false);
                $variation->set_stock_status('instock');
            }
            $variation->update_meta_data('_avenza_legacy_variant_id', absint($v['id'] ?? 0));
            $variation->save();
        }
        WC_Product_Variable::sync($product_id);
    }

    return $product_id;
}

function avenza_sideload_image($url, $description = '', $post_id = 0) {
    if (!$url) return 0;
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';

    $id = media_sideload_image(esc_url_raw($url), $post_id, $description, 'id');
    return is_wp_error($id) ? 0 : (int) $id;
}
