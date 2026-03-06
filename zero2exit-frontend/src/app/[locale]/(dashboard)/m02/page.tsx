import { redirect } from "next/navigation"

export default async function LegacyM02Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard/m02`)
}
