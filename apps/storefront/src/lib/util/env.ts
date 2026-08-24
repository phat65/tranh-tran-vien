// Hàm tiện ích xử lý env dùng chung trong storefront.

export const getBaseURL = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"
}
