
const { app, BrowserWindow, dialog } = require('electron')
const fs = require('fs')

class DOMElement
{
    constructor(oWindow_i, )
    {

    }
}

class AutoRuParser
{
    constructor(oWindow_i)
    {
        this.oWindow = oWindow_i
        this.iWaitTime = 1000
        this.sSavedURLsFileName = "auto_ru_URLS.old.json"
        this.aBrands = {}
        this.oModels = {}
        this.oURLs = {}

        try {
            this.fnLoadURLs()
            this.fnStart()
        } catch(oException) {
            console.log(`[E] ${oException.message}`)
        }
    }

    fnLoadURLs(sFileName = this.sSavedURLsFileName)
    {
        if (fs.existsSync(sFileName)) {
            JSON.parse(fs.readFileSync(
				sFileName,
				"utf8"
			))
        }
    }

    fnSaveURLs(sFileName = this.sSavedURLsFileName)
    {
        fs.writeFile(
            sFileName, 
            JSON.stringify(this.oURLs)
        )
    }

    async fnGetElementCSS(sCSS, iWaitTime = this.iWaitTime)
    {
        console.log(`[!] fnGetElementCSS '${sCSS}' ${iWaitTime}s`);

        var iStartTime = Math.round(new Date().getTime()/1000);

        while(true) {
            var iEndTime = Math.round(new Date().getTime()/1000);
            
            if (iEndTime-iStartTime>=iWaitTime) {
                console.log(`[E] fnGetElementCSS '${sCSS}' ${iWaitTime}s - Timeout`);
                break;
            }

            var iResult = await this.oWindow.webContents.executeJavaScript(`
                (function() { 
                    var oNodeList = document.querySelectorAll('${sCSS}');
                    if (oNodeList.length>0) {
                        if (!window.SAVED_ELEMENTS) {
                            window.SAVED_ELEMENTS = [];
                        }
                        window.SAVED_ELEMENTS.push(oNodeList[0]);
                        return window.SAVED_ELEMENTS.length-1;
                    }
                    return -1;
                })()
            `)

            if (iResult!=-1) {
                console.log(`[E] fnGetElementCSS '${sCSS}' ${iWaitTime}s - Create element with id ${iResult}`);
                return new DOMElement();    
            }
        }

        console.log(`[E] fnGetElementCSS '${sCSS}' ${iWaitTime}s - Element not found`);
    }

    async fnWaitElementCSS(sCSS, iWaitTime = this.iWaitTime)
    {
        console.log(`[!] fnWaitElementCSS '${sCSS}' ${iWaitTime}s`);

        var iStartTime = Math.round(new Date().getTime()/1000);

        while(true) {
            var iEndTime = Math.round(new Date().getTime()/1000);
            
            if (iEndTime-iStartTime>=iWaitTime) {
                console.log(`[E] fnWaitElementCSS '${sCSS}' ${iWaitTime}s - Timeout`);
                break;
            }

            var iResult = await this.oWindow.webContents.executeJavaScript(`document.querySelectorAll('${sCSS}').length`)

            if (iResult) {
                console.log(`[E] fnWaitElementCSS '${sCSS}' ${iWaitTime}s - Found ${iResult} elements`);
                return true;    
            }
        }

        console.log(`[E] fnWaitElementCSS '${sCSS}' ${iWaitTime}s - Element not found`);
    }

    async fnStart()
    {
        console.log('START PARSING');

        await this.fnLoadURL('https://auto.ru/moskva/cars/all/')

        if (!await this.fnWaitElementCSS(".Select__button")) {
            new Error("10001 - Button not found");
        }

        console.log('bSelectButtonExists > ', bSelectButtonExists)
    }

    async fnLoadURL(sURL)
    {
        console.log(`[!] Loading URL '${sURL}'`)
        await this.oWindow.loadURL(sURL)
        console.log(`[!] URL loaded '${sURL}'`)
    }
}

function createWindow() 
{
    new AutoRuParser(new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    }));    
}

app.on('ready', createWindow)