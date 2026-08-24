"use client"

import { placeOrder } from "@lib/data/cart"
import { ArrowPath, CheckCircle, XCircle } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  Button,
  Container,
  Heading,
  Text,
} from "@modules/common/components/ui"
import { useCallback, useEffect, useRef, useState } from "react"

type PayOSReturnProps = {
  status?: string
  cancelled: boolean
}

type CompletionState = "idle" | "processing" | "pending" | "error"

const PayOSReturn = ({ status, cancelled }: PayOSReturnProps) => {
  const normalizedStatus = status?.toUpperCase()
  const shouldComplete = normalizedStatus === "PAID" && !cancelled
  const isPendingStatus = ["PENDING", "PROCESSING"].includes(
    normalizedStatus ?? ""
  )
  const isFailedStatus = ["FAILED", "ERROR"].includes(normalizedStatus ?? "")
  const started = useRef(false)
  const [state, setState] = useState<CompletionState>(
    shouldComplete ? "processing" : "idle"
  )
  const [error, setError] = useState<string | null>(null)

  const completeOrder = useCallback(async () => {
    setState("processing")
    setError(null)

    try {
      const cart = await placeOrder()

      // A returned cart means PayOS has not confirmed payment yet.
      if (cart) {
        setState("pending")
      }
    } catch (completeError) {
      setState("error")
      setError(
        completeError instanceof Error
          ? completeError.message
          : "Không thể kiểm tra thanh toán PayOS."
      )
    }
  }, [])

  useEffect(() => {
    if (!shouldComplete || started.current) {
      return
    }

    started.current = true
    void completeOrder()
  }, [completeOrder, shouldComplete])

  if (cancelled || normalizedStatus === "CANCELLED") {
    return (
      <ReturnShell
        icon={<XCircle className="text-ui-fg-error" />}
        title="Thanh toán đã hủy"
        description="Đơn hàng chưa được tạo và giỏ hàng của bạn vẫn được giữ nguyên."
      >
        <LocalizedClientLink href="/checkout?step=payment">
          <Button size="large">Chọn lại phương thức thanh toán</Button>
        </LocalizedClientLink>
      </ReturnShell>
    )
  }

  if (state === "processing") {
    return (
      <ReturnShell
        icon={<ArrowPath className="animate-spin text-ui-fg-interactive" />}
        title="Đang xác nhận thanh toán"
        description="Hệ thống đang kiểm tra giao dịch trực tiếp với PayOS."
      />
    )
  }

  if (state === "pending" || isPendingStatus) {
    return (
      <ReturnShell
        icon={<ArrowPath className="text-ui-fg-interactive" />}
        title="Giao dịch đang được xử lý"
        description="Ngân hàng hoặc PayOS chưa xác nhận hoàn tất. Bạn có thể kiểm tra lại sau vài giây."
      >
        <Button size="large" onClick={completeOrder}>
          Kiểm tra lại thanh toán
        </Button>
      </ReturnShell>
    )
  }

  if (state === "error" || isFailedStatus) {
    return (
      <ReturnShell
        icon={<XCircle className="text-ui-fg-error" />}
        title="Chưa thể hoàn tất đơn hàng"
        description={error ?? "Không thể kiểm tra thanh toán PayOS."}
      >
        <Button size="large" onClick={completeOrder}>
          Thử kiểm tra lại
        </Button>
      </ReturnShell>
    )
  }

  return (
    <ReturnShell
      icon={<CheckCircle className="text-ui-fg-interactive" />}
      title="Quay lại từ PayOS"
      description="Không tìm thấy trạng thái giao dịch trong đường dẫn trả về."
    >
      <LocalizedClientLink href="/checkout?step=payment">
        <Button size="large">Quay lại thanh toán</Button>
      </LocalizedClientLink>
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
      <Container className="flex w-full max-w-xl flex-col items-center gap-y-5 p-8 text-center">
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

export default PayOSReturn
