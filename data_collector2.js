
const { app, BrowserWindow, dialog } = require('electron')

class AutoRuParser
{
    constructor(oWindow_i)
    {
        this.oWindow = oWindow_i
        this.iWaitTime = 1000;
        
        this.fnStart()
    }

    async fnWaitOneElementCSS(sCSS, iWaitTime = this.iWaitTime)
    {
        var oNodeList = await this.fnWaitElementCSS(sCSS, iWaitTime)

        if (oNodeList && oNodeList.length) {
            return oNodeList[0]
        }
    }

    async fnWaitElementCSS(sCSS, iWaitTime = this.iWaitTime)
    {
        var iStartTime = Math.round(new Date().getTime()/1000);

        while(true) {
            var iEndTime = Math.round(new Date().getTime()/1000);
            
            if (iEndTime-iStartTime>=iWaitTime) {
                break;
            }

            var oNodeList = await this.oWindow.webContents.executeJavaScript(`document.querySelectorAll('${sCSS}')`)

            console.log('oNodeList > ', oNodeList);

            if (oNodeList.length) {
                return oNodeList;    
            }
        }
    }

    async fnStart()
    {
        console.log('START PARSING');

        await this.fnLoadURL('https://auto.ru/moskva/cars/all/')
        //dialog.showMessageBoxSync({message:'123'})

        var oSelectButton = await this.fnWaitOneElementCSS(".Select__button")

        console.log('oSelectButton > ', oSelectButton)
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