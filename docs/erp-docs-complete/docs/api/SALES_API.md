# Sales API

## Endpoints

### `GET /api/sales/invoices`
- **Description:** Fetch all sales invoices.
- **Response:** Array of invoices with customer and items.

### `GET /api/sales/invoices/:id`
- **Description:** Fetch a single invoice by its ID.
- **Response:** Invoice object with customer and item details (including model, color, size).

### `POST /api/sales/invoices`
- **Description:** Create a new sales invoice.
- **Body:** `{ customerId, orderId, items: [{ modelId, colorId, sizeId, quantity, unitPrice, gstPercent }] }`
- **Response:** Created invoice object.

### `POST /api/sales/payments`
- **Description:** Record a customer payment against outstanding balance.
- **Body:** `{ customerId, amount, method, reference }`
- **Response:** Created payment record.
