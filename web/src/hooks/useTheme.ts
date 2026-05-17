import { useThemeStore } from "@/store/themeStore";

export function useTheme() {
  const { theme, setTheme } = useThemeStore();

  return { theme, setTheme };
}
