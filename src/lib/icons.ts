import type { Group } from '@/engine'
import {
  Banknote,
  Bitcoin,
  Building2,
  Car,
  ChartCandlestick,
  CircleDollarSign,
  CreditCard,
  Handshake,
  House,
  Landmark,
  Layers,
  type LucideIcon,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  SquareParking,
  TrendingUp,
  Wallet,
} from 'lucide-react'

export const GROUP_ICONS: Record<Group, LucideIcon> = {
  cash: Wallet,
  investment: TrendingUp,
  fixed: House,
  restricted: ShieldCheck,
  other: Layers,
  liability: CreditCard,
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  checking: Landmark,
  wallet: Wallet,
  wechatBalance: Wallet,
  alipayBalance: Wallet,
  mmf: PiggyBank,
  deposit: Banknote,
  stock: ChartCandlestick,
  fund: TrendingUp,
  bond: ReceiptText,
  crypto: Bitcoin,
  home: House,
  rental: Building2,
  parking: SquareParking,
  car: Car,
  hpf: ShieldCheck,
  pension: PiggyBank,
  loaned: Handshake,
  mortgage: House,
  carLoan: Car,
  creditCard: CreditCard,
  familyLoan: Handshake,
}

export const categoryIcon = (id: string): LucideIcon => CATEGORY_ICONS[id] ?? CircleDollarSign
