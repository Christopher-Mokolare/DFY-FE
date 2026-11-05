import { useEffect } from 'react'

/**
 * Sets route-specific metadata for public pages in the client-rendered app.
 * Static document defaults remain in index.html for first response and fallbacks.
 */
export function usePageMetadata(title: string, description: string) {
  useEffect(() => {
    const fullTitle = title.includes('DoForYou') ? title : `${title} | DoForYou`
    document.title = fullTitle

    const setMeta = (selector: string, attribute: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      if (!element) {
        element = document.createElement('meta')
        const [key, name] = selector.match(/\[(name|property)="([^"]+)"\]/)?.slice(1) ?? []
        if (key && name) element.setAttribute(key, name)
        document.head.appendChild(element)
      }
      element.setAttribute(attribute, value)
    }

    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[property="og:title"]', 'content', fullTitle)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[name="twitter:title"]', 'content', fullTitle)
    setMeta('meta[name="twitter:description"]', 'content', description)
  }, [title, description])
}
