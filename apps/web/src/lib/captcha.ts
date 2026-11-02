// hCaptcha through Web3Forms' client script, shared by the feedback form and the chat.
// The script renders every `.h-captcha[data-captcha]` box on the page, so it loads once,
// the first time either form opens.
let loading: Promise<boolean> | undefined;

export function loadCaptcha(): Promise<boolean> {
  if (!loading) {
    loading = new Promise((resolve) => {
      if (matchMedia('(prefers-color-scheme: dark)').matches) {
        document.querySelectorAll<HTMLElement>('.h-captcha').forEach((el) => { el.dataset.theme = 'dark'; });
      }
      const s = document.createElement('script');
      s.src = 'https://web3forms.com/client/script.js';
      s.async = true; s.defer = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.append(s);
    });
  }
  return loading;
}

/** The solved token inside one captcha box ('' until the visitor passes the check). */
export const captchaToken = (box: Element | null) =>
  box?.querySelector<HTMLTextAreaElement>('[name="h-captcha-response"]')?.value ?? '';

/** Tokens work once: clear this box after each send. */
export function resetCaptcha(box: Element | null) {
  const id = box?.querySelector('iframe')?.getAttribute('data-hcaptcha-widget-id');
  try { (window as any).hcaptcha?.reset(id ?? undefined); } catch {}
}
