## Benchmarker

Times your code's execution in a way similar to how Java's JUnit runs unit tests.

### Features

- Can create test groups and automatically run functions before and after each test. 

- Will generate a readable and color-coded log which can also be exported to a file of choice.

- Can run a function multiple times and present the success rate, time for each run and average time.

- Can group functions and generate simple SVG graphs with the times obtained.

### Simple Usage

This is the benchmarker lifecycle.

**runBeforeAllTests( ... )** - run only once, at the beginning.

**runBeforeTest( ... )** - run before each test.

**runTests( ... )** - list of tests to run.

**runAfterTest( ... )** - run after each test.

**runAfterAllTests( ... )** - run only once, at the end.

Each of these functions receives an array as its only argument. This array may contain a collection of **functions**, **async functions** and **functions that return a Promise**.

Benchmarker will wait for every function of a lifecycle stage to finish execution before moving onto the next stage (this is done through ```Promise.all```). 

If any non-test function (that is, a function attributed to a lifecycle stage that is **NOT runTests**) fails, the entire process will be aborted and the user will be notified.

**benchmark(file?: string)** - start the benchmarker.

This function should be called only after defining which functions should be run in each stage. It will generate the result logs, and optionally create graphs and export the logs to a file.

### Graphs and Multiple Runs

**runTests** also accepts objects with the following structure.

    {
      function: Function;
      group?: string;
      executionCount?: number;
      name?: string;
    }

**group** - mandatory for graph creation. Every function in the same group will be included in a SVG graph of that group. A function without a group will not appear in any graph.

**executionCount** - runs the **function** that amount of times, presents the success rate, time for each run and the average time of runs. All pre-test and post-test operations defined by the user will be run each time.

**name** - override the function's name in the logs. Useful when many functions have the same name.

### Example output

![](https://i.imgur.com/Dl4YtMW.png)

### Example graph

![](https://i.imgur.com/zP5IgIq.png)