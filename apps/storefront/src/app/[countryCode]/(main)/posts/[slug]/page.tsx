// Trang route storefront render màn hình countryCode / (main) / posts / slug.

import { retrieveTtvPost } from "@lib/data/ttv"
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
  const post = await retrieveTtvPost(slug)

  if (!post) {
    return {}
  }

  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
  }
}

export default async function TtvPostRoute({ params }: Props) {
  const { slug } = await params
  const post = await retrieveTtvPost(slug)

  if (!post) {
    notFound()
  }

  return (
    <main className="content-container py-16">
      <article className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <h1 className="txt-compact-xlarge-plus">{post.title}</h1>
          {post.excerpt && (
            <p className="text-base-regular text-ui-fg-subtle">
              {post.excerpt}
            </p>
          )}
        </header>
        {post.cover_image_url && (
          <img
            alt={post.title}
            className="aspect-[16/9] w-full object-cover"
            src={post.cover_image_url}
          />
        )}
        <div className="text-base-regular text-ui-fg-base">
          <ContentJson value={post.content_json} />
        </div>
      </article>
    </main>
  )
}
