import { CorePage } from "@/components/core/CorePage"
import { DashboardProductShell } from "@/lib/dashboard-product-shell"

export default function DashboardCorePage() {
  return (
    <DashboardProductShell>
      <CorePage />
    </DashboardProductShell>
  )
}
