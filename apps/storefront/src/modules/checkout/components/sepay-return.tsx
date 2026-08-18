"use client"

import { placeOrder } from "@lib/data/cart"
import { ArrowPath, XCircle } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  Button,
  Container,
  Heading,
  Text,
} from "@modules/common/components/ui"
import { useCallback, useEffect, useRef, useState } from "react"

export type SePayReturnResult = "success" | "error" | "cancel"

type SePayReturnProps = {
  result?: SePayReturnResult
}

type CompletionState = "idle" | "processing" | "pending" | "error"

const MAX_CONFIRMATION_ATTEMPTS = 5
const CONFIRMATION_RETRY_DELAY_MS = 2_000
const PAYMENT_CHECK_ERROR_MESSAGE =
  "Chưa thể xác nhận giao dịch lúc này. Vui lòng đợi một chút rồi kiểm tra lại."

const linkButtonBaseClassName =
  "inline-flex h-12 items-center justify-center gap-2 rounded-md px-6 text-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
const primaryLinkButtonClassName = `${linkButtonBaseClassName} bg-black text-white hover:bg-gray-800`
const secondaryLinkButtonClassName = `${linkButtonBaseClassName} border border-gray-200 bg-white text-black hover:bg-gray-50`

const waitForConfirmation = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, CONFIRMATION_RETRY_DELAY_MS)
  })

const SePayReturn = ({ result }: SePayReturnProps) => {
  const shouldComplete = result !== "cancel" && result !== "error"
  const started = useRef(false)
  const mounted = useRef(true)
  const checking = useRef(false)
  const [state, setState] = useState<CompletionState>(
    shouldComplete ? "processing" : "idle"
  )

  const completeOrder = useCallback(async () => {
    if (checking.current) {
      return
    }

    checking.current = true
    setState("processing")

    try {
      for (let attempt = 1; attempt <= MAX_CONFIRMATION_ATTEMPTS; attempt++) {
        const cart = await placeOrder()

        if (!mounted.current) {
          return
        }

        // A redirect happens when the order is complete. A returned cart means
        // the SePay webhook has not confirmed the payment yet.
        if (!cart) {
          setState("error")
          return
        }

        if (attempt < MAX_CONFIRMATION_ATTEMPTS) {
          await waitForConfirmation()

          if (!mounted.current) {
            return
          }
        }
      }

      setState("pending")
    } catch {
      if (mounted.current) {
        setState("error")
      }
    } finally {
      checking.current = false
    }
  }, [])

  useEffect(() => {
    mounted.current = true

    if (!shouldComplete || started.current) {
      return () => {
        mounted.current = false
      }
    }

    started.current = true
    void completeOrder()

    return () => {
      mounted.current = false
    }
  }, [completeOrder, shouldComplete])

  if (result === "cancel") {
    return (
      <ReturnShell
        icon={<XCircle className="text-ui-fg-error" />}
        title="Thanh toán đã hủy"
        description="Đơn hàng chưa được tạo và giỏ hàng của bạn vẫn được giữ nguyên."
      >
        <LocalizedClientLink
          href="/checkout?step=payment"
          className={primaryLinkButtonClassName}
        >
          Chọn lại phương thức thanh toán
        </LocalizedClientLink>
      </ReturnShell>
    )
  }

  if (state === "processing") {
    return (
      <ReturnShell
        icon={<ArrowPath className="animate-spin text-ui-fg-interactive" />}
        title="Đang xác nhận thanh toán"
        description="Hệ thống đang kiểm tra giao dịch trực tiếp với SePay. Quá trình này có thể mất vài giây."
      />
    )
  }

  if (state === "pending") {
    return (
      <ReturnShell
        icon={<ArrowPath className="text-ui-fg-interactive" />}
        title="Giao dịch đang được xử lý"
        description="Ngân hàng hoặc SePay chưa xác nhận hoàn tất. Bạn có thể đợi một chút rồi kiểm tra lại."
      >
        <Button size="large" onClick={completeOrder}>
          Kiểm tra lại thanh toán
        </Button>
      </ReturnShell>
    )
  }

  if (state === "error") {
    return (
      <ReturnShell
        icon={<XCircle className="text-ui-fg-error" />}
        title="Chưa thể hoàn tất đơn hàng"
        description={PAYMENT_CHECK_ERROR_MESSAGE}
      >
        <Button size="large" onClick={completeOrder}>
          Thử kiểm tra lại
        </Button>
      </ReturnShell>
    )
  }

  return (
    <ReturnShell
      icon={<XCircle className="text-ui-fg-error" />}
      title="Thanh toán chưa hoàn tất"
      description="SePay không thể hoàn tất giao dịch. Giỏ hàng của bạn vẫn được giữ nguyên."
    >
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="large" onClick={completeOrder}>
          Kiểm tra lại thanh toán
        </Button>
        <LocalizedClientLink
          href="/checkout?step=payment"
          className={secondaryLinkButtonClassName}
        >
          Chọn lại phương thức
        </LocalizedClientLink>
      </div>
    </ReturnShell>
  )
}

const ReturnShell = ({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}) => {
  return (
    <main className="content-container flex min-h-[60vh] items-center justify-center py-12">
      <Container
        className="flex w-full max-w-xl flex-col items-center gap-y-5 p-8 text-center"
        aria-live="polite"
      >
        <span className="flex h-10 w-10 items-center justify-center [&_svg]:h-8 [&_svg]:w-8">
          {icon}
        </span>
        <div className="flex flex-col gap-y-2">
          <Heading level="h1" className="text-2xl-regular">
            {title}
          </Heading>
          <Text className="text-ui-fg-subtle">{description}</Text>
        </div>
        {children}
      </Container>
    </main>
  )
}

export default SePayReturn
