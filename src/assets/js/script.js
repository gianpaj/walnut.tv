export function helloWorld() {
    console.log("Hello, World!");
}

export function add(a, b) {
    return a + b;
}

export function subtract(a, b) {
    return a - b;
}

export function multiply(a, b) {
    return a * b;
}

export function divide(a, b) {
    if (b !== 0) {
        return a / b;
    } else {
        throw new Error("Cannot divide by zero");
    }
}