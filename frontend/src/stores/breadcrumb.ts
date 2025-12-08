// SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
// SPDX-License-Identifier: GPL-2.0-only
import { create } from 'zustand'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbState {
  items: BreadcrumbItem[]
  hideGlobal: boolean
  setItems: (items: BreadcrumbItem[]) => void
  setHideGlobal: (hide: boolean) => void
  clear: () => void
}

export const useBreadcrumb = create<BreadcrumbState>((set) => ({
  items: [],
  hideGlobal: false,
  setItems: (items: BreadcrumbItem[]) => set({ items }),
  setHideGlobal: (hideGlobal: boolean) => set({ hideGlobal }),
  clear: () => set({ items: [], hideGlobal: false }),
}))
