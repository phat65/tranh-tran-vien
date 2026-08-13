// Trang route storefront render màn hình countryCode / (main) / posts.

import { listTtvPosts } from "@lib/data/ttv"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Posts",
  description: "Latest published posts",
}

export default async function PostsPage() {
  const posts = await listTtvPosts(24)

  return (
    <div className="content-container py-16 small:py-24">
      <div className="mb-10">
        <h1 className="text-3xl-semi text-ui-fg-base">Posts</h1>
      </div>

      {posts.length > 0 ? (
        <ul className="grid grid-cols-1 small:grid-cols-2 medium:grid-cols-3 gap-6">
          {posts.map((post) => (
            <li
              key={post.id}
              className="border border-ui-border-base rounded-rounded overflow-hidden"
            >
              {post.cover_image_url && (
                <img
                  src={post.cover_image_url}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                />
              )}
              <div className="p-5 flex flex-col gap-y-3">
                <h2 className="txt-large-plus text-ui-fg-base">
                  <LocalizedClientLink
                    href={`/posts/${post.slug}`}
                    className="hover:text-ui-fg-subtle"
                  >
                    {post.title}
                  </LocalizedClientLink>
                </h2>
                {post.excerpt && (
                  <p className="txt-small text-ui-fg-subtle leading-6">
                    {post.excerpt}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="txt-small text-ui-fg-muted">No published posts yet.</p>
      )}
    </div>
  )
}
