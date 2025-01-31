import express from "express"
import cors from "cors"
import fetch from "node-fetch"
import jsdom from "jsdom"

import lowDb from "lowdb"
import FileSync from "lowdb/adapters/FileSync.js"
import {
    nanoid
} from "nanoid"
// const Jsdom = jsdom.JSDOM

//express app

(async () => {




    const app = express()
    app.use(cors())
    app.use(express.json())
    const PORT = 4000;
    app.use('/', express.static('public'))

    //sync json

    const db = lowDb(new FileSync('db.json'))
    db.defaults({
        channels: [],
        feed: []
    }).write()


    const localData = db.get("channels").value()





    const updatePages = async () => {

        await Promise.all(localData.map(async (singlePage) => {

            try {

                const request = await (await (fetch(singlePage.link)))

                if (request.status === 404) {
                    const feedPostdata = {
                        content: "thread is ded, F",
                        link: singlePage.link,
                        postid: singlePage.id,
                        image: null
                    }


                    db.get('feed')
                        .find({
                            postid: singlePage.id,
                        })
                        .assign({
                            ...feedPostdata
                        })
                        .write()


                    singlePage.dead = true


                    db.get('channels')
                        .find({
                            id: singlePage.id
                        })
                        .assign({
                            ...singlePage
                        })
                        .write()

                } else {

                    const sitecontent = await request.text();
                    const dom = new jsdom.JSDOM(sitecontent);
                    const observedItems = dom.window.document.querySelectorAll(singlePage.observe)
                    observedItems.forEach(itemToObserve => {

                        if (singlePage.updates != observedItems.length) {

                            singlePage.dead = (observedItems.length == 0)
                            console.log(singlePage.dead)
                            console.log("item updated!")
                            singlePage.updates = observedItems.length

                            db.get('channels')
                                .find({
                                    id: localData.id
                                })
                                .assign({
                                    ...localData
                                })
                                .write()


                            db.get("feed").push({
                                content: singlePage.dead ? "ded thread, F" : observedItems[observedItems.length - 1].textContent,
                                link: singlePage.link,
                                postid: singlePage.id,
                                image: singlePage.dead ? null : (observedItems[observedItems.length - 1].querySelector('img') ? observedItems[observedItems.length - 1].querySelector('img').src : null)
                            }).write()




                        }

                    });

                }


            } catch (error) {
                console.warn(error)
            }
        }));

        return localData


    }

    await updatePages()
    console.log("updated!")

    app.get('/channels', (req, res) => {
        const data = db.get("channels").value()
        res.send(data)
    })

    app.get('/feed', (req, res) => {
        const data = db.get("feed").value()
        res.send(data)
    })

    app.get('/update', async (req, res) => {
        const data = await updatePages()
        res.send(data)
    })






    app.listen(PORT, () => {
        console.log(`Backend is running on http://localhost:${PORT}`)
    })









})()