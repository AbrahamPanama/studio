import Link from 'next/link';
import Image from 'next/image';
import logo from '@/logo.png';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image
                src={logo}
                alt="VA OMS Logo"
                width={40}
                height={40}
                className="h-10 w-10"
            />
            <span className="font-bold sm:inline-block text-2xl">
              VA OMS
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
