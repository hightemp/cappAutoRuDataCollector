
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

    async fnSendInputClickEvent(oEvent_i = {})
    {
        var oEvent = {type: 'mouseDown', button:'left', ...oEvent_i}
        await this.oWindow.webContents.sendInputEvent(oEvent)
        console.log(`[!] DOMElement ${this.iID} - fnClick - sendInputEvent `+JSON.stringify(oEvent))

        var oEvent = {type: 'mouseUp', button:'left', ...oEvent_i}
        await this.oWindow.webContents.sendInputEvent(oEvent)
        console.log(`[!] DOMElement ${this.iID} - fnClick - sendInputEvent `+JSON.stringify(oEvent))
    }

    async fnClick(iClickCount = 1)
    {
        console.log(`[!] DOMElement ${this.iID} - fnClick`)

        var oBoundingClientRect = await this.fnGetClientPosition()

        var fX = (oBoundingClientRect.right + oBoundingClientRect.left)/2;
        var fY = (oBoundingClientRect.bottom + oBoundingClientRect.top)/2;

        for (let iIndex = 0; iIndex < iClickCount; iIndex++) {
            await this.fnSendInputClickEvent({ x:fX, y:fY })
        }
    }
}

class AutoRuParser
{
    constructor(oWindow_i)
    {
        this.oWindow = oWindow_i
        this.iWaitTime = 1000
        this.sSavedURLsFileName = "auto_ru_URLS.old.json"
        this.aBrands = []
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

    async fnGetElementsAttributeXPath(sXPath, aAttributeName, iWaitTime = this.iWaitTime)
    {
        console.log(`[!] fnGetElementsAttributeXPath '${sXPath}' ${iWaitTime}s`);

        var iStartTime = Math.round(new Date().getTime()/1000);

        while(true) {
            var iEndTime = Math.round(new Date().getTime()/1000);
            
            if (iEndTime-iStartTime>=iWaitTime) {
                console.log(`[E] fnGetElementsAttributeXPath '${sXPath}' ${iWaitTime}s - Timeout`);
                break;
            }

            var aResult = await this.oWindow.webContents.executeJavaScript(`
                (function() { 
                    var oXPathResult = document.evaluate('${sXPath}', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    if (oXPathResult.snapshotLength>0) {
                        var aResult = [];

                        for (var iIndex=0; iIndex<oXPathResult.snapshotLength; iIndex++) {
                            aResult.push(oXPathResult.snapshotItem(iIndex)['${aAttributeName}']);
                        }

                        return aResult;
                    }
                    return false;
                })()
            `)

            if (aResult) {
                console.log(`[+] fnGetElementsAttributeXPath '${sXPath}' ${iWaitTime}s - ${aResult.length}`);
                return aResult;    
            }
        }

        console.log(`[E] fnGetElementsAttributeXPath '${sXPath}' ${iWaitTime}s - Element not found`);
    }

    async fnGetElementXPath(sXPath, iElementIndex=0, iWaitTime = this.iWaitTime)
    {
        console.log(`[!] fnGetElementXPath '${sXPath}' ${iWaitTime}s`);

        var iStartTime = Math.round(new Date().getTime()/1000);

        while(true) {
            var iEndTime = Math.round(new Date().getTime()/1000);
            
            if (iEndTime-iStartTime>=iWaitTime) {
                console.log(`[E] fnGetElementXPath '${sXPath}' ${iWaitTime}s - Timeout`);
                break;
            }

            var iResult = await this.oWindow.webContents.executeJavaScript(`
                (function() { 
                    var oXPathResult = document.evaluate('${sXPath}', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    if (oXPathResult.snapshotLength>0) {
                        if (!window.SAVED_ELEMENTS) {
                            window.SAVED_ELEMENTS = [];
                        }
                        window.SAVED_ELEMENTS.push(oXPathResult.snapshotItem(${iElementIndex}));
                        return window.SAVED_ELEMENTS.length-1;
                    }
                    return -1;
                })()
            `)

            if (iResult!=-1) {
                console.log(`[+] fnGetElementXPath '${sXPath}' ${iWaitTime}s - Create element with id ${iResult}`);
                return new DOMElement(this.oWindow, iResult);    
            }
        }

        console.log(`[E] fnGetElementXPath '${sXPath}' ${iWaitTime}s - Element not found`);
    }

    async fnWaitElementXPath(sXPath, iWaitTime = this.iWaitTime)
    {
        console.log(`[!] fnWaitElementXPath '${sXPath}' ${iWaitTime}s`);

        var iStartTime = Math.round(new Date().getTime()/1000);

        while(true) {
            var iEndTime = Math.round(new Date().getTime()/1000);
            
            if (iEndTime-iStartTime>=iWaitTime) {
                console.log(`[E] fnWaitElementXPath '${sXPath}' ${iWaitTime}s - Timeout`);
                break;
            }

            var iResult = await this.oWindow.webContents.executeJavaScript(`
                document.evaluate('${sXPath}', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength
            `)

            if (iResult) {
                console.log(`[+] fnWaitElementXPath '${sXPath}' ${iWaitTime}s - Found ${iResult} elements`);
                return true;    
            }
        }

        console.log(`[E] fnWaitElementXPath '${sXPath}' ${iWaitTime}s - Element not found`);
    }

    async fnGetElementCSS(sCSS, iElementIndex=0, iWaitTime = this.iWaitTime)
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
                        window.SAVED_ELEMENTS.push(oNodeList[${iElementIndex}]);
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

        var oBodyElement = await this.fnGetElementCSS("body")

        // Открытие списка с марками(брендами)
        var oElement = await this.fnGetElementCSS(".Select__button")

        if (!oElement) {
            console.log(`[E] Parsing brands list - Element not found '.Select__button'`)
            return;
        }

        await oElement.fnClick()

        await oBodyElement.fnClick()

        // Получение списка с марками(брендами)
        var sBrandMenuItemXPath = "(//*[contains(@class,\"Select__menu\")])//*[contains(@class,\"Menu__group\")][descendant::*[text()=\"Все\"]]/*[contains(@class,\"MenuItem\")]"
        this.aBrands = await this.fnGetElementsAttributeXPath(sBrandMenuItemXPath, 'innerText')

        for (var sBrand of this.aBrands) {
            oURLS[sBrand] = {}

            var oElement = await this.fnGetElementCSS(".Select__button")

            if (!oElement) {
                console.log(`[E] Iterating brands list - '${sBrand}' - Element not found '.Select__button'`)
                return;
            }
    
            await oElement.fnClick()
    
            var sBrandMenuItemXPath = "(//*[contains(@class,\"Select__menu\")])[1]//div[text()=\"Все\"]/following::*[text()=\""+sBrand+"\"]"
            
        }

        console.dir(aBrands, {depth: null, colors: true, maxArrayLength: null})
    }

    fnConsoleDir(aValue)
    {
        console.dir(aValue, {depth: null, colors: true, maxArrayLength: null})
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