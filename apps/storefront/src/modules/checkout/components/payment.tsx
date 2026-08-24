"use client"
// Component giao diện xử lý phần payment trong storefront.

import { RadioGroup } from "@headlessui/react"
import { isPayOS, isSePay, isStripeLike, paymentInfoMap } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import { getPayOSCheckoutUrl } from "@lib/util/payos"
import { getSePayQrDetails } from "@lib/util/sepay"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer, {
  StripeCardContainer,
} from "@modules/checkout/components/payment-container"
import Divider from "@modules/common/components/divider"
import {
  Button,
  Container,
  Heading,
  Text,
  clx,
} from "@modules/common/components/ui"
import { HttpTypes } from "@medusajs/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: HttpTypes.StoreCart
  availablePaymentMethods: { id: string }[]
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession) => paymentSession.status === "pending",
  )

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardBrand, setCardBrand] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? "",
  )
  const [localPaymentSession, setLocalPaymentSession] =
    useState<HttpTypes.StorePaymentSession | null>(activeSession ?? null)
  const [sePayCheckoutFields, setSePayCheckoutFields] = useState<unknown>(
    activeSession && isSePay(activeSession.provider_id)
      ? activeSession.data?.checkout_fields
      : null,
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "payment"
  const currentPaymentSession = localPaymentSession ?? activeSession

  const setPaymentMethod = async (method: string) => {
    setError(null)
    setSelectedPaymentMethod(method)
    if (isStripeLike(method) || isSePay(method)) {
      const hasUsableCurrentSession =
        currentPaymentSession?.provider_id === method &&
        (!isSePay(method) ||
          Boolean(
            getSePayQrDetails(
              currentPaymentSession.data?.checkout_fields,
            ),
          ))

      if (hasUsableCurrentSession) {
        if (isSePay(method)) {
          setSePayCheckoutFields(
            currentPaymentSession.data?.checkout_fields ?? null,
          )
        }
        return
      }

      setIsLoading(true)

      try {
        const { payment_collection } = await initiatePaymentSession(cart, {
          provider_id: method,
        })
        const session = payment_collection.payment_sessions?.find(
          (candidate) => candidate.provider_id === method,
        )
        setLocalPaymentSession(session ?? null)

        if (isSePay(method)) {
          setSePayCheckoutFields(session?.data?.checkout_fields ?? null)
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error))
      } finally {
        setIsLoading(false)
      }
    }
  }

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards &&
    ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])
      ?.length > 0 &&
    cart?.total === 0
  )

  const paymentReady =
    (currentPaymentSession && (cart?.shipping_methods?.length ?? 0) !== 0) ||
    paidByGiftcard

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams],
  )

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const shouldInputCard =
        isStripeLike(selectedPaymentMethod) && !currentPaymentSession

      const checkActiveSession =
        currentPaymentSession?.provider_id === selectedPaymentMethod &&
        (!isSePay(selectedPaymentMethod) ||
          Boolean(
            getSePayQrDetails(
              currentPaymentSession.data?.checkout_fields,
            ),
          ))

      let paymentSession = currentPaymentSession

      if (!checkActiveSession) {
        const { payment_collection } = await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
        })

        paymentSession = payment_collection.payment_sessions?.find(
          (session) => session.provider_id === selectedPaymentMethod,
        )
        setLocalPaymentSession(paymentSession ?? null)
      }

      if (isPayOS(selectedPaymentMethod)) {
        const checkoutUrl = getPayOSCheckoutUrl(
          paymentSession?.data?.checkout_url,
        )

        if (!checkoutUrl) {
          throw new Error("Không tạo được liên kết PayOS. Vui lòng thử lại.")
        }

        window.location.assign(checkoutUrl)
        return
      }

      if (isSePay(selectedPaymentMethod)) {
        const checkoutFields =
          paymentSession?.data?.checkout_fields ?? sePayCheckoutFields
        const qrDetails = getSePayQrDetails(checkoutFields)

        if (!qrDetails) {
          throw new Error("Không tạo được mã QR SePay. Vui lòng thử lại.")
        }

        setSePayCheckoutFields(checkoutFields)
        return router.push(
          pathname + "?" + createQueryString("step", "review"),
          { scroll: false },
        )
      }

      if (!shouldInputCard) {
        return router.push(
          pathname + "?" + createQueryString("step", "review"),
          {
            scroll: false,
          },
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  useEffect(() => {
    setLocalPaymentSession(activeSession ?? null)

    if (activeSession) {
      setSelectedPaymentMethod(activeSession.provider_id)

      if (isSePay(activeSession.provider_id)) {
        setSePayCheckoutFields(activeSession.data?.checkout_fields ?? null)
      }
    }
  }, [activeSession])

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && !paymentReady,
            },
          )}
        >
          Payment
          {!isOpen && paymentReady && <CheckCircleSolid />}
        </Heading>
        {!isOpen && paymentReady && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-payment-button"
            >
              Edit
            </button>
          </Text>
        )}
      </div>
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {!paidByGiftcard && availablePaymentMethods?.length && (
            <>
              <RadioGroup
                value={selectedPaymentMethod}
                onChange={(value: string) => setPaymentMethod(value)}
              >
                {availablePaymentMethods.map((paymentMethod) => (
                  <div key={paymentMethod.id}>
                    {isStripeLike(paymentMethod.id) ? (
                      <StripeCardContainer
                        paymentProviderId={paymentMethod.id}
                        selectedPaymentOptionId={selectedPaymentMethod}
                        paymentInfoMap={paymentInfoMap}
                        setCardBrand={setCardBrand}
                        setError={setError}
                        setCardComplete={setCardComplete}
                      />
                    ) : (
                      <PaymentContainer
                        paymentInfoMap={paymentInfoMap}
                        paymentProviderId={paymentMethod.id}
                        selectedPaymentOptionId={selectedPaymentMethod}
                      >
                        {isSePay(paymentMethod.id) &&
                        selectedPaymentMethod === paymentMethod.id ? (
                          <SePayQrPanel
                            checkoutFields={
                              sePayCheckoutFields ??
                              (currentPaymentSession?.provider_id ===
                              paymentMethod.id
                                ? currentPaymentSession.data?.checkout_fields
                                : null)
                            }
                          />
                        ) : null}
                      </PaymentContainer>
                    )}
                  </div>
                ))}
              </RadioGroup>
            </>
          )}

          {paidByGiftcard && (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                Payment method
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                Gift card
              </Text>
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          <Button
            size="large"
            className="mt-6"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={
              (isStripeLike(selectedPaymentMethod) && !cardComplete) ||
              (!selectedPaymentMethod && !paidByGiftcard)
            }
            data-testid="submit-payment-button"
          >
            {!currentPaymentSession && isStripeLike(selectedPaymentMethod)
              ? " Enter card details"
              : isPayOS(selectedPaymentMethod)
                ? "Thanh toán qua PayOS"
                : isSePay(selectedPaymentMethod)
                  ? getSePayQrDetails(sePayCheckoutFields)
                    ? "Tiếp tục sau khi quét QR"
                    : "Thanh toán qua SePay"
                  : "Continue to review"}
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && currentPaymentSession ? (
            <div className="flex items-start gap-x-1 w-full">
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Payment method
                </Text>
                <Text
                  className="txt-medium text-ui-fg-subtle"
                  data-testid="payment-method-summary"
                >
                  {paymentInfoMap[currentPaymentSession.provider_id]?.title ||
                    currentPaymentSession.provider_id}
                </Text>
              </div>
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Payment details
                </Text>
                <div
                  className="flex gap-2 txt-medium text-ui-fg-subtle items-center"
                  data-testid="payment-details-summary"
                >
                  <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
                    {paymentInfoMap[selectedPaymentMethod]?.icon || (
                      <CreditCard />
                    )}
                  </Container>
                  <Text>
                    {isStripeLike(selectedPaymentMethod) && cardBrand
                      ? cardBrand
                      : isPayOS(currentPaymentSession.provider_id)
                        ? "Quét mã QR hoặc chuyển khoản trên PayOS"
                        : isSePay(currentPaymentSession.provider_id)
                          ? "Quét mã QR hoặc chuyển khoản trên SePay"
                          : "Another step will appear"}
                  </Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                Payment method
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                Gift card
              </Text>
            </div>
          ) : null}
        </div>
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default Payment

function SePayQrPanel({ checkoutFields }: { checkoutFields: unknown }) {
  const details = getSePayQrDetails(checkoutFields)

  if (!details) {
    return (
      <div className="mt-4 grid min-h-52 place-items-center rounded-lg border border-ui-border-base bg-ui-bg-subtle p-6 text-center">
        <div className="grid gap-2">
          <span className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-ui-border-base border-t-[#5f8f16]" />
          <Text className="text-small-regular font-semibold">
            Đang tạo mã QR thanh toán...
          </Text>
          <Text className="text-xsmall-regular text-ui-fg-subtle">
            Mã QR sẽ hiển thị trực tiếp tại đây, không chuyển sang trang khác.
          </Text>
        </div>
      </div>
    )
  }

  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(details.amount)

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-ui-border-base bg-white shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
      <div className="grid small:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="grid content-between gap-6 bg-[#10131a] p-5 text-white">
          <div className="grid gap-5">
            <div>
              <Text className="text-xsmall-regular uppercase tracking-[0.12em] text-white/60">
                Thanh toán an toàn
              </Text>
              <Text className="mt-1 text-large-semi text-white">SePay QR</Text>
            </div>
            <PaymentSummary label="Nhà cung cấp" value="SePay" />
            <PaymentSummary label="Số tiền" value={formattedAmount} />
            <PaymentSummary
              label="Mã thanh toán"
              value={details.transferContent}
            />
          </div>
          <Text className="text-xsmall-regular leading-5 text-white/60">
            Không đóng trang này cho tới khi ngân hàng xác nhận giao dịch.
          </Text>
        </aside>

        <section className="grid min-w-0 place-items-center gap-4 p-5 text-center small:p-7">
          <div>
            <span className="inline-flex rounded-full bg-[#e9f5d8] px-3 py-1 text-xsmall-regular font-semibold text-[#4f7c13]">
              TRẢ TIỀN BẰNG QR
            </span>
            <Text className="mt-3 text-large-semi text-ui-fg-base">
              Quét mã để thanh toán
            </Text>
          </div>

          <div className="rounded-lg border border-ui-border-base bg-white p-3 shadow-sm">
            <Image
              src={details.qrCodeUrl}
              alt="Mã QR thanh toán SePay"
              width={280}
              height={280}
              unoptimized
              className="aspect-square w-full max-w-[280px] object-contain"
            />
          </div>

          <div className="grid w-full max-w-md gap-2 rounded-lg bg-ui-bg-subtle p-4 text-left">
            <PaymentDetail label="Ngân hàng" value={details.bankCode} />
            <PaymentDetail label="Số tài khoản" value={details.bankAccount} />
            {details.accountHolder ? (
              <PaymentDetail
                label="Chủ tài khoản"
                value={details.accountHolder}
              />
            ) : null}
            <PaymentDetail
              label="Nội dung"
              value={details.transferContent}
            />
          </div>

          <div className="flex items-center justify-center gap-2 text-small-regular text-ui-fg-subtle">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#7fb51d]" />
            Đang chờ ngân hàng xác nhận...
          </div>
          <Text className="max-w-md text-xsmall-regular leading-5 text-ui-fg-subtle">
            Mở ứng dụng ngân hàng, quét QR và giữ nguyên số tiền cùng nội dung
            chuyển khoản.
          </Text>
        </section>
      </div>
    </div>
  )
}

function PaymentSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-t border-white/10 pt-3">
      <Text className="text-xsmall-regular text-white/55">{label}</Text>
      <Text className="mt-1 break-words text-small-regular font-semibold text-white">
        {value}
      </Text>
    </div>
  )
}

function PaymentDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 grid-cols-[96px_minmax(0,1fr)] gap-3">
      <Text className="text-small-regular text-ui-fg-subtle">{label}</Text>
      <Text className="break-words text-small-regular font-semibold">
        {value}
      </Text>
    </div>
  )
}
