import * as puppeteer from 'puppeteer';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';



class Stechuhr {
  private page : puppeteer.Page;

  public constructor(p : puppeteer.Page) {
    this.page = p;
  }

  public async insertNewRecording(date : string, startTime : string, endTime : string, sodexo : string) {
    const da = date;
    const st = startTime;
    const en = endTime;
    const so = sodexo;
    // click new recording button
    await this.page.evaluate(() => {
      function findComponent(tag: string, name: RegExp): HTMLElement|null {
        const all = 
          Array.from(document.getElementsByTagName(tag))
            .filter(e => {
                var a = e.getAttribute("data-componentid");
                return a ? name.test(a) : false;
            });
        if(all.length > 0) return all[0] as HTMLElement;
        else return null;
      }
      const newButton = findComponent("a", /.*RibbonButtonExt429CID30104.*/i);
      if(!newButton) throw "Edit Time Recordings screen: create new recording button not found";
      newButton.click();
    });

    // wait until input mask appears
    await this.page.waitForSelector('a.x-row-editor-update-button');

    // fill out input mask
    await this.page.evaluate(([da,st,en,so]) => {
      function findInput(name : RegExp): HTMLElement|null {
        const all = 
          Array.from(document.getElementsByTagName("input"))
            .filter(e => {
                var a = e.getAttribute("name");
                return a ? name.test(a) : false;
            });
        if(all.length > 0) return all[0] as HTMLElement;
        else return null;
      }
      const saveButton = Array.from(document.getElementsByTagName("a")).filter((e) => e.classList.contains("x-row-editor-update-button"))[0];
      if(!saveButton) throw "New Recording form: save button not found"

      const dateInput = findInput(/.*BUCHUNG_DATUM.*/i) as HTMLInputElement;
      if(!dateInput) throw "New Recording form: input BUCHUNG_DATUM not found"
      const startTimeInput = findInput(/.*BUCHUNG_BEGINNZEIT.*/i) as HTMLInputElement;
      if(!startTimeInput) throw "New Recording form: input BUCHUNG_BEGINNZEIT not found"
      const endTimeInput = findInput(/.*BUCHUNG_ENDEZEIT.*/i) as HTMLInputElement;
      if(!endTimeInput) throw "New Recording form: input BUCHUNG_ENDEZEIT not found"
      const sodexoInput = findInput(/.*FREIFELD8.*/i) as HTMLInputElement;
      if(!sodexoInput) throw "New Recording form: input FREIFELD8 (Sodexo) not found"

      dateInput.value = da;
      startTimeInput.value = st;
      endTimeInput.value = en;
      sodexoInput.value = so;

      saveButton.click();

    },[da,st,en,so]);

    this.page.waitForFunction(() => {
      const a = Array.from(document.getElementsByTagName("a")).filter((e) => e.classList.contains("x-row-editor-update-button"));
      return a.length == 0;
    })
    console.log("new recording inserted");
  }

  public async editRecordings() {
    console.log("begin opening page: edit time recordings.....");
    await this.page.evaluate(() => {
      function findComponent(tag: string, name: RegExp): HTMLElement|null {
        const all = 
          Array.from(document.getElementsByTagName(tag))
            .filter(e => {
                var a = e.getAttribute("data-componentid");
                return a ? name.test(a) : false;
            });
        if(all.length > 0) return all[0] as HTMLElement;
        else return null;
      }
      const editButton = findComponent("a", /.*TileButtonCID30045.*/i);
      if(!editButton) throw "Time screen: edit recordings button not found";
      editButton.click();
    });
    await this.page.waitForSelector('a.bmd-ribbonbar-button');
    this.page.waitForFunction(() => {
      const a = Array.from(document.getElementsByTagName("div")).filter((e) => e.getAttribute("componentid") == "loadmask-1010");
      return a.length == 0;
    })
    // still too early!!
    console.log("finished opening page: edit time recordings");
  }

  public async time() {
    await this.page.evaluate(() => {
      function findComponent(tag: string, name: RegExp): HTMLElement|null {
        const all = 
          Array.from(document.getElementsByTagName(tag))
            .filter(e => {
                var a = e.getAttribute("data-componentid");
                return a ? name.test(a) : false;
            });
        if(all.length > 0) return all[0] as HTMLElement;
        else return null;
      }
      const timeButton = findComponent("a", /.*TileButtonPKG564.*/i);
      if(!timeButton) throw "Main screen: time button not found";
      timeButton.click();
    });
    await this.page.waitForSelector('a.bmd-tile');
    console.log("goto: time");
  }

  /// logout
  public async logout() {
    await this.page.evaluate(() => {
      function findComponent(tag: string, name: RegExp): HTMLElement|null {
        const all = 
          Array.from(document.getElementsByTagName(tag))
            .filter(e => {
                var a = e.getAttribute("data-componentid");
                return a ? name.test(a) : false;
            });
        if(all.length > 0) return all[0] as HTMLElement;
        else return null;
      }
      const userButton = findComponent("a", /^NavBtnCmdUser.*$/i);
      if(!userButton) throw "no user button";
      userButton.click();

      const logoutButton = findComponent("a", /.*Logout.*$/i);
      if(!logoutButton) throw "no logout button";
      logoutButton.click();
    });
    await this.page.waitForNavigation();
    console.log("logout");
  }

  /// login
  public async login(user : string, password : string) {
    const u = user;
    const p = password;
    await this.page.evaluate(([u,p]) => {
      const uField : HTMLInputElement = document.getElementById("username") as HTMLInputElement;
      const pField : HTMLInputElement = document.getElementById("password") as HTMLInputElement;
      const sButton : HTMLInputElement = document.getElementById("submit") as HTMLInputElement;
      const lSelect : HTMLInputElement = document.getElementById("language") as HTMLInputElement;

      lSelect.value = "ENG";
      uField.value = u;
      pField.value = p;
      sButton.click();
    }, [u, p]);
    console.log("login");
    await this.page.waitForSelector('a.bmd-tile');
    console.log("login done");
  }
  
  public async screenshot(i : number) {
    console.log("screenshot");
    const p = 'outputs/'+i+'.png';
    return this.page.screenshot({ path: p });
  }

}


// Create an async closure, this way we can use await everywhere
(async () => {
  const home = os.homedir()
  
  const data = fs.readFileSync(path.join(home, ".ssh", "stechbot.txt"), { encoding: "utf8" });
  const lines = data.split(os.EOL);

  // Create the browser instance. Pass an object to launch to configure the browser instance
  const browser = await puppeteer.launch({ignoreHTTPSErrors: true, args: ['--ignore-certificate-errors']});
  
  // Create a new page, and navigate to the example site when it's ready
  const page = await browser.newPage();
  await page.goto('https://stechuhr.vrvis.at');

  const u = new Stechuhr(page);


  await u.login(lines[0], lines[1]);

  await u.screenshot(0);

  await u.time();

  await u.screenshot(1);

  await u.editRecordings();

  await u.screenshot(2);

  await u.insertNewRecording("26.09.2019","06:00","18:00","1,10");

  await u.screenshot(3);

  await u.logout();

  // Close the page, we no longer need it
  await page.close();

  // Close the browser, we no longer need it
  await browser.close();
})();
