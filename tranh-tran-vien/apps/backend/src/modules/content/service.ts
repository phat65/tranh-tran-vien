import { MedusaService } from "@medusajs/framework/utils"

import Page from "./models/page"
import Post from "./models/post"

class ContentModuleService extends MedusaService({
  Page,
  Post,
}) {
  async publishPost(id: string, publishedAt = new Date()) {
    const [post] = await this.updatePosts({
      selector: { id },
      data: {
        status: "published",
        published_at: publishedAt,
      },
    })

    return post
  }

  async archivePost(id: string) {
    const [post] = await this.updatePosts({
      selector: { id },
      data: {
        status: "archived",
      },
    })

    return post
  }

  async publishPage(id: string, publishedAt = new Date()) {
    const [page] = await this.updatePages({
      selector: { id },
      data: {
        status: "published",
        published_at: publishedAt,
      },
    })

    return page
  }

  async archivePage(id: string) {
    const [page] = await this.updatePages({
      selector: { id },
      data: {
        status: "archived",
      },
    })

    return page
  }
}

export default ContentModuleService
