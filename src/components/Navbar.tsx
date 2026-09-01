'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LockIcon, MenuIcon, CloseIcon } from './Icons';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isLinkActive = (path: string) => {
    return pathname === path;
  };

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0a4d94] text-white shadow-sm transition-transform group-hover:scale-105">
                <LockIcon className="text-white" size={18} />
              </div>
              <span className="font-heading text-xl font-bold tracking-tight text-slate-900">
                Smart<span className="text-[#0a4d94]">Escrow</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-[#0a4d94] ${
                    isLinkActive(link.href) ? 'text-[#0a4d94] font-semibold' : 'text-slate-600'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <Link
              href="/dashboard"
              className="btn-primary flex h-10 items-center justify-center rounded-md px-5 text-sm font-semibold shadow-sm"
            >
              Open Console
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none"
            >
              {isOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-4 space-y-3 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`block rounded-md px-3 py-2 text-base font-medium transition-colors ${
                isLinkActive(link.href)
                  ? 'bg-slate-100 text-[#0a4d94] font-semibold'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-2">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="btn-primary flex h-11 w-full items-center justify-center rounded-md text-sm font-semibold shadow-sm"
            >
              Open Console
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
