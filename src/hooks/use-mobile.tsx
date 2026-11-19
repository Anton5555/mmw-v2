import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

const getSnapshot = () => window.innerWidth < MOBILE_BREAKPOINT
const getServerSnapshot = () => false

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

const HOVER_NONE_QUERY = "(hover: none)"

function subscribeHoverNone(onChange: () => void) {
  const mql = window.matchMedia(HOVER_NONE_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

const getHoverNoneSnapshot = () => window.matchMedia(HOVER_NONE_QUERY).matches

/**
 * True on devices that can't hover (phones, tablets). Use it to choose
 * between tap and hover UI; viewport width doesn't tell you that.
 */
export function useIsTouch() {
  return React.useSyncExternalStore(subscribeHoverNone, getHoverNoneSnapshot, getServerSnapshot)
}
