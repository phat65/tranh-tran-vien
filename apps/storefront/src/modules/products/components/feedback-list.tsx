// Component giao diện xử lý phần feedback list trong storefront.

import { listTtvFeedbacks } from "@lib/data/ttv"

type FeedbackListProps = {
  productId: string
}

export default async function FeedbackList({ productId }: FeedbackListProps) {
  const feedbacks = await listTtvFeedbacks(productId, 6)

  if (!feedbacks.length) {
    return null
  }

  return (
    <section className="product-page-constraint">
      <div className="flex flex-col mb-8">
        <span className="text-base-regular text-gray-600 mb-2">
          Customer feedback
        </span>
        <p className="text-2xl-regular text-ui-fg-base">
          Reviews from customers who bought or requested this artwork.
        </p>
      </div>
      <ul className="grid grid-cols-1 small:grid-cols-2 gap-4">
        {feedbacks.map((feedback) => (
          <li
            key={feedback.id}
            className="border border-ui-border-base rounded-rounded p-5 flex flex-col gap-y-3"
          >
            <div className="flex items-center justify-between gap-x-4">
              <span className="txt-small-plus text-ui-fg-base">
                {feedback.customer_name}
              </span>
              <span className="txt-compact-small text-ui-fg-muted">
                {feedback.rating}/5
              </span>
            </div>
            {feedback.content && (
              <p className="txt-small text-ui-fg-subtle leading-6">
                {feedback.content}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
