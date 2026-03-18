export const dynamic = 'force-dynamic'

import { redirect } from "next/navigation"

export default function HomePage({
  params,
}: {
  params: { locale: string }
}) {
  const locale = params.locale ?? "en"
  redirect(`/${locale}/dashboard`)
}

