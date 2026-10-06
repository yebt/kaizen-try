import { answer, useConfirm } from '../lib/confirm'
import { Sheet } from './Sheet'

/** Renders the pending `ask()` dialog, if any. Mounted once in App. */
export function ConfirmHost() {
  const c = useConfirm()
  if (!c) return null
  return (
    <Sheet title="" onClose={() => answer(false)} closeLabel={c.cancel ?? 'Cancel'} className="confirm">
      <div className="stack" style={{ gap: 18 }}>
        <div className="stack" style={{ gap: 8 }}>
          <h2 className="confirm-title">{c.title}</h2>
          {c.body && <div className="confirm-body">{c.body}</div>}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <button className={`btn lg block ${c.danger ? 'danger-fill' : 'primary'}`} onClick={() => answer(true)} autoFocus>
            {c.confirm}
          </button>
          <button className="btn lg block ghost" onClick={() => answer(false)}>
            {c.cancel ?? 'Cancel'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
