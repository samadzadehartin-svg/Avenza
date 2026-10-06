<?php if (!defined('ABSPATH')) exit; ?>
<!doctype html>
<html <?php language_attributes(); ?> dir="rtl">
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div class="av-announcement"><?php echo esc_html(avenza_opt('announcement')); ?></div>
<header class="av-header">
<div class="av-brand"><?php avenza_logo(); ?></div>
<nav class="av-nav"><ul>
<li><a href="<?php echo esc_url(home_url('/')); ?>">خانه</a></li>
<li><a href="<?php echo esc_url(avenza_shop_url()); ?>">فروشگاه</a></li>
<li><a href="<?php echo esc_url(home_url('/#categories')); ?>">دسته بندی ها</a></li>
<li><a href="<?php echo esc_url(home_url('/wholesale/')); ?>">فروش عمده</a></li>
<li><a href="<?php echo esc_url(home_url('/#about')); ?>">درباره ما</a></li>
</ul></nav>
<div class="av-actions">
<a href="<?php echo esc_url(avenza_account_url()); ?>">حساب من</a>
<a href="<?php echo esc_url(function_exists('wc_get_cart_url') ? wc_get_cart_url() : '#'); ?>">سبد <b><?php echo esc_html(avenza_cart_count()); ?></b></a>
</div>
</header>
<main class="av-main">
