// Cấu hình middleware backend cho API cần body parser, auth hoặc xử lý request riêng.

import { defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/uploads",
      methods: ["POST"],
      bodyParser: {
        sizeLimit: "50mb",
      },
    },
    {
      matcher: "/admin/uploads/*",
      methods: ["POST"],
      bodyParser: {
        sizeLimit: "50mb",
      },
    },
    {
      matcher: "/store/tranh-tran-vien/custom-wall/uploads",
      methods: ["POST"],
      bodyParser: {
        sizeLimit: "12mb",
      },
    },
  ],
})
