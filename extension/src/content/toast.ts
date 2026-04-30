let lastToastUrl: string | null = null;
let lastToastAt = 0;

export function shouldShowToast(
  url: string,
  now: () => number = () => Date.now(),
  cooldownMs = 2500
): boolean {
  const timestamp = now();
  const canShow = lastToastUrl !== url || timestamp - lastToastAt >= cooldownMs;

  if (canShow) {
    lastToastUrl = url;
    lastToastAt = timestamp;
  }

  return canShow;
}

export function renderRoastToast(input: {
  message: string;
  subline: string;
  durationMs?: number;
}): void {
  document.querySelector("[data-shame-toast]")?.remove();

  const toast = document.createElement("aside");
  toast.dataset.shameToast = "true";
  toast.setAttribute("role", "status");
  toast.innerHTML = `
    <style>${styles}</style>
    <strong>${escapeHtml(input.message)}</strong>
    <span>${escapeHtml(input.subline)}</span>
  `;

  document.documentElement.append(toast);

  const removeToast = () => {
    toast.classList.add("stweb-toast--leaving");
    window.setTimeout(() => toast.remove(), 220);
  };

  window.setTimeout(removeToast, input.durationMs ?? 2500);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character] ?? character;
  });
}

const styles = `
  [data-shame-toast] {
    position: fixed;
    top: 18px;
    right: 18px;
    z-index: 2147483647;
    display: grid;
    gap: 4px;
    max-width: min(360px, calc(100vw - 36px));
    padding: 12px 14px;
    border: 1px solid rgba(120, 53, 15, 0.18);
    border-radius: 16px;
    background: #1f160f;
    color: #fff8ef;
    box-shadow: 0 18px 60px rgba(31, 22, 15, 0.28);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    line-height: 1.3;
    animation: stweb-toast-in 180ms ease-out;
  }

  [data-shame-toast] strong {
    font-size: 14px;
  }

  [data-shame-toast] span {
    color: #f2d7b5;
    font-size: 12px;
  }

  .stweb-toast--leaving {
    opacity: 0;
    transform: translateY(-6px);
    transition: opacity 180ms ease, transform 180ms ease;
  }

  @keyframes stweb-toast-in {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
