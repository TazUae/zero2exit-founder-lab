import React from "react"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import { TrpcProvider } from "@/components/providers/TrpcProvider"

const locales = ["en", "ar"]

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!locales.includes(locale)) notFound()

  const messages = await getMessages()
  const isRTL = locale === "ar"

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <TrpcProvider>{children}</TrpcProvider>
      <Toaster position="top-right" />
    </NextIntlClientProvider>
  )
}
