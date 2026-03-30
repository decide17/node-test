# Set Config app for Data logger
This is ‘set-config desktop app’ for Data logger based on Electron Application.

## Use Elecronjs
Build cross-platform desktop apps with JavaScript, HTML, and CSS

A basic files:

- `package.json` - Points to the app's main file and lists its details and dependencies.
- `main.js` - Starts the app and creates a browser window to render HTML. This is the app's **main process**.
- `index.html` - A web page to render. This is the app's **renderer process**.

## Prerequisites
Need to install Node.js & yarn. We recommend that you use the latest LTS version available.

### Install node by operating system
#### Window
1. download install [file](https://nodejs.org/en/)
2. install node
3. install yarn : use 'choco' or 'scoop' or 'npm

```bash
# choco
choco install yarn 
# scoop
scoop install yarn
# npm
npm install -g yarn
```

#### Mac
1. Install 'Homebrew'
    ```bash
    /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)”
    ```
2. Install node
    ```bash
    brew update
    brew install node
    ```
3. install yarn
    ```bash
    brew update
    brew install yarn
    ```

#### Linux (Ubuntu)
1. install node
    ```bash
    sudo apt-get update
    sudo apt-get install nodejs
    sudo apt-get install npm
    ```
2. install yarn
    ```bash
    npm install -g yarn
    ```

## Run App
```bash
# git clone and app's root folder  
# Install dependencies 
yarn install
# Run the app
yarn start
```

## Package and distribute
```bash
# window 64bit
yarn deploy:win64
# window 32bit
yarn deploy:win32
# mac os
yarn deploy:osx
# linux
yarn deploy:linux
# raspberry pi 5
yarn deploy:linux-arm64

```
created **dist** folder where excutable app file
```
// Example for window
dist/
├── win-unpacked/
├── ...
├── ...
└── set-config-datalogger Setup 1.0.0.exe
```