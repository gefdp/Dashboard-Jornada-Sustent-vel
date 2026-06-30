export function ct(dark: boolean) {
  return {
    legendText:    dark ? "#9be9df" : "#31544d",
    axisLabel:     dark ? "#8deadd" : "#55706c",
    axisLabelBold: dark ? "#9be9df" : "#31544d",
    splitLine:     dark ? "rgba(31,202,184,0.1)"  : "#dcece7",
    splitLineSoft: dark ? "rgba(31,202,184,0.08)" : "#e5f1ed",
    axisLine:      dark ? "rgba(31,202,184,0.15)" : "#cde9e1",
    rightLabel:    dark ? "#c8fff4" : "#1a4d44",
    dimmedBar:     dark ? "#1a3530" : "#d8e1de",
    // Visual map (legend box)
    vmBg:     dark ? "rgba(6,31,28,0.92)" : "rgba(255,255,255,0.85)",
    vmBorder: dark ? "rgba(31,202,184,0.22)" : "#dceee9",
    vmText:   dark ? "#9be9df" : "#31544d",
    // Map areas
    mapBorder:    dark ? "rgba(31,202,184,0.18)" : "rgba(255,255,255,0.9)",
    mapBaseArea:  dark ? "#0d2b27" : "#e0f0eb",
    // Pie chart
    pieLabel:     dark ? "#c8fff4" : "#244d45",
    pieLabelLine: dark ? "rgba(31,202,184,0.45)" : "#9bbdb7",
    pieBorder:    dark ? "rgba(10,30,26,1)" : "#ffffff",
  };
}
