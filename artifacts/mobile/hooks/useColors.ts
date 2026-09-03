import colors from "@/constants/colors";

/**
 * Always returns dark palette — Pulse Network is a dark-themed admin console.
 * Includes all design tokens plus `radius`.
 */
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
