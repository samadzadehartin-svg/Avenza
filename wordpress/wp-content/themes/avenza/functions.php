<?php
if (!defined('ABSPATH')) exit;

function avenza_theme_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo', array(
        'height' => 120,
        'width' => 120,
        'flex-height' => true,
        'flex-width' => true,
    ));
    add_theme_support('woocommerce', array(
        'thumbnail_image_width' => 700,
        'single_image_width' => 1200,
        'product_grid' => array(
            'default_rows' => 2,
            'min_rows' => 1,
            'max_rows' => 8,
            'default_columns' => 4,
            'min_columns' => 2,
            'max_columns' => 4,
        ),
    ));
    add_theme_support('wc-product-gallery-zoom');
    add_theme_support('wc-product-gallery-lightbox');
    add_theme_support('wc-product-gallery-slider');
    register_nav_menus(array('primary' => 'Primary menu'));
}
add_action('after_setup_theme', 'avenza_theme_setup');

function avenza_assets() {
    wp_enqueue_style('avenza-style', get_stylesheet_uri(), array(), '1.0.0');
    wp_enqueue_style('avenza-main', get_template_directory_uri() . '/assets/css/avenza.css', array('avenza-style'), '1.0.0');
}
add_action('wp_enqueue_scripts', 'avenza_assets');

function avenza_site_options() {
    $defaults = array(
        'announcement' => 'Avenza',
        'hero_eyebrow' => 'Avenza | تنها برای تو',
        'hero_title' => 'Avenza',
        'hero_subtitle' => '',
        'hero_image_url' => '',
        'about_title' => 'برای استایل های ساده، ماندگار و خاص',
        'about_text' => 'آونزا فقط یک برند نیست؛ یک نگرش است.',
        'wholesale_title' => 'لباسی بذار تو فروشگاهت که حرف ساز بشه',
        'wholesale_text' => 'قیمت عمده و هماهنگی تعداد سفارش را می خواهی؟ درخواستت را ثبت کن.',
        'instagram' => 'Avenza_co',
        'phone' => '09108456261',
        'whatsapp' => '09108456261',
        'address' => 'تهران، فردوسی، نبش جمهوری، پاساژ کویتی های استانبول، واحد ۱۰۱',
    );
    return wp_parse_args((array) get_option('avenza_site', array()), $defaults);
}

function avenza_opt($key, $default = '') {
    $options = avenza_site_options();
    return array_key_exists($key, $options) ? $options[$key] : $default;
}

function avenza_logo() {
    if (has_custom_logo()) {
        the_custom_logo();
        return;
    }
    echo '<a class="av-wordmark" href="' . esc_url(home_url('/')) . '" aria-label="AVENZA">AVENZA</a>';
}

function avenza_whatsapp_url() {
    $phone = preg_replace('/\D+/', '', (string) avenza_opt('whatsapp'));
    if (substr($phone, 0, 1) === '0') {
        $phone = '98' . substr($phone, 1);
    }
    return 'https://wa.me/' . $phone;
}

function avenza_shop_url() {
    return function_exists('wc_get_page_permalink') ? wc_get_page_permalink('shop') : home_url('/shop/');
}

function avenza_account_url() {
    return function_exists('wc_get_page_permalink') ? wc_get_page_permalink('myaccount') : wp_login_url();
}

function avenza_cart_count() {
    return function_exists('WC') && WC()->cart ? WC()->cart->get_cart_contents_count() : 0;
}
