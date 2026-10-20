# 3. Guest checkout with synthetic customer details

No customer accounts. Checkout takes a nickname (pre-filled "Guest 123"),
pickup or delivery to a listed neighbourhood (never a street address) and an
optional kitchen note. The backend gives each order a synthetic, unallocated
`+254 000 …` number so the admin board still looks like a real one. Orders are
purged after 30 days and the admin can reset them at any time; sample orders
keep the board alive between demos.

Prices come from the database at checkout; the client's total must match or
the order is refused.
