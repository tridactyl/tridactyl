/**
 * Library used for measuring performance. The basic steps are as follows:
 *
 * 1. Set up a persistent StatsLogger object to store samples.
 * 2. Invoke listenForCounters with the StatsLogger to start logging
 *    performance counters to the stats logger.
 * 3. If you have other scripts (content, iframes, web workers, etc),
 *    set up to receive stats from those other sources:
 *    * Set the stats logger up with an attributeCaller receiving messages as
 *      "performance_background".
 *    * For each other context, invoke listenForCounters without arguments and
 *      hold on to the resulting object.
 * 4. Instrument methods using the @measured or @measuredAsync
 *    decorators (for class methods) or by using Marker objects in
 *    your functions.
 * 5. Collect data!
 * 6. Use getEntries to retrieve data from the statsLogger.
 */

import * as messaging from "@src/lib/messaging"
import * as config from "@src/lib/config"
import * as math from "@src/lib/math"
import * as logging from "@src/lib/logging"

const logger = new logging.Logger("performance")

/**
 * Decorator for performance measuring. If performance is enabled,
 * wraps the function call with performance marks and a measure that
 * can be used for profiling. The mark's ownerName will be the name of
 * the containing class and the functionName will be the name of the
 * function. For example:
 *
 * class Foo {
 *   @Perf.measured
 *   function doFoos() { stuff() }
 * }
 *
 * These counters can be obtained using listenForCounters and a
 * StatsLogger.
 *
 */
export function measured(
    cls: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
): PropertyDescriptor {
    if (!performanceApiAvailable()) return

    const originalMethod = descriptor.value
    descriptor.value = function (this, ...args) {
        const marker = new Marker(cls.constructor.name, propertyKey).start()
        const result = originalMethod.apply(this, args)
        marker.end()
        return result
    }
    return descriptor
}

/**
 * Like the @measured decorator, but properly handles async functions
 * by chaining a resolution onto the promise that marks completion
 * when the function resolves its promise.
 */
export function measuredAsync(
    cls: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
): PropertyDescriptor {
    if (!performanceApiAvailable()) return

    const originalMethod = descriptor.value
    descriptor.value = async function (this, ...args) {
        const marker = new Marker(cls.constructor.name, propertyKey).start()
        const result = await originalMethod.apply(this, args)
        marker.end()
        return result
    }
    return descriptor
}

/**
 * Convenience object for collecting timing information. Create it and
 * call start() to create a mark entry for the start of the duration
 * to measure. Later, call end() to create a mark entry for the end of
 * the duration and a measure entry for the duration from the start
 * mark to the end mark. Marks are given a unique identifier to ensure
 * that async, multi-threaded, or reentrant code doesn't have collisions.
 *
 * WARNING! Will SILENTLY DEACTIVATE ITSELF if the "perfcounters"
 * config option is not set to "true"! This is done to minimize the
 * performance overhead of instrumentation when performance counters
 * are turned off.
 *
 * The ownerName and functionName are encoded into the name of the
 * performance entry in a way that allows entries to be retrieved
 * using StatsFilters.
 *
 */
export class Marker {
    constructor(
        ownerName: string,
        functionName: string,
        private readonly active: boolean = performanceApiAvailable() &&
            config.get("perfcounters") === "true",
        private readonly metricName: MetricName = new MetricName(
            ownerName,
            functionName,
        ),
    ) {}

    public start() {
        if (!this.active) return this
        logger.debug(
            "Marking startpoint of performance counter for %o",
            this.metricName,
        )
        performance.mark(this.metricName.startName)
        return this
    }

    public end() {
        if (!this.active) return this
        logger.debug(
            "Marking endpoint of performance counter for %o",
            this.metricName,
        )
        performance.mark(this.metricName.endName)
        performance.measure(
            this.metricName.fullName,
            this.metricName.startName,
            this.metricName.endName,
        )
        return this
    }
}

/**
 * Start listening for performance counters. Note that you _must_
 * attach the returned PerformanceObserver to some long-lived object
 * like the window; there's some kind of bug that causes
 * PerformanceObservers to be incorrectly garbage-collected even if
 * they're still attached and observing.
 *
 * @param statsLogger If given, stats will be logged directly to the
 * given stats logger. If absent, stats will be sent to the
 * performance_background receiver using messaging.
 */
export function listenForCounters(
    statsLogger?: StatsLogger,
): PerformanceObserver {
    let callback: (
        list: PerformanceObserverEntryList,
        observer: PerformanceObserver,
    ) => void
    if (statsLogger === undefined) {
        callback = (list) => {
            sendStats(list.getEntries())
        }
    } else {
        callback = (list) => {
            statsLogger.pushList(list.getEntries())
        }
    }

    const perfObserver = new PerformanceObserver(callback)
    perfObserver.observe({ entryTypes: ["mark", "measure"] })
    return perfObserver
}

/**
 * Configuration for filtering performance samples.
 */
export type StatsFilterConfig =
    // a filter with kind functionName permits only samples with
    // functionName equal to the given functionName.
    | { kind: "functionName"; functionName: string }
    // a filter with kind ownerName permits only samples with
    // ownerName equal to the given ownerName.
    | { kind: "ownerName"; ownerName: string }
    // a filter with kind eventType permits only samples of the given
    // eventType.
    | { kind: "eventType"; eventType: "start" | "end" | "measure" }

/**
 * Stores a bounded-size buffer of performance entries and provides
 * convenience functions for accessing subsets of the buffer. Very
 * simple circular buffer.
 */
export class StatsLogger {
    // TODO: Consider mapping each name to a symbol and storing the
    // mapped symbol instead of the name so we're storing more like 50
    // bytes per sample instead of 130 @_@
    public buffer: PerformanceEntry[] = []
    private idx = 0
    private buffersize = 10000
    private lastError = 0

    /**
     * Target for receiving stats entries from other threads - there
     * was some issue with encoding that I couldn't figure out so I
     * just kludged it.
     */
    public receiveStatsJson(entriesJson: string) {
        this.pushList(JSON.parse(entriesJson) as PerformanceEntry[])
    }

    /**
     * Ingests the given performance entries into the buffer.
     */
    public pushList(entries: PerformanceEntry[]) {
        for (const entry of entries) {
            this.pushEntry(entry)
        }
    }

    /**
     * Returns only entries that match _all_ of the given filter
     * configs.
     */
    public getEntries(...filterConfigs: StatsFilterConfig[]) {
        // Explicit stream fusion, wheeeee.
        //
        // Well, sort of. We're not fusing all the way up to the regex
        // match, so that's a ton of duplicated work. Not that it
        // matters, since this should only ever be invoked when a
        // developer asks for data.
        const filters: StatsFilter[] = filterConfigs.map(
            fc => new StatsFilter(fc),
        )
        const filterFun: (input: PerformanceEntry) => boolean = e =>
            filters.every(f => f.matches(e))
        return this.buffer.filter(filterFun)
    }

    public updateBuffersize() {
        // Changing the buffer length while this is running will
        // probably result in weirdness, but that shouldn't be a major
        // issue - it's not like we need these to be in order or
        // otherwise coherent, we're just trying to store a big pile
        // of recent-ish samples.
        const perfsamples = Number(config.get("perfsamples"))
        // Check for NaN or non-integer
        if (Number.isInteger(perfsamples)) {
            this.buffersize = perfsamples
        } else {
            // This function could be called a hundred times a second
            // and would error out every single time if someone has
            // given an invalid config, so rate-limit the error log -
            // one every five seconds.
            if (performance.now() - this.lastError > 5000) {
                this.lastError = performance.now()
                logger.error(
                    "perfsamples must be an integer, is %O",
                    perfsamples,
                )
            }
        }
    }

    private pushEntry(entry: PerformanceEntry) {
        logger.debug(
            "Pushing performance entry %o into performance counters",
            entry,
        )

        // Drop samples that aren't for tridactyl, since performance
        // events are global and there are some badly-behaved
        // libraries spamming them all over our own data.
        if (!entry.name.startsWith(TRI_PERFORMANCE_NAME_PREFIX)) return

        // We depend on arrays auto-vivifying when elements past the
        // end are set to make this easy.
        this.buffer[this.idx] = entry
        this.incrementIdx()
    }

    private incrementIdx() {
        this.idx = (this.idx + 1) % this.buffersize
    }
}

/**
 * Pretty-prints a pile of performance samples of type measure (others
 * won't work because they have duration zero or undefined) as a
 * horizontal ASCII histogram. Useful if you just want basic
 * statistics about performance and don't want to spend a bunch of
 * time mucking about in python or julia.
 *
 * A very small example of what you'll get:
 *
 *   0     ####
 *   125   ##########
 *   250   ###############
 *   375   ######
 *   500   ##
 *
 * @param samples A set of samples to plot.
 * @param buckets The number of bins to divide the samples into.
 * @param width The width of the chart.
 */
export function renderStatsHistogram(
    samples: PerformanceEntry[],
    buckets = 15,
    width = 80,
): string {
    const durs: number[] = samples.map(sample => sample.duration)

    const min = durs.reduce((a, b) => Math.min(a, b))
    const max = durs.reduce((a, b) => Math.max(a, b))

    const bucketvals: number[] = math.linspace(min, max, buckets)

    const bucketed: Map<number, number> = math.bucketize(durs, bucketvals)
    const maxcount: number = Array.from(bucketed.values()).reduce(
        (a, b) => Math.max(a, b),
        0,
    )

    const labelwidth = 20
    const barwidth = width - labelwidth
    const tobarwidth = n => (barwidth * n) / maxcount

    const result = []
    for (const [bucketval, bucketcount] of bucketed.entries()) {
        const bar = "#".repeat(tobarwidth(bucketcount))
        const label = bucketval.toString().padEnd(labelwidth)
        result.push(label + bar)
    }
    return result.join("\n")
}

/**
 * Implements filtering of performance entries using the
 * StatsFilterConfig. Exposed so users of the library can do more
 * filtering themselves if they want to.
 */
export class StatsFilter {
    constructor(private readonly config: StatsFilterConfig) {}

    matches(entry: PerformanceEntry): boolean {
        const metricNameInfo = extractMetricName(entry.name)
        if (
            this.config.kind === "functionName" &&
            this.config.functionName !== metricNameInfo.functionName
        ) {
            return false
        }
        if (
            this.config.kind === "ownerName" &&
            this.config.ownerName !== metricNameInfo.ownerName
        ) {
            return false
        }
        if (
            this.config.kind === "eventType" &&
            this.config.eventType !== entry.entryType
        ) {
            return false
        }
        return true
    }
}

const TRI_PERFORMANCE_NAME_PREFIX = "tri"

function performanceApiAvailable(): boolean {
    return performance.mark !== undefined
}

interface MetricNameInfo {
    ownerName: string
    functionName: string
    uniqueSuffix: string
}

const extractRegExp = new RegExp(
    `^${TRI_PERFORMANCE_NAME_PREFIX}` +
        // owner name
        `/([^/]+)` +
        // function name
        `/([^:]+)` +
        // unique suffix
        `:([^:]+)`,
    // No need to handle :start/:end
    // because we can get that from the
    // sample itself.
)
function extractMetricName(counterName: string): MetricNameInfo {
    const matchresult = extractRegExp.exec(counterName)
    if (!matchresult) return
    const [ownerName, functionName, uniqueSuffix] = matchresult.slice(1)

    return {
        ownerName,
        functionName,
        uniqueSuffix,
    }
}

class MetricName {
    public readonly fullName: string
    public readonly startName: string
    public readonly endName: string

    constructor(ownerName: string, functionName: string) {
        const uniqueSuffix = Math.floor(
            Math.random() * Math.floor(1e6),
        ).toString()

        this.fullName = `${TRI_PERFORMANCE_NAME_PREFIX}/${ownerName}/${functionName}:${uniqueSuffix}`
        this.startName = `${this.fullName}:start`
        this.endName = `${this.fullName}:end`
    }
}

function sendStats(list: PerformanceEntryList) {
    messaging.message(
        "performance_background",
        "receiveStatsJson",
        JSON.stringify(list),
    )
}
