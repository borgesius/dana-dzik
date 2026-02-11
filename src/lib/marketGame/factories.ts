import type { CommodityId } from "./commodities"

export type FactoryId =
    | "list-builder"
    | "cattle-ranch"
    | "banner-exchange"
    | "rendering-plant"
    | "colocation-rack"
    | "offshore-dev"

export interface FactoryDef {
    id: FactoryId
    name: string
    description: string
    produces: CommodityId
    cost: number
    minOutput: number
    maxOutput: number
    ticksPerCycle: number
    conversionInput?: { commodity: CommodityId; quantity: number }
}

export const FACTORY_COST_SCALING = 1.22

export const FACTORIES: FactoryDef[] = [
    {
        id: "list-builder",
        name: "Automated List Builder",
        description:
            "Harvests verified email addresses 24/7. Results may vary.",
        produces: "EMAIL",
        cost: 5,
        minOutput: 0,
        maxOutput: 2,
        ticksPerCycle: 2,
    },
    {
        id: "cattle-ranch",
        name: "Cattle Ranch",
        description:
            "Free-range livestock operation. Output varies with season.",
        produces: "LIVE",
        cost: 10,
        minOutput: 0,
        maxOutput: 2,
        ticksPerCycle: 2,
    },
    {
        id: "banner-exchange",
        name: "Banner Exchange",
        description:
            "Rotating ad network. Impressions generated automatically.",
        produces: "ADS",
        cost: 15,
        minOutput: 0,
        maxOutput: 2,
        ticksPerCycle: 3,
        conversionInput: { commodity: "EMAIL", quantity: 6 },
    },
    {
        id: "rendering-plant",
        name: "Rendering Plant",
        description:
            "Converts livestock into industrial adhesive. Smells terrible.",
        produces: "GLUE",
        cost: 80,
        minOutput: 0,
        maxOutput: 1,
        ticksPerCycle: 4,
        conversionInput: { commodity: "LIVE", quantity: 8 },
    },
    {
        id: "colocation-rack",
        name: "Co-Location Rack",
        description: "Dedicated server hosting. Uptime not guaranteed.",
        produces: "BW",
        cost: 150,
        minOutput: 0,
        maxOutput: 1,
        ticksPerCycle: 3,
        conversionInput: { commodity: "ADS", quantity: 11 },
    },
    {
        id: "offshore-dev",
        name: "Offshore Dev Team",
        description: "24-hour development cycle. Quality assurance pending.",
        produces: "SOFT",
        cost: 400,
        minOutput: 0,
        maxOutput: 1,
        ticksPerCycle: 5,
        conversionInput: { commodity: "BW", quantity: 3 },
    },
]
