# AVENZA WordPress / WooCommerce Migration

The WordPress migration lives here while the current React/Vite/Supabase production stays untouched.

## Included

- Custom AVENZA WooCommerce theme
- Retail WooCommerce storefront
- WooCommerce My Account customer panel
- Wholesale customer role and approval flow
- Per-product wholesale price and minimum quantity
- Wholesale price list inside My Account
- Instagram / Shop The Look content type linked to WooCommerce products
- AVENZA site settings in WordPress Admin
- One-time importer for the current Supabase products, variants, stock, wholesale prices and public site content

## Install

1. Install WordPress and WooCommerce on a PHP/MySQL host.
2. Copy `wp-content/themes/avenza` to WordPress themes.
3. Copy `wp-content/plugins/avenza-core` to WordPress plugins.
4. Activate WooCommerce.
5. Activate AVENZA Core.
6. Activate the AVENZA theme.
7. Open **AVENZA → Migration** and run the importer.
8. Review Products, WooCommerce settings, payment, shipping and permalink settings.
9. Test retail checkout and a wholesale account before DNS/domain cutover.

Do not remove the current Vercel/Supabase production until acceptance testing is complete.
