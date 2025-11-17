interface LevelStepDisplayProps {
  level: number
  step: number
  size?: 'sm' | 'lg'
}

export function LevelStepDisplay({
  level,
  step,
  size = 'lg',
}: LevelStepDisplayProps) {
  const numberSize = size === 'lg' ? 'text-xl' : 'text-base'
  const labelSize = size === 'lg' ? 'text-xs' : 'text-[10px]'
  const separatorSize = size === 'lg' ? 'text-2xl' : 'text-lg'

  return (
    <div className="flex justify-end gap-2">
      <div>
        <div className={`${numberSize} font-bold`}>
          {level === 1 ? '1.0' : level}
        </div>
        <div className={`${labelSize} text-gray-500 text-center`}>level</div>
      </div>
      <div className={`${separatorSize} text-gray-300`}>/</div>
      <div>
        <div className={`${numberSize} font-bold`}>{step}</div>
        <div className={`${labelSize} text-gray-500 text-center`}>step</div>
      </div>
    </div>
  )
}
