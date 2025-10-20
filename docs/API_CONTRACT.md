# API Contract (v0)

## POST /api/uploads/presign
Req: `{ pathHint: "users/{uid}/tmp/", contentType: "image/png" }`
Res: `{ uploadUrl, publicUrl, expiresAt }`

## POST /api/orders
Req: `{ designRecipe, productSlug, options, contact, fulfillment }`
Res: `{ orderId, status: "draft" }`

## POST /api/checkout/create
Req: `{ orderId }`
Res: `{ checkoutUrl }`

## POST /api/webhooks/stripe
Stripe sends events; we verify signature server-side.

## GET /api/designs
Res: `{ items: [ { id, previewUrl, productSlug, updatedAt } ] }`

## POST /api/designs
Req: `{ previewUrl, designRecipe }`
Res: `{ id }`

## POST /api/requests
Req: `{ shortDescription, style, colorVibe, textWanted, useCase, deadline, notes, referenceUrls[] }`
Res: `{ requestId, status: "awaiting_quote" }`

## GET /api/premades?product=poster&tag=Minimal&q=lion&page=1
Res: `{ items: [...], page, total }`