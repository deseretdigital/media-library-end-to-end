export default async function retry(fn, attempts = 5) {
    for(let i = 0; i < attempts; i++) {
        await fn();
    }
    return true;
}
