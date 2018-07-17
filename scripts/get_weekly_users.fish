#!/usr/bin/env fish

set CADDYLOG "../../caddylog"
set DAYS 7

for d in (seq 1 $DAYS);
    set daterange $daterange (date -d"-$d day" +"%d/%b")'|'
end

cat $CADDYLOG | grep "GET /betas/updates.json" | grep -E "$daterange" | cut -d' ' -f1 | sort | uniq | wc -l
