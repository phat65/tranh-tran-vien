// Khai báo type TypeScript dùng chung cho icon.

export type IconProps = {
  color?: string
  size?: string | number
} & React.SVGAttributes<SVGElement>
