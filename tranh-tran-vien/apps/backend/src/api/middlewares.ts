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
  ],
})
