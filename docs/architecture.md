# Bookshop POS Architecture

## Domain Model

The system now has two layers:

- Legacy MVP tables: `books`, `sale_items.book_id`, `purchase_items.book_id`, and `stock_logs` keep the current screens working.
- Expanded POS tables: `products`, `product_variants`, `stock_movements`, `payments`, `returns`, `return_items`, `expenses`, `settings`, and `audit_logs` support the full requirements.

The migration path is to move POS, purchase, report, and receipt logic from book-only records to product variants. Product variants own SKU/barcode, purchase price, retail price, current stock, and minimum stock level.

## Roles And Permissions

System roles are seeded into `roles`:

- `admin`: all permissions.
- `manager`: inventory, purchases, sales, returns, reports, and discount overrides.
- `cashier`: create POS sales.
- `inventory_staff`: product, category, purchase, and stock operations.

Fine-grained permissions are seeded into `permissions` and linked through `role_permissions`. Existing JWT authorization still uses `users.role`; permission-based middleware can be added without changing the user table again.

## Categories

`categories` supports hierarchy through `parent_id` and status through `active` or `inactive`. The initializer seeds:

- Books
- Stationery
- Gift Items
- Sports Items

Each main category has the subcategories listed in the project brief. Subcategories are data-managed, not hard-coded in application logic.

## Products And Variants

`products` stores common product details such as name, category, supplier, unit, image, status, and category-specific attributes.

`product_variants` stores sellable variations:

- SKU
- Barcode
- Purchase price
- Sale price
- Current stock
- Minimum stock level
- Variant attributes as JSON

Examples: `Blue Pen`, `Black Pen`, and `Notebook 100 pages` should be variants under their parent product when they share product-level metadata.

## Inventory Logic

Stock changes should always use transactions. Every confirmed stock change should write to `stock_movements` with:

- Previous quantity
- Quantity change
- New quantity
- Movement type
- User
- Reason or reference

The product API already supports manual variant stock adjustment at:

```text
POST /api/products/:id/variants/:variantId/adjust
```

## POS Workflow

The POS workflow should eventually sell `product_variants` instead of `books`:

1. Search by product name, product code, SKU, barcode, category, or subcategory.
2. Add variant to cart.
3. Validate available stock unless negative stock is enabled in `settings`.
4. Apply default discount from `settings`.
5. Enforce role discount limits.
6. Save sale, sale items, and payment rows in one transaction.
7. Decrease stock and create `stock_movements`.
8. Generate printable receipt/PDF.

## Next Migration Steps

1. Update sales and purchase tables to reference `product_variant_id`.
2. Add settings API for discounts, tax, receipt, negative stock, and shop details.
3. Add returns/refunds API that links to original sales.
4. Add audit logging middleware/helper.
5. Update frontend screens from `Books` to `Products` and add category/subcategory administration.
