#!/bin/bash

# Usage: ./run_android.sh <device_id>
if [ -z "$1" ]; then
    echo "Usage: ./run_android.sh <device_id>"
    exit 1
fi

web-ext run -s build/ -t firefox-android --adb-device $1 --firefox-apk org.mozilla.firefox -u 'paste.to'
