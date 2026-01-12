
'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';


export default function Header() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center pl-10">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-4">
            <Image src="/logo.png" alt="VA OMS Logo" width={40} height={40} />
            <span className="font-bold sm:inline-block text-2xl">
              VA OMS 0.15
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          <Button asChild variant="ghost">
            <Link href="/inventory">{t('navInventory')}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/workload">{t('navWorkload')}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/reports">{t('navReports')}</Link>
          </Button>

          <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'es')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t('language')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}
