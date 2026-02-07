export class SeededRng {
    private state: number

    constructor(seed?: number) {
        this.state = seed ?? (Math.random() * 2147483647) | 0
        if (this.state <= 0) this.state = 1
    }

    public next(): number {
        this.state = (this.state * 16807) % 2147483647
        return (this.state - 1) / 2147483646
    }

    public nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min
    }
}
