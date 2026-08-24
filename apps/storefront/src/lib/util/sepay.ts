export type SePayQrDetails = {
  qrCodeUrl: string
  bankAccount: string
  bankCode: string
  accountHolder: string
  transferContent: string
  amount: number
}

export const getSePayQrDetails = (
  checkoutFields: unknown,
): SePayQrDetails | null => {
  if (
    !checkoutFields ||
    typeof checkoutFields !== "object" ||
    Array.isArray(checkoutFields)
  ) {
    return null
  }

  const fields = checkoutFields as Record<string, unknown>
  const qrCodeUrl = readString(fields.qr_code_url)
  const bankAccount = readString(fields.bank_account)
  const bankCode = readString(fields.bank_code)
  const transferContent = readString(fields.transfer_content)
  const accountHolder = readString(fields.account_holder)
  const amount = Number(fields.order_amount)

  try {
    const url = new URL(qrCodeUrl)

    if (
      url.protocol !== "https:" ||
      url.hostname !== "vietqr.app" ||
      !bankAccount ||
      !bankCode ||
      !transferContent ||
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      return null
    }
  } catch {
    return null
  }

  return {
    qrCodeUrl,
    bankAccount,
    bankCode,
    accountHolder,
    transferContent,
    amount,
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}
