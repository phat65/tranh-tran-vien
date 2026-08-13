# TESTING REQUIREMENTS

## Mục tiêu

Test tập trung vào:
- business rules,
- checkout/cart critical path,
- permissions,
- production workflow,
- file upload,
- regression quan trọng.

Không theo đuổi 100% coverage vô nghĩa.

## Test Levels

### Unit
Cho:
- validators,
- pure functions,
- status transition,
- price display formatter,
- business mapping.

### Integration
Cho:
- API/service + database,
- artwork creation,
- production transitions,
- permission,
- cart mutation,
- upload confirmation.

### E2E
Cho critical flow:
- browse → product → cart,
- custom upload → configuration → cart,
- admin login,
- update order,
- upload preview,
- artwork approval,
- production transition,
- shipping tracking.

## Required Business Tests

### Production
- valid next transition passes.
- invalid jump fails.
- manager override works with reason.
- printing before approval fails.
- completed job cannot silently return to design.

### Permission
- Designer cannot refund.
- Warehouse cannot change price.
- Sales cannot edit role.
- Viewer cannot mutate.
- Admin can perform permitted override.

### Artwork
- invalid MIME rejected.
- file size limit enforced.
- private file not public.
- version history preserved.
- approved version cannot be overwritten silently.

### Cart
- invalid variant rejected.
- out-of-stock rejected.
- client-manipulated price ignored.
- volume discount from backend applied correctly.

## UI Tests

Storefront:
- mobile product grid,
- mobile nav,
- PDP selection,
- cart drawer,
- empty/error/loading states.

Admin:
- list loading,
- filters,
- unauthorized state,
- dangerous action confirmation.

## Accessibility Tests

Critical pages:
- homepage,
- collection,
- product,
- cart,
- admin order detail.

Check:
- keyboard,
- focus,
- labels,
- aria,
- contrast,
- modal trap.

## CI Gates

Minimum:
- type-check,
- lint,
- unit/integration tests,
- production build.

Không merge nếu critical tests fail.

## Test Data

Seed:
- standard product,
- custom product,
- in-stock variant,
- out-of-stock variant,
- standard order,
- custom order,
- artwork waiting approval,
- artwork approved,
- production job printing.
