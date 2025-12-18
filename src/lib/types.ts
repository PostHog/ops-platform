export type HierarchyNode = {
  id: string
  name: string
  title: string
  team?: string
  employeeId?: string
  workEmail?: string | null
  children: HierarchyNode[]
}
