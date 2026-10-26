import Image from "next/image";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({
  size = 32,
  className = "",
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/logo.jpg"
      alt="ContextHub logo"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-xl object-cover shadow-sm ring-1 ring-black/5 ${className}`}
    />
  );
}
