import { redirect } from "next/navigation"

export default async function LegacyRoadmapPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard/roadmap`)
}
