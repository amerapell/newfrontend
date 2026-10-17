import type { CSSProperties } from "react";

/**
 * Amerapelle logo — the "A" mark (traced from the brand logo) with the AMERAPELLE wordmark set in
 * Montserrat 700 via --font-logo (the ONLY place Montserrat is used; everything else is Newsreader).
 * Server-safe (no hooks).
 *
 *  variant="lockup"  mark + wordmark on one line (headers, footer, admin)
 *  variant="mark"    the A mark alone (favicons, tight spaces)
 *  variant="stacked" mark over wordmark + "CLOTHING AND ACCESSORIES" tagline (login, link-in-bio)
 *  tone="light"      --on-dark (#fffffa), for imagery, the transparent home header and the --dark footer
 */
type Props = {
  variant?: "lockup" | "mark" | "stacked";
  tone?: "color" | "light";
  /** Mark height in px; the wordmark scales from it. */
  size?: number;
  className?: string;
  title?: string;
};

export const LOGO_NAVY = "#05153c";
export const LOGO_RED = "#c32a2e";
const MARK_VIEWBOX = "11 16 551 467";
const MARK_NAVY = "M 209.835 32.750 C 206.500 39.763, 200.725 52.025, 197.001 60 C 193.278 67.975, 187.754 79.675, 184.727 86 C 181.700 92.325, 169.329 118.425, 157.236 144 C 145.143 169.575, 133.437 194.325, 131.223 199 C 129.010 203.675, 118.994 224.825, 108.967 246 C 98.940 267.175, 89.272 287.650, 87.481 291.500 C 85.690 295.350, 81.025 305.180, 77.113 313.345 C 73.201 321.510, 70 328.326, 70 328.491 C 70 328.656, 66.675 335.701, 62.612 344.146 C 58.549 352.591, 49.493 371.650, 42.488 386.500 C 35.484 401.350, 27.506 418.225, 24.761 424 C 22.015 429.775, 18.694 436.879, 17.380 439.787 L 14.992 445.075 17.246 443.873 C 22.142 441.263, 91.194 396.603, 119.500 377.739 C 136 366.742, 190.225 330.482, 240 297.161 C 289.775 263.839, 359.102 217.434, 394.060 194.038 C 429.018 170.642, 472.070 141.825, 489.732 130 C 512.469 114.777, 521.240 108.401, 519.776 108.161 C 513.198 107.084, 470.413 114.152, 444.500 120.597 C 434.628 123.052, 432.467 123.686, 412.205 130.068 C 406.247 131.944, 401.582 132.929, 401.130 132.405 C 400.701 131.907, 397.375 124.525, 393.740 116 C 386.233 98.394, 364.188 46.890, 357.251 30.750 L 352.631 20 284.265 20 L 215.899 20 209.835 32.750 M 270.825 136.750 C 268.256 141.012, 258.765 156.875, 249.735 172 C 240.704 187.125, 221.273 219.666, 206.555 244.314 C 191.837 268.962, 180.044 289.378, 180.349 289.682 C 180.944 290.278, 190.523 283.654, 244 245.661 C 262.975 232.181, 285.587 216.127, 294.250 209.986 C 302.913 203.846, 310 198.627, 310 198.390 C 310 197.887, 305.551 188.480, 293.497 163.500 C 288.720 153.600, 283.033 141.787, 280.858 137.250 C 278.684 132.713, 276.588 129, 276.200 129 C 275.813 129, 273.394 132.488, 270.825 136.750 M 276.599 334.046 C 269.933 370.482, 246.246 393.773, 206.500 402.973 L 199.500 404.594 211.489 406.861 C 232.007 410.741, 243.432 416.296, 255.096 428.062 C 263.570 436.610, 271.147 450.210, 274.842 463.500 C 275.912 467.350, 277.344 472.525, 278.024 475 L 279.260 479.500 280.658 474.500 C 291.378 436.134, 309.121 417.545, 345.507 406.556 C 357.609 402.902, 358.059 402.686, 354.500 402.259 C 340.190 400.541, 320.504 392.523, 310.524 384.347 C 296.829 373.127, 285.864 354.051, 281.011 333 C 278.954 324.078, 278.399 324.209, 276.599 334.046";
const MARK_RED = "M 426.250 202.774 C 422.813 206.855, 420 210.825, 420 211.597 C 420 212.369, 419.438 213, 418.750 213.001 C 417.277 213.002, 394.384 239.821, 394.750 241.116 C 394.888 241.602, 394.652 241.888, 394.227 241.750 C 393.486 241.510, 386 249.227, 386 250.231 C 386 250.500, 384.538 252.277, 382.750 254.179 C 371.227 266.442, 365.219 274.637, 364.188 279.500 C 360.776 295.596, 362.195 309.733, 368.232 319.785 C 371.658 325.489, 374.315 327.590, 403 347.269 C 409.875 351.985, 416.850 356.813, 418.500 357.997 C 421.230 359.955, 455.503 383.525, 479 399.603 C 484.225 403.178, 496.600 411.684, 506.500 418.504 C 546.801 446.268, 557.168 453.166, 557.737 452.597 C 558.065 452.269, 557.782 452, 557.108 452 C 556.434 452, 556.112 451.628, 556.392 451.174 C 556.673 450.720, 554.852 446.107, 552.345 440.924 C 549.838 435.741, 540.688 416.650, 532.013 398.500 C 508.937 350.227, 494.901 320.888, 489.195 309 C 469.487 267.946, 446.911 220.586, 442.240 210.500 C 436.199 197.456, 434.010 193.617, 433.985 196.027 C 433.975 196.963, 433.702 197.109, 433.235 196.427 C 432.792 195.781, 430.014 198.305, 426.250 202.774";

export function LogoMark({ size = 32, tone = "color", title }: { size?: number; tone?: "color" | "light"; title?: string }) {
  const ink = tone === "light" ? "var(--on-dark)" : LOGO_NAVY;
  const accent = tone === "light" ? "var(--on-dark)" : LOGO_RED;
  return (
    <svg className="logo__mark" viewBox={MARK_VIEWBOX} height={size} width={Math.round((size * 551) / 467)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title} focusable="false">
      <path fillRule="evenodd" fill={ink} d={MARK_NAVY} />
      <path fillRule="evenodd" fill={accent} opacity={tone === "light" ? 0.85 : 1} d={MARK_RED} />
    </svg>
  );
}

export function Logo({ variant = "lockup", tone = "color", size = 30, className = "", title = "Amerapelle" }: Props) {
  const style = { "--logo-size": `${size}px` } as CSSProperties;
  if (variant === "mark") return <span className={`logo logo--mark ${className}`} style={style}><LogoMark size={size} tone={tone} title={title} /></span>;
  return (
    <span className={`logo logo--${variant} logo--${tone} ${className}`} style={style} aria-label={title} role="img">
      <LogoMark size={size} tone={tone} />
      <span className="logo__text" aria-hidden>
        <span className="logo__word">AMERAPELLE</span>
        {variant === "stacked" && <span className="logo__tagline">CLOTHING AND ACCESSORIES</span>}
      </span>
    </span>
  );
}
