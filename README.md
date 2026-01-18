# TLDR;

No Cookies used, does not save data to any server, no compile, runs on your devices, html hosted on GitHub. Unlinited use. Happy Scouting ✌️
https://p10tyr.github.io/gantry/

# Intro
I needed something to help me visualise what each section withing my Scouts colony would look like over the years.
Needless to say OSM tried to do something like this and they gave up with the reason of "everybody does it differently" 

This is the way I had visualised it in my head and I used Claude (Thanks GitHub Public free credits) to create a no server required, sick of compling code all day so it just needs to run, single HTML, host on anything page,- that can render a Gantt chart based on the files OSM exports.

I hope this helps you.. but if its not your thing .. Try and vibe it out on your own. Let us know.

# How To
In OSM
 - Select Members (young people)
 - Downalod "Deatils PDF or Sheet"
 - Deselect everything except Other Data > Date of Birth
 - Click Spreadsheet
 - Download
<img width="584" height="539" alt="image" src="https://github.com/user-attachments/assets/35cc5982-7f93-4d58-a8a8-efc06bc1c45b" />

Once you have downlaoded all your sections, Waiting List/Squirrels, Beavers, Cubs and Scouts into the same directory you can then load them all into Gantry to visualise movement between sections

<img width="745" height="1196" alt="image" src="https://github.com/user-attachments/assets/bbe9503e-2ef4-433c-b2f0-ce7ba4023d01" />

# OSM Live Import (NEW!)

You can now connect directly to OSM using OAuth to import member data automatically:

1. **Configure Settings**: Click on Settings and add:
   - Cloudflare Worker Proxy URL: `osm-api-proxy.piotr-e9a.workers.dev` (or deploy your own - see `cloudflare-worker/README.md`)
   - OSM OAuth Client ID (get from OSM)
   - Redirect URI (must match your OAuth app settings)

2. **Login to OSM**: Click "Login to OSM" and authorize the app

3. **Import Data**: Select your sections and terms, then click "Load from OSM"

For production use on GitHub Pages, this uses a Cloudflare Worker proxy to handle CORS and secure API calls.


# Setting up OAUTH in OSM

Log in to OSM with Admin provliges

1. Settings -> My Account Details -> Developer Tools
2. Create Application > Application Name (Anything that makes sense you, eg GroupTimelineAnalyser, Gantry, etc)
3. You will get two code. You only need `OAuth ClientID` -
   - Treat it like a one time visible password. Save it into your password manager as you wont see this code ever again. You will need to recreate the application to get a new one. This code does not give access to OSM its just a unique code for the software to know which account you are.
5. Click edit on the application name
6. URL > `https://p10tyr.github.io/gantry/`
   - This is a redirect URL. You can self host this if you know how and this will change 
8. Check Public Client
9. Save

That is the OSM part setup completed. Back on the website in the settings panel you need to fill in a few details. These details are saved on your machines browser for convienience. If you use another browser you need to refill these details in.

> These details are not stored, logged or processed anywhere. You do need to use a proxy but read about the proxy below.


1. Proxy URL > a proxy you trust but you can use `osm-api-proxy.piotr-e9a.workers.dev` the default.
   -  Please read below about proxies so that you dont get into trouble
2. OAuth Cliend ID > The ID you saved securly using the steps above.
3. Redirect URL > Should be `https://p10tyr.github.io/gantry/` if you are using the self hosted version I provide.
   - If you are hosting your own you will know what to put in here
3. Save Settings
4. Click Log In to Osm in the top right.
5. You will be redirected to OSM . The login you use are the same permission what you will see in OSM (Sections/ Members) you see here.
   - This application only needs to know the members Date of Birth as a requirement - Names are provided for convienience . Non of this data is stored or processed anywhere excpet on your browser.


# Proxy

A proxy is needed because OSM does not allow cross site request to occur which is a good security practice. Unfortunately this means simple applications like this are blocked by the browser and we have to use a proxy to workaround this blocking measure.

I have provided a default proxy with the source code in this GitHub. It is hosted in Cloudflare workers on a free account. There are limits, if these limits get hit the proxy will stop to work for the remaining duration of the month.

The proxy does NOT store or process data. This is your responsibility to go and check everything out and make sure your group is happy to use this proxy. I am open and transparent, I run my own group and I am not happy that we need to run a proxy... but this application also makes my life easier. The only difference is the proxy code is mine, I trust it and I dont want to fall foul of GDPR and data protection acts.

> You must do your own due diligence and make sure you understand what the use of proxy menas, the dangers ascociated with it and that you are good within your data protection guidelines!

I also dont want people to abuse my proxy, because they are usefull tools so it is heavly constrictred to only work with my hosted page and only call specific urls in OSM api. 

You are wlecome to use my free proxy but you can easility setup your own proxy in cloudflare for free too! Grab somebody that knows something about code i have documented all the steps needed.

In the very last resort, If you are really and truly stuck but for some reason you really want to use this - I can help you for s small donation towards my group as a gesture of good will;- It will be used to educate our Young People around Digital Maker badge or similar educational programmes.


# Local Development

To run locally with HTTPS (required for OAuth):

1. Navigate to the `dev` folder
2. Run `python https_server.py`
3. Visit `https://localhost:8443/`
4. Accept the self-signed certificate warning

The local HTTPS server serves the HTML files directly. For OSM Live import, configure the Cloudflare Worker proxy URL in settings.

# Disclaimer

This tool is meant to be used to try and help you. Do not use this for final or definitive numbers. There may be slight bugs or oddities to accuracy. Tested as best as I could against my own group and using common sense I understand that some variations may occur.
