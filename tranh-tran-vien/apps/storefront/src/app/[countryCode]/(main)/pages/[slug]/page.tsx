import { retrieveTtvPage } from "@lib/data/ttv"
import ContentJson from "@modules/ttv/components/content-json"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await retrieveTtvPage(slug)

  if (!page) {
    return {}
  }

  return {
    title: page.seo_title ?? page.title,
    description: page.seo_description ?? undefined,
  }
}

export default async function TtvPageRoute({ params }: Props) {
  const { slug } = await params
  const page = await retrieveTtvPage(slug)

  if (!page) {
    notFound()
  }

  return (
    <main className="content-container py-16">
      <article className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="txt-compact-xlarge-plus">{page.title}</h1>
        </header>
        <div className="text-base-regular text-ui-fg-base">
          <ContentJson value={page.content_json} />
        </div>
      </article>
    </main>
  )
}
