export type HierarchyNode = {
  id: string
  name: string
  title: string
  team?: string
  employeeId?: string
  workEmail?: string | null
  startDate?: Date | null
  hiringPriority?: 'low' | 'medium' | 'high'
  hasActivePerformanceProgram?: boolean
  children: HierarchyNode[]
  childrenCount?: {
    active: number
    pending: number
    planned: number
  }
}
