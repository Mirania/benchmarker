import * as m from './metrics';
import * as cx from './coloring';
import { writeFile } from 'fs';

let execGroupCount = 0;

type FunctionWithOpts = { 
    function: Function, 
    group: string, //for graphs
    executionCount: number, 
    executionGroup: number, //for averages
    name: string 
};

type ExecutionLog = {
    meta: FunctionWithOpts,
    async: boolean,
    completed: boolean,
    time: number
};

let beforeAll: Function[] = [];
let before: Function[] = [];
let tests: FunctionWithOpts[] = [];
let after: Function[] = [];
let afterAll: Function[] = [];

export function runBeforeAllTests(functions: Function[]): void {
    beforeAll = functions;
}

export function runBeforeTest(functions: Function[]): void {
    before = functions;
}

export function runTests(functions: (Function | 
    {function: Function, group?: string, executionCount?: number, name?: string})[]): void {

    for (let fn of functions) {
        try {
            let meta = extractMeta(fn);
            for (let i=0;i<meta.executionCount;i++) tests.push(meta);
        } catch (e) {
            throw e;
        }
    }
}

export function runAfterTest(functions: Function[]): void {
    after = functions;
}

export function runAfterAllTests(functions: Function[]): void {
    afterAll = functions;
}

export async function benchmark(file?: string): Promise<boolean> {
    if (tests.length===0) { console.log("No tests to run."); return false; }
    else console.log("Working...");

    if (!(await stage(beforeAll, "Run Before All Tests")).success) return false;

    let result = await Promise.all(tests.map( (test) => wrap(test)).map( (wrapped) => wrapped() ))
        .then( (res) => ({success: true, logs: res}))
        .catch( (err) => ({ success: false, logs: err}));

    if (!result.success) { console.log(abort(result.logs.stage, result.logs.error)); return false; }

    if (!(await stage(afterAll, "Run After All Tests")).success) return false;

    // everything went well, print results

    exportLogs(result.logs, file);

    return true;
}

// internals start here

function collectGroups(logs: ExecutionLog[], repeated: any): any {
    let r = {};
    let execgr = [];

    for (let log of logs) {
        if (execgr.includes(log.meta.executionGroup)) continue; //skip
        if (log.meta.executionGroup!==null) execgr.push(log.meta.executionGroup);
        let rep = repeated[log.meta.executionGroup]; //can be null at this point

        if (log.meta.group!==null) {
            let s: number;
            if (rep === undefined) s = log.completed ? 1 : -1;
            else if (rep.samt === 0) s = -1;
            else if (rep.samt < log.meta.executionCount) s = 0;
            else s = 1;

            if (!r[log.meta.group])
                r[log.meta.group] = {
                    values: [rep===undefined ? log.time : rep.total/rep.values.length],
                    barinfo: [{name: log.meta.name, success: s}]
                };
            else {
                r[log.meta.group].values.push(rep === undefined ? log.time : rep.total / rep.values.length);
                r[log.meta.group].barinfo.push({ name: log.meta.name, success: s});
            }
        }
    }

    return r;
}

function collectRepetitions(logs: ExecutionLog[]): any {
    let r = {};

    for (let log of logs) {
        if (log.meta.executionCount>1) {
            if (!r[log.meta.executionGroup]) 
                r[log.meta.executionGroup] = {values: [{t: log.time, s: log.completed}], 
                                              total: log.time, printed: false, samt: log.completed ? 1 : 0};
            else {
                r[log.meta.executionGroup].values.push({t: log.time, s: log.completed});
                r[log.meta.executionGroup].total += log.time;
                if (log.completed) r[log.meta.executionGroup].samt++;
            }
        }
    }

    return r;
}

function exportLogs(logs: ExecutionLog[], file?: string): void {
    //say graph was generated if enabled: Graph exported to 'groupname.png'
    //make graph
    let f: string = "";
    let repeated = collectRepetitions(logs);
    let grouped = collectGroups(logs, repeated);

    for (let log of logs) {
        let rep = repeated[log.meta.executionGroup];
        if (rep !== undefined && rep.printed) continue; //already printed, don't do it again

        let p = "Function " + cx.gray(log.meta.name) + "\n";
        f += "Function " + log.meta.name + "\n";
            
        if (rep !== undefined) { //was run multiple times
            if (rep.samt === 0) { p += cx.logfailed; f += "Failed" }
            else if (rep.samt === log.meta.executionCount) { p += cx.logsucceeded; f += "Succeeded" }
            else { p += cx.logmixed; f += "Mixed results" };
            p += " in " + m.microTimeLog(rep.total/rep.values.length) + "\n";
            f += " in " + m.microTimeLog(rep.total/rep.values.length) + "\n";
            rep.printed = true;
        } else { //was only run once
            p += (log.completed ? cx.logsucceeded : cx.logfailed) + " in " + m.microTimeLog(log.time) + "\n";
            f += (log.completed ? "Succeeded": "Failed") + " in " + m.microTimeLog(log.time) + "\n";
        }
        
        if (log.async) { p += "Behaviour is " + cx.asynctrue + "\n"; f += "Behaviour is async\n" }
        if (log.meta.group!==null) {
            p += "Belongs to group " + cx.grayemphasis(log.meta.group) + "\n";
            f += "Belongs to group '" + log.meta.group + "'\n";
        }
        
        let gr = grouped[log.meta.group];
        if (gr !== undefined) {
            writeFile(log.meta.group+".svg", m.graph(gr.values, gr.barinfo, log.meta.group), ()=>{});
            p += "Exported to graph " + cx.blueemphasis(log.meta.group+".svg") + "\n";
            f += "Exported to graph '"+log.meta.group+".svg'\n";
        }

        if (log.meta.executionCount>1) {
            p += "Executed " + cx.gray(log.meta.executionCount) + " times\n";
            f += "Executed " + log.meta.executionCount + " times\n";
            for (let i=0; i<rep.values.length; i++) {
                p += "Run #" + (i+1) + ": " + (rep.values[i].s ? cx.check : cx.cross) + " " + 
                    m.microTimeLog(rep.values[i].t) + "\n";
                f += "Run #" + (i+1) + ": " + (rep.values[i].s ? "S" : "F") + " " +
                    m.microTimeLog(rep.values[i].t) + "\n";
            }
        }

        console.log(p);
        f += "\n";
    }

    if (file !== undefined) writeFile(file, f, (err) => {
        if (err) console.log(cx.warning + " Exporting to file "+cx.blueemphasis(file)+" failed.\n" + err);
        else console.log("Exported results to file "+cx.blueemphasis(file)+".");
    });
}

function wrap(meta: FunctionWithOpts): Function {

    return async (): Promise<ExecutionLog> => {

        let st = await stage(before, "Run Before Test", true)
        if (!st.success)
            throw st;

        let t = m.microTime();

        try {        
            let result = meta.function(); //function being evaluated

            if (isAsync(result)) {
                return await result.then(() => ({ 
                    meta: meta, 
                    async: true, 
                    completed: true, 
                    time: m.microTimeDiff(t)
                }))
                .catch(() => ({
                    meta: meta,
                    async: true, 
                    completed: false, 
                    time: m.microTimeDiff(t)
                }))
            } else {
                return { 
                    meta: meta, 
                    async: false, 
                    completed: true, 
                    time: m.microTimeDiff(t)
                };
            }
        } catch (e) {
            return { 
                meta: meta,
                async: false, 
                completed: false,
                time: m.microTimeDiff(t) 
            };
        } finally {
            //if this step doesn't go wrong, the return value is what was obtained in
            //the try or catch blocks; if it does go wrong, the return value is this
            let st = await stage(after, "Run After Test", true)
            if (!st.success)
                throw st;
        }
    };
}

function extractMeta(fn: Function | 
    { function: Function, group?: string, executionCount?: number, name?: string }): FunctionWithOpts {

    if (typeof fn === "function") {
        return {
            function: fn,
            group: null, 
            executionCount: 1,
            executionGroup: null,
            name: fn.name === "" ? "(no name)" : fn.name
        }
    } else {
        let g = fn.group === undefined ? null : fn.group;
        if (!isValidWindowsFilename(g)) throw badname(g);
        let exct = fn.executionCount === undefined ? 1 : //if not set or <1, set to 1
            (fn.executionCount < 1 ? 1 : Math.floor(fn.executionCount));
        
        return {
            function: fn.function,
            group: g, 
            executionCount: exct,
            executionGroup: exct > 1 ? execGroupCount++ : null,
            name: fn.name === undefined ? //name supplied by user has priority over function's own name
                  (fn.function.name === "" ? "(no name)" : fn.function.name) : fn.name
        };
    }
}

async function stage(functions: Function[], stage: string, silent?: boolean): 
    Promise<{success: boolean, error?: any, stage?: string}> {

    return Promise.all(functions.map( (fn) => fn() ))
        .then( () => ({success: true}) )
        .catch( (err: any) => { 
            if (silent===undefined || !silent) console.log(abort(stage, err));
            return ({ success: false, error: err, stage: stage });
        });
}

function abort(stage: string, err: any): string {
    return cx.failed + " Stage " + cx.grayemphasis(stage) + " failed with message:\n" + err + "\n\nAborting."; 
}

function badname(name: string): string {
    return "Error: The group name '" + name + "' either contains a reserved Windows keyword or is an invalid filename. \n\nAborting."; 
}

function isValidWindowsFilename(name: string): boolean {
    let xp = new RegExp(/^(?!\.)(?!com[1-9]$)(?!con$)(?!lpt[0-9]$)(?!nul$)(?!aux$)(?!prn$)[^\|\*\?\\:<>/$"]*[^\.\|\*\?\\:<>/$"]+$/, 'i'); //nice
    return xp.test(name);
}

function isAsync(functionReturnValue: any): boolean {
    try {
        return functionReturnValue.constructor.name === "Promise";
    } catch (e) { return false; }
}