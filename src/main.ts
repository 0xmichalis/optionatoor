import Optionatoor from './optionatoor'

(async () => {
    const tmpl = new Optionatoor()
    await tmpl.init()

    tmpl.run()
})()
