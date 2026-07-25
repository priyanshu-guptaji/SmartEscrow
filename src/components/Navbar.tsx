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
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#070a13]/70 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
                <LockIcon className="text-white" size={18} />
              </div>
              <span className="font-sans text-xl font-bold tracking-tight text-white">
                Smart<span className="text-gradient">Escrow</span>
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
                  className={`text-sm font-medium transition-colors hover:text-white ${
                    isLinkActive(link.href) ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <Link
              href="/dashboard"
              className="glow-btn flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-violet-700 transition-all"
            >
              Launch App
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-white/5 hover:text-white focus:outline-none"
            >
              {isOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-b border-white/[0.06] bg-[#070a13]/95 px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`block rounded-lg px-3 py-2 text-base font-medium transition-colors ${
                isLinkActive(link.href)
                  ? 'bg-indigo-500/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-2">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-md shadow-indigo-500/10"
            >
              Launch App
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
