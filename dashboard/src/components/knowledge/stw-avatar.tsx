type StwAvatarProps = {
  size?: number;
  className?: string;
};

export function StwAvatar({ size = 32, className }: StwAvatarProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 512 512"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="24" y="24" width="464" height="464" rx="96" fill="#19191d" />
      <rect x="70" y="120" width="372" height="278" rx="36" fill="#f3f3f1" />
      <circle cx="206" cy="294" r="114" fill="#c9d67a" />
      <circle cx="206" cy="294" r="62" fill="#f3f3f1" />
      <circle cx="206" cy="294" r="30" fill="#c9d67a" />
      <circle cx="360" cy="296" r="72" fill="#19191d" />
      <circle cx="336" cy="206" r="20" fill="#19191d" />
      <circle cx="388" cy="206" r="20" fill="#19191d" />
      <circle cx="336" cy="206" r="8" fill="#f3f3f1" />
      <circle cx="388" cy="206" r="8" fill="#f3f3f1" />
    </svg>
  );
}
