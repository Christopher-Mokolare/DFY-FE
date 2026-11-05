import { useEffect, useRef, useState } from 'react'
import { identityVerificationApi } from '../../api'

const SUMSUB_WEBSDK_SCRIPT = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js'

type SdkInstance = {
  withConf: (configuration: Record<string, unknown>) => SdkInstance
  withOptions: (options: Record<string, unknown>) => SdkInstance
  on: (eventName: string, callback: (payload?: unknown) => void) => SdkInstance
  build: () => { destroy?: () => void }
}

type SdkGlobal = {
  init: (accessToken: string, refreshToken: () => Promise<string>) => SdkInstance
}

declare global {
  interface Window {
    snsWebSdk?: SdkGlobal
  }
}

let sdkScriptPromise: Promise<void> | null = null

function loadSumsubSdk(): Promise<void> {
  if (window.snsWebSdk) return Promise.resolve()
  if (sdkScriptPromise) return sdkScriptPromise

  const scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SUMSUB_WEBSDK_SCRIPT}"]`)
    const script = existing || document.createElement('script')
    script.src = SUMSUB_WEBSDK_SCRIPT
    script.async = true
    script.onload = () => window.snsWebSdk ? resolve() : reject(new Error('Verification widget failed to initialize.'))
    script.onerror = () => reject(new Error('The verification widget could not be loaded. Check your connection and try again.'))
    if (!existing) document.head.appendChild(script)
  }).catch((error: unknown): never => {
    sdkScriptPromise = null
    throw error
  })
  sdkScriptPromise = scriptPromise

  return scriptPromise
}

export interface SumsubVerificationWidgetProps {
  handoffCode: string
  onSubmitted?: () => void
  onClose?: () => void
}

export default function SumsubVerificationWidget({
  handoffCode,
  onSubmitted,
  onClose,
}: SumsubVerificationWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<{ destroy?: () => void } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const callbacksRef = useRef({ onSubmitted })
  callbacksRef.current = { onSubmitted }

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      setLoading(true)
      setError('')
      try {
        const tokenResponse = await identityVerificationApi.exchange(handoffCode)
        const apiBody = tokenResponse.data
        const response = apiBody?.data || apiBody
        if (apiBody?.success === false || !response?.accessToken) {
          throw new Error(apiBody?.message || response?.message || 'A verification session could not be opened.')
        }

        await loadSumsubSdk()
        if (cancelled) return
        if (!window.snsWebSdk || !containerRef.current) {
          throw new Error('The verification widget is unavailable in this browser.')
        }

        const instance = window.snsWebSdk
          .init(response.accessToken, async () => {
            const refreshed = await identityVerificationApi.refresh()
            const refreshBody = refreshed.data
            const refreshData = refreshBody?.data || refreshBody
            if (refreshBody?.success === false || !refreshData?.accessToken) {
              throw new Error(refreshBody?.message || refreshData?.message || 'This verification session could not be refreshed. Return to your account and check its status.')
            }
            return refreshData.accessToken as string
          })
          .withConf({ lang: 'en' })
          .withOptions({ addViewportTag: false, adaptIframeHeight: true })
          .on('idCheck.onApplicantSubmitted', () => {
            if (cancelled) return
            setSubmitted(true)
            callbacksRef.current.onSubmitted?.()
          })
          .on('idCheck.onApplicantStatusChanged', () => {
            if (cancelled) return
            callbacksRef.current.onSubmitted?.()
          })
          .on('idCheck.onError', () => {
            if (!cancelled) setError('The verification provider reported an issue. Your account remains protected; return to your profile for the current status.')
          })
          .build()

        instanceRef.current = instance
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'The verification session could not be opened.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void initialize()
    return () => {
      cancelled = true
      instanceRef.current?.destroy?.()
      instanceRef.current = null
    }
  }, [handoffCode])

  return (
    <section className="section-card" aria-live="polite">
      <div className="section-header">
        <h3>Runner identity verification</h3>
        {onClose && <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>}
      </div>
      <p className="text-muted text-sm">
        Complete the provider's identity document and liveness steps in this secure window. DoForYou receives the verification result, not a copy of the captured images or raw provider payload.
      </p>
      {loading && <p role="status">Preparing secure verification…</p>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {submitted && (
        <div className="alert alert-info" role="status">
          Verification was submitted. Runner access stays locked until the backend receives and validates the provider's final result.
        </div>
      )}
      <div ref={containerRef} id="sumsub-websdk-container" style={{ minHeight: 280, width: '100%' }} />
    </section>
  )
}
