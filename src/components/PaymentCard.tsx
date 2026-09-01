'use client';

import React from 'react';
import Link from 'next/link';
import { Payment } from '@/types/payment';
import { ClockIcon, CheckCircleIcon, CancelIcon, LockIcon, ArrowUpRightIcon } from './Icons';

interface PaymentCardProps {
  payment: Payment;
}

export default function PaymentCard({ payment }: PaymentCardProps) {
  const getStatusStyle = (status: Payment['status']) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          icon: <CheckCircleIcon size={12} />,
        };
      case 'cancelled':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-800',
          icon: <CancelIcon size={12} />,
        };
      case 'active':
        return {
          bg: 'bg-blue-50 border-blue-200 text-[#0a4d94]',
          icon: <LockIcon size={12} />,
        };
      case 'pending':
      default:
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          icon: <ClockIcon size={12} />,
        };
    }
  };

  const statusStyle = getStatusStyle(payment.status);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="surface-card rounded-lg p-5 flex flex-col justify-between relative">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 border border-slate-200 font-bold text-xs text-slate-800">
              {payment.token}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 font-mono">
                {payment.amount} {payment.token}
              </p>
              <p className="text-xs text-slate-500 font-medium capitalize">
                {payment.type} escrow
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${statusStyle.bg}`}>
            {statusStyle.icon}
            <span className="capitalize">{payment.status}</span>
          </span>
        </div>

        <div className="space-y-1 mb-3">
          <span className="text-xs text-slate-500 font-medium">Recipient</span>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span className="font-semibold text-slate-900">{payment.receiverName}</span>
            <span className="font-mono text-slate-500 truncate text-[11px]">{payment.receiverAddress}</span>
          </div>
        </div>

        <div className="space-y-1 surface-inset rounded-md p-3 mb-4 min-h-[72px]">
          <span className="text-xs text-slate-700 font-semibold flex items-center gap-1">
            <ArrowUpRightIcon size={12} className="text-[#0a4d94]" />
            Release condition
          </span>
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3" title={payment.condition}>
            {payment.condition}
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 mt-auto flex items-center justify-between gap-4">
        <span className="text-xs text-slate-500">
          Created {formatDate(payment.createdAt)}
        </span>

        {payment.status === 'active' && (
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/payments/${payment.id}`}
              className="text-xs font-medium text-slate-600 hover:text-rose-700 transition-colors px-2 py-1 rounded"
              title="Refund payment"
            >
              Refund
            </Link>
            <Link
              href={`/dashboard/payments/${payment.id}`}
              className="btn-primary rounded-md px-3 py-1.5 text-xs font-semibold shadow-xs"
            >
              Release Funds
            </Link>
          </div>
        )}

        {payment.status === 'completed' && payment.releaseDate && (
          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
            Released {formatDate(payment.releaseDate)}
          </span>
        )}

        {payment.status === 'cancelled' && payment.releaseDate && (
          <span className="text-xs text-rose-700 font-semibold flex items-center gap-1">
            Refunded {formatDate(payment.releaseDate)}
          </span>
        )}
      </div>
    </div>
  );
}
