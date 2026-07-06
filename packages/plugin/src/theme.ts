// Only the colors that differ between modes. Badges/health/trace stay constant (spec §4).
export const edgeStroke = (dark: boolean) => (dark ? "#4a4a50" : "#cfcfcf");
export const bgDots = (dark: boolean) => (dark ? "#26262a" : "#e6e6e6");
