/** Library used for measuring performance. */

import * as messaging from "./messaging"
import * as config from "./config"
import * as math from "./math"
import * as itertools from "./itertools"
import * as logging from "./logging"

const logger = new logging.Logger("performance")

export const TRI_PERFORMANCE_NAME_PREFIX: string = "tri"

function performanceEnabled(): boolean {
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
    const matchresult = counterName.match(extractRegExp)
    if (!matchresult) return
    const [_, ownerName, functionName, uniqueSuffix, startOrEnd] = matchresult

    return {
        ownerName,
        functionName,
        uniqueSuffix,
    }
}

export class MetricName {
    public readonly fullName: string
    public readonly startName: string
    public readonly endName: string

    constructor(ownerName: string, functionName: string) {
        const counterName = ownerName
        const uniqueSuffix = Math.floor(
            Math.random() * Math.floor(1e6),
        ).toString()

        this.fullName = `${TRI_PERFORMANCE_NAME_PREFIX}/${ownerName}/${functionName}:${uniqueSuffix}`
        this.startName = `${this.fullName}:start`
        this.endName = `${this.fullName}:end`
    }
}

export class Marker {
    constructor(
        ownerName: string,
        functionName: string,
        private readonly active: boolean = config.get("perfcounters") == "true",
        private readonly metricName: MetricName = new MetricName(
            ownerName,
            functionName,
        ),
    ) {}

    public start() {
        if (!this.active) return
        performance.mark(this.metricName.startName)
    }

    public end() {
        if (!this.active) return
        performance.mark(this.metricName.endName)
        performance.measure(
            this.metricName.fullName,
            this.metricName.startName,
            this.metricName.endName,
        )
    }
}

/**
 * Decorator for performance measuring. If performance is enabled,
 * wraps the function call with performance marks and a measure that
 * can be used for profiling.
 */
export function measured(
    cls: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
): PropertyDescriptor | void {
    // do nothing if performance isn't available
    if (!performanceEnabled()) return

    const originalMethod = descriptor.value
    descriptor.value = function(this, ...args) {
        const marker = new Marker(cls.constructor.name, propertyKey)
        marker.start()
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
): PropertyDescriptor | void {
    // do nothing if performance isn't available
    if (!performanceEnabled()) return

    const originalMethod = descriptor.value
    descriptor.value = async function(this, ...args) {
        const marker = new Marker(cls.constructor.name, propertyKey)
        marker.start()
        const result = await originalMethod.apply(this, args)
        marker.end()
        return result
    }
    return descriptor
}

export type StatsFilterConfig =
    | { filter: "functionName"; functionName: string }
    | { filter: "ownerName"; ownerName: string }
    | { filter: "eventType"; eventType: "start" | "end" | "measure" }

class StatsFilter {
    constructor(private readonly config: StatsFilterConfig) {}

    matches(entry: PerformanceEntry): boolean {
        const metricNameInfo = extractMetricName(entry.name)
        if (
            this.config.filter === "functionName" &&
            this.config.functionName !== metricNameInfo.functionName
        ) {
            return false
        }
        if (
            this.config.filter === "ownerName" &&
            this.config.ownerName !== metricNameInfo.ownerName
        ) {
            return false
        }
        if (
            this.config.filter === "eventType" &&
            this.config.eventType !== entry.entryType
        ) {
            return false
        }
        return true
    }
}

// export function makeObserver() {
//     const perf_observer = new PerformanceObserver((list, observer) => {
//         console.log("commandline_frame performance: %O", list.getEntries())
//         console.log("commandline_frame take records: %O", observer.takeRecords())
//     })
//     perf_observer.observe({entryTypes: ['mark', 'measure'], buffered: true})
//     // Attach it to the window object since there's a bug that causes
//     // performance observers to be GC'd even if they're attached.
//     ;(window as any).tri = Object.assign(Object.create(null), {
//         perf_observer,
//     })
// }

export function sendStats(list: PerformanceEntryList) {
    messaging.message("performance_background", "receiveStatsJson", [
        JSON.stringify(list),
    ])
}

export class StatsLogger {
    // TODO: Consider mapping each name to a symbol and storing the
    // mapped symbol instead of the name so we're storing more like 50
    // bytes per sample instead of 130 @_@
    public buffer: PerformanceEntry[] = []
    private idx: number = 0

    constructor() {}

    private incrementIdx() {
        // Changing the buffer length while this is running will
        // probably result in weirdness, but that shouldn't be a major
        // issue - it's not like we need these to be in order or
        // otherwise coherent, we're just trying to store a big pile
        // of recent-ish samples.
        this.idx = (this.idx + 1) % config.get("perfsamples")
    }

    public receiveStatsJson(entriesJson: string) {
        this.pushList(JSON.parse(entriesJson) as PerformanceEntry[])
    }

    public pushList(entries: PerformanceEntry[]) {
        for (const entry of entries) {
            this.pushEntry(entry)
        }
    }

    public pushEntry(entry: PerformanceEntry) {
        // Drop samples that aren't for tridactyl, since performance
        // events are global and there are some badly-behaved
        // libraries spamming them all over our own data.
        if (!entry.name.startsWith(TRI_PERFORMANCE_NAME_PREFIX)) return

        // We depend on arrays auto-vivifying when elements past the
        // end are set to make this easy.
        this.buffer[this.idx] = entry
        this.incrementIdx()
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
}

export function renderStatsHistogram(
    samples: PerformanceEntry[],
    buckets: number = 15,
    width: number = 80,
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
