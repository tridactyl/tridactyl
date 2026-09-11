# adding a new target

make a file here like

```js
// unsupported-apis-mosaic.js
module.exports = require("./lib/unsupported-apis")("mosaic")
```


add a line to `../browser-targets.json`

```json
"mosaic": { "minimumVersion": "1.0.0" }
```

add a few lines to `../.eslintrc.js`

```js
"unsupported-apis-mosaic": [
    "warn",
    { "minimumVersion": browserTargets.mosaic.minimumVersion }
],
```
