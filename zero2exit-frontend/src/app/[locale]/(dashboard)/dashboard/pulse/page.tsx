import { PulsePage } from "@/components/pulse/PulsePage"
import { DashboardProductShell } from "@/lib/dashboard-product-shell"

export default function DashboardPulsePage() {
  return (
    <DashboardProductShell>
      <PulsePage />
    </DashboardProductShell>
  )
}
