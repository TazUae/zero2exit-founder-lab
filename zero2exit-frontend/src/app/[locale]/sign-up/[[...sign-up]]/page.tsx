import { redirect } from "next/navigation"

export default function LegacySignUpRedirect({
  params,
}: {
  params: { locale: string }
}) {
  const locale = params.locale ?? "en"
  redirect(`/${locale}/register`)
}

