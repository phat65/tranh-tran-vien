"use server"

// Lớp truy xuất dữ liệu cart từ Medusa/backend cho storefront.

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId,
} from "./cookies"
import { getRegion } from "./regions"
import { getLocale } from "./locale-actions"

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 */
export async function retrieveCart(cartId?: string, fields?: string) {
  const id = cartId || (await getCartId())
  fields ??=
    "*items, *items.adjustments, *region, *items.product, *items.product.categories, *items.product.collection, *items.variant, *items.variant.options, *items.thumbnail, *items.metadata, +items.total, +items.original_total, +items.discount_total, +metadata, *promotions, +shipping_methods.name"

  if (!id) {
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("carts")),
  }

  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)
    .catch(() => null)
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart(undefined, "id,region_id")

  const headers = {
    ...(await getAuthHeaders()),
  }

  if (!cart) {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id, locale: locale || undefined },
      {},
      headers
    )
    cart = cartResp.cart

    await setCartId(cart.id)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      await syncCartRules(cart.id, headers)

      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)

      return cart
    })
    .catch(medusaError)
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
  metadata,
}: {
  variantId: string
  quantity: number
  countryCode: string
  metadata?: Record<string, unknown>
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await addSingleLineItem(cart.id, variantId, quantity, headers, metadata)
  } catch (error) {
    await removeCartId()
    const freshCart = await getOrSetCart(countryCode)

    if (!freshCart) {
      medusaError(error)
    }

    await addSingleLineItem(
      freshCart.id,
      variantId,
      quantity,
      headers,
      metadata
    ).catch(medusaError)
  }
}

export async function addItemsToCart({
  items,
  countryCode,
}: {
  items: {
    variantId: string
    quantity: number
    metadata?: Record<string, unknown>
  }[]
  countryCode: string
}) {
  const normalizedItems = items
    .map((item) => ({
      variantId: item.variantId,
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 0)),
      metadata: item.metadata,
    }))
    .filter((item) => item.variantId && item.quantity > 0)

  if (!normalizedItems.length) {
    throw new Error("Missing line items when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await addMultipleLineItems(cart.id, normalizedItems, headers)
  } catch (error) {
    await removeCartId()
    const freshCart = await getOrSetCart(countryCode)

    if (!freshCart) {
      medusaError(error)
    }

    await addMultipleLineItems(freshCart.id, normalizedItems, headers).catch(
      medusaError
    )
  }
}

async function addSingleLineItem(
  cartId: string,
  variantId: string,
  quantity: number,
  headers: Record<string, string>,
  metadata?: Record<string, unknown>
) {
  await sdk.client.fetch(`/store/carts/${cartId}/line-items`, {
    method: "POST",
    body: {
      variant_id: variantId,
      quantity,
      ...(metadata ? { metadata } : {}),
    },
    headers,
    cache: "no-store",
  })

  await refreshCartAfterMutation(cartId, headers)
}

async function addMultipleLineItems(
  cartId: string,
  items: {
    variantId: string
    quantity: number
    metadata?: Record<string, unknown>
  }[],
  headers: Record<string, string>
) {
  for (const item of items) {
    await sdk.client.fetch(`/store/carts/${cartId}/line-items`, {
      method: "POST",
      body: {
        variant_id: item.variantId,
        quantity: item.quantity,
        ...(item.metadata ? { metadata: item.metadata } : {}),
      },
      headers,
      cache: "no-store",
    })
  }

  await refreshCartAfterMutation(cartId, headers)
}

async function refreshCartAfterMutation(
  cartId: string,
  headers: Record<string, string>
) {
  await syncCartRules(cartId, headers)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  const fulfillmentCacheTag = await getCacheTag("fulfillment")
  revalidateTag(fulfillmentCacheTag)
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(async () => {
      await syncCartRules(cartId, headers)
    })
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(async () => {
      await syncCartRules(cartId, headers)
    })
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  if (!shippingMethodId) {
    throw new Error("Please select a shipping method")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(async () => {
      await syncCartRules(cartId, headers)
    })
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch(medusaError)
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await syncCartRules(cart.id, headers)

  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, headers)
    .then(async (resp) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return resp
    })
    .catch(medusaError)
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function applyGiftCard(_code: string) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, { gift_cards: [{ code }] }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function removeDiscount(_code: string) {
  // const cartId = getCartId()
  // if (!cartId) return "No cartId cookie found"
  // try {
  //   await deleteDiscount(cartId, code)
  //   revalidateTag("cart")
  // } catch (error: any) {
  //   throw error
  // }
}

export async function removeGiftCard(
  _codeToRemove: string,
  _giftCards: unknown[]
  // giftCards: GiftCard[]
) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, {
  //       gift_cards: [...giftCards]
  //         .filter((gc) => gc.code !== codeToRemove)
  //         .map((gc) => ({ code: gc.code })),
  //     }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: unknown) {
    return e instanceof Error ? e.message : String(e)
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }
    const cartId = await getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }
    const formValue = (name: string) => {
      const value = formData.get(name)

      return typeof value === "string" ? value : null
    }

    const data: HttpTypes.StoreUpdateCart = {
      shipping_address: {
        first_name: formValue("shipping_address.first_name"),
        last_name: formValue("shipping_address.last_name"),
        address_1: formValue("shipping_address.address_1"),
        address_2: "",
        company: formValue("shipping_address.company"),
        postal_code: formValue("shipping_address.postal_code"),
        city: formValue("shipping_address.city"),
        country_code: formValue("shipping_address.country_code"),
        province: formValue("shipping_address.province"),
        phone: formValue("shipping_address.phone"),
      },
      email: formValue("email"),
    }

    const sameAsBilling = formData.get("same_as_billing")
    if (sameAsBilling === "on") data.billing_address = data.shipping_address

    if (sameAsBilling !== "on")
      data.billing_address = {
        first_name: formValue("billing_address.first_name"),
        last_name: formValue("billing_address.last_name"),
        address_1: formValue("billing_address.address_1"),
        address_2: "",
        company: formValue("billing_address.company"),
        postal_code: formValue("billing_address.postal_code"),
        city: formValue("billing_address.city"),
        country_code: formValue("billing_address.country_code"),
        province: formValue("billing_address.province"),
        phone: formValue("billing_address.phone"),
      }
    await updateCart(data)

    const headers = {
      ...(await getAuthHeaders()),
    }

    await ensureDefaultShippingMethod(cartId, headers)
  } catch (e: unknown) {
    return e instanceof Error ? e.message : String(e)
  }

  redirect(
    `/${formData.get("shipping_address.country_code")}/checkout?step=delivery`
  )
}

/**
 * Places an order for a cart. If no cart ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to place an order for.
 * @returns The cart object if the order was successful, or null if not.
 */
export async function placeOrder(cartId?: string) {
  const id = cartId || (await getCartId())

  if (!id) {
    throw new Error("No existing cart found when placing an order")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await syncCartRules(id, headers)

  const cartRes = await sdk.store.cart
    .complete(id, {}, headers)
    .then(async (cartRes) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return cartRes
    })
    .catch(medusaError)

  if (cartRes?.type === "order") {
    const countryCode =
      cartRes.order.shipping_address?.country_code?.toLowerCase()

    const orderCacheTag = await getCacheTag("orders")
    revalidateTag(orderCacheTag)

    removeCartId()
    redirect(`/${countryCode}/order/${cartRes?.order.id}/confirmed`)
  }

  return cartRes.cart
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  const regionCacheTag = await getCacheTag("regions")
  revalidateTag(regionCacheTag)

  const productsCacheTag = await getCacheTag("products")
  revalidateTag(productsCacheTag)

  redirect(`/${countryCode}${currentPath}`)
}

export async function listCartOptions() {
  const cartId = await getCartId()
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("shippingOptions")),
  }

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    next,
    headers,
    cache: "force-cache",
  })
}

async function ensureDefaultShippingMethod(
  cartId: string,
  headers: Record<string, string>
) {
  const cart = await sdk.client
    .fetch<{ cart: HttpTypes.StoreCart }>(`/store/carts/${cartId}`, {
      method: "GET",
      query: {
        fields: "id,*shipping_methods",
      },
      headers,
      cache: "no-store",
    })
    .then(({ cart }) => cart)
    .catch(() => null)

  if ((cart?.shipping_methods?.length ?? 0) > 0) {
    return
  }

  const shippingOptions = await sdk.client
    .fetch<{ shipping_options: HttpTypes.StoreCartShippingOption[] }>(
      "/store/shipping-options",
      {
        method: "GET",
        query: {
          cart_id: cartId,
        },
        headers,
        cache: "no-store",
      }
    )
    .then(({ shipping_options }) => shipping_options)
    .catch(() => [])

  const shippingOption =
    shippingOptions.find((option) => !isPickupShippingOption(option)) ??
    shippingOptions[0]

  if (!shippingOption?.id) {
    return
  }

  await sdk.store.cart.addShippingMethod(
    cartId,
    { option_id: shippingOption.id },
    {},
    headers
  )

  await syncCartRules(cartId, headers)
}

function isPickupShippingOption(option: HttpTypes.StoreCartShippingOption) {
  return (
    (
      option as unknown as {
        service_zone?: {
          fulfillment_set?: {
            type?: string
          }
        }
      }
    ).service_zone?.fulfillment_set?.type === "pickup"
  )
}

async function syncCartRules(
  cartId: string,
  headers: Record<string, string>
) {
  return sdk.client
    .fetch(`/store/tranh-tran-vien/cart-rules/${cartId}/sync`, {
      method: "POST",
      headers,
      cache: "no-store",
    })
    .catch(medusaError)
}
