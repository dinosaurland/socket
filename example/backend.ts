export default {
    greet(name: string) {
        return `Hello, ${name}!`;
    },
    math: {
        add(a: number, b: number) {
            return a + b;
        },
        subtract(a: number, b: number) {
            return a - b;
        },
    },
    async * countTo(n: number) {
        for (let i = 1; i < n; i++) {
            yield i;
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return n;
    }
};
