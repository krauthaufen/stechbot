import * as puppeteer from 'puppeteer';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';



class Stechuhr {
  private page : puppeteer.Page;

  public constructor(p : puppeteer.Page) {
    this.page = p;
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
  }

  /// login
  public async login(user : string, password : string) {
    const u = user;
    const p = password;
    await this.page.evaluate(([u,p]) => {
      const uField : HTMLInputElement = document.getElementById("username") as HTMLInputElement;
      const pField : HTMLInputElement = document.getElementById("password") as HTMLInputElement;
      const sButton : HTMLInputElement = document.getElementById("submit") as HTMLInputElement;

      uField.value = u;
      pField.value = p;
      sButton.click();
    }, [u, p]);
    console.log("login");
    await this.page.waitForSelector('a.bmd-tile');
    console.log("login done");
  }
  
  public async screenshot() {
    console.log("screenshot");
    return this.page.screenshot({ path: 'outputs/example.png' });
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

  await u.screenshot();

  await u.logout();

  // Close the page, we no longer need it
  await page.close();

  // Close the browser, we no longer need it
  await browser.close();
})();
