export function formatWinMethod(method: string): string {
  switch (method) {
    case "ko_tko":             return "KO/TKO";
    case "submission":         return "SUB";
    case "decision_unanimous": return "UD";
    case "decision_split":     return "SD";
    case "decision_majority":  return "MD";
    default:                   return method;
  }
}
