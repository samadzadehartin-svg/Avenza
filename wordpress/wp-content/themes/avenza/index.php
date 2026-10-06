<?php
get_header();
?>
<section class="av-page">
  <div class="av-shell">
    <?php
    if (have_posts()) {
        while (have_posts()) {
            the_post();
            the_content();
        }
    } else {
        echo '<p>محتوایی پیدا نشد.</p>';
    }
    ?>
  </div>
</section>
<?php get_footer(); ?>
