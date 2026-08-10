// Hàm tiện ích xử lý repeat dùng chung trong storefront.

const repeat = (times: number) => {
  return Array.from(Array(times).keys())
}

export default repeat
