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
> Buy at **$${trimDecimals(buyPrice)}** in ${buyMarket} (**${buyLink}**)
> Sell at **$${trimDecimals(sellPrice)}** in ${sellMarket} (**${sellLink}**)`
}

const trimDecimals = (price: string): string => {
    return parseFloat(price).toFixed(2)
}
