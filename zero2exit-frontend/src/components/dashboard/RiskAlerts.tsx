'use client'

import {
  AlertTriangle,
  ShieldAlert,
  Swords,
  Cpu,
  DollarSign,
  Scale,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { trpc } from '@/lib/trpc'

type RiskType = 'market' | 'competition' | 'execution' | 'financial' | 'regulatory'

const riskConfig: Record<RiskType, { icon: React.ElementType; label: string; color: string }> = {
  market:      { icon: AlertTriangle, label: 'Market Risk',     color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  competition: { icon: Swords,        label: 'Competition Risk', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  execution:   { icon: Cpu,           label: 'Execution Risk',   color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  financial:   { icon: DollarSign,    label: 'Financial Risk',   color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
  regulatory:  { icon: Scale,         label: 'Regulatory Risk',  color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
}

export function RiskAlerts() {
  const { data, isLoading, error } = trpc.dashboard.getRiskAlerts.useQuery()

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800 rounded-xl py-3 gap-1">
        <CardHeader className="pb-0">
          <Skeleton className="h-4 w-28 bg-slate-800" />
        </CardHeader>
        <CardContent className="space-y-1.5">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full bg-slate-800" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-slate-900 border-slate-800 rounded-xl py-3 gap-1">
        <CardHeader className="pb-0">
          <CardTitle className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> Risk Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-xs">Unable to load risk alerts.</p>
        </CardContent>
      </Card>
    )
  }

  const alerts = (data?.riskAlerts ?? []) as Array<{ type: RiskType; message: string }>

  return (
    <Card className="bg-slate-900 border-slate-800 rounded-xl py-3 gap-1">
      <CardHeader className="pb-0">
        <CardTitle className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5" /> Risk Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-slate-500 text-xs">
            No risk alerts detected. Complete Idea Validation to surface insights.
          </p>
        ) : (
          <div className="space-y-1.5">
            {alerts.map((alert, idx) => {
              const config = riskConfig[alert.type as RiskType] ?? riskConfig.market
              const Icon = config.icon
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 px-2.5 py-1.5 rounded-md border ${config.color}`}
                >
                  <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium opacity-80 leading-tight">{config.label}</p>
                    <p className="text-xs text-slate-300 leading-tight truncate">{alert.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
