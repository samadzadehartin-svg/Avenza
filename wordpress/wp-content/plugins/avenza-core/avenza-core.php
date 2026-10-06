<?php
/**
 * Plugin Name: AVENZA Core
 * Description: AVENZA settings, wholesale/B2B, Shop the Look, customer portal and Supabase-to-WooCommerce migration.
 * Version: 1.0.0
 * Requires PHP: 8.1
 * Text Domain: avenza-core
 */
if (!defined('ABSPATH')) exit;

define('AVENZA_CORE_VERSION', '1.0.0');
define('AVENZA_CORE_DIR', plugin_dir_path(__FILE__));
define('AVENZA_CORE_URL', plugin_dir_url(__FILE__));

require_once AVENZA_CORE_DIR . 'includes/settings.php';
require_once AVENZA_CORE_DIR . 'includes/wholesale.php';
require_once AVENZA_CORE_DIR . 'includes/looks.php';
require_once AVENZA_CORE_DIR . 'includes/importer.php';

function avenza_core_activate() {
    add_role('wholesale_customer', 'مشتری عمده', array(
        'read' => true,
    ));

    if (!get_page_by_path('wholesale')) {
        wp_insert_post(array(
            'post_title' => 'فروش عمده',
            'post_name' => 'wholesale',
            'post_status' => 'publish',
            'post_type' => 'page',
            'post_content' => '[avenza_wholesale_portal]',
        ));
    }

    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'avenza_core_activate');

function avenza_core_deactivate() {
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'avenza_core_deactivate');

function avenza_core_woocommerce_notice() {
    if (!current_user_can('activate_plugins')) return;
    if (!class_exists('WooCommerce')) {
        echo '<div class="notice notice-error"><p>AVENZA Core برای بخش فروش به WooCommerce نیاز دارد.</p></div>';
    }
}
add_action('admin_notices', 'avenza_core_woocommerce_notice');
