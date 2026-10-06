<?php
if (!defined('ABSPATH')) exit;

function avenza_is_wholesale_user($user_id = 0) {
    $user = $user_id ? get_userdata($user_id) : wp_get_current_user();
    return $user && in_array('wholesale_customer', (array) $user->roles, true);
}

function avenza_wholesale_parent_id($product) {
    return $product && $product->is_type('variation') ? $product->get_parent_id() : ($product ? $product->get_id() : 0);
}

add_action('woocommerce_product_options_pricing', function () {
    woocommerce_wp_text_input(array(
        'id' => '_avenza_wholesale_price',
        'label' => 'قیمت عمده AVENZA',
        'description' => 'قیمت قابل مشاهده برای مشتری عمده تاییدشده.',
        'data_type' => 'price',
    ));
    woocommerce_wp_text_input(array(
        'id' => '_avenza_wholesale_min_qty',
        'label' => 'حداقل تعداد عمده',
        'description' => 'حداقل تعداد این محصول در سفارش عمده.',
        'type' => 'number',
        'custom_attributes' => array('min'=>'1','step'=>'1'),
    ));
});

add_action('woocommerce_admin_process_product_object', function ($product) {
    if (isset($_POST['_avenza_wholesale_price'])) {
        $product->update_meta_data('_avenza_wholesale_price', wc_format_decimal(wp_unslash($_POST['_avenza_wholesale_price'])));
    }
    if (isset($_POST['_avenza_wholesale_min_qty'])) {
        $product->update_meta_data('_avenza_wholesale_min_qty', max(1, absint($_POST['_avenza_wholesale_min_qty'])));
    }
});

function avenza_filter_wholesale_price($price, $product) {
    if (is_admin() && !wp_doing_ajax()) return $price;
    if (!avenza_is_wholesale_user()) return $price;
    $product_id = avenza_wholesale_parent_id($product);
    $wholesale = get_post_meta($product_id, '_avenza_wholesale_price', true);
    return $wholesale !== '' ? $wholesale : $price;
}
add_filter('woocommerce_product_get_price', 'avenza_filter_wholesale_price', 20, 2);
add_filter('woocommerce_product_get_sale_price', 'avenza_filter_wholesale_price', 20, 2);
add_filter('woocommerce_product_variation_get_price', 'avenza_filter_wholesale_price', 20, 2);
add_filter('woocommerce_product_variation_get_sale_price', 'avenza_filter_wholesale_price', 20, 2);
add_filter('woocommerce_variation_prices_price', 'avenza_filter_wholesale_price', 20, 2);
add_filter('woocommerce_variation_prices_sale_price', 'avenza_filter_wholesale_price', 20, 2);

add_filter('woocommerce_get_variation_prices_hash', function ($hash) {
    $hash['avenza_wholesale'] = avenza_is_wholesale_user() ? '1' : '0';
    return $hash;
});

add_filter('woocommerce_quantity_input_args', function ($args, $product) {
    if (!avenza_is_wholesale_user()) return $args;
    $min = max(1, absint(get_post_meta(avenza_wholesale_parent_id($product), '_avenza_wholesale_min_qty', true)));
    $args['min_value'] = $min;
    $args['input_value'] = max($min, (int) $args['input_value']);
    return $args;
}, 20, 2);

add_filter('woocommerce_add_to_cart_validation', function ($passed, $product_id, $quantity) {
    if (!avenza_is_wholesale_user()) return $passed;
    $min = max(1, absint(get_post_meta($product_id, '_avenza_wholesale_min_qty', true)));
    if ($quantity < $min) {
        wc_add_notice(sprintf('حداقل تعداد خرید عمده برای این محصول %d عدد است.', $min), 'error');
        return false;
    }
    return $passed;
}, 20, 3);

add_action('init', function () {
    add_rewrite_endpoint('avenza-pricelist', EP_ROOT | EP_PAGES);
});

add_filter('query_vars', function ($vars) {
    $vars[] = 'avenza-pricelist';
    return $vars;
});

add_filter('woocommerce_account_menu_items', function ($items) {
    if (!avenza_is_wholesale_user()) return $items;
    $logout = isset($items['customer-logout']) ? $items['customer-logout'] : null;
    unset($items['customer-logout']);
    $items['avenza-pricelist'] = 'لیست قیمت عمده';
    if ($logout !== null) $items['customer-logout'] = $logout;
    return $items;
});

add_action('woocommerce_account_avenza-pricelist_endpoint', 'avenza_render_wholesale_pricelist');

function avenza_render_wholesale_pricelist() {
    if (!avenza_is_wholesale_user()) {
        echo '<p>این بخش فقط برای مشتریان عمده تاییدشده فعال است.</p>';
        return;
    }
    $products = wc_get_products(array('status'=>'publish','limit'=>200,'orderby'=>'title','order'=>'ASC'));
    echo '<h2>لیست قیمت عمده</h2>';
    echo '<table class="shop_table shop_table_responsive"><thead><tr><th>محصول</th><th>قیمت عمده</th><th>حداقل تعداد</th></tr></thead><tbody>';
    foreach ($products as $product) {
        $wholesale = get_post_meta($product->get_id(), '_avenza_wholesale_price', true);
        $price = $wholesale !== '' ? wc_price($wholesale) : $product->get_price_html();
        $min = max(1, absint(get_post_meta($product->get_id(), '_avenza_wholesale_min_qty', true)));
        echo '<tr><td><a href="'.esc_url($product->get_permalink()).'">'.esc_html($product->get_name()).'</a></td><td>'.wp_kses_post($price).'</td><td>'.esc_html($min).'</td></tr>';
    }
    echo '</tbody></table>';
}

add_shortcode('avenza_wholesale_portal', function () {
    if (is_user_logged_in()) {
        if (avenza_is_wholesale_user()) {
            ob_start();
            echo '<div class="avenza-wholesale-account"><h2>پنل مشتری عمده</h2><p>حساب شما تایید شده است. قیمت های عمده در فروشگاه برای شما فعال هستند.</p>';
            echo '<p><a class="button" href="'.esc_url(wc_get_account_endpoint_url('avenza-pricelist')).'">لیست قیمت عمده</a> <a class="button" href="'.esc_url(avenza_shop_url()).'">محصولات</a></p>';
            avenza_render_wholesale_pricelist();
            echo '</div>';
            return ob_get_clean();
        }
        if (get_user_meta(get_current_user_id(), 'avenza_wholesale_pending', true)) {
            return '<div class="woocommerce-info">درخواست حساب عمده شما ثبت شده و در انتظار تایید است.</div>';
        }
        return '<div class="woocommerce-info">با این حساب وارد شده اید. برای تبدیل حساب به عمده، فرم ثبت نام عمده را با ایمیل دیگری تکمیل کنید یا با AVENZA تماس بگیرید.</div>';
    }

    $message = '';
    if (!empty($_GET['avenza_wholesale_registered'])) {
        $message = '<div class="woocommerce-message">درخواست شما ثبت شد. پس از تایید، حساب عمده فعال می شود.</div>';
    }

    ob_start();
    echo $message;
    ?>
    <div class="avenza-wholesale-register">
        <h2>ثبت نام خریدار عمده</h2>
        <p>بعد از تایید، قیمت همکاری و پنل اختصاصی عمده برای حساب شما فعال می شود.</p>
        <form method="post">
            <?php wp_nonce_field('avenza_wholesale_register','avenza_wholesale_nonce'); ?>
            <p><label>نام و نام خانوادگی<br><input required type="text" name="avenza_name"></label></p>
            <p><label>نام فروشگاه / مزون<br><input required type="text" name="avenza_shop"></label></p>
            <p><label>شماره تماس<br><input required type="tel" name="avenza_phone"></label></p>
            <p><label>ایمیل<br><input required type="email" name="avenza_email"></label></p>
            <p><label>رمز عبور<br><input required type="password" minlength="8" name="avenza_password"></label></p>
            <p><button class="button alt" type="submit" name="avenza_wholesale_submit" value="1">ثبت درخواست عمده</button></p>
        </form>
        <p><a href="<?php echo esc_url(avenza_account_url()); ?>">قبلا حساب ساخته اید؟ ورود به حساب من</a></p>
    </div>
    <?php
    return ob_get_clean();
});

add_action('init', function () {
    if (empty($_POST['avenza_wholesale_submit'])) return;
    if (empty($_POST['avenza_wholesale_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['avenza_wholesale_nonce'])), 'avenza_wholesale_register')) return;

    $email = sanitize_email(wp_unslash($_POST['avenza_email'] ?? ''));
    $password = (string) ($_POST['avenza_password'] ?? '');
    $name = sanitize_text_field(wp_unslash($_POST['avenza_name'] ?? ''));
    $shop = sanitize_text_field(wp_unslash($_POST['avenza_shop'] ?? ''));
    $phone = sanitize_text_field(wp_unslash($_POST['avenza_phone'] ?? ''));

    if (!$email || email_exists($email) || strlen($password) < 8) {
        wc_add_notice('ایمیل نامعتبر است، قبلا استفاده شده یا رمز عبور کوتاه است.', 'error');
        return;
    }

    $base = sanitize_user(strstr($email, '@', true), true);
    $username = $base ?: 'avenza';
    $candidate = $username;
    $i = 1;
    while (username_exists($candidate)) {
        $candidate = $username . $i;
        $i++;
    }

    $user_id = wp_create_user($candidate, $password, $email);
    if (is_wp_error($user_id)) {
        wc_add_notice($user_id->get_error_message(), 'error');
        return;
    }

    wp_update_user(array('ID'=>$user_id,'display_name'=>$name,'first_name'=>$name));
    update_user_meta($user_id, 'avenza_wholesale_pending', 1);
    update_user_meta($user_id, 'avenza_shop', $shop);
    update_user_meta($user_id, 'avenza_phone', $phone);

    wp_safe_redirect(add_query_arg('avenza_wholesale_registered','1', wp_get_referer() ?: home_url('/wholesale/')));
    exit;
});

add_action('admin_menu', function () {
    add_submenu_page('avenza','درخواست های عمده','درخواست های عمده','manage_woocommerce','avenza-wholesale-requests','avenza_wholesale_requests_page');
});

function avenza_wholesale_requests_page() {
    if (!current_user_can('manage_woocommerce')) return;

    if (!empty($_GET['approve']) && !empty($_GET['_wpnonce'])) {
        $user_id = absint($_GET['approve']);
        if (wp_verify_nonce(sanitize_text_field(wp_unslash($_GET['_wpnonce'])), 'avenza_approve_wholesale_'.$user_id)) {
            $user = get_userdata($user_id);
            if ($user) {
                $user->set_role('wholesale_customer');
                delete_user_meta($user_id, 'avenza_wholesale_pending');
                echo '<div class="notice notice-success"><p>حساب عمده تایید شد.</p></div>';
            }
        }
    }

    $users = get_users(array('meta_key'=>'avenza_wholesale_pending','meta_value'=>'1','orderby'=>'registered','order'=>'ASC'));
    echo '<div class="wrap"><h1>درخواست های مشتری عمده</h1>';
    if (!$users) {
        echo '<p>درخواستی در انتظار تایید نیست.</p></div>';
        return;
    }
    echo '<table class="widefat striped"><thead><tr><th>نام</th><th>ایمیل</th><th>فروشگاه</th><th>تلفن</th><th></th></tr></thead><tbody>';
    foreach ($users as $user) {
        $url = wp_nonce_url(admin_url('admin.php?page=avenza-wholesale-requests&approve='.$user->ID), 'avenza_approve_wholesale_'.$user->ID);
        echo '<tr><td>'.esc_html($user->display_name).'</td><td>'.esc_html($user->user_email).'</td><td>'.esc_html(get_user_meta($user->ID,'avenza_shop',true)).'</td><td>'.esc_html(get_user_meta($user->ID,'avenza_phone',true)).'</td><td><a class="button button-primary" href="'.esc_url($url).'">تایید حساب عمده</a></td></tr>';
    }
    echo '</tbody></table></div>';
}
