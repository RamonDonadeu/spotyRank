type ChevronLeftIconProps = {
  size?: number
  className?: string
}

export function ChevronLeftIcon({ size = 18, className }: ChevronLeftIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
    </svg>
  )
}
