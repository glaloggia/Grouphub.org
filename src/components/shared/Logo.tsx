
import { Users } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
}

export function Logo({ size = 'md', href }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };
  const finalHref = href || '/';

  return (
    <Link href={finalHref} className={`flex items-center gap-2 group group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:gap-0`}>
      <Users className={`text-primary group-hover:text-accent transition-colors duration-300 ${size === 'sm' ? 'h-6 w-6' : size === 'lg' ? 'h-8 w-8' : 'h-7 w-7'}`} />
      <h1 className={`font-headline font-bold ${sizeClasses[size]} text-foreground group-hover:text-accent transition-colors duration-300 group-data-[collapsible=icon]:hidden`}>
        GroupHub
      </h1>
    </Link>
  );
}
