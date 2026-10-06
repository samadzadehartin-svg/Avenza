</main>
<footer class="av-footer">
<div><strong>AVENZA COLLECTION</strong><p>لباس هایی برای ریتم خودت.</p></div>
<div><span>اینستاگرام</span><p>@<?php echo esc_html(ltrim(avenza_opt('instagram'),'@')); ?></p></div>
<div><span>تماس و واتساپ</span><a href="tel:<?php echo esc_attr(avenza_opt('phone')); ?>"><?php echo esc_html(avenza_opt('phone')); ?></a></div>
<div><span>آدرس</span><p><?php echo esc_html(avenza_opt('address')); ?></p></div>
</footer>
<nav class="av-mobile-nav">
<a href="<?php echo esc_url(home_url('/')); ?>">خانه</a>
<a href="<?php echo esc_url(avenza_shop_url()); ?>">فروشگاه</a>
<a href="<?php echo esc_url(avenza_account_url()); ?>">حساب</a>
<a href="<?php echo esc_url(function_exists('wc_get_cart_url') ? wc_get_cart_url() : '#'); ?>">سبد <?php echo esc_html(avenza_cart_count()); ?></a>
</nav>
<?php wp_footer(); ?>
</body>
</html>
