export function microTime(): number {
    let t = process.hrtime();
    return t[0] * 1e6 + t[1]/1000;
}

export function microTimeDiff(lastMicroTime: number): number {
    return microTime() - lastMicroTime;
}

export function microTimeLog(microTime: number): string {
    if (microTime<1000)
        return (microTime / 1e6).toFixed(6)+" secs (" + (microTime/1000).toFixed(3) + " ms)";
    else
        return (microTime/1e6).toFixed(3) + " secs";
}

export function graph(values: number[], barinfo: {name: string, success: number}[], title: string): string {
    let width = 300+values.length*140;
    let max = Math.max(...values);
    let xcol = (pos: number) => 170 + 140 * pos;
    let ycol = (val: number) => Math.floor(450 - 2025 / 6 * (val / max));

    //canvas
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="600">`;
    //bars
    for (let i = 0; i < values.length; i++) {
        let startx = xcol(i), starty = ycol(values[i]);
        svg += `<rect x="${startx}"` +
               ` y="${starty}" width="50" height="${450-starty}" style="fill:` +
               ` ${successToColor(barinfo, i)};"/>`;
        if (barinfo.length > i) 
            svg += `<text x="${startx}" y="${i%2===0 ? 475 : 500}" fill="black" font-size="1.1em"` +
                   ` font-weight="bold">${barinfo[i].name}</text>`;
    }
    //bar connectors
    for (let i = 0; i < values.length-1; i++) {
        let startx = xcol(i), starty = ycol(values[i]);
        svg += `<path d="M${startx + 25} ${starty} L${startx + 165} ${ycol(values[i + 1])}"` +
            ` stroke = "black" stroke-width="1.2" fill = "none" />`;
    }
    //axises
    svg += `<path d="M135 45 L135 450 L${width-170} 450" stroke = "black" stroke-width="3" fill = "none" />`;
    for (let i = 1; i <= 5; i++) {
        let py = Math.floor(405*i/6)+45;
        svg += `<path d="M125 ${py} L145 ${py}" stroke = "black" stroke-width="3" fill = "none" />`;
        svg += `<text x="45" y="${py}" fill="black" font-size="1.1em"` +
            ` font-weight="bold">${decimalToString(max*(6-i)/5)}</text>`;
    }
    //axis arrows and titles
    svg += `<path d="M125 55 L135 45 L145 55" stroke = "black" stroke-width="3" fill = "none" />`;
    svg += `<text x="80" y="30" fill="black" font-size="1.1em" font-weight="bold">Time (seconds)</text>`;
    svg += `<path d="M${width-180} 440 L${width-170} 450 L${width-180} 460"` +
           ` stroke = "black" stroke-width="3" fill = "none" />`;
    svg += `<text x="${width-160}" y="455" fill="black" font-size="1.1em" font-weight="bold">Functions</text>`;
    //graph title
    svg += `<text x="45" y="575" fill="black" font-size="1.5em" font-weight="bold">` +
           `→ Graph for the group '${title}'</text>`;

    svg += '</svg>';
    return svg;
}

function decimalToString(n: number): string {
    //n is in microseconds
    let s = n/1e6;
    if (s < 0.001) return parseFloat(s.toFixed(6)).toString(); //under 1ms? 6 decimals max, trim useless 0s
    if (s < 1000) return parseFloat(s.toFixed(3)).toString(); //under 1000s? 3 decimals max, trim useless 0s
    return parseFloat(s.toFixed(1)).toString(); //1 decimal max, trim useless 0s
}

function successToColor(barinfo: { name: string, success: number }[], pos: number): string {
    if (barinfo.length <= pos) return "lightslategray";
    if (barinfo[pos].success === 1) return "mediumseagreen";
    if (barinfo[pos].success === 0) return "goldenrod";
    else return "indianred";
}