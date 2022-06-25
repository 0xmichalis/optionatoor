export const sleep = (seconds: number) => {
    new Promise(resolve => setTimeout(resolve, seconds * 1000 ));
}

export const arbitrageMessage = (
    asset: string,
    size: string,
    buyMarket: string,
    buyPrice: string,
    sellMarket: string,
    sellPrice: string
) => {
    return `Arbitrage opportunity found!
Asset: ${asset}
Contract size: ${size}
Buy in ${buyMarket} at $${buyPrice}
Sell in ${sellMarket} at $${sellPrice}`
}