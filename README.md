![Ace Logo](assets/ace_logo.png?raw=true)  
[![Build Status](https://travis-ci.org/ace-lol/Ace.svg?branch=master)](https://travis-ci.org/ace-lol/Ace)
[![Ace Discord](https://img.shields.io/badge/discord-Ace-738bd7.svg?style=flat)](https://discord.gg/bfxdsRC)

:sparkles: Ace - Alpha Client Enhancer.  
A project that aims to get useful features into the new League of Legends client that Riot Games has been developing.  

Ace currently in beta and might not completely stable. Steps have been taken to ensure that Ace does not crash the client and day-to-day usage should be as stable as the normal client, but you should not be surprised if something goes wrong.

# Current Plugins

- **hide-mobile**: Adds a new `Hide Mobile` option in the friends list, acting the same way as `Hide Offline`, but for players that are on mobile.  
![Image of hide-mobile](http://i.imgur.com/ei5ei2V.png)
- **no-shutdown-prompt**: Removes the `Are you sure you want to quit?` prompt that normally comes up when closing the client.
- **owned-skins**: Adds a new tab in `Collections` that shows all of your owned skins, along with some general statistics.  
![GIF of owned-skins](https://thumbs.gfycat.com/AgedSlowDiamondbackrattlesnake-size_restricted.gif)
- **resize**: Allows you to resize the client to any size, as long as it keeps the same aspect ratio.
- **summoner-icon-description**: Adds a simple tooltip on each summoner icon, detailing where it came from.  
![Image of summoner-icon-description](http://i.imgur.com/f2S0tYX.png)
- **summoner-tooltip**: Adds a tooltip in champion select that shows some ranked statistics about the player, including current rank, W/L and promo status.  
![Image of summoner-tooltip](http://i.imgur.com/dA5Sedw.png)

# Developing Ace

Ace uses TypeScript and Stylus as main languages, with Webpack as bundling tool. The webpack development server can be started using `npm run watch`, which will start a server over at `https://localhost:8080`. The easiest way to develop with this server is to clone the [Launcher](http://github.com/ace-lol/launcher) and replacing the `bundle.js` file with a dummy file that loads from the dev server:
```javascript
// Dummy bundle.js that loads the actual bundle from the dev server.
const el = document.createElement("script");
el.src = "https://localhost:8080/built/bundle.js";
document.head.appendChild(el);
```

Once you are confident with your changes, running `npm run bundle` will create a bundled version of Ace in `src/built/bundle.js`. This file can then be distributed with the launcher to create a single package that anyone can run.

# License

Ace is released under the [MIT](https://github.com/ace-lol/Ace/blob/master/LICENSE) license. Feel free to browse through the code as you like, and if you end up making any improvements or changes, please do not hesitate to make a pull request. :)
