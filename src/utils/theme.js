/**
 * Convierte el color de marca de un centro (hex) en una rampa de 10 pasos y la
 * inyecta como variables CSS. Tailwind lee "brand-*" desde estas variables
 * (ver tailwind.config.js), asi cada centro tiene su propia identidad visual
 * sin recompilar el frontend.
 */
function hexToHsl(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgbString(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(f(0) * 255), g = Math.round(f(8) * 255), b = Math.round(f(4) * 255);
  return `${r} ${g} ${b}`;
}

const LIGHTNESS_STEPS = { 50: 96, 100: 92, 200: 84, 300: 72, 400: 60, 500: 48, 600: 40, 700: 32, 800: 24, 900: 16 };

export function applyBrandColor(hex) {
  if (!hex) return;
  try {
    const [h, s] = hexToHsl(hex);
    Object.entries(LIGHTNESS_STEPS).forEach(([step, l]) => {
      document.documentElement.style.setProperty(`--brand-${step}`, hslToRgbString(h, Math.max(s, 35), l));
    });
  } catch {
    // color invalido: se ignora y se mantiene la marca por defecto
  }
}
