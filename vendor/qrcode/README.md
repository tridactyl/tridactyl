## About

This library is a precompiled version of npm `node-qrcode` package. Github repo for the source code can be found at [node-qrcode](https://github.com/soldair/node-qrcode). The precompiled library is of version `1.5.3`.

### How to update

-   Download the source code tar of the new version from github [Release Page](https://github.com/soldair/node-qrcode/tags).
-   Extract the tar and run below commands:

```bash
> npm install
> npm run build
```

-   This will create a build directory containig the file `qrcode.js`. Copy this file to the vendor directory of the project.
-   Make sure to add the `module.exports` at the end of the file to make it work with typescript imports (check existing file for example).
-   Check the repo and update `license` file if required.
