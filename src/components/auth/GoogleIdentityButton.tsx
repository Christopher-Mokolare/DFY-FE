import { useEffect, useRef, useState } from 'react'

type GoogleCredentialResponse = { credential?: string }
type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string
        callback: (response: GoogleCredentialResponse) => void
        auto_select?: boolean
        cancel_on_tap_outside?: boolean
      }) => void
      renderButton: (parent: HTMLElement, options: {
        theme?: 'outline' | 'filled_blue' | 'filled_black'
        size?: 'large' | 'medium' | 'small'
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
        shape?: 'rectangular' | 'pill' | 'circle' | 'square'
        width?: number
        logo_alignment?: 'left' | 'center'
      }) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentityApi
  }
}

interface Props {
  onCredential: (idToken: string) => void
  mode?: 'signin' | 'signup'
  disabled?: boolean
}

const SCRIPT_ID = 'google-identity-services-script'

export default function GoogleIdentityButton({ onCredential, mode = 'signin', disabled = false }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onCredential)
  const [clientId] = useState(() => (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim())
  const [scriptReady, setScriptReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    callbackRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!clientId) return
    let cancelled = false
    const render = () => {
      if (cancelled || !host.current || !window.google) return
      host.current.replaceChildren()
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: response => {
          const credential = response.credential
          if (!credential) {
            setFailed(true)
            return
          }
          callbackRef.current(credential)
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      window.google.accounts.id.renderButton(host.current, {
        theme: 'outline',
        size: 'large',
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
        shape: 'rectangular',
        width: Math.min(360, host.current.clientWidth || 320),
        logo_alignment: 'left',
      })
      setScriptReady(true)
      setFailed(false)
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (window.google) {
      render()
    } else if (existing) {
      existing.addEventListener('load', render)
      existing.addEventListener('error', () => setFailed(true), { once: true })
    } else {
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = render
      script.onerror = () => setFailed(true)
      document.head.appendChild(script)
    }

    return () => {
      cancelled = true
      existing?.removeEventListener('load', render)
    }
  }, [clientId, mode])

  if (!clientId) {
    return <p className="text-muted text-sm" role="status">Google sign-in is not configured for this staging build.</p>
  }

  return (
    <div>
      <div
        ref={host}
        aria-label={mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
        aria-disabled={disabled || !scriptReady}
        style={{ minHeight: 42, opacity: disabled ? 0.55 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
      />
      {!scriptReady && !failed && <p className="text-muted text-sm" role="status">Loading Google sign-in…</p>}
      {failed && <p className="text-muted text-sm" role="status">Google sign-in could not load. Check your connection and try again.</p>}
    </div>
  )
}
