type ContentJsonProps = {
  value: unknown
}

type ContentBlock = {
  type?: string
  text?: string
  title?: string
  content?: string
}

const ContentJson = ({ value }: ContentJsonProps) => {
  if (!value) {
    return null
  }

  if (typeof value === "string") {
    return <p className="whitespace-pre-line">{value}</p>
  }

  if (isRecord(value) && Array.isArray(value.blocks)) {
    return (
      <div className="flex flex-col gap-4">
        {(value.blocks as ContentBlock[]).map((block, index) => (
          <ContentBlockView block={block} key={index} />
        ))}
      </div>
    )
  }

  return (
    <pre className="overflow-auto rounded border bg-ui-bg-subtle p-4 text-small-regular text-ui-fg-subtle">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function ContentBlockView({ block }: { block: ContentBlock }) {
  const text = block.text ?? block.content ?? ""

  if (block.type === "heading") {
    return <h2 className="txt-xlarge-plus">{block.title ?? text}</h2>
  }

  if (block.type === "quote") {
    return (
      <blockquote className="border-l pl-4 text-ui-fg-subtle">
        {text}
      </blockquote>
    )
  }

  return <p className="whitespace-pre-line">{text}</p>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

export default ContentJson
