// Service Medusa chứa nghiệp vụ và thao tác dữ liệu cho module wishlist.

import { MedusaService } from "@medusajs/framework/utils"

import Wishlist from "./models/wishlist"
import WishlistItem from "./models/wishlist-item"

class WishlistModuleService extends MedusaService({
  Wishlist,
  WishlistItem,
}) {
  async getOrCreateCustomerWishlist(customerId: string) {
    const [wishlists] = await this.listAndCountWishlists(
      {
        customer_id: customerId,
        status: "active",
      },
      { take: 1 }
    )

    if (wishlists[0]) {
      return wishlists[0]
    }

    return this.createWishlists({
      customer_id: customerId,
      guest_token: null,
      status: "active",
    })
  }

  async getOrCreateGuestWishlist(guestToken: string) {
    const [wishlists] = await this.listAndCountWishlists(
      {
        guest_token: guestToken,
        status: "active",
      },
      { take: 1 }
    )

    if (wishlists[0]) {
      return wishlists[0]
    }

    return this.createWishlists({
      customer_id: null,
      guest_token: guestToken,
      status: "active",
    })
  }

  async addProductToWishlist(input: {
    wishlist_id: string
    product_id: string
    variant_id?: string | null
    metadata?: Record<string, unknown> | null
  }) {
    const existingItems = await this.listWishlistItems({
      wishlist_id: input.wishlist_id,
      product_id: input.product_id,
    })

    if (existingItems[0]) {
      return existingItems[0]
    }

    return this.createWishlistItems({
      wishlist_id: input.wishlist_id,
      product_id: input.product_id,
      variant_id: input.variant_id ?? null,
      metadata: input.metadata ?? null,
    })
  }

  async removeProductFromWishlist(wishlistId: string, productId: string) {
    const items = await this.listWishlistItems({
      wishlist_id: wishlistId,
      product_id: productId,
    })

    if (!items.length) {
      return []
    }

    await this.deleteWishlistItems(items.map((item) => item.id))

    return items
  }
}

export default WishlistModuleService
