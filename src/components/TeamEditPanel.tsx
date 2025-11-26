import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createOrgChartFn } from '@/lib/auth-middleware'
import { Prisma } from '@prisma/client'
import { useQuery } from '@tanstack/react-query'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createToast } from 'vercel-toast'
import prisma from '@/db'
import { useRouter } from '@tanstack/react-router'

type RawDeelTeam = {
  id: string
  name: string
  parent: string
}

type DeelTeam = {
  id: string
  name: string
  parent: DeelTeam | null
}

const getDeelTeams = createOrgChartFn({
  method: 'GET',
}).handler(async () => {
  const response = await fetch(`https://api.letsdeel.com/rest/v2/departments`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.DEEL_API_KEY}`,
    },
  })

  const data: { data: RawDeelTeam[] } = await response.json()

  const buildTeam = (team: RawDeelTeam): DeelTeam => {
    const parentTeam = data.data.find(({ name }) => name === team.parent)
    return {
      id: team.id,
      name: team.name,
      parent: parentTeam ? buildTeam(parentTeam) : null,
    }
  }

  return data.data.filter(({ parent }) => parent !== null).map(buildTeam)
})

const updateDeelTeam = createOrgChartFn({
  method: 'POST',
})
  .inputValidator((d: { id: string; team: DeelTeam }) => d)
  .handler(async ({ data: { id, team } }) => {
    const setTeam = async (team: DeelTeam, replaceAll: boolean) => {
      const response = await fetch(
        `https://api.letsdeel.com/rest/v2/people/${id}/department${replaceAll ? '?replace_other_positions=true' : ''}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${process.env.DEEL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              department_id: team.id,
            },
          }),
        },
      )

      const data = await response.json()

      if (response.status !== 200) {
        throw Error(
          `Error from Deel API: ${response.status}: ${JSON.stringify(data)}`,
        )
      }

      if (team.parent) {
        await setTeam(team.parent, false)
      }
    }

    await setTeam(team, true)

    await prisma.deelEmployee.update({
      where: { id },
      data: { team: team.name },
    })

    return 'OK'
  })

type DeelEmployee = Prisma.DeelEmployeeGetPayload<{
  include: {
    employee: {
      select: {
        id: true
        email: true
      }
    }
    manager: {
      select: {
        id: true
        name: true
      }
    }
  }
}>

export function TeamEditPanel({ employee }: { employee: DeelEmployee }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(employee.team)
  const router = useRouter()

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: getDeelTeams,
  })

  const handleSubmit = async () => {
    const team = teams?.find((team) => team.name === value)
    if (!team) return
    await updateDeelTeam({ data: { id: employee.id, team } })
    setDialogOpen(false)
    router.invalidate()
    createToast('Team updated successfully.', {
      timeout: 3000,
    })
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit team</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3">
            <Popover modal={true} open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {value
                    ? teams?.find((team) => team.name === value)?.name
                    : 'Select team...'}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search team..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No team found.</CommandEmpty>
                    <CommandGroup>
                      {teams?.map((team) => (
                        <CommandItem
                          key={team.name}
                          value={team.name}
                          onSelect={(currentValue) => {
                            setValue(currentValue === value ? '' : currentValue)
                            setOpen(false)
                          }}
                        >
                          {team.name}
                          <Check
                            className={cn(
                              'ml-auto',
                              value === team.name ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
