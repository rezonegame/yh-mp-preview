declare module 'pangu/browser' {
    /** The synchronous shared API used for text-node-only clipboard formatting. */
    const pangu: { spacingText(value: string): string };
    export default pangu;
}
