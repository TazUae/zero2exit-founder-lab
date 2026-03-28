import { redirect } from "next/navigation"

/** Short URL: /en/pulse → /en/dashboard/pulse */
export default async function PulseShortcutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard/pulse`)
}
