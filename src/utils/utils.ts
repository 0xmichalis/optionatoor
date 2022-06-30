export const sleep = async (seconds: number) => {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000 ));
}

export const arbitrageMessage = (
    asset: string,
    size: string,
    buyMarket: string,
    buyLink: string,
    buyPrice: string,
    sellMarket: string,
    sellLink: string,
    sellPrice: string
): string => {
    return `> Asset: **${asset}**
> Contract size: **${size}**
> Buy in ${buyMarket} (**${buyLink}**) at **$${trimDecimals(buyPrice)}**
> Sell in ${sellMarket} (**${sellLink}**) at **$${trimDecimals(sellPrice)}**`
}

const trimDecimals = (price: string): string => {
    return parseFloat(price).toFixed(2)
}
