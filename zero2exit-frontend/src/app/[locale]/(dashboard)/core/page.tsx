import { redirect } from "next/navigation"

/** Short URL: /en/core → /en/dashboard/core (avoids 404 when linked without /dashboard). */
export default async function CoreShortcutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard/core`)
}
