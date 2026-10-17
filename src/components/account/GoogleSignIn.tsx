"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { isUsingMocks } from "@/lib/api";
import { USE_MOCKS } from "@/lib/env";

/** Set at build time; the button only renders when it is configured (or in mock mode). */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
export const GOOGLE_ENABLED = !!GOOGLE_CLIENT_ID || USE_MOCKS;

type GsiButtonOptions = { type: "standard"; theme: "outline"; size: "large"; text: "continue_with"; shape: "rectangular"; width: number; logo_alignment: "left" };
type Gsi = {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential?: string }) => void; ux_mode?: "popup"; auto_select?: boolean; cancel_on_tap_outside?: boolean }) => void;
      renderButton: (el: HTMLElement, o: GsiButtonOptions) => void;
      prompt: () => void;
    };
  };
};
declare global {
  interface Window {
    google?: Gsi;
  }
}

/**
 * "Continue with Google" drawn as the design system's secondary button (1px ink border, 48px, serif 14px).
 * Google Identity Services' own button is rendered invisibly on top so the click opens Google's real popup
 * and returns an ID token (`credential`) — that is what POST /auth/google verifies.
 * In mock mode there is no Google round trip: the click resolves with a mock credential.
 */
export function GoogleSignIn({ onCredential, disabled }: { onCredential: (credential: string) => void; disabled?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const cb = useRef(onCredential);
  cb.current = onCredential;
  const [ready, setReady] = useState(false);
  const mocks = USE_MOCKS;

  const mount = useCallback(() => {
    const g = window.google?.accounts?.id;
    const box = host.current;
    const layer = overlay.current;
    if (!g || !box || !layer || mocks) return;
    g.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (r) => r.credential && cb.current(r.credential),
      ux_mode: "popup",
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    // GIS caps its button at 400px: render at the box width (≤400) and stretch the invisible layer to cover ours.
    const width = Math.min(400, Math.max(200, Math.round(box.clientWidth)));
    layer.innerHTML = "";
    g.renderButton(layer, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width, logo_alignment: "left" });
    layer.style.transform = `scale(${box.clientWidth / width}, ${box.clientHeight / 40})`;
    setReady(true);
  }, [mocks]);

  useEffect(() => {
    if (window.google?.accounts?.id) mount();
    const box = host.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    let last = box.clientWidth;
    const ro = new ResizeObserver(() => {
      if (Math.abs(box.clientWidth - last) > 4) {
        last = box.clientWidth;
        mount();
      }
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, [mount]);

  if (!GOOGLE_CLIENT_ID && !mocks) return null;

  return (
    <div ref={host} className={`cm-google${disabled ? " is-disabled" : ""}`}>
      {!mocks && <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={mount} />}
      <button
        type="button"
        className="btn btn--secondary btn--block cm-google__face"
        disabled={disabled}
        // Only reached when Google's layer is absent (mock mode, or the script was blocked).
        onClick={() => (isUsingMocks() ? cb.current("mock-google-credential") : window.google?.accounts?.id.prompt())}
        tabIndex={ready ? -1 : 0}
        aria-hidden={ready ? true : undefined}
      >
        <GoogleMark />
        <span>Continue with Google</span>
      </button>
      {!mocks && <div ref={overlay} className="cm-google__gsi" aria-label="Continue with Google" />}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="cm-or" role="separator" aria-label="or">
      <span>or</span>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
