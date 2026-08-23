// Helper admin chuẩn hóa text và cấu hình hiển thị Tranh Trần Viền.

import { useTranslation } from "react-i18next"

const TTV_ADMIN_NAMESPACE = "ttvAdmin"
let resourcesRegistered = false

type I18nLike = {
  addResourceBundle: (
    language: string,
    namespace: string,
    resources: Record<string, string>,
    deep?: boolean,
    overwrite?: boolean
  ) => void
}

const viTranslations: Record<string, string> = {
  "Action completed": "Đã hoàn tất thao tác",
  Actions: "Thao tác",
  active: "đang bật",
  archived: "đã lưu trữ",
  Archive: "Lưu trữ",
  Approve: "Duyệt",
  approved: "đã duyệt",
  "Brand ID": "ID thương hiệu",
  "Brand created": "Đã tạo thương hiệu",
  brands: "thương hiệu",
  Brand: "Thương hiệu",
  "Catalog request failed": "Yêu cầu catalog thất bại",
  Cancel: "Hủy",
  "Category ID": "ID danh mục",
  Code: "Mã",
  "Content JSON must be an object": "Content JSON phải là object",
  "Content JSON, for example {\"blocks\":[]}":
    "Content JSON, ví dụ {\"blocks\":[]}",
  Content: "Nội dung",
  Customer: "Khách hàng",
  "Customer name": "Tên khách hàng",
  "Create brand": "Tạo thương hiệu",
  "Create feedback": "Tạo feedback",
  "Create item": "Tạo mục",
  "Create menu": "Tạo menu",
  "Create page": "Tạo trang",
  "Create post": "Tạo bài viết",
  "Create setting": "Tạo cài đặt",
  "Create taxonomy": "Tạo taxonomy",
  "Create term": "Tạo term",
  "Delete this record?": "Xóa bản ghi này?",
  Delete: "Xóa",
  Description: "Mô tả",
  draft: "nháp",
  Edit: "Sửa",
  "Edit page": "Sửa trang",
  "Edit post": "Sửa bài viết",
  "Edit feedback": "Sửa feedback",
  "Entity ID": "ID đối tượng",
  "Ends at": "Kết thúc lúc",
  Excerpt: "Tóm tắt",
  "Failed to create brand": "Tạo thương hiệu thất bại",
  "Failed to create feedback": "Tạo feedback thất bại",
  "Failed to create item": "Tạo mục thất bại",
  "Failed to create menu": "Tạo menu thất bại",
  "Failed to create page": "Tạo trang thất bại",
  "Failed to create post": "Tạo bài viết thất bại",
  "Failed to create setting": "Tạo cài đặt thất bại",
  "Failed to create taxonomy": "Tạo taxonomy thất bại",
  "Failed to create term": "Tạo term thất bại",
  "Failed to delete": "Xóa thất bại",
  "Failed to load business data": "Tải dữ liệu business thất bại",
  "Failed to load catalog": "Tải catalog thất bại",
  "Failed to update": "Cập nhật thất bại",
  false: "không",
  Fee: "Phí",
  Free: "Miễn phí",
  Feedback: "Feedback",
  feedbacks: "feedback",
  "Feedback created": "Đã tạo feedback",
  "Feedback updated": "Đã cập nhật feedback",
  Group: "Nhóm",
  hidden: "ẩn",
  hide: "ẩn",
  Key: "Khóa",
  "Label": "Nhãn",
  Link: "Liên kết",
  "Maximum quantity": "Số lượng tối đa",
  Min: "Tối thiểu",
  "Manage custom business data that extends Medusa commerce core.":
    "Quản lý dữ liệu kinh doanh riêng mở rộng trên nền Medusa.",
  "Manage custom catalog data around Medusa products. Product, variant, price, collection, and category still stay in Medusa core.":
    "Quản lý dữ liệu catalog riêng xung quanh sản phẩm Medusa. Product, variant, price, collection và category vẫn thuộc Medusa core.",
  Menus: "Menu",
  "Minimum quantity": "Số lượng tối thiểu",
  Modules: "Module",
  Name: "Tên",
  "Navigation item created": "Đã tạo mục menu",
  "Navigation menu created": "Đã tạo menu",
  "New brand": "Thương hiệu mới",
  "New feedback": "Feedback mới",
  "New menu item": "Mục menu mới",
  "New menu": "Menu mới",
  "New page": "Trang mới",
  "New post": "Bài viết mới",
  "New setting": "Cài đặt mới",
  "New taxonomy term": "Term taxonomy mới",
  "New taxonomy": "Taxonomy mới",
  "No parent": "Không có mục cha",
  "No records yet.": "Chưa có bản ghi.",
  Order: "Đơn hàng",
  "Order ID": "ID đơn hàng",
  Page: "Trang",
  "Page created": "Đã tạo trang",
  "Page updated": "Đã cập nhật trang",
  pages: "trang",
  "Page type": "Loại trang",
  Parent: "Cha",
  "Parent brand": "Thương hiệu cha",
  "Parent item": "Mục cha",
  "Parent term": "Term cha",
  pending_review: "chờ duyệt",
  Post: "Bài viết",
  "Post created": "Đã tạo bài viết",
  "Post updated": "Đã cập nhật bài viết",
  posts: "bài viết",
  Priority: "Độ ưu tiên",
  private: "riêng tư",
  Product: "Sản phẩm",
  "Product ID": "ID sản phẩm",
  Public: "Công khai",
  public: "công khai",
  Publish: "Xuất bản",
  published: "đã xuất bản",
  Quantity: "Số lượng",
  "Rating": "Đánh giá",
  "Record deleted": "Đã xóa bản ghi",
  Records: "Bản ghi",
  Refresh: "Tải lại",
  Reject: "Từ chối",
  rejected: "đã từ chối",
  "Save feedback": "Lưu feedback",
  "Save page": "Lưu trang",
  "Save post": "Lưu bài viết",
  Scope: "Phạm vi",
  Settings: "Cài đặt",
  "SEO description": "Mô tả SEO",
  "SEO title": "Tiêu đề SEO",
  show: "hiện",
  Slug: "Slug",
  Sort: "Thứ tự",
  "Sort order": "Thứ tự sắp xếp",
  "Starts at": "Bắt đầu lúc",
  Status: "Trạng thái",
  "Status updated": "Đã cập nhật trạng thái",
  Tables: "Bảng",
  Taxonomies: "Taxonomy",
  Taxonomy: "Taxonomy",
  taxonomies: "taxonomy",
  "Taxonomy term created": "Đã tạo term taxonomy",
  "Taxonomy term ID": "ID term taxonomy",
  terms: "term",
  Title: "Tiêu đề",
  true: "có",
  Type: "Loại",
  Value: "Giá trị",
  "Value JSON or text": "Giá trị JSON hoặc text",
  Visibility: "Hiển thị",
  "Visibility updated": "Đã cập nhật hiển thị",
  visible: "hiện",
  yes: "có",
  no: "không",
  all: "tất cả",
  product: "sản phẩm",
  category: "danh mục",
  brand: "thương hiệu",
  taxonomy: "taxonomy",
  url: "url",
  ID: "ID",
  Menu: "Menu",
  "Please fill required field": "Hay dien truong bat buoc",
  "Please choose required field": "Hay chon truong bat buoc",
  "Please enter a valid number": "Hay nhap dung dinh dang so",
  "Please enter a positive number": "Hay nhap so lon hon 0",
  "Choose menu": "Chon menu",
  "Choose taxonomy": "Chon taxonomy",
  "Saved records": "Ban ghi da luu",
  Sections: "Muc",
  "Maximum quantity must be greater than or equal to minimum quantity":
    "Maximum quantity phai lon hon hoac bang minimum quantity",
  "Rating must be between 1 and 5": "Rating phai nam trong khoang 1 den 5",
  "Brand examples: Hoa Phat, imported canvas supplier, or artist/source name. Leave parent empty for a top-level brand.":
    "Vi du brand: Hoa Phat, nha cung cap canvas nhap khau, hoac ten hoa si/nguon tranh. De khong co cha neu day la brand cap goc.",
  "No parent means this record is a root item. Choose a parent only when you want a nested group.":
    "Khong co muc cha nghia la ban ghi cap goc. Chi chon parent khi muon tao nhom long nhau.",
  "Sort order controls display order. Smaller numbers show first; 0 is fine for default.":
    "Sort order dung de sap xep hien thi. So nho hon hien truoc; de 0 neu dung mac dinh.",
  "Taxonomy is a product attribute group, for example style, material, room, subject, or frame type.":
    "Taxonomy la nhom thuoc tinh san pham, vi du phong cach, chat lieu, phong treo, chu de, hoac loai khung.",
  "A term is one value inside a taxonomy, for example Modern inside Style or Canvas inside Material.":
    "Term la mot gia tri ben trong taxonomy, vi du Hien dai trong Phong cach hoac Canvas trong Chat lieu.",
  "Choose which taxonomy this term belongs to.":
    "Chon taxonomy ma term nay thuoc ve.",
  "Use code main for the storefront side menu/header and footer for footer links.":
    "Dung code main cho menu chinh/header storefront va footer cho cac link footer.",
  "Menu item is one visible link in a menu. URL uses the URL field; product/category/brand/taxonomy/page/post use Entity ID.":
    "Menu item la mot link hien tren menu. Loai URL dung truong URL; product/category/brand/taxonomy/page/post dung Entity ID.",
  "No parent means this link is shown at the top level. Choose a parent to make it a child link.":
    "Khong co muc cha nghia la link nam o cap goc. Chon parent neu muon no la link con.",
  "Entity ID is the Medusa or TTV record id/slug depending on link type. For page/post, use the slug.":
    "Entity ID la id hoac slug cua ban ghi Medusa/TTV tuy loai link. Voi page/post, dung slug.",
  "Settings are simple key/value options used by storefront, for example site_name, brand_name, or footer_text.":
    "Setting la cac tuy chon key/value storefront dung, vi du site_name, brand_name, hoac footer_text.",
  "Plain text is accepted. JSON is only needed for structured values.":
    "Co the nhap text binh thuong. JSON chi can khi gia tri co cau truc.",
  "Collection": "Collection",
  collection: "collection",
  Current: "Hien tai",
  "No options available": "Chua co lua chon nao",
  "Assign custom brand and taxonomy data for storefront filters.":
    "Gan brand va taxonomy tuy chinh de dung cho bo loc storefront.",
  "Catalog links saved": "Da luu lien ket catalog",
  "Failed to save links": "Luu lien ket that bai",
  Brands: "Thuong hieu",
  "Primary brand": "Thuong hieu chinh",
  "No primary brand": "Khong co thuong hieu chinh",
  "No active brands.": "Chua co thuong hieu active.",
  "Taxonomy terms": "Taxonomy term",
  "No active taxonomy terms.": "Chua co taxonomy term active.",
  "Save catalog links": "Luu lien ket catalog",
  "Product metadata and storefront": "Mo rong san pham va storefront",
  "Medusa still owns products, categories, collections, options, variants, prices, and inventory. This page only manages extra product labels and storefront content.":
    "Product, category, collection, option, variant, gia va ton kho van nam trong Medusa. Trang nay chi quan ly nhan phu cho san pham va noi dung storefront.",
  "TTV product metadata": "Thong tin phu TTV cho san pham",
  "Assign extra brand and attribute labels to this Medusa product.":
    "Gan thuong hieu va nhan thuoc tinh phu cho san pham Medusa nay.",
  "Use brand when you need an extra label such as artist, supplier, or product line. Do not use it for Medusa collections or categories.":
    "Dung brand khi can nhan phu nhu artist, nha cung cap, hoac dong san pham. Khong dung thay collection/category cua Medusa.",
  "Attribute groups are extra storefront labels such as style, room, subject, or frame type. Medusa product options still stay in the product editor.":
    "Nhom thuoc tinh la nhan phu cho storefront nhu phong cach, phong treo, chu de, hoac loai khung. Product options cua Medusa van nam trong trang sua san pham.",
  "Attribute values are choices inside a group, for example Modern inside Style or Living room inside Room.":
    "Gia tri thuoc tinh la lua chon trong mot nhom, vi du Hien dai trong Phong cach hoac Phong khach trong Phong treo.",
  "Menu items are storefront links. Use URL for a direct link, or choose product/category/brand/attribute/page/post and enter the matching id or slug.":
    "Menu item la link storefront. Dung URL cho link truc tiep, hoac chon product/category/brand/attribute/page/post roi dien id hoac slug tuong ung.",
  "Shop operations": "Van hanh shop",
  "Manage feedback, posts, and pages.":
    "Quan ly danh gia, bai viet va trang noi dung.",
  "Product brands": "Thuong hieu phu",
  "Product attribute groups": "Nhom thuoc tinh phu",
  "Product attribute values": "Gia tri thuoc tinh phu",
  "Storefront menus": "Menu storefront",
  "Storefront settings": "Cau hinh storefront",
  "Operations feedback": "Danh gia",
  "Operations posts": "Bai viet",
  "Operations pages": "Trang noi dung",
  "Business database overview": "Tong quan database business",
  Module: "Module",
  "No module overview yet. Records below can still load independently.":
    "Chua co tong quan module. Cac ban ghi ben duoi van co the load rieng.",
  schema_ready: "Schema ready",
  "Feedback becomes visible on product pages only after status is approved and product ID matches.":
    "Feedback chi hien tren trang san pham khi status approved va Product ID khop.",
  "Rating is a number from 1 to 5.": "Rating la so tu 1 den 5.",
  "Published posts are visible on the storefront posts pages. Slug is used in the URL.":
    "Post published se hien tren storefront. Slug duoc dung trong URL.",
  "Content JSON is optional. Leave empty for simple title/excerpt content.":
    "Content JSON la tuy chon. De trong neu chi can title/excerpt.",
  "Published pages are visible at storefront page URLs. Slug is used in the URL.":
    "Page published se hien tai URL storefront. Slug duoc dung trong URL.",
  "Content JSON is optional. Leave empty for simple static page content.":
    "Content JSON la tuy chon. De trong neu chi can trang noi dung don gian.",
}

export function useTtvAdminTranslation() {
  const { t, i18n } = useTranslation(TTV_ADMIN_NAMESPACE)
  registerTtvAdminTranslations(i18n)

  return (text: string): string => {
    return t(text)
  }
}

function registerTtvAdminTranslations(i18n: I18nLike): void {
  if (resourcesRegistered) {
    return
  }

  i18n.addResourceBundle(
    "vi",
    TTV_ADMIN_NAMESPACE,
    viTranslations,
    true,
    true
  )
  resourcesRegistered = true
}
