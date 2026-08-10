import { NextResponse } from "next/server"

import { addToCart } from "@lib/data/cart"

type AddCartPayload = {
  countryCode?: unknown
  variantId?: unknown
  quantity?: unknown
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AddCartPayload
    const countryCode =
      typeof payload.countryCode === "string" ? payload.countryCode : ""
    const variantId =
      typeof payload.variantId === "string" ? payload.variantId : ""
    const quantity = Math.max(1, Math.floor(Number(payload.quantity) || 0))

    if (!countryCode) {
      return NextResponse.json(
        { message: "Missing country code" },
        { status: 400 }
      )
    }

    if (!variantId) {
      return NextResponse.json(
        { message: "Missing variant ID" },
        { status: 400 }
      )
    }

    await addToCart({ countryCode, variantId, quantity })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[cart-add]", error)

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not add to cart",
      },
      { status: 500 }
    )
  }
}
