import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image
              src="https://i.ibb.co/wJMyC6V/logito.png"
              alt="VA cards & crafts logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="font-bold sm:inline-block">
              VA cards &amp; crafts
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
