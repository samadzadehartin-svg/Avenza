<?php
if (!defined('ABSPATH')) exit;

add_action('admin_init', function () {
    register_setting('avenza_site_group', 'avenza_site');
});

add_action('admin_menu', function () {
    add_menu_page('AVENZA','AVENZA','manage_woocommerce','avenza','avenza_render_settings','dashicons-store',56);
    add_submenu_page('avenza','تنظیمات سایت','تنظیمات سایت','manage_woocommerce','avenza','avenza_render_settings');
});

function avenza_render_settings() {
    if (!current_user_can('manage_woocommerce')) return;
    $o = (array) get_option('avenza_site', array());
    $fields = array(
        'announcement'=>'نوار اعلان',
        'hero_eyebrow'=>'Hero eyebrow',
        'hero_title'=>'عنوان Hero',
        'hero_subtitle'=>'زیرعنوان Hero',
        'hero_image_url'=>'آدرس عکس Hero',
        'about_title'=>'عنوان درباره ما',
        'about_text'=>'متن درباره ما',
        'wholesale_title'=>'عنوان فروش عمده',
        'wholesale_text'=>'متن فروش عمده',
        'instagram'=>'Instagram username',
        'phone'=>'تلفن',
        'whatsapp'=>'WhatsApp',
        'address'=>'آدرس',
    );
    echo '<div class="wrap"><h1>تنظیمات AVENZA</h1><form method="post" action="options.php">';
    settings_fields('avenza_site_group');
    echo '<table class="form-table">';
    foreach ($fields as $key=>$label) {
        $value = isset($o[$key]) ? $o[$key] : '';
        echo '<tr><th><label for="av_'.$key.'">'.esc_html($label).'</label></th><td>';
        if (in_array($key, array('about_text','wholesale_text'), true)) {
            echo '<textarea class="large-text" rows="7" id="av_'.$key.'" name="avenza_site['.$key.']">'.esc_textarea($value).'</textarea>';
        } else {
            echo '<input class="regular-text" id="av_'.$key.'" name="avenza_site['.$key.']" value="'.esc_attr($value).'">';
        }
        echo '</td></tr>';
    }
    echo '</table>';
    submit_button('ذخیره و انتشار');
    echo '</form></div>';
}
