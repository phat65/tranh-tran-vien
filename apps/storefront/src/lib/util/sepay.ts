type SePayCheckoutForm = {
  checkoutUrl: string
  fields: Record<string, string>
}

export const getSePayCheckoutForm = (
  checkoutUrl: unknown,
  checkoutFields: unknown
): SePayCheckoutForm | null => {
  if (
    typeof checkoutUrl !== "string" ||
    !checkoutFields ||
    typeof checkoutFields !== "object" ||
    Array.isArray(checkoutFields)
  ) {
    return null
  }

  let url: URL

  try {
    url = new URL(checkoutUrl)
  } catch {
    return null
  }

  if (url.protocol !== "https:") {
    return null
  }

  const fields = Object.entries(checkoutFields).reduce<Record<string, string>>(
    (result, [name, value]) => {
      if (
        name &&
        (typeof value === "string" || typeof value === "number")
      ) {
        result[name] = String(value)
      }

      return result
    },
    {}
  )

  if (!Object.keys(fields).length) {
    return null
  }

  return {
    checkoutUrl: url.toString(),
    fields,
  }
}

export const submitSePayCheckout = (
  checkoutUrl: unknown,
  checkoutFields: unknown
): boolean => {
  const checkout = getSePayCheckoutForm(checkoutUrl, checkoutFields)

  if (
    !checkout ||
    typeof document === "undefined" ||
    typeof HTMLFormElement === "undefined"
  ) {
    return false
  }

  const form = document.createElement("form")
  form.method = "POST"
  form.action = checkout.checkoutUrl
  form.acceptCharset = "UTF-8"
  form.hidden = true

  Object.entries(checkout.fields).forEach(([name, value]) => {
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = name
    input.value = value
    form.appendChild(input)
  })

  document.body.appendChild(form)
  HTMLFormElement.prototype.submit.call(form)
  form.remove()

  return true
}
