<?php
get_header();

$hero = avenza_opt('hero_image_url');
$hero_style = $hero ? ' style="background-image:linear-gradient(90deg,rgba(0,0,0,.58),rgba(0,0,0,.08)),url(' . esc_url($hero) . ')"' : '';

$featured = function_exists('wc_get_products') ? wc_get_products(array(
    'status' => 'publish',
    'limit' => 4,
    'featured' => true,
    'orderby' => 'date',
    'order' => 'DESC',
)) : array();

if (!$featured && function_exists('wc_get_products')) {
    $featured = wc_get_products(array(
        'status' => 'publish',
        'limit' => 4,
        'orderby' => 'date',
        'order' => 'DESC',
    ));
}

$latest = function_exists('wc_get_products') ? wc_get_products(array(
    'status' => 'publish',
    'limit' => 8,
    'orderby' => 'date',
    'order' => 'DESC',
)) : array();

$categories = taxonomy_exists('product_cat') ? get_terms(array(
    'taxonomy' => 'product_cat',
    'hide_empty' => true,
    'number' => 6,
)) : array();
?>
<section class="av-hero"<?php echo $hero_style; ?>>
    <div class="av-shell av-hero-copy">
        <small><?php echo esc_html(avenza_opt('hero_eyebrow')); ?></small>
        <h1><?php echo esc_html(avenza_opt('hero_title')); ?></h1>
        <?php if (avenza_opt('hero_subtitle')) : ?><p><?php echo esc_html(avenza_opt('hero_subtitle')); ?></p><?php endif; ?>
        <div class="av-hero-actions">
            <a class="av-btn av-btn-light" href="<?php echo esc_url(avenza_shop_url()); ?>">مشاهده کالکشن</a>
            <a class="av-btn av-btn-ghost" href="<?php echo esc_url(home_url('/wholesale/')); ?>">خرید عمده</a>
        </div>
    </div>
</section>

<section class="av-trust">
    <div><b>ارسال به سراسر کشور</b><span>هماهنگی قبل از ارسال</span></div>
    <div><b>خرید تکی و عمده</b><span>قیمت گذاری جداگانه</span></div>
    <div><b>پشتیبانی مستقیم</b><span>راهنمای انتخاب و سفارش</span></div>
    <div><b>AVENZA</b><span>بدون واسطه</span></div>
</section>

<?php if ($featured) : ?>
<section class="av-section">
    <div class="av-section-head"><div><small>NEW ARRIVALS</small><h2>جدیدترین انتخاب ها</h2></div><a href="<?php echo esc_url(avenza_shop_url()); ?>">مشاهده همه</a></div>
    <div class="av-products">
    <?php foreach ($featured as $product) : ?>
        <article class="av-product-card">
            <a class="av-product-media" href="<?php echo esc_url($product->get_permalink()); ?>">
                <?php echo $product->get_image('woocommerce_thumbnail'); ?>
                <?php if ($product->is_featured()) : ?><span>پرفروش</span><?php endif; ?>
            </a>
            <div class="av-product-copy">
                <div><small><?php echo esc_html(wc_get_product_category_list($product->get_id(), ', ', '', '')); ?></small><h3><a href="<?php echo esc_url($product->get_permalink()); ?>"><?php echo esc_html($product->get_name()); ?></a></h3></div>
                <strong><?php echo wp_kses_post($product->get_price_html()); ?></strong>
            </div>
        </article>
    <?php endforeach; ?>
    </div>
</section>
<?php endif; ?>

<?php if (!is_wp_error($categories) && $categories) : ?>
<section class="av-section" id="categories">
    <div class="av-section-head"><div><small>SHOP BY CATEGORY</small><h2>انتخاب براساس دسته بندی</h2></div></div>
    <div class="av-category-grid">
    <?php foreach ($categories as $cat) :
        $thumb_id = get_term_meta($cat->term_id, 'thumbnail_id', true);
        $img = $thumb_id ? wp_get_attachment_image_url($thumb_id, 'large') : '';
    ?>
        <a href="<?php echo esc_url(get_term_link($cat)); ?>"<?php echo $img ? ' style="background-image:linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.58)),url(' . esc_url($img) . ')"' : ''; ?>>
            <span><?php echo esc_html($cat->name); ?></span>
            <small>مشاهده محصولات</small>
        </a>
    <?php endforeach; ?>
    </div>
</section>
<?php endif; ?>

<?php if ($latest) : ?>
<section class="av-section" id="shop">
    <div class="av-section-head"><div><small>THE COLLECTION</small><h2>AVENZA</h2></div><a href="<?php echo esc_url(avenza_shop_url()); ?>">فروشگاه کامل</a></div>
    <div class="av-products">
    <?php foreach ($latest as $product) : ?>
        <article class="av-product-card">
            <a class="av-product-media" href="<?php echo esc_url($product->get_permalink()); ?>"><?php echo $product->get_image('woocommerce_thumbnail'); ?></a>
            <div class="av-product-copy"><div><h3><a href="<?php echo esc_url($product->get_permalink()); ?>"><?php echo esc_html($product->get_name()); ?></a></h3></div><strong><?php echo wp_kses_post($product->get_price_html()); ?></strong></div>
        </article>
    <?php endforeach; ?>
    </div>
</section>
<?php endif; ?>

<section class="av-wholesale">
    <div>
        <small>WHOLESALE · AVENZA</small>
        <h2><?php echo esc_html(avenza_opt('wholesale_title')); ?></h2>
        <p><?php echo nl2br(esc_html(avenza_opt('wholesale_text'))); ?></p>
    </div>
    <div class="av-wholesale-panel">
        <b>فروش عمده</b>
        <p>قیمت همکاری، سفارش تعداد، سابقه سفارش ها و حساب اختصاصی خریدار عمده.</p>
        <a class="av-btn av-btn-dark" href="<?php echo esc_url(home_url('/wholesale/')); ?>">ورود / ثبت نام عمده</a>
    </div>
</section>

<?php if (shortcode_exists('avenza_shop_the_look')) : ?>
<section class="av-section av-look">
    <div class="av-section-head"><div><small>FOLLOW THE LOOK</small><h2>SHOP THE LOOK</h2></div></div>
    <?php echo do_shortcode('[avenza_shop_the_look limit="4"]'); ?>
</section>
<?php endif; ?>

<section class="av-about" id="about">
    <div><small>ABOUT AVENZA</small><h2><?php echo esc_html(avenza_opt('about_title')); ?></h2></div>
    <p><?php echo nl2br(esc_html(avenza_opt('about_text'))); ?></p>
</section>

<?php get_footer(); ?>
