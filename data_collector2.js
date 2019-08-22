
const { app, BrowserWindow, dialog } = require('electron')
const fs = require('fs')

class DOMElement
{
    constructor(oWindow_i, iID_i)
    {
        this.oWindow = oWindow_i
        this.iID = iID_i*1

        console.log(`[!] DOMElement ${this.iID} - created`)
    }

    async fnGetClientPosition()
    {
        console.log(`[!] DOMElement ${this.iID} - fnGetClientPosition`)

        var sResult = await this.oWindow.webContents.executeJavaScript(`
            (function()
            {
                if (!window.SAVED_ELEMENTS[${this.iID}]) {
                    console.log('[E] fnGetClientPosition - ${this.iID} - empty');
                    return false;
                }

                if (window.SAVED_ELEMENTS[${this.iID}].parentElement===null) {
                    console.log('[E] fnGetClientPosition - ${this.iID} - parentElement===null');
                    return false;
                }

                return JSON.stringify(window.SAVED_ELEMENTS[${this.iID}].getBoundingClientRect());
            })()
        `)
        if (!sResult) {
            console.log(`[E] DOMElement ${this.iID} - fnGetClientPosition - Element not found`)
        }

        var oResult = JSON.parse(sResult);

        console.log(`[+] DOMElement ${this.iID} - fnGetClientPosition ${sResult}`)

        return oResult;
    }

    async fnClick(iClickCount = 1)
    {
        console.log(`[!] DOMElement ${this.iID} - fnClick`)

        var oBoundingClientRect = await this.fnGetClientPosition()

        var oEvent = { 
            type: 'mouseDown', 
            x: (oBoundingClientRect.right + oBoundingClientRect.left)/2,
            y: (oBoundingClientRect.bottom + oBoundingClientRect.top)/2,
            button:'left', 
            clickCount: 1
        }
        await this.oWindow.webContents.sendInputEvent(oEvent)
        console.log(`[!] DOMElement ${this.iID} - fnClick - sendInputEvent `+JSON.stringify(oEvent))

        var oEvent = { 
            type: 'mouseUp', 
            x: (oBoundingClientRect.right + oBoundingClientRect.left)/2,
            y: (oBoundingClientRect.bottom + oBoundingClientRect.top)/2,
            button:'left', 
            clickCount: 1
        }
        await this.oWindow.webContents.sendInputEvent(oEvent)
        console.log(`[!] DOMElement ${this.iID} - fnClick - sendInputEvent `+JSON.stringify(oEvent))
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
        fs.writeFileSync(
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
                console.log(`[+] fnGetElementCSS '${sCSS}' ${iWaitTime}s - Create element with id ${iResult}`);
                return new DOMElement(this.oWindow, iResult);    
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
                console.log(`[+] fnWaitElementCSS '${sCSS}' ${iWaitTime}s - Found ${iResult} elements`);
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

        var oElement;

        if (oElement = await this.fnGetElementCSS(".Select__button")) {
            await oElement.fnClick();
        }
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