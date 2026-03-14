import { redirect } from "next/navigation"

export default function LegacySignInRedirect({
  params,
}: {
  params: { locale: string }
}) {
  const locale = params.locale ?? "en"
  redirect(`/${locale}/login`)
}

