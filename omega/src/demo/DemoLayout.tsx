import { DemoApiBridge } from './DemoApiBridge'
import { DemoProvider } from './DemoContext'
import { DemoShell } from './DemoShell'

export function DemoLayout() {
  return (
    <DemoProvider>
      <DemoApiBridge>
        <DemoShell />
      </DemoApiBridge>
    </DemoProvider>
  )
}
