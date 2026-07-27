# Brand Module

Owns brand and sub-brand data such as Tranh Tran Vien and POKE Framium.

Do not model Medusa products here. Product ownership stays in Medusa core.

Product-to-brand assignment is stored in `product_brand` instead of a bare Medusa module link because the business needs extra fields such as `is_primary`, `sort_order`, and `metadata`.
