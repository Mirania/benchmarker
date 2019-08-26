import * as console from '../extras/console-colors';

export const failed = console.format({ text: "ruby" }, "Failed.");
export const gray = (n: any) => console.format({ text: "gray" }, n);
export const asynctrue = console.format({ text: "gray" }, "async");
export const logfailed = console.format({text: "ruby"}, "Failed");
export const logsucceeded = console.format({ text: "leaf" }, "Succeeded");
export const logmixed = console.format({ text: "yellow" }, "Mixed results");
export const grayemphasis = (n: any) => console.format({ text: "gray"}, "'" + n + "'");
export const check = console.format({ text: "leaf" }, "S");
export const cross = console.format({ text: "ruby" }, "F");
export const blueemphasis = (n: any) => console.format({ text: "cyan" }, "'" + n + "'");
export const warning = console.format({ text: "yellow" }, "Warning:");